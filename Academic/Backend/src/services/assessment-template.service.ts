import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { smListClasses } from '../clients/student-management.client';
import { resolveAcademicClass } from './sm-resolve.service';
import { classCategoryMatchesTemplateLevel } from '../utils/education-level';

function applyTemplateTermFilter(where: Record<string, unknown>, term: string) {
  const t = term.trim();
  if (t.toLowerCase() === 'annual') {
    where.term = 'Annual';
  } else {
    where.OR = [{ term: t }, { term: 'Annual' }];
  }
}

export class AssessmentTemplateService {
  private sumActiveWeights(
    components: Array<{
      weightPercentage?: number | null | { toString(): string } | null;
      isActive?: boolean | null;
    }>
  ) {
    return components.reduce((sum, c) => {
      if (c.isActive === false) return sum;
      return sum + Number(c.weightPercentage ?? 0);
    }, 0);
  }

  private assertComponentWeightsTotal100(
    components: Array<{
      weightPercentage?: number | null | { toString(): string } | null;
      isActive?: boolean | null;
    }>
  ) {
    const totalWeight = this.sumActiveWeights(components);
    if (Math.round(totalWeight * 100) / 100 !== 100) {
      throw new AppError(
        400,
        `Active assessment component weights must total exactly 100% (currently ${Math.round(totalWeight * 100) / 100}%)`
      );
    }
  }

  private async assertActiveWeightsCapForTemplate(
    templateId: string,
    next: { componentId: string; weightPercentage: number; isActive: boolean }
  ) {
    const rows = await prisma.assessmentComponent.findMany({ where: { templateId } });
    let total = 0;
    for (const row of rows) {
      const isTarget = row.id === next.componentId;
      const active = isTarget ? next.isActive : row.isActive !== false;
      const weight = isTarget ? next.weightPercentage : Number(row.weightPercentage ?? 0);
      if (active) total += weight;
    }
    const rounded = Math.round(total * 100) / 100;
    if (rounded > 100) {
      throw new AppError(
        400,
        `Active component weights cannot exceed 100% (would be ${rounded}%)`
      );
    }
  }

  private async assertActiveWeightsCapAfterAdd(
    templateId: string,
    added: { weightPercentage: number; isActive?: boolean }
  ) {
    const rows = await prisma.assessmentComponent.findMany({ where: { templateId } });
    let total = added.isActive === false ? 0 : Number(added.weightPercentage ?? 0);
    for (const row of rows) {
      if (row.isActive !== false) total += Number(row.weightPercentage ?? 0);
    }
    const rounded = Math.round(total * 100) / 100;
    if (rounded > 100) {
      throw new AppError(
        400,
        `Active component weights cannot exceed 100% (would be ${rounded}%)`
      );
    }
  }

