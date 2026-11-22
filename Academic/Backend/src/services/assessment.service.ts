import { prisma } from '../config/database';
import { distributionBandsFromScale, countInBand } from '../utils/grading-scale.utils';
import { fetchIamOrgUsers, fetchIamUser, iamUserDisplayName } from '../clients/iam.client';
import { AppError } from '../middleware/error.middleware';
import { resolveAcademicClass, resolveAcademicSubject } from './sm-resolve.service';
import { buildAssessmentCode, buildAssessmentTitle } from '../utils/assessment-code';

async function resolveTeacherNameMap(organizationId: string, userIds: string[]) {
  const map = new Map<string, string>();
  const uniq = [...new Set(userIds.filter(Boolean))];
  if (!uniq.length) return map;

  const orgUsers = await fetchIamOrgUsers(organizationId);
  for (const u of orgUsers) {
    if (uniq.includes(u.id)) {
      const label = iamUserDisplayName(u);
      if (label) map.set(u.id, label);
    }
  }

  const missing = uniq.filter((id) => !map.has(id));
  await Promise.all(
    missing.map(async (id) => {
      const u = await fetchIamUser(id);
      if (!u) return;
      const label = iamUserDisplayName(u);
      if (label) map.set(id, label);
    }),
  );

  return map;
}

function attachTeacherName<T extends { createdBy?: string | null }>(row: T, names: Map<string, string>) {
  return {
    ...row,
    createdByName: row.createdBy ? names.get(row.createdBy) ?? null : null,
  };
}

export class AssessmentService {
  async create(organizationId: string, data: {
    templateId?: string;
    componentId?: string;
    subjectId?: string;
    classId?: string;
    className?: string;
    subjectName?: string;
    title?: string;
    assessmentCode?: string;
    description?: string;
    academicYear: string;
    term: string;
    assessmentDate?: string;
    assessmentTime?: string;
    maxMark: number;
    duration?: string;
    reportingStage?: 'UNASSIGNED' | 'BEGINNING_TERM' | 'MID_TERM' | 'TERM_FINAL';
    assessmentCategory?: string;
    catAllocationStage?: 'BEGINNING_TERM' | 'MID_TERM' | 'TERM_FINAL';
    createdBy?: string;
  }) {
    if (!data.subjectId && !data.subjectName) {
      throw new AppError(400, 'Subject is required');
    }
    if (!data.classId && !data.className) {
      throw new AppError(400, 'Class is required');
    }

    const subject = await resolveAcademicSubject(organizationId, {
      subjectId: data.subjectId,
      subjectName: data.subjectName,
    });
    if (!subject) throw new AppError(404, 'Subject not found. Sync subjects from Student Management or add it in Academic.');

    const cls = await resolveAcademicClass(organizationId, {
      classId: data.classId,
      className: data.className,
    });
    if (!cls) throw new AppError(404, 'Class not found. Classes come from Student Management / Timetable assignments.');

    if (data.templateId) {
      const template = await prisma.assessmentTemplate.findFirst({ where: { id: data.templateId, organizationId } });
      if (!template) throw new AppError(404, 'Assessment template not found');
    }

    if (data.componentId) {
      let component = await prisma.assessmentComponent.findFirst({
        where: { id: data.componentId, template: { organizationId } },
      });
      if (!component && data.templateId) {
        const slug = String(data.componentId).trim();
        component = await prisma.assessmentComponent.findFirst({
          where: {
            templateId: data.templateId,
            OR: [
              { code: { equals: slug, mode: 'insensitive' } },
              { name: { equals: slug, mode: 'insensitive' } },
            ],
          },
        });
      }
      if (!component) {
        const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.componentId);
        if (looksLikeUuid) {
          throw new AppError(404, 'Assessment component/category not found');
        }
        data.componentId = undefined;
      } else {
        data.componentId = component.id;
        if (!data.templateId) data.templateId = component.templateId;
      }
    }

    if (data.maxMark <= 0) {
      throw new AppError(400, 'Maximum mark must be greater than 0');
    }

    const tenant = await prisma.tenant.findFirst({ where: { organizationId } });
    const sequence =
      (await prisma.assessment.count({
        where: {
          organizationId,
          subjectId: subject.id,
          classId: cls.id,
          academicYear: data.academicYear,
          term: data.term,
        },
      })) + 1;

    const assessmentCode =
      data.assessmentCode?.trim() ||
      buildAssessmentCode({ schoolCode: tenant?.schoolCode ?? tenant?.organizationCode, subject, sequence });
    const title = data.title?.trim() || buildAssessmentTitle(subject.name, sequence);

    let assessmentDate: Date | null = null;
    if (data.assessmentDate) {
      const base = data.assessmentDate.includes('T')
        ? data.assessmentDate
        : `${data.assessmentDate}${data.assessmentTime ? `T${data.assessmentTime}` : 'T08:00:00'}`;
      const parsed = new Date(base);
      assessmentDate = Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    let inferredStage = data.reportingStage || 'UNASSIGNED';
    const category = String((data as any).assessmentCategory || '').toUpperCase();
    if (!data.reportingStage && category) {
      if (category === 'BEGINNING_TEST' || category === 'BEGINNING_TERM') inferredStage = 'BEGINNING_TERM';
      else if (category === 'MIDTERM_TEST' || category === 'MID_TERM_TEST' || category === 'MID_TERM') inferredStage = 'MID_TERM';
      else if (category === 'END_OF_TERM_EXAM' || category === 'END_TERM_EXAM' || category === 'TERM_FINAL') inferredStage = 'TERM_FINAL';
      else if ((category === 'CAT' || category === 'CONTINUOUS' || category === 'CONTINUOUS_ASSESSMENT') && (data as any).catAllocationStage) {
        inferredStage = String((data as any).catAllocationStage).toUpperCase() as any;
      }
    }
    // Template component is the central source: a configured component stage overrides client input.
    if (data.componentId) {
      const comp = await prisma.assessmentComponent.findFirst({
        where: { id: data.componentId, template: { organizationId } },
        select: { reportingStage: true },
      });
      const compStage = String(comp?.reportingStage || 'UNASSIGNED').toUpperCase();
      if (['BEGINNING_TERM', 'MID_TERM', 'TERM_FINAL'].includes(compStage)) inferredStage = compStage as any;
    }

    return prisma.assessment.create({
      data: {
        organizationId,
        templateId: data.templateId ?? null,
        componentId: data.componentId ?? null,
        subjectId: subject.id,
        classId: cls.id,
        title,
        assessmentCode,
        description: data.description ?? null,
        academicYear: data.academicYear,
        term: data.term,
        assessmentDate,
        maxMark: data.maxMark,
        duration: data.duration ?? null,
        status: 'OPEN',
        reportingStage: inferredStage as any,
        createdBy: data.createdBy ?? null,
        publishedBy: data.createdBy ?? null,
        publishedAt: new Date(),
      },
      include: {
        subject: true,
        class: true,
        template: true,
        component: true,
      },
    });
  }

  async list(organizationId: string, filters?: {
    status?: string;
    academicYear?: string;
    term?: string;
    subjectId?: string;
    classId?: string;
    componentId?: string;
    templateId?: string;
    createdBy?: string;
    reportingStage?: string;
  }) {
    const where: any = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.academicYear) where.academicYear = filters.academicYear;
    if (filters?.term) where.term = filters.term;
    if (filters?.subjectId) where.subjectId = filters.subjectId;
    if (filters?.classId) where.classId = filters.classId;
    if (filters?.componentId) where.componentId = filters.componentId;
    if (filters?.templateId) where.templateId = filters.templateId;
    if (filters?.createdBy) where.createdBy = filters.createdBy;
    if (filters?.reportingStage) where.reportingStage = filters.reportingStage;

    const rows = await prisma.assessment.findMany({
      where,
      include: {
        subject: true,
        class: true,
        component: true,
        _count: { select: { marks: true } },
      },
      orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
    });
    if (!rows.length) return rows;

    const scored = await prisma.assessmentMark.groupBy({
      by: ['assessmentId'],
      where: {
        assessmentId: { in: rows.map((r) => r.id) },
        score: { not: null },
      },
      _count: { _all: true },
    });
    const scoredMap = new Map(scored.map((s) => [s.assessmentId, s._count._all]));