  async create(organizationId: string, data: {
    name: string;
    description?: string;
    academicLevel: string;
    academicYear: string;
    term: string;
    calculationMethod?: string;
    defaultCourseMarks?: number;
    applicableClasses?: any;
    createdBy?: string;
    components: Array<{
      name: string;
      code: string;
      description?: string;
      maxMark?: number;
      weightPercentage?: number;
      isRequired?: boolean;
      isActive?: boolean;
      sortOrder?: number;
    }>;
  }) {
    if (!data.components || data.components.length === 0) {
      throw new AppError(400, 'At least one assessment component is required');
    }

    this.assertComponentWeightsTotal100(data.components);
    const defaultCourseMarks = Math.max(1, Number(data.defaultCourseMarks ?? 100));

    const existing = await prisma.assessmentTemplate.findFirst({
      where: {
        organizationId,
        name: data.name,
        academicYear: data.academicYear,
        term: data.term,
      },
    });
    if (existing) {
      throw new AppError(409, 'A template with this name already exists for this academic year and term');
    }

    return prisma.assessmentTemplate.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description ?? null,
        academicLevel: data.academicLevel as any,
        academicYear: data.academicYear,
        term: data.term,
        calculationMethod: (data.calculationMethod as any) ?? 'WEIGHTED_AVERAGE',
        defaultCourseMarks,
        applicableClasses: data.applicableClasses ?? null,
        createdBy: data.createdBy ?? null,
        components: {
          create: data.components.map((c, idx) => ({
            name: c.name,
            code: c.code,
            description: c.description ?? null,
            maxMark: c.maxMark ?? 0,
            weightPercentage: c.weightPercentage ?? null,
            isRequired: c.isRequired ?? true,
            isActive: c.isActive !== false,
            sortOrder: c.sortOrder ?? idx,
          })),
        },
      },
      include: { components: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async list(organizationId: string, filters?: {
    status?: string;
    academicYear?: string;
    term?: string;
    academicLevel?: string;
  }) {
    const where: any = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.academicYear) where.academicYear = filters.academicYear;
    if (filters?.term) applyTemplateTermFilter(where, filters.term);
    if (filters?.academicLevel) where.academicLevel = filters.academicLevel;

    return prisma.assessmentTemplate.findMany({
      where,
      include: {
        components: { orderBy: { sortOrder: 'asc' } },
        assignments: {
          include: { class: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async getById(id: string, organizationId: string) {
    const template = await prisma.assessmentTemplate.findFirst({
      where: { id, organizationId },
      include: {
        components: { orderBy: { sortOrder: 'asc' } },
        assignments: {
          include: {
            class: true,
            marks: { take: 0 },
          },
        },
      },
    });
    if (!template) throw new AppError(404, 'Assessment template not found');
    return template;
  }

  async update(id: string, organizationId: string, data: {
    name?: string;
    description?: string;
    academicLevel?: string;
    academicYear?: string;
    term?: string;
    status?: string;
    defaultCourseMarks?: number;
  }) {
    const existing = await prisma.assessmentTemplate.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Assessment template not found');
    if (existing.status === 'ARCHIVED' || existing.status === 'REJECTED') {
      throw new AppError(400, 'Cannot modify an archived or rejected template');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.academicLevel !== undefined) updateData.academicLevel = data.academicLevel;
    if (data.academicYear !== undefined) updateData.academicYear = data.academicYear;
    if (data.term !== undefined) updateData.term = data.term;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.defaultCourseMarks !== undefined) {
      updateData.defaultCourseMarks = Math.max(1, Number(data.defaultCourseMarks));
    }

    return prisma.assessmentTemplate.update({
      where: { id },
      data: updateData,
      include: { components: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async approve(id: string, organizationId: string, assignedBy?: string) {
    const template = await prisma.assessmentTemplate.findFirst({
      where: { id, organizationId },
      include: { components: true },
    });
    if (!template) throw new AppError(404, 'Assessment template not found');
    if (template.status !== 'DRAFT') {
      throw new AppError(400, 'Only draft templates can be approved');
    }
    if (!template.components.length) {
      throw new AppError(400, 'Template must have at least one component before approval');
    }
    this.assertComponentWeightsTotal100(template.components);
    if (!template.defaultCourseMarks || Number(template.defaultCourseMarks) <= 0) {
      throw new AppError(400, 'Default course marks must be greater than 0 before approval');
    }

    await prisma.assessmentTemplate.updateMany({
      where: {
        organizationId,
        academicLevel: template.academicLevel,
        academicYear: template.academicYear,
        term: template.term,
        status: 'ACTIVE',
        id: { not: id },
      },
      data: { status: 'ARCHIVED' },
    });

    const smClasses = (await smListClasses(organizationId).catch(() => [])) as Array<{
      id: string;
      name: string;
      stream?: string | null;
      category?: string | null;
    }>;

    const matching = smClasses.filter((c) =>
      classCategoryMatchesTemplateLevel(c.category, template.academicLevel)
    );

    for (const smClass of matching) {
      const localClass = await resolveAcademicClass(organizationId, { classId: smClass.id });
      if (!localClass) continue;
      const existingAssignment = await prisma.templateAssignment.findFirst({
        where: { templateId: id, classId: localClass.id },
      });
      if (existingAssignment) continue;
      await prisma.templateAssignment.create({
        data: {
          organizationId,
          templateId: id,
          classId: localClass.id,
          academicYear: template.academicYear,
          term: template.term,
          assignedBy: assignedBy ?? null,
        },
      });
    }

    const applicableClasses = matching.map((c) => ({
      id: c.id,
      name: c.name,
      stream: c.stream ?? null,
      category: c.category ?? null,
    }));

    return prisma.assessmentTemplate.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        applicableClasses,
      },
      include: {
        components: { orderBy: { sortOrder: 'asc' } },
        assignments: { include: { class: true } },
      },
    });
  }

  async reject(id: string, organizationId: string, reason?: string) {
    const template = await prisma.assessmentTemplate.findFirst({ where: { id, organizationId } });
    if (!template) throw new AppError(404, 'Assessment template not found');
    if (template.status !== 'DRAFT') {
      throw new AppError(400, 'Only draft templates can be rejected');
    }

    const note = reason?.trim();
    const description =
      note && template.description
        ? `${template.description}\n\n[Rejected] ${note}`
        : note
          ? `[Rejected] ${note}`
          : template.description;

    return prisma.assessmentTemplate.update({
      where: { id },
      data: {
        status: 'REJECTED',
        description,
      },
      include: {
        components: { orderBy: { sortOrder: 'asc' } },
        assignments: { include: { class: true } },
      },
    });
  }

  async delete(id: string, organizationId: string) {
    const existing = await prisma.assessmentTemplate.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Assessment template not found');

    if (existing.status === 'ACTIVE') {
      throw new AppError(400, 'Cannot delete an active template. Archive it first.');
    }

    await prisma.assessmentTemplate.delete({ where: { id } });
    return { message: 'Assessment template deleted' };
  }

  async addComponent(templateId: string, organizationId: string, data: {
    name: string;
    code: string;
    description?: string;
    maxMark?: number;
    weightPercentage?: number;
    sortOrder?: number;
    required?: boolean;
    isActive?: boolean;
  }) {
    const template = await prisma.assessmentTemplate.findFirst({ where: { id: templateId, organizationId } });
    if (!template) throw new AppError(404, 'Assessment template not found');
    if (template.status === 'ARCHIVED' || template.status === 'REJECTED') {
      throw new AppError(400, 'Cannot modify an archived or rejected template');
    }

    const existingComponent = await prisma.assessmentComponent.findFirst({
      where: { templateId, code: data.code },
    });
    if (existingComponent) {
      throw new AppError(409, `Component with code '${data.code}' already exists in this template`);
    }

    const isActive = data.isActive !== false;
    await this.assertActiveWeightsCapAfterAdd(templateId, {
      weightPercentage: Number(data.weightPercentage ?? 0),
      isActive,
    });

    return prisma.assessmentComponent.create({
      data: {
        templateId,
        name: data.name,
        code: data.code,
        description: data.description ?? null,
        maxMark: data.maxMark ?? 0,
        weightPercentage: data.weightPercentage ?? null,
        isRequired: data.required ?? true,
        isActive,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateComponent(componentId: string, organizationId: string, data: {
    name?: string;
    code?: string;
    description?: string;
    maxMark?: number;
    weightPercentage?: number;
    sortOrder?: number;
    isActive?: boolean;
    required?: boolean;
  }) {
    const component = await prisma.assessmentComponent.findFirst({
      where: { id: componentId, template: { organizationId } },
    });
    if (!component) throw new AppError(404, 'Component not found');
    const template = await prisma.assessmentTemplate.findFirst({
      where: { id: component.templateId, organizationId },
    });
    if (!template || template.status === 'ARCHIVED' || template.status === 'REJECTED') {
      throw new AppError(400, 'Cannot modify components on this template');
    }

    if (data.code !== undefined && data.code !== component.code) {
      const dup = await prisma.assessmentComponent.findFirst({
        where: { templateId: component.templateId, code: data.code, id: { not: componentId } },
      });
      if (dup) throw new AppError(409, `Component code '${data.code}' already exists in this template`);
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.maxMark !== undefined) updateData.maxMark = data.maxMark;
    if (data.weightPercentage !== undefined) updateData.weightPercentage = data.weightPercentage;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.required !== undefined) updateData.isRequired = data.required;

    const nextWeight =
      data.weightPercentage !== undefined
        ? Number(data.weightPercentage)
        : Number(component.weightPercentage ?? 0);
    const nextActive = data.isActive !== undefined ? data.isActive : component.isActive !== false;
    await this.assertActiveWeightsCapForTemplate(component.templateId, {
      componentId,
      weightPercentage: nextWeight,
      isActive: nextActive,
    });

    return prisma.assessmentComponent.update({ where: { id: componentId }, data: updateData });
  }

  /** Replace component set atomically (avoids transient >100% during sequential updates). */
  async syncComponents(
    templateId: string,
    organizationId: string,
    items: Array<{
      id?: string;
      name: string;
      code: string;
      weightPercentage: number;
      sortOrder: number;
      required?: boolean;
      isActive?: boolean;
      maxMark?: number;
    }>
  ) {
    const template = await prisma.assessmentTemplate.findFirst({ where: { id: templateId, organizationId } });
    if (!template) throw new AppError(404, 'Assessment template not found');
    if (template.status === 'ARCHIVED' || template.status === 'REJECTED') {
      throw new AppError(400, 'Cannot modify an archived or rejected template');
    }
    if (!items.length) throw new AppError(400, 'At least one component is required');

    this.assertComponentWeightsTotal100(
      items.map((c) => ({
        weightPercentage: c.weightPercentage,
        isActive: c.isActive !== false,
      }))
    );

    const existing = await prisma.assessmentComponent.findMany({ where: { templateId } });
    const keepIds = new Set(items.map((i) => i.id).filter(Boolean) as string[]);

    for (const row of existing) {
      if (keepIds.has(row.id)) continue;
      const hasMarks = await prisma.componentMark.findFirst({ where: { componentId: row.id } });
      const hasAssessmentMarks = await prisma.assessmentMark.findFirst({
        where: { assessment: { componentId: row.id } },
      });
      if (hasMarks || hasAssessmentMarks) {
        throw new AppError(400, `Cannot remove "${row.name}" — it has marks. Deactivate it instead.`);
      }
    }

    return prisma.$transaction(async (tx) => {
      for (const row of existing) {
        if (!keepIds.has(row.id)) {
          await tx.assessmentComponent.delete({ where: { id: row.id } });
        }
      }
      const out = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const payload = {
          name: item.name,
          code: item.code,
          maxMark: item.maxMark ?? 0,
          weightPercentage: item.weightPercentage,
          isRequired: item.required !== false,
          isActive: item.isActive !== false,
          sortOrder: item.sortOrder ?? i,
        };
        if (item.id && existing.some((e) => e.id === item.id)) {
          out.push(await tx.assessmentComponent.update({ where: { id: item.id }, data: payload }));
        } else {
          const dup = await tx.assessmentComponent.findFirst({
            where: { templateId, code: item.code },
          });
          if (dup) throw new AppError(409, `Component code '${item.code}' already exists`);
          out.push(await tx.assessmentComponent.create({ data: { templateId, ...payload } }));
        }
      }
      return out;
    });
  }

  async deleteComponent(componentId: string, organizationId: string) {
    const component = await prisma.assessmentComponent.findFirst({
      where: { id: componentId, template: { organizationId } },
    });
    if (!component) throw new AppError(404, 'Component not found');
    const template = await prisma.assessmentTemplate.findFirst({
      where: { id: component.templateId, organizationId },
    });
    if (!template || template.status === 'ARCHIVED' || template.status === 'REJECTED') {
      throw new AppError(400, 'Cannot modify components on this template');
    }

    const hasMarks = await prisma.componentMark.findFirst({
      where: { componentId },
    });
    const hasAssessmentMarks = await prisma.assessmentMark.findFirst({
      where: { assessment: { componentId } },
    });
    if (hasMarks || hasAssessmentMarks) {
      throw new AppError(400, 'Cannot delete a component that has marks entered. Deactivate it instead.');
    }

    await prisma.assessmentComponent.delete({ where: { id: componentId } });
    return { message: 'Component deleted' };
  }

  async assignToClass(templateId: string, organizationId: string, data: {
    classId: string;
    assignedBy?: string;
  }) {
    const template = await prisma.assessmentTemplate.findFirst({ where: { id: templateId, organizationId } });
    if (!template) throw new AppError(404, 'Assessment template not found');
    if (template.status !== 'ACTIVE' && template.status !== 'DRAFT') {
      throw new AppError(400, 'Template must be active or draft to assign to classes');
    }

    const cls = await prisma.class.findFirst({ where: { id: data.classId, organizationId } });
    if (!cls) throw new AppError(404, 'Class not found');

    const existing = await prisma.templateAssignment.findFirst({
      where: { templateId, classId: data.classId },
    });
    if (existing) {
      throw new AppError(409, 'This template is already assigned to this class');
    }

    return prisma.templateAssignment.create({
      data: {
        organizationId,
        templateId,
        classId: data.classId,
        academicYear: template.academicYear,
        term: template.term,
        assignedBy: data.assignedBy ?? null,
      },
      include: { template: true, class: true },
    });
  }

  async removeClassAssignment(assignmentId: string, organizationId: string) {
    const assignment = await prisma.templateAssignment.findFirst({
      where: { id: assignmentId, organizationId },
    });
    if (!assignment) throw new AppError(404, 'Assignment not found');

    const hasMarks = await prisma.componentMark.findFirst({
      where: { assignmentId },
    });
    if (hasMarks) {
      throw new AppError(400, 'Cannot remove an assignment that has marks entered');
    }

    await prisma.templateAssignment.delete({ where: { id: assignmentId } });
    return { message: 'Assignment removed' };
  }

  async listAssignments(organizationId: string, filters?: {
    templateId?: string;
    classId?: string;
    academicYear?: string;
    term?: string;
  }) {
    const where: any = { organizationId };
    if (filters?.templateId) where.templateId = filters.templateId;
    if (filters?.classId) where.classId = filters.classId;
    if (filters?.academicYear) where.academicYear = filters.academicYear;
    if (filters?.term) applyTemplateTermFilter(where, filters.term);

    return prisma.templateAssignment.findMany({
      where,
      include: {
        template: {
          include: { components: { orderBy: { sortOrder: 'asc' } } },
        },
        class: true,
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async enterMarks(assignmentId: string, organizationId: string, data: {
    subjectId: string;
    marks: Array<{
      studentId: string;
      componentId: string;
      score: number;
      maxMark?: number;
      remarks?: string;
    }>;
    enteredBy?: string;
  }) {
    const assignment = await prisma.templateAssignment.findFirst({
      where: { id: assignmentId, organizationId },
      include: {
        template: {
          include: { components: true },
        },
      },
    });
    if (!assignment) throw new AppError(404, 'Template assignment not found');
    if (assignment.status === 'COMPLETED') {
      throw new AppError(400, 'Cannot enter marks for a completed assignment');
    }

    const subject = await prisma.subject.findFirst({
      where: { id: data.subjectId, organizationId },
    });
    if (!subject) throw new AppError(404, 'Subject not found');

    const componentMap = new Map(
      assignment.template.components.map(c => [c.id, c])
    );

    for (const mark of data.marks) {
      const component = componentMap.get(mark.componentId);
      if (!component) {
        throw new AppError(400, `Component ${mark.componentId} does not belong to this template`);
      }
      const effectiveMaxMark = mark.maxMark ?? Number(component.maxMark ?? 0);
      if (effectiveMaxMark > 0 && mark.score > effectiveMaxMark) {
        throw new AppError(400, `Score ${mark.score} for component '${component.name}' exceeds max mark of ${effectiveMaxMark}`);
      }
    }

    const results = await prisma.$transaction(
      data.marks.map(mark =>
        prisma.componentMark.upsert({
          where: {
            assignmentId_componentId_studentId_subjectId: {
              assignmentId,
              componentId: mark.componentId,
              studentId: mark.studentId,
              subjectId: data.subjectId,
            },
          },
          update: {
            score: mark.score,
            maxMark: mark.maxMark ?? 0,
            remarks: mark.remarks ?? null,
            enteredBy: data.enteredBy ?? null,
            enteredAt: new Date(),
          },
          create: {
            organizationId,
            assignmentId,
            componentId: mark.componentId,
            studentId: mark.studentId,
            subjectId: data.subjectId,
            score: mark.score,
            maxMark: mark.maxMark ?? 0,
            remarks: mark.remarks ?? null,
            enteredBy: data.enteredBy ?? null,
          },
        })
      )
    );

    return { message: `${results.length} marks saved successfully`, count: results.length };
  }

  async calculateResults(assignmentId: string, organizationId: string) {
    const assignment = await prisma.templateAssignment.findFirst({
      where: { id: assignmentId, organizationId },
      include: {
        template: {
          include: {
            components: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
    if (!assignment) throw new AppError(404, 'Template assignment not found');

    const allMarks = await prisma.componentMark.findMany({
      where: { assignmentId },
      include: { component: true },
    });

    if (allMarks.length === 0) {
      throw new AppError(400, 'No marks entered yet. Enter marks before calculating results.');
    }

    const componentMap = new Map(
      assignment.template.components.map(c => [c.id, c])
    );

    const studentSubjectMap = new Map<string, {
      studentId: string;
      subjectId: string;
      scores: Record<string, number>;
      totalScore: number;
      totalMaxMark: number;
    }>();

    for (const mark of allMarks) {
      const key = `${mark.studentId}-${mark.subjectId}`;
      if (!studentSubjectMap.has(key)) {
        studentSubjectMap.set(key, {
          studentId: mark.studentId,
          subjectId: mark.subjectId,
          scores: {},
          totalScore: 0,
          totalMaxMark: 0,
        });
      }
      const entry = studentSubjectMap.get(key)!;
      entry.scores[mark.component.code] = Number(mark.score);
      entry.totalScore += Number(mark.score);
      const effectiveMaxMark = Number(mark.maxMark ?? 0);
      const componentMaxMark = effectiveMaxMark > 0
        ? effectiveMaxMark
        : Number(componentMap.get(mark.componentId)?.maxMark ?? 0);
      entry.totalMaxMark += componentMaxMark;
    }

    const classMarks = allMarks.reduce((acc, mark) => {
      if (!acc[mark.subjectId]) acc[mark.subjectId] = new Set<string>();
      acc[mark.subjectId].add(mark.studentId);
      return acc;
    }, {} as Record<string, Set<string>>);

    const results = [];
    for (const [key, entry] of studentSubjectMap) {
      const classSize = classMarks[entry.subjectId]?.size || 0;
      const percentage = entry.totalMaxMark > 0
        ? (entry.totalScore / entry.totalMaxMark) * 100
        : 0;

      const result = await prisma.studentResult.upsert({
        where: {
          assignmentId_studentId_subjectId: {
            assignmentId,
            studentId: entry.studentId,
            subjectId: entry.subjectId,
          },
        },
        update: {
          componentScores: entry.scores,
          totalScore: entry.totalScore,
          averageScore: percentage,
          percentage,
          classSize,
          calculatedAt: new Date(),
        },
        create: {
          organizationId,
          assignmentId,
          studentId: entry.studentId,
          classId: assignment.classId,
          subjectId: entry.subjectId,
          academicYear: assignment.academicYear,
          term: assignment.term,
          componentScores: entry.scores,
          totalScore: entry.totalScore,
          averageScore: percentage,
          percentage,
          classSize,
          calculatedAt: new Date(),
        },
      });
      results.push(result);
    }

    await this.rankStudents(assignmentId);

    return { message: `Results calculated for ${results.length} student-subject records`, count: results.length };
  }

  async rankStudents(assignmentId: string) {
    const results = await prisma.studentResult.findMany({
      where: { assignmentId },
      orderBy: { percentage: 'desc' },
    });

    const subjectGroups = new Map<string, typeof results>();
    for (const result of results) {
      const key = result.subjectId;
      if (!subjectGroups.has(key)) subjectGroups.set(key, []);
      subjectGroups.get(key)!.push(result);
    }

    const updates = [];
    for (const [, group] of subjectGroups) {
      for (let i = 0; i < group.length; i++) {
        updates.push(
          prisma.studentResult.update({
            where: { id: group[i].id },
            data: { rank: i + 1 },
          })
        );
      }
    }
    await prisma.$transaction(updates);
  }

  async getStudentResults(organizationId: string, filters: {
    studentId: string;
    academicYear: string;
    term?: string;
  }) {
    const where: any = {
      organizationId,
      studentId: filters.studentId,
      academicYear: filters.academicYear,
    };
    if (filters.term) where.term = filters.term;

    return prisma.studentResult.findMany({
      where,
      include: {
        assignment: {
          include: {
            template: {
              include: { components: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
        subject: true,
        class: true,
      },
      orderBy: [{ subject: { name: 'asc' } }],
    });
  }

  async getClassResults(assignmentId: string, organizationId: string) {
    const assignment = await prisma.templateAssignment.findFirst({
      where: { id: assignmentId, organizationId },
      include: { class: true, template: { include: { components: true } } },
    });
    if (!assignment) throw new AppError(404, 'Assignment not found');

    const results = await prisma.studentResult.findMany({
      where: { assignmentId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentUid: true } },
        subject: true,
      },
      orderBy: [{ student: { lastName: 'asc' } }],
    });

    return { assignment, results };
  }

  async getReportCard(organizationId: string, studentId: string, classId: string, academicYear: string, term?: string) {
    const where: any = {
      organizationId,
      studentId,
      classId,
      academicYear,
    };
    if (term) where.term = term;

    const results = await prisma.studentResult.findMany({
      where,
      include: {
        subject: true,
        assignment: {
          include: {
            template: {
              include: { components: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
      },
      orderBy: [{ subject: { name: 'asc' } }],
    });

    if (results.length === 0) {
      throw new AppError(404, 'No results found for this student');
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, organizationId },
      select: { id: true, firstName: true, lastName: true, studentUid: true, gender: true, dateOfBirth: true },
    });

    const cls = await prisma.class.findFirst({
      where: { id: classId, organizationId },
      select: { id: true, name: true, stream: true },
    });

    const totalPercentage = results.reduce((sum, r) => sum + Number(r.percentage || 0), 0);
    const avgPercentage = results.length > 0 ? totalPercentage / results.length : 0;

    const subjects = results.map(r => ({
      subject: r.subject.name,
      subjectId: r.subject.id,
      scores: r.componentScores,
      totalScore: Number(r.totalScore),
      percentage: Number(r.percentage),
      grade: r.grade,
      rank: r.rank,
      classSize: r.classSize,
    }));

    return {
      student,
      class: cls,
      academicYear,
      term,
      subjects,
      totalPercentage: Math.round(totalPercentage * 100) / 100,
      averagePercentage: Math.round(avgPercentage * 100) / 100,
    };
  }

  async getGrowthData(organizationId: string, studentId: string, classId: string) {
    const results = await prisma.studentResult.findMany({
      where: { organizationId, studentId, classId },
      include: { subject: true, assignment: { include: { template: true } } },
      orderBy: [{ academicYear: 'asc' }, { term: 'asc' }],
    });

    if (results.length === 0) {
      throw new AppError(404, 'No results found for growth analysis');
    }

    const termGroups = new Map<string, typeof results>();
    for (const result of results) {
      const key = `${result.academicYear}-${result.term}`;
      if (!termGroups.has(key)) termGroups.set(key, []);
      termGroups.get(key)!.push(result);
    }

    const termAverages = Array.from(termGroups.entries()).map(([key, termResults]) => {
      const avg = termResults.reduce((sum, r) => sum + Number(r.percentage || 0), 0) / termResults.length;
      return {
        period: key,
        averagePercentage: Math.round(avg * 100) / 100,
        subjectCount: termResults.length,
      };
    });

    const subjectGrowth = new Map<string, Array<{ period: string; percentage: number }>>();
    for (const result of results) {
      const key = `${result.academicYear}-${result.term}`;
      if (!subjectGrowth.has(result.subject.name)) {
        subjectGrowth.set(result.subject.name, []);
      }
      subjectGrowth.get(result.subject.name)!.push({
        period: key,
        percentage: Number(result.percentage || 0),
      });
    }

    return {
      termAverages,
      subjectGrowth: Object.fromEntries(subjectGrowth),
    };
  }

  async createGradingScale(organizationId: string, data: {
    name: string;
    academicLevel: string;
    grades: Array<{
      minPercentage: number;
      maxPercentage: number;
      grade: string;
      description?: string;
      remarks?: string;
      sortOrder?: number;
    }>;
  }) {
    const results = await prisma.$transaction(
      data.grades.map((g, idx) =>
        prisma.gradingScale.create({
          data: {
            organizationId,
            name: data.name,
            academicLevel: data.academicLevel as any,
            minPercentage: g.minPercentage,
            maxPercentage: g.maxPercentage,
            grade: g.grade,
            description: g.description ?? null,
            remarks: g.remarks ?? null,
            sortOrder: g.sortOrder ?? idx,
          },
        })
      )
    );
    return results;
  }

  async getGradingScales(organizationId: string, academicLevel?: string) {
    const where: any = { organizationId };
    if (academicLevel) where.academicLevel = academicLevel;
    return prisma.gradingScale.findMany({
      where,
      orderBy: [{ academicLevel: 'asc' }, { sortOrder: 'asc' }],
    });
  }
}

export const assessmentTemplateService = new AssessmentTemplateService();