    const teacherNames = await resolveTeacherNameMap(
      organizationId,
      rows.map((r) => r.createdBy).filter(Boolean) as string[],
    );

    return rows.map((r) =>
      attachTeacherName(
        {
          ...r,
          marksScoredCount: scoredMap.get(r.id) ?? 0,
        },
        teacherNames,
      ),
    );
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      title?: string;
      description?: string;
      assessmentDate?: string;
      assessmentTime?: string;
      maxMark?: number;
      duration?: string;
      reportingStage?: 'UNASSIGNED' | 'BEGINNING_TERM' | 'MID_TERM' | 'TERM_FINAL';
    }
  ) {
    const assessment = await prisma.assessment.findFirst({ where: { id, organizationId } });
    if (!assessment) throw new AppError(404, 'Assessment not found');
    if (!['DRAFT', 'OPEN', 'MARK_ENTRY'].includes(assessment.status) && data.reportingStage === undefined) {
      throw new AppError(400, 'Only scheduled assessments that are not yet submitted can be edited');
    }

    let assessmentDate: Date | null | undefined = undefined;
    if (data.assessmentDate !== undefined) {
      if (!data.assessmentDate) {
        assessmentDate = null;
      } else {
        const base = data.assessmentDate.includes('T')
          ? data.assessmentDate
          : `${data.assessmentDate}${data.assessmentTime ? `T${data.assessmentTime}` : 'T08:00:00'}`;
        const parsed = new Date(base);
        assessmentDate = Number.isNaN(parsed.getTime()) ? null : parsed;
      }
    }

    if (data.maxMark != null && data.maxMark <= 0) {
      throw new AppError(400, 'Maximum mark must be greater than 0');
    }

    let reportingStage: string | undefined = data.reportingStage;
    if (assessment.componentId) {
      const comp = await prisma.assessmentComponent.findFirst({
        where: { id: assessment.componentId, template: { organizationId } },
        select: { reportingStage: true },
      });
      const compStage = String(comp?.reportingStage || 'UNASSIGNED').toUpperCase();
      if (['BEGINNING_TERM', 'MID_TERM', 'TERM_FINAL'].includes(compStage)) reportingStage = compStage;
    }

    return prisma.assessment.update({
      where: { id },
      data: {
        ...(data.title?.trim() ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(assessmentDate !== undefined ? { assessmentDate } : {}),
        ...(data.maxMark != null ? { maxMark: data.maxMark } : {}),
        ...(data.duration !== undefined ? { duration: data.duration?.trim() || null } : {}),
        ...(reportingStage ? { reportingStage: reportingStage as any } : {}),
      },
      include: { subject: true, class: true, component: true, template: true },
    });
  }

  async listAssessmentMarkRecordsForStatusUpdate(
    organizationId: string,
    filters: {
      academicYear?: string;
      term?: string;
      classId?: string;
      stream?: string;
      subjectId?: string;
      componentId?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      reportingStage?: string;
    }
  ) {
    const assessmentWhere: any = { organizationId };
    if (filters.academicYear) assessmentWhere.academicYear = filters.academicYear;
    if (filters.term) assessmentWhere.term = filters.term;
    if (filters.classId) assessmentWhere.classId = filters.classId;
    if (filters.subjectId) assessmentWhere.subjectId = filters.subjectId;
    if (filters.componentId) assessmentWhere.componentId = filters.componentId;
    if (filters.reportingStage) assessmentWhere.reportingStage = filters.reportingStage;
    if (filters.stream) assessmentWhere.class = { stream: { equals: filters.stream, mode: 'insensitive' } };

    if (filters.dateFrom || filters.dateTo) {
      assessmentWhere.assessmentDate = {};
      if (filters.dateFrom) {
        const d = new Date(filters.dateFrom);
        if (!Number.isNaN(d.getTime())) assessmentWhere.assessmentDate.gte = d;
      }
      if (filters.dateTo) {
        const d = new Date(filters.dateTo);
        if (!Number.isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999);
          assessmentWhere.assessmentDate.lte = d;
        }
      }
    }

    const marks = await prisma.assessmentMark.findMany({
      where: {
        organizationId,
        assessment: assessmentWhere,
        ...(filters.search
          ? {
              OR: [
                { student: { firstName: { contains: filters.search, mode: 'insensitive' } } },
                { student: { lastName: { contains: filters.search, mode: 'insensitive' } } },
                { student: { studentCode: { contains: filters.search, mode: 'insensitive' } } },
                { student: { studentUid: { contains: filters.search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentCode: true,
            studentUid: true,
          },
        },
        assessment: {
          include: {
            subject: { select: { id: true, name: true } },
            class: { select: { id: true, name: true, stream: true } },
            component: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: [
        { assessment: { class: { name: 'asc' } } },
        { assessment: { subject: { name: 'asc' } } },
        { assessment: { assessmentDate: 'desc' } },
        { student: { lastName: 'asc' } },
      ],
      take: 2000,
    });

    return marks.map((m) => ({
      markId: m.id,
      assessmentId: m.assessmentId,
      studentId: m.studentId,
      studentName: `${m.student?.firstName || ''} ${m.student?.lastName || ''}`.trim() || 'Student',
      studentCode: m.student?.studentCode || m.student?.studentUid || '',
      classId: m.assessment.classId,
      className: m.assessment.class?.name || '',
      stream: m.assessment.class?.stream || '',
      subjectId: m.assessment.subjectId,
      subjectName: m.assessment.subject?.name || '',
      componentId: m.assessment.componentId || '',
      componentName: m.assessment.component?.name || m.assessment.title || 'Assessment',
      assessmentTitle: m.assessment.title,
      assessmentDate: m.assessment.assessmentDate,
      score: m.score,
      maxMark: m.maxMark ?? m.assessment.maxMark,
      markStatus: m.markStatus,
      currentReportingStage: (m.assessment as any).reportingStage || 'UNASSIGNED',
      assessmentStatus: m.assessment.status,
    }));
  }

  async bulkUpdateAssessmentReportingStage(
    organizationId: string,
    actor: { id?: string; name?: string; roles?: string[] },
    input: {
      assessmentIds?: string[];
      markIds?: string[];
      reportingStage: 'BEGINNING_TERM' | 'MID_TERM' | 'TERM_FINAL' | 'UNASSIGNED';
      filters?: {
        academicYear?: string;
        term?: string;
        classId?: string;
      };
    }
  ) {
    const stage = input.reportingStage;
    if (!['BEGINNING_TERM', 'MID_TERM', 'TERM_FINAL', 'UNASSIGNED'].includes(stage)) {
      throw new AppError(400, 'Invalid reporting stage');
    }

    let targetAssessmentIds = Array.from(new Set((input.assessmentIds || []).filter(Boolean)));

    if ((!targetAssessmentIds.length) && input.markIds?.length) {
      const rows = await prisma.assessmentMark.findMany({
        where: { organizationId, id: { in: Array.from(new Set(input.markIds.filter(Boolean))) } },
        select: { assessmentId: true },
      });
      targetAssessmentIds = Array.from(new Set(rows.map((r) => r.assessmentId)));
    }

    if (!targetAssessmentIds.length) {
      return { updated: 0, skipped: 0, unchanged: 0, reportingStage: stage, affectedAssessmentIds: [] as string[] };
    }

    const assessments = await prisma.assessment.findMany({
      where: {
        organizationId,
        id: { in: targetAssessmentIds },
        ...(input.filters?.academicYear ? { academicYear: input.filters.academicYear } : {}),
        ...(input.filters?.term ? { term: input.filters.term } : {}),
        ...(input.filters?.classId ? { classId: input.filters.classId } : {}),
      },
      select: {
        id: true,
        reportingStage: true,
        classId: true,
        subjectId: true,
        academicYear: true,
        term: true,
        title: true,
      },
    });

    const allowedIds = assessments.map((a) => a.id);
    const skipped = targetAssessmentIds.length - allowedIds.length;
    const toUpdate = assessments.filter((a) => String((a as any).reportingStage || 'UNASSIGNED') !== stage);
    const unchanged = assessments.length - toUpdate.length;

    if (!toUpdate.length) {
      return { updated: 0, skipped, unchanged, reportingStage: stage, affectedAssessmentIds: allowedIds };
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.assessment.updateMany({
        where: { organizationId, id: { in: toUpdate.map((a) => a.id) } },
        data: { reportingStage: stage as any },
      });
      return { updated: toUpdate.length };
    });

    // Audit is best-effort and outside the transaction so a log failure cannot roll back marks.
    try {
      await prisma.academicAuditLog.createMany({
        data: toUpdate.map((a) => ({
          organizationId,
          action: 'ASSESSMENT_REPORTING_STAGE_UPDATED',
          entityType: 'ASSESSMENT',
          entityId: a.id,
          classId: a.classId,
          academicYear: a.academicYear,
          term: a.term,
          actorId: actor.id || null,
          actorName: actor.name || null,
          actorRoles: (Array.isArray(actor.roles) ? actor.roles.join(',') : typeof actor.roles === 'string' ? actor.roles : null) || null,
          beforeState: { reportingStage: (a as any).reportingStage || 'UNASSIGNED' } as any,
          afterState: { reportingStage: stage } as any,
          details: { title: a.title } as any,
        })),
      });
    } catch (err) {
      console.warn('[assessment] reporting-stage audit log failed:', err instanceof Error ? err.message : err);
    }

    return {
      ...result,
      skipped,
      unchanged,
      reportingStage: stage,
      affectedAssessmentIds: allowedIds,
    };
  }

  async getById(id: string, organizationId: string) {
    const assessment = await prisma.assessment.findFirst({
      where: { id, organizationId },
      include: {
        subject: true,
        class: true,
        template: true,
        component: true,
        marks: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, studentUid: true } },
          },
          orderBy: { student: { lastName: 'asc' } },
        },
        evidences: true,
        _count: { select: { marks: true, corrections: true } },
      },
    });
    if (!assessment) throw new AppError(404, 'Assessment not found');
    const teacherNames = await resolveTeacherNameMap(
      organizationId,
      assessment.createdBy ? [assessment.createdBy] : [],
    );
    return attachTeacherName(assessment, teacherNames);
  }

  async previewNextCode(
    organizationId: string,
    input: { subjectId?: string; subjectName?: string; classId?: string; className?: string; academicYear: string; term: string }
  ) {
    const subject = await resolveAcademicSubject(organizationId, {
      subjectId: input.subjectId,
      subjectName: input.subjectName,
    });
    if (!subject) throw new AppError(404, 'Subject not found');

    const cls = await resolveAcademicClass(organizationId, {
      classId: input.classId,
      className: input.className,
    });
    if (!cls) throw new AppError(404, 'Class not found');

    const tenant = await prisma.tenant.findFirst({ where: { organizationId } });
    const sequence =
      (await prisma.assessment.count({
        where: {
          organizationId,
          subjectId: subject.id,
          classId: cls.id,
          academicYear: input.academicYear,
          term: input.term,
        },
      })) + 1;

    return {
      assessmentCode: buildAssessmentCode({
        schoolCode: tenant?.schoolCode ?? tenant?.organizationCode,
        subject,
        sequence,
      }),
      title: buildAssessmentTitle(subject.name, sequence),
      sequence,
    };
  }

  async approveByAcademic(id: string, organizationId: string, userId?: string) {
    return this.updateStatus(id, organizationId, 'OPEN', userId);
  }

  async rejectByAcademic(id: string, organizationId: string, reason?: string) {
    const assessment = await prisma.assessment.findFirst({ where: { id, organizationId } });
    if (!assessment) throw new AppError(404, 'Assessment not found');
    if (!['DRAFT', 'OPEN'].includes(assessment.status)) {
      throw new AppError(400, 'Only scheduled or open assessments can be rejected');
    }
    const prefix = reason?.trim() ? `[Rejected by Academic] ${reason.trim()}\n` : '[Rejected by Academic]\n';
    const description = `${prefix}${assessment.description ?? ''}`.trim();

    return prisma.assessment.update({
      where: { id },
      data: {
        status: 'DRAFT',
        description,
        publishedBy: null,
        publishedAt: null,
      },
      include: { subject: true, class: true, component: true, template: true },
    });
  }

  async updateStatus(id: string, organizationId: string, newStatus: string, userId?: string) {
    const assessment = await prisma.assessment.findFirst({
      where: { id, organizationId },
    });
    if (!assessment) throw new AppError(404, 'Assessment not found');

    const validTransitions: Record<string, string[]> = {
      DRAFT: ['OPEN'],
      OPEN: ['MARK_ENTRY', 'DRAFT'],
      MARK_ENTRY: ['SUBMITTED', 'OPEN'],
      SUBMITTED: ['REVIEWED', 'MARK_ENTRY'],
      REVIEWED: ['APPROVED', 'SUBMITTED'],
      APPROVED: ['LOCKED', 'REVIEWED'],
      LOCKED: [],
    };

    if (newStatus === assessment.status) {
      return prisma.assessment.findFirst({
        where: { id, organizationId },
        include: { subject: true, class: true, component: true, template: true },
      });
    }

    const allowed = validTransitions[assessment.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new AppError(400, `Cannot transition from ${assessment.status} to ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`);
    }

    const updateData: any = { status: newStatus };
    if (newStatus === 'OPEN' || newStatus === 'MARK_ENTRY') {
      updateData.publishedBy = userId ?? null;
      updateData.publishedAt = new Date();
    }

    return prisma.assessment.update({
      where: { id },
      data: updateData,
      include: { subject: true, class: true, component: true },
    });
  }

  async getStatistics(assessmentId: string, organizationId: string) {
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, organizationId },
      include: {
        marks: true,
        subject: true,
        class: true,
      },
    });
    if (!assessment) throw new AppError(404, 'Assessment not found');

    const enteredMarks = assessment.marks.filter(
      (m) => m.markStatus === 'PRESENT' && m.score != null
    );
    const maxMark = Number(assessment.maxMark);

    if (enteredMarks.length === 0) {
      return {
        assessment,
        totalStudents: assessment.marks.length,
        completedCount: 0,
        missingCount: assessment.marks.length,
        absentCount: 0,
        excusedCount: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        passRate: 0,
        distribution: [],
      };
    }

    const percentages = enteredMarks.map((m) => (Number(m.score) / maxMark) * 100);
    const sorted = [...percentages].sort((a, b) => a - b);
    const average = percentages.reduce((a, b) => a + b, 0) / percentages.length;
    const highest = sorted[sorted.length - 1];
    const lowest = sorted[0];

    const absentCount = assessment.marks.filter((m) => m.markStatus === 'ABSENT').length;
    const excusedCount = assessment.marks.filter((m) => m.markStatus === 'EXCUSED' || m.markStatus === 'EXEMPT').length;
    const missingCount = assessment.marks.filter((m) => m.markStatus === 'MISSING').length;

    const classCategory = (assessment.class as { category?: string | null })?.category ?? null;
    let gradingScale = await prisma.gradingScale.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: 'asc' }],
    });
    if (classCategory) {
      const scoped = await prisma.gradingScale.findMany({
        where: { organizationId, academicLevel: classCategory as any },
        orderBy: [{ sortOrder: 'asc' }],
      });
      if (scoped.length) gradingScale = scoped;
    }
    const ranges = distributionBandsFromScale(gradingScale);
    for (const pct of percentages) {
      for (const range of ranges) {
        if (countInBand(pct, range.min, range.max)) {
          range.count++;
          break;
        }
      }
    }

    const passThreshold = 50;
    const passCount = percentages.filter((p) => p >= passThreshold).length;

    return {
      assessment,
      totalStudents: assessment.marks.length,
      completedCount: enteredMarks.length,
      missingCount,
      absentCount,
      excusedCount,
      average: Math.round(average * 100) / 100,
      highest: Math.round(highest * 100) / 100,
      lowest: Math.round(lowest * 100) / 100,
      passRate: Math.round((passCount / enteredMarks.length) * 10000) / 100,
      distribution: ranges,
    };
  }

  async delete(id: string, organizationId: string) {
    const assessment = await prisma.assessment.findFirst({
      where: { id, organizationId },
    });
    if (!assessment) throw new AppError(404, 'Assessment not found');
    if (!['DRAFT', 'OPEN', 'MARK_ENTRY'].includes(assessment.status)) {
      throw new AppError(400, 'Only scheduled assessments that are not submitted can be deleted');
    }

    const scored = await prisma.assessmentMark.count({
      where: { assessmentId: id, score: { not: null } },
    });
    if (scored > 0) {
      throw new AppError(400, 'Cannot delete an assessment that already has marks entered');
    }

    await prisma.assessment.delete({ where: { id } });
    return { message: 'Assessment deleted' };
  }

  /** Admin: remove an assessment (course) together with every mark entered for it. */
  async deleteCourse(
    id: string,
    organizationId: string,
    actor: { id?: string; name?: string; roles?: string[] }
  ) {
    const assessment = await prisma.assessment.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { marks: true } } },
    });
    if (!assessment) throw new AppError(404, 'Assessment not found');
    const marksRemoved = assessment._count.marks;

    await prisma.assessment.delete({ where: { id } });

    try {
      await prisma.academicAuditLog.create({
        data: {
          organizationId,
          action: 'ASSESSMENT_COURSE_DELETED',
          entityType: 'ASSESSMENT',
          entityId: id,
          classId: assessment.classId,
          academicYear: assessment.academicYear,
          term: assessment.term,
          actorId: actor.id || null,
          actorName: actor.name || null,
          actorRoles: (actor.roles ?? []).join(',') || null,
          beforeState: { title: assessment.title, status: assessment.status, marksRemoved } as any,
          afterState: null as any,
          details: { title: assessment.title, marksRemoved } as any,
        },
      });
    } catch (err) {
      console.warn('[assessment] course delete audit failed:', err instanceof Error ? err.message : err);
    }

    return { deleted: true, marksRemoved };
  }

  /** Admin: remove every mark entered for an assessment. The course stays and reports update immediately. */
  async deleteAllMarks(
    assessmentId: string,
    organizationId: string,
    actor: { id?: string; name?: string; roles?: string[] }
  ) {
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, organizationId },
      include: { _count: { select: { marks: true } } },
    });
    if (!assessment) throw new AppError(404, 'Assessment not found');
    const marksRemoved = assessment._count.marks;

    await prisma.$transaction(async (tx) => {
      await tx.assessmentMark.deleteMany({ where: { assessmentId, organizationId } });
      if (['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED'].includes(String(assessment.status))) {
        await tx.assessment.update({ where: { id: assessmentId }, data: { status: 'MARK_ENTRY' } });
      }
    });

    try {
      await prisma.academicAuditLog.create({
        data: {
          organizationId,
          action: 'ASSESSMENT_MARKS_DELETED',
          entityType: 'ASSESSMENT',
          entityId: assessmentId,
          classId: assessment.classId,
          academicYear: assessment.academicYear,
          term: assessment.term,
          actorId: actor.id || null,
          actorName: actor.name || null,
          actorRoles: (actor.roles ?? []).join(',') || null,
          beforeState: { status: assessment.status, marksRemoved } as any,
          afterState: { status: 'MARK_ENTRY', marksRemoved: 0 } as any,
          details: { title: assessment.title, marksRemoved } as any,
        },
      });
    } catch (err) {
      console.warn('[assessment] marks delete audit failed:', err instanceof Error ? err.message : err);
    }

    return { marksRemoved };
  }

  async getTeacherDashboard(organizationId: string, teacherId: string, filters?: {
    academicYear?: string;
    term?: string;
  }) {
    const where: any = {
      organizationId,
      createdBy: teacherId,
    };
    if (filters?.academicYear) where.academicYear = filters.academicYear;
    if (filters?.term) where.term = filters.term;

    const assessments = await prisma.assessment.findMany({
      where,
      include: {
        subject: true,
        class: true,
        component: true,
        _count: { select: { marks: true } },
      },
      orderBy: { assessmentDate: 'desc' },
    });

    const completed = assessments.filter((a) => a.status === 'LOCKED' || a.status === 'APPROVED');
    const pending = assessments.filter((a) => a.status === 'MARK_ENTRY' || a.status === 'OPEN');

    const completionRate = assessments.length > 0
      ? Math.round((completed.length / assessments.length) * 10000) / 100
      : 0;

    return {
      total: assessments.length,
      completed: completed.length,
      pending: pending.length,
      completionRate,
      assessments,
    };
  }
}

export const assessmentService = new AssessmentService();
