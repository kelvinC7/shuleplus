import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { smListClasses, smListStudents, smListSubjects } from '../clients/student-management.client';
import { ensureAcademicStudent, resolveAcademicClass, resolveAcademicSubject } from './sm-resolve.service';
import { enrichReportPayload } from './report-card.service';
import { fetchTimetableClassCatalog, fetchTimetableCourseCoreFlags } from '../clients/timetable.client';
import {
  findCourseDefaultMarksForSubjects,
  listCourseDefaultMarksRows,
  upsertCourseDefaultMarksRow,
} from './course-default-marks.store';
import {
  accumulateAssessmentMark,
  buildSubjectScoresFromComponents,
  resolveToTemplateComponentName,
  type ComponentAccumulator,
} from '../utils/report-card-component-calc';

function normClassLabel(name: string) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s·_-]+/g, ' ');
}

function normSubjectKey(name: string) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveIsCoreFromMap(subjectName: string, coreMap: Map<string, boolean>): boolean | undefined {
  const key = normSubjectKey(subjectName);
  if (!key) return undefined;
  if (coreMap.has(key)) return coreMap.get(key)!;
  for (const [k, isCore] of coreMap.entries()) {
    if (k === key) return isCore;
    const shorter = k.length < key.length ? k : key;
    const longer = k.length < key.length ? key : k;
    if (shorter.length >= 4 && longer.includes(shorter)) return isCore;
  }
  return undefined;
}

type ReportSubjectRow = {
  subject: string;
  subjectId: string;
  isCore?: boolean;
  categoryScores: Record<string, unknown>;
  totalScore: number;
  totalMax?: number;
  defaultCourseMarks?: number;
  percentage: number;
  marksEntered?: boolean;
  courseComplete?: boolean;
  missingComponents?: string[];
  grade: string | null;
  gradeDescription: string | null;
  rank: number | null;
  classSize: number | null;
  termResults?: Array<{
    term: string;
    categoryScores: Record<string, unknown>;
    totalScore: number;
    totalMax?: number;
    percentage: number;
    marksEntered?: boolean;
    grade: string | null;
    rank: number | null;
    classSize: number | null;
    componentOrder: string[];
  }>;
};

function sortSubjectsCoreFirst<T extends { subject: string; isCore?: boolean }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ac = a.isCore !== false ? 0 : 1;
    const bc = b.isCore !== false ? 0 : 1;
    if (ac !== bc) return ac - bc;
    return a.subject.localeCompare(b.subject);
  });
}

/** Payload shape returned by buildReportFromAssessmentMarks (single term). */
type BuiltAssessmentReport = {
  term?: string | null;
  subjects: ReportSubjectRow[];
  componentOrder?: string[];
  assessmentTemplate?: { components?: Array<{ name: string; weightPercentage?: number; code?: string }> } | null;
  [key: string]: unknown;
};

interface CategoryAccumulator {
  studentId: string;
  categoryScores: Record<string, { percentage: number; weight: number; contribution: number }>;
  totalWeightedScore: number;
  totalWeight: number;
}

interface FinalResultEntry extends CategoryAccumulator {
  finalPercentage: number;
  rank?: number | null;
  grade?: string | null;
  gradeDescription?: string | null;
  remarks?: string | null;
}

export class GradingEngineService {
  async calculateStudentResult(assessmentId: string, organizationId: string) {
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, organizationId },
      include: {
        template: { include: { components: true } },
        component: true,
        marks: { include: { student: true } },
        subject: true,
        class: true,
      },
    });
    if (!assessment) throw new AppError(404, 'Assessment not found');
    if (!assessment.templateId || !assessment.componentId) {
      throw new AppError(400, 'Assessment must be linked to a template and category to calculate results');
    }

    const component = assessment.component!;
    const weightPct = Number(component.weightPercentage ?? 0);
    const maxMark = Number(assessment.maxMark);

    const studentResults = assessment.marks
      .filter((m) => m.markStatus === 'PRESENT' && m.score != null)
      .map((m) => {
        const score = Number(m.score);
        const percentage = maxMark > 0 ? (score / maxMark) * 100 : 0;
        const weightedContribution = (percentage * weightPct) / 100;

        return {
          studentId: m.studentId,
          score,
          percentage: Math.round(percentage * 100) / 100,
          weightedContribution: Math.round(weightedContribution * 100) / 100,
        };
      });

    return {
      assessment: {
        id: assessment.id,
        title: assessment.title,
        subject: assessment.subject.name,
        class: assessment.class.name,
        category: component.name,
        weightPercentage: weightPct,
        maxMark,
      },
      studentResults,
    };
  }

  async calculateCategoryResults(templateId: string, classId: string, subjectId: string, organizationId: string) {
    const template = await prisma.assessmentTemplate.findFirst({
      where: { id: templateId, organizationId },
      include: { components: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template) throw new AppError(404, 'Template not found');

    const assessments = await prisma.assessment.findMany({
      where: {
        templateId,
        classId,
        subjectId,
        organizationId,
        status: { in: ['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED'] },
        componentId: { not: null },
      },
      include: {
        component: true,
        marks: { where: { markStatus: 'PRESENT' } },
      },
    });

    const categoryMap = new Map<string, {
      component: any;
      assessments: typeof assessments;
    }>();

    for (const assessment of assessments) {
      if (!assessment.componentId) continue;
      if (!categoryMap.has(assessment.componentId)) {
        categoryMap.set(assessment.componentId, {
          component: assessment.component,
          assessments: [],
        });
      }
      categoryMap.get(assessment.componentId)!.assessments.push(assessment);
    }

    const results = [];
    for (const [componentId, data] of categoryMap) {
      const weightPct = Number(data.component?.weightPercentage ?? 0);
      const studentAvgMap = new Map<string, { totalPct: number; count: number }>();

      for (const assessment of data.assessments) {
        const maxMark = Number(assessment.maxMark);
        for (const mark of assessment.marks) {
          if (mark.score == null) continue;
          const pct = maxMark > 0 ? (Number(mark.score) / maxMark) * 100 : 0;
          const existing = studentAvgMap.get(mark.studentId) || { totalPct: 0, count: 0 };
          existing.totalPct += pct;
          existing.count += 1;
          studentAvgMap.set(mark.studentId, existing);
        }
      }

      const categoryAverages = Array.from(studentAvgMap.entries()).map(([studentId, data]) => {
        const avgPct = data.count > 0 ? data.totalPct / data.count : 0;
        return {
          studentId,
          categoryPercentage: Math.round(avgPct * 100) / 100,
          weightedContribution: Math.round((avgPct * weightPct) / 100 * 100) / 100,
          assessmentCount: data.count,
        };
      });

      results.push({
        componentId,
        componentName: data.component?.name,
        weightPercentage: weightPct,
        assessmentCount: data.assessments.length,
        studentAverages: categoryAverages,
      });
    }

    return results;
  }

  async calculateFinalResults(templateId: string, classId: string, subjectId: string, organizationId: string) {
    const template = await prisma.assessmentTemplate.findFirst({
      where: { id: templateId, organizationId },
      include: { components: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template) throw new AppError(404, 'Template not found');

    const categoryResults = await this.calculateCategoryResults(templateId, classId, subjectId, organizationId);

    const studentFinalMap = new Map<string, CategoryAccumulator>();

    for (const category of categoryResults) {
      for (const avg of category.studentAverages) {
        if (!studentFinalMap.has(avg.studentId)) {
          studentFinalMap.set(avg.studentId, {
            studentId: avg.studentId,
            categoryScores: {},
            totalWeightedScore: 0,
            totalWeight: 0,
          });
        }
        const student = studentFinalMap.get(avg.studentId)!;
        student.categoryScores[category.componentName || 'Unknown'] = {
          percentage: avg.categoryPercentage,
          weight: category.weightPercentage,
          contribution: avg.weightedContribution,
        };
        student.totalWeightedScore += avg.weightedContribution;
        student.totalWeight += category.weightPercentage;
      }
    }

    const finalResults: FinalResultEntry[] = Array.from(studentFinalMap.values()).map((s) => {
      const finalPercentage = s.totalWeight > 0
        ? (s.totalWeightedScore / s.totalWeight) * 100
        : 0;
      return {
        ...s,
        finalPercentage: Math.round(finalPercentage * 100) / 100,
      };
    });

    finalResults.sort((a, b) => b.finalPercentage - a.finalPercentage);
    finalResults.forEach((r, i) => { r.rank = i + 1; });

    const gradingScale = await prisma.gradingScale.findMany({
      where: {
        organizationId,
        academicLevel: template.academicLevel,
      },
      orderBy: { sortOrder: 'asc' },
    });

    for (const result of finalResults) {
      const gradeEntry = gradingScale.find(
        (g) => result.finalPercentage >= Number(g.minPercentage) && result.finalPercentage <= Number(g.maxPercentage)
      );
      result.grade = gradeEntry?.grade ?? null;
      result.gradeDescription = gradeEntry?.description ?? null;
      result.remarks = gradeEntry?.remarks ?? null;
    }

    const classSize = finalResults.length;

    await prisma.$transaction(
      finalResults.map((r) => {
        const existingResult = prisma.studentResult.findFirst({
          where: {
            assignment: { templateId, classId },
            studentId: r.studentId,
            subjectId,
          },
        });

        return prisma.studentResult.upsert({
          where: {
            assignmentId_studentId_subjectId: {
              assignmentId: templateId,
              studentId: r.studentId,
              subjectId,
            },
          },
          update: {
            categoryScores: r.categoryScores,
            totalScore: r.totalWeightedScore,
            percentage: r.finalPercentage,
            grade: r.grade,
            rank: r.rank,
            classSize,
            calculatedAt: new Date(),
          },
          create: {
            organizationId,
            assignmentId: templateId,
            studentId: r.studentId,
            classId,
            subjectId,
            academicYear: template.academicYear,
            term: template.term,
            componentScores: {},
            categoryScores: r.categoryScores,
            totalScore: r.totalWeightedScore,
            percentage: r.finalPercentage,
            grade: r.grade,
            rank: r.rank,
            classSize,
            calculatedAt: new Date(),
          },
        });
      })
    );

    return {
      template: template.name,
      subjectId,
      classId,
      totalStudents: finalResults.length,
      results: finalResults,
    };
  }

  async getGradingScale(organizationId: string, academicLevel: string) {
    return prisma.gradingScale.findMany({
      where: { organizationId, academicLevel: academicLevel as any },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async upsertGradingScale(organizationId: string, data: {
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
    const existing = await prisma.gradingScale.findFirst({
      where: { organizationId, name: data.name, academicLevel: data.academicLevel as any },
    });

    if (existing) {
      await prisma.gradingScale.deleteMany({
        where: { organizationId, name: data.name, academicLevel: data.academicLevel as any },
      });
    }

    return prisma.$transaction(
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
  }

  async getReportCard(
    organizationId: string,
    studentId: string,
    classId: string,
    academicYear: string,
    term?: string,
    includeTerms?: string[]
  ) {
    const cls = await resolveAcademicClass(organizationId, { classId });
    if (!cls) throw new AppError(404, 'Class not found');

    const student = await ensureAcademicStudent(organizationId, { studentId });
    const resolvedStudentId = student.id;
    const resolvedClassId = cls.id;

    const termsList = (includeTerms ?? []).map((t) => t.trim()).filter(Boolean);
    if (termsList.length > 1) {
      const built = await this.buildCombinedTermReport(
        organizationId,
        resolvedStudentId,
        resolvedClassId,
        academicYear,
        termsList,
        student,
        cls
      );
      const displayTerm = term?.trim() || termsList[termsList.length - 1];
      return enrichReportPayload(organizationId, built as Record<string, unknown>, {
        studentId: resolvedStudentId,
        classId: resolvedClassId,
        academicYear,
        term: displayTerm,
        studentUid: student.studentUid,
      });
    }

    const activeTerm = termsList[0] || term;

    const where: any = {
      organizationId,
      studentId: resolvedStudentId,
      classId: resolvedClassId,
      academicYear,
    };
    if (activeTerm) where.term = activeTerm;

    const assessmentMarksWhere: any = {
      organizationId,
      classId: resolvedClassId,
      academicYear,
      status: { not: 'DRAFT' },
      marks: { some: { studentId: resolvedStudentId, markStatus: 'PRESENT' } },
    };
    if (activeTerm) assessmentMarksWhere.term = activeTerm;

    const hasAssessmentMarks = await prisma.assessment.count({ where: assessmentMarksWhere });

    if (hasAssessmentMarks > 0) {
      const built = await this.buildReportFromAssessmentMarks(
        organizationId,
        resolvedStudentId,
        resolvedClassId,
        academicYear,
        activeTerm,
        student,
        cls
      );
      return enrichReportPayload(organizationId, built as Record<string, unknown>, {
        studentId: resolvedStudentId,
        classId: resolvedClassId,
        academicYear,
        term: activeTerm,
        studentUid: student.studentUid,
      });
    }

    const results = await prisma.studentResult.findMany({
      where,
      include: {
        subject: true,
        assignment: true,
      },
      orderBy: [{ subject: { name: 'asc' } }],
    });

    if (results.length === 0) {
      throw new AppError(
        404,
        'No results found for this student. Enter and publish marks in TichaPortal first.'
      );
    }

    const totalPercentage = results.reduce((sum, r) => sum + Number(r.percentage || 0), 0);
    const avgPercentage = results.length > 0 ? totalPercentage / results.length : 0;

    const assessmentWhere: any = {
      organizationId,
      classId: resolvedClassId,
      academicYear,
      status: { not: 'DRAFT' },
    };
    if (activeTerm) assessmentWhere.term = activeTerm;
    const assessmentsForScale = await prisma.assessment.findMany({
      where: assessmentWhere,
      select: { templateId: true },
      take: 50,
    });
    const gradingScale = await this.resolveGradingScaleForOrg(organizationId, assessmentsForScale, {
      name: cls.name,
      stream: cls.stream,
      category: (cls as { category?: string | null }).category ?? null,
    });

    const avgRounded = Math.round(avgPercentage * 100) / 100;
    const overallGrade = this.matchGradeScale(avgRounded, gradingScale);

    const allClassResults = await prisma.studentResult.findMany({
      where: { assignmentId: results[0]?.assignmentId, classId: resolvedClassId, subjectId: results[0]?.subjectId },
      orderBy: { percentage: 'desc' },
    });
    const position = allClassResults.findIndex((r) => r.studentId === resolvedStudentId) + 1;

    const subjects = results.map((r) => {
      const pct = Math.round(Number(r.percentage) * 100) / 100;
      const subjectGrade = this.matchGradeScale(pct, gradingScale);
      return {
        subject: r.subject.name,
        subjectId: r.subject.id,
        categoryScores: r.categoryScores,
        totalScore: Number(r.totalScore),
        percentage: pct,
        grade: subjectGrade?.grade ?? r.grade,
        gradeDescription: subjectGrade?.description,
        rank: r.rank,
        classSize: r.classSize,
      };
    });

    const growthData = await this.getTermlyGrowth(organizationId, resolvedStudentId, resolvedClassId);

    const base = {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        studentUid: student.studentUid,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
      },
      class: cls,
      academicYear,
      term: activeTerm ?? null,
      subjects,
      overallScore: Math.round(avgPercentage * 100) / 100,
      overallGrade: overallGrade?.grade ?? null,
      overallGradeDescription: overallGrade?.description ?? null,
      position: position || 1,
      classSize: allClassResults.length || 1,
      growth: growthData,
    };

    return enrichReportPayload(organizationId, base as Record<string, unknown>, {
      studentId: resolvedStudentId,
      classId: resolvedClassId,
      academicYear,
      term: activeTerm,
      studentUid: student.studentUid,
    });
  }

  private async loadSubjectCoreMap(
    organizationId: string,
    cls: { id: string; name: string; stream: string | null },
    academicYear: string,
    term?: string
  ): Promise<Map<string, boolean>> {
    const map = await fetchTimetableCourseCoreFlags(organizationId);
    try {
      const catalog = await fetchTimetableClassCatalog(organizationId, {
        academicYear,
        term: term ?? undefined,
      });
      const classLabel = [cls.name, cls.stream].filter(Boolean).join(' ').trim();
      const n = normClassLabel(classLabel);
      const row = catalog.find((t) => {
        if (t.classId && t.classId === cls.id) return true;
        if (normClassLabel(t.className) === n) return true;
        if (t.level && normClassLabel(t.level) === normClassLabel(cls.name)) return true;
        return false;
      });
      for (const course of row?.courses ?? []) {
        const sub = String(course.subjectName ?? '').trim();
        if (!sub) continue;
        map.set(normSubjectKey(sub), course.isCore !== false);
      }
    } catch (err) {
      console.warn('[report-card] class catalog core flags:', err instanceof Error ? err.message : err);
    }
    return map;
  }

  private applyCoreFlagsAndSort(subjects: ReportSubjectRow[], coreMap: Map<string, boolean>): ReportSubjectRow[] {
    const withFlags = subjects.map((s) => {
      const resolved = resolveIsCoreFromMap(s.subject, coreMap);
      return {
        ...s,
        isCore: resolved ?? s.isCore ?? true,
      };
    });
    return sortSubjectsCoreFirst(withFlags);
  }

  private async buildCombinedTermReport(
    organizationId: string,
    studentId: string,
    classId: string,
    academicYear: string,
    terms: string[],
    student: { id: string; firstName: string; lastName: string; studentUid: string; gender: string | null; dateOfBirth: Date | null },
    cls: { id: string; name: string; stream: string | null; category?: string | null }
  ) {
    const termReports: Array<{ term: string; report: BuiltAssessmentReport }> = [];
    for (const t of terms) {
      try {
        const hasMarks = await prisma.assessment.count({
          where: {
            organizationId,
            classId,
            academicYear,
            term: t,
            status: { not: 'DRAFT' },
            marks: { some: { studentId, markStatus: 'PRESENT' } },
          },
        });
        if (!hasMarks) continue;
        termReports.push({
          term: t,
          report: (await this.buildReportFromAssessmentMarks(
            organizationId,
            studentId,
            classId,
            academicYear,
            t,
            student,
            cls
          )) as BuiltAssessmentReport,
        });
      } catch (err) {
        if (err instanceof AppError && err.statusCode === 404) continue;
        throw err;
      }
    }

    if (!termReports.length) {
      throw new AppError(404, 'No results found for the selected terms. Enter and publish marks in TichaPortal first.');
    }

    const coreMap = await this.loadSubjectCoreMap(organizationId, cls, academicYear, terms[terms.length - 1]);
    const subjectIndex = new Map<string, ReportSubjectRow>();

    for (const { term: termLabel, report: tr } of termReports) {
      const componentOrder = tr.componentOrder?.length
        ? tr.componentOrder
        : tr.assessmentTemplate?.components?.map((c: { name: string }) => c.name) ?? [];

      for (const s of tr.subjects) {
        const key = s.subjectId.startsWith('tt:') ? normSubjectKey(s.subject) : s.subjectId;
        let row = subjectIndex.get(key);
        if (!row) {
          row = {
            subject: s.subject,
            subjectId: s.subjectId,
            isCore: resolveIsCoreFromMap(s.subject, coreMap) ?? true,
            categoryScores: {},
            totalScore: 0,
            totalMax: s.totalMax,
            defaultCourseMarks: s.defaultCourseMarks,
            percentage: 0,
            marksEntered: false,
            grade: null,
            gradeDescription: null,
            rank: null,
            classSize: null,
            termResults: [],
          };
          subjectIndex.set(key, row);
        }
        row.termResults = row.termResults ?? [];
        row.termResults.push({
          term: termLabel,
          categoryScores: s.categoryScores,
          totalScore: s.totalScore,
          totalMax: s.totalMax,
          percentage: s.percentage,
          marksEntered: s.marksEntered,
          grade: s.grade,
          rank: s.rank,
          classSize: s.classSize,
          componentOrder,
        });
        if (s.defaultCourseMarks != null) row.defaultCourseMarks = s.defaultCourseMarks;
      }
    }

    const lastReport = termReports[termReports.length - 1].report;
    const subjects = this.applyCoreFlagsAndSort([...subjectIndex.values()], coreMap);

    const termComponentOrders = termReports.map(({ term: termLabel, report: tr }) => {
      const order =
        tr.componentOrder?.length
          ? tr.componentOrder
          : tr.assessmentTemplate?.components?.map((c: { name: string }) => c.name) ?? [];
      return { term: termLabel, components: order };
    });
    const combinedTermLabels = termReports.map((r) => r.term);

    const displayTerm = terms.join(' + ');

    return {
      ...lastReport,
      term: displayTerm,
      reportView: 'combined' as const,
      combinedTerms: combinedTermLabels,
      termComponentOrders,
      subjects,
      componentOrder: lastReport.componentOrder,
    };
  }

  /** Prefer teacher-used template (mode), then class assignment, then ACTIVE for year/term. */
  private async resolveReportTemplateId(
    organizationId: string,
    classId: string,
    academicYear: string,
    term: string | undefined,
    assessmentTemplateIds: Array<string | null | undefined>
  ): Promise<string | null> {
    const counts = new Map<string, number>();
    for (const id of assessmentTemplateIds) {
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const fromMarks = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    if (fromMarks) {
      const ok = await prisma.assessmentTemplate.findFirst({
        where: { id: fromMarks, organizationId, academicYear },
      });
      if (ok) return fromMarks;
    }

    if (term) {
      const assigned = await prisma.templateAssignment.findFirst({
        where: {
          classId,
          academicYear,
          term,
          status: 'ACTIVE',
          template: { organizationId, status: 'ACTIVE', academicYear, term },
        },
        orderBy: { assignedAt: 'desc' },
      });
      if (assigned?.templateId) return assigned.templateId;
    }

    const activeForYear = await prisma.assessmentTemplate.findFirst({
      where: {
        organizationId,
        academicYear,
        ...(term ? { term } : {}),
        status: 'ACTIVE',
      },
      orderBy: { updatedAt: 'desc' },
    });
    return activeForYear?.id ?? fromMarks;
  }

  private async buildReportFromAssessmentMarks(
    organizationId: string,
    studentId: string,
    classId: string,
    academicYear: string,
    term: string | undefined,
    student: { id: string; firstName: string; lastName: string; studentUid: string; gender: string | null; dateOfBirth: Date | null },
    cls: { id: string; name: string; stream: string | null }
  ) {
    const assessmentWhere: any = {
      organizationId,
      classId,
      academicYear,
      status: { not: 'DRAFT' },
    };
    if (term) assessmentWhere.term = term;

    const assessments = await prisma.assessment.findMany({
      where: assessmentWhere,
      include: {
        subject: true,
        component: true,
        marks: {
          where: { markStatus: 'PRESENT' },
        },
      },
      orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
    });

    const primaryTemplateId = await this.resolveReportTemplateId(
      organizationId,
      classId,
      academicYear,
      term ?? assessments[0]?.term,
      assessments.map((a) => a.templateId)
    );
    const templateMeta = primaryTemplateId
      ? await prisma.assessmentTemplate.findUnique({
          where: { id: primaryTemplateId },
          include: {
            components: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          },
        })
      : null;
    const defaultCourseMarks = Math.max(1, Number(templateMeta?.defaultCourseMarks ?? 100));
    const templateComponents =
      templateMeta?.components.map((c) => ({
        name: c.name,
        weightPercentage: Number(c.weightPercentage ?? 0),
        sortOrder: c.sortOrder,
        code: c.code,
      })) ?? [];

    const termKey = term ?? assessments[0]?.term ?? '';
    const subjectIdsForDefaults = [...new Set(assessments.map((a) => a.subjectId))];
    let subjectDefaultMarks = new Map<string, number>();
    if (termKey && subjectIdsForDefaults.length) {
      try {
        subjectDefaultMarks = await findCourseDefaultMarksForSubjects(
          organizationId,
          classId,
          academicYear,
          termKey,
          subjectIdsForDefaults
        );
      } catch (err) {
        console.warn('[report-card] course default marks lookup skipped:', err instanceof Error ? err.message : err);
      }
    }

    try {
      const catalog = await fetchTimetableClassCatalog(organizationId, {
        academicYear,
        term: termKey || term,
      });
      const classLabel = normClassLabel([cls.name, cls.stream].filter(Boolean).join(' '));
      const catalogRow = catalog.find(
        (c) =>
          normClassLabel(c.className) === classLabel ||
          normClassLabel(c.className) === normClassLabel(cls.name)
      );
      if (catalogRow?.courses?.length) {
        const nameToSubjectId = new Map<string, string>();
        for (const a of assessments) {
          nameToSubjectId.set(normClassLabel(a.subject.name), a.subjectId);
        }
        for (const course of catalogRow.courses) {
          const dcm = course.defaultCourseMarks;
          if (dcm == null || !Number.isFinite(Number(dcm))) continue;
          const sid = nameToSubjectId.get(normClassLabel(course.subjectName));
          if (sid && !subjectDefaultMarks.has(sid)) {
            subjectDefaultMarks.set(sid, Math.max(1, Number(dcm)));
          }
        }
      }
    } catch {
      /* timetable optional */
    }

    const classReports = this.buildClassSubjectReportsFromAssessments(assessments, {
      defaultCourseMarks,
      subjectDefaultMarks,
      templateComponents,
    });

    if (assessments.length === 0 || classReports.size === 0) {
      throw new AppError(
        404,
        'No results found for this student. Enter and publish marks in TichaPortal first.'
      );
    }

    let studentReport = classReports.get(studentId);
    if (!studentReport) {
      studentReport = {
        subjects: [],
        subjectRanks: new Map(),
        overallScore: 0,
        overallRank: classReports.size + 1,
        overallClassSize: Math.max(classReports.size, 1),
      };
    }

    const gradingScale = await this.resolveGradingScaleForOrg(organizationId, assessments, {
      name: cls.name,
      stream: cls.stream,
      category: (cls as { category?: string | null }).category ?? null,
    });

    const subjectMeta = new Map<string, string>();
    for (const a of assessments) subjectMeta.set(a.subjectId, a.subject.name);

    const merged = new Map(studentReport.subjects.map((s) => [s.subjectId, s]));
    for (const [subjectId, name] of subjectMeta) {
      if (!merged.has(subjectId)) {
        merged.set(subjectId, {
          subjectId,
          subject: name,
          categoryScores: {},
          totalScore: 0,
          totalMax: defaultCourseMarks,
          percentage: 0,
          defaultCourseMarks,
          hasComponentMarks: false,
          courseComplete: false,
          missingComponents: [],
        });
      }
    }

    await this.mergeTimetableCoursesIntoSubjects(organizationId, cls, academicYear, term, merged);

    const coreMap = await this.loadSubjectCoreMap(organizationId, cls, academicYear, term);

    const subjects = this.applyCoreFlagsAndSort(
      [...merged.values()].map((bucket) => {
      const pct = Math.round(bucket.percentage * 100) / 100;
      const totalMax = Math.round((bucket.totalMax ?? defaultCourseMarks) * 100) / 100;
      const marksEntered = Boolean((bucket as { hasComponentMarks?: boolean }).hasComponentMarks);
      const courseComplete = Boolean((bucket as { courseComplete?: boolean }).courseComplete);
      const subjectGrade =
        marksEntered && courseComplete ? this.matchGradeScale(pct, gradingScale) : null;
      const rankInfo = studentReport.subjectRanks.get(bucket.subjectId);
      return {
        subject: bucket.subject,
        subjectId: bucket.subjectId,
        categoryScores: bucket.categoryScores,
        totalScore: Math.round(bucket.totalScore * 100) / 100,
        totalMax,
        defaultCourseMarks:
          (bucket as { defaultCourseMarks?: number }).defaultCourseMarks ?? defaultCourseMarks,
        percentage: pct,
        marksEntered,
        courseComplete,
        missingComponents: (bucket as { missingComponents?: string[] }).missingComponents ?? [],
        grade: subjectGrade?.grade ?? null,
        gradeDescription: subjectGrade?.description ?? null,
        rank: marksEntered && courseComplete ? rankInfo?.rank ?? null : null,
        classSize: marksEntered && courseComplete ? rankInfo?.classSize ?? null : null,
      };
      }),
      coreMap
    );

    const overallScore = Math.round(studentReport.overallScore * 100) / 100;
    const overallGrade = this.matchGradeScale(overallScore, gradingScale);

    const growth = await this.buildGrowthFromAssessments(organizationId, studentId, classId);

    const componentOrder: string[] = templateComponents.length
      ? templateComponents.map((c) => c.name)
      : [];
    if (!componentOrder.length) {
      const compSeen = new Set<string>();
      const sortedAssessments = [...assessments].sort(
        (a, b) => Number(a.component?.sortOrder ?? 999) - Number(b.component?.sortOrder ?? 999)
      );
      for (const a of sortedAssessments) {
        const name = a.component?.name;
        if (name && !compSeen.has(name)) {
          compSeen.add(name);
          componentOrder.push(name);
        }
      }
    }

    const withScores = subjects.filter((s) => s.marksEntered);
    const byPct = [...withScores].sort((a, b) => b.percentage - a.percentage);
    const passThreshold = 50;
    const strongCourses = byPct.slice(0, 3).map((s) => ({
      subject: s.subject,
      percentage: s.percentage,
      grade: s.grade,
    }));
    const improvementCourses = [...byPct]
      .reverse()
      .slice(0, 3)
      .filter((s) => s.percentage > 0)
      .map((s) => ({
        subject: s.subject,
        percentage: s.percentage,
        grade: s.grade,
      }));

    const totalMarks =
      Math.round(withScores.reduce((sum, s) => sum + s.totalScore, 0) * 100) / 100;
    const totalMax =
      Math.round(withScores.reduce((sum, s) => sum + (s.totalMax ?? 0), 0) * 100) / 100;
    const coursesPassed = withScores.filter((s) => s.percentage >= passThreshold).length;

    const gradingLegend = gradingScale.map((g) => ({
      grade: g.grade,
      minPercentage: Number(g.minPercentage),
      maxPercentage: Number(g.maxPercentage),
      description: g.description,
    }));

    const termAvgs = growth?.termAverages ?? [];
    const previousTerm =
      termAvgs.length >= 2 ? termAvgs[termAvgs.length - 2].averagePercentage : null;
    const currentTerm =
      termAvgs.length >= 1 ? termAvgs[termAvgs.length - 1].averagePercentage : overallScore;
    const termChange =
      previousTerm != null ? Math.round((currentTerm - previousTerm) * 100) / 100 : null;

    const insights = withScores.length
      ? {
          highest: byPct[0]
            ? { subject: byPct[0].subject, percentage: byPct[0].percentage }
            : null,
          lowest: byPct.length
            ? { subject: byPct[byPct.length - 1].subject, percentage: byPct[byPct.length - 1].percentage }
            : null,
        }
      : null;

    const reportRef = `RC-${String(academicYear).replace(/\s/g, '')}-${String(student.studentUid || student.id).slice(-8)}`;

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        studentUid: student.studentUid,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
      },
      class: cls,
      academicYear,
      term: term ?? null,
      subjects,
      componentOrder,
      overallScore: Math.round(overallScore * 100) / 100,
      overallGrade: overallGrade?.grade ?? null,
      overallGradeDescription: overallGrade?.description ?? null,
      position: studentReport.overallRank,
      classSize: studentReport.overallClassSize,
      growth,
      summary: {
        totalMarks,
        totalMax,
        coursesPassed,
        coursesTotal: subjects.length,
        termChange,
        previousTermAverage: previousTerm,
        currentTermAverage: Math.round(currentTerm * 100) / 100,
        trend: growth?.trend ?? 'STABLE',
      },
      strongCourses,
      improvementCourses,
      insights,
      gradingLegend,
      attendance: { available: false, message: 'Attendance summary will appear when synced from your attendance module.' },
      discipline: {
        record: 'Not recorded',
        comment: null,
        incidents: 0,
        message: 'No discipline incidents recorded during this term.',
      },
      comments: { classTeacher: '', headTeacher: '' },
      assessmentTemplate: templateMeta
        ? {
            id: templateMeta.id,
            name: templateMeta.name,
            defaultCourseMarks,
            components: templateComponents.map((c) => ({
              name: c.name,
              weightPercentage: c.weightPercentage,
              code: c.code,
            })),
          }
        : null,
      meta: {
        reportNumber: reportRef,
        generatedAt: new Date().toISOString(),
        verifyUrl: null,
      },
    };
  }

  private buildNormalizedSubjectScores(
    acc: {
      subject: string;
      components: Map<string, ComponentAccumulator>;
    },
    defaultCourseMarks: number,
    templateComponents: Array<{ name: string; weightPercentage: number }>
  ) {
    return buildSubjectScoresFromComponents(acc.components, defaultCourseMarks, templateComponents);
  }

  private async mergeTimetableCoursesIntoSubjects(
    organizationId: string,
    cls: { id: string; name: string; stream: string | null },
    academicYear: string,
    term: string | undefined,
    merged: Map<
      string,
      {
        subjectId: string;
        subject: string;
        categoryScores: Record<string, unknown>;
        totalScore: number;
        totalMax: number;
        percentage: number;
      }
    >
  ) {
    try {
      const catalog = await fetchTimetableClassCatalog(organizationId, {
        academicYear,
        term: term ?? undefined,
      });
      const classLabel = [cls.name, cls.stream].filter(Boolean).join(' ').trim();
      const n = normClassLabel(classLabel);
      const tt = catalog.find((t) => {
        if (t.classId && t.classId === cls.id) return true;
        if (normClassLabel(t.className) === n) return true;
        if (t.level && normClassLabel(t.level) === normClassLabel(cls.name)) return true;
        if (t.section && normClassLabel(`${t.level} ${t.section}`) === n) return true;
        return false;
      });
      if (!tt?.courses?.length) return;

      for (const course of tt.courses) {
        const subName = String(course.subjectName ?? '').trim();
        if (!subName) continue;
        const normSub = normClassLabel(subName);
        let found = false;
        for (const bucket of merged.values()) {
          if (normClassLabel(bucket.subject) === normSub) {
            found = true;
            break;
          }
        }
        if (found) continue;
        const code = String(course.courseCode ?? '').trim() || normSub.replace(/\s+/g, '-');
        merged.set(`tt:${code}`, {
          subjectId: `tt:${code}`,
          subject: subName,
          categoryScores: {},
          totalScore: 0,
          totalMax: 0,
          percentage: 0,
        });
      }
    } catch (err) {
      console.warn('[report-card] Timetable Config Class courses not merged:', err);
    }
  }

  /** Standard competition ranking: tied scores share rank; next rank skips (1,1,3). */
  private rankWithTies<T>(items: T[], score: (item: T) => number): Map<T, number> {
    const sorted = [...items].sort((a, b) => score(b) - score(a));
    const ranks = new Map<T, number>();
    let index = 0;
    let lastScore: number | null = null;
    let lastRank = 0;
    for (const item of sorted) {
      index += 1;
      const s = score(item);
      if (lastScore === null || s !== lastScore) {
        lastRank = index;
        lastScore = s;
      }
      ranks.set(item, lastRank);
    }
    return ranks;
  }

  private matchGradeScale(
    percentage: number,
    scales: Array<{ minPercentage: unknown; maxPercentage: unknown; grade: string; description: string | null }>
  ) {
    if (!scales.length || percentage == null || Number.isNaN(percentage)) return null;
    const p = Math.round(Number(percentage) * 100) / 100;
    if (p < 0) return null;

    const sorted = [...scales].sort((a, b) => Number(b.minPercentage) - Number(a.minPercentage));
    for (const g of sorted) {
      const min = Number(g.minPercentage);
      const max = Number(g.maxPercentage);
      if (p + 0.001 >= min && p - 0.001 <= max) return g;
    }
    const lowest = sorted[sorted.length - 1];
    if (lowest && p >= Number(lowest.minPercentage)) return lowest;
    return null;
  }

  private gradingLevelsToTry(templateLevel: string | null, classLabel: string | null) {
    const order: string[] = [];
    if (templateLevel) order.push(templateLevel);
    const label = String(classLabel ?? '').trim().toUpperCase();
    if (/^(N[1-3]|BABY|NURSERY)/.test(label) || /^N\d/.test(label)) order.push('NURSERY');
    if (/^(P[1-6]|PRIMARY)/.test(label)) order.push('PRIMARY');
    if (/^S[1-6]/.test(label)) order.push('SECONDARY');
    order.push('PRIMARY', 'NURSERY', 'SECONDARY', 'O_LEVEL', 'A_LEVEL', 'TVET', 'UNIVERSITY');
    return [...new Set(order.filter(Boolean))];
  }

  private async resolveGradingScaleForOrg(
    organizationId: string,
    assessments: Array<{ templateId: string | null }>,
    classHint?: { name: string; stream?: string | null; category?: string | null }
  ) {
    const templateIds = [...new Set(assessments.map((a) => a.templateId).filter(Boolean))] as string[];
    let templateLevel: string | null = null;
    if (templateIds.length) {
      const tmpl = await prisma.assessmentTemplate.findFirst({
        where: { organizationId, id: { in: templateIds } },
        select: { academicLevel: true },
      });
      templateLevel = tmpl?.academicLevel ?? null;
    }

    const classLabel = [classHint?.name, classHint?.stream].filter(Boolean).join(' ') || classHint?.category || null;
    for (const level of this.gradingLevelsToTry(templateLevel, classLabel)) {
      const scoped = await prisma.gradingScale.findMany({
        where: { organizationId, academicLevel: level as any },
        orderBy: { sortOrder: 'asc' },
      });
      if (scoped.length) return scoped;
    }

    const all = await prisma.gradingScale.findMany({
      where: { organizationId },
      orderBy: [{ academicLevel: 'asc' }, { sortOrder: 'asc' }],
    });
    if (!all.length) return all;

    const byLevel = new Map<string, typeof all>();
    for (const row of all) {
      const key = String(row.academicLevel);
      if (!byLevel.has(key)) byLevel.set(key, []);
      byLevel.get(key)!.push(row);
    }
    let best = all;
    for (const rows of byLevel.values()) {
      if (rows.length > best.length) best = rows;
    }
    return best;
  }

  /** Aggregate marks by student / subject / template component with weights (for report cards). */
  private buildClassSubjectReportsFromAssessments(
    assessments: Array<{
      subjectId: string;
      subject: { name: string };
      maxMark: unknown;
      title: string;
      componentId: string | null;
      component: { name: string; weightPercentage: unknown } | null;
      marks: Array<{ studentId: string; score: unknown; maxMark: unknown; markStatus: string }>;
    }>,
    opts?: {
      defaultCourseMarks: number;
      subjectDefaultMarks?: Map<string, number>;
      templateComponents: Array<{ name: string; weightPercentage: number; sortOrder: number; code?: string }>;
    }
  ) {
    const defaultCourseMarks = Math.max(1, opts?.defaultCourseMarks ?? 100);
    const subjectDefaultMarks = opts?.subjectDefaultMarks ?? new Map<string, number>();
    const templateComponents = opts?.templateComponents ?? [];
    type SubjectAcc = {
      subjectId: string;
      subject: string;
      components: Map<string, ComponentAccumulator>;
      totalScore: number;
      totalMax: number;
    };

    const byStudent = new Map<string, Map<string, SubjectAcc>>();

    for (const assessment of assessments) {
      const rawCompName = assessment.component?.name || assessment.title || 'Assessment';
      const compName = resolveToTemplateComponentName(rawCompName, templateComponents);
      const weightRaw = Number(assessment.component?.weightPercentage ?? 0);

      for (const mark of assessment.marks) {
        if (mark.markStatus !== 'PRESENT' || mark.score == null) continue;
        const maxMark = Number(mark.maxMark ?? assessment.maxMark ?? 0);
        const score = Number(mark.score);
        if (maxMark <= 0) continue;

        let studentSubjects = byStudent.get(mark.studentId);
        if (!studentSubjects) {
          studentSubjects = new Map();
          byStudent.set(mark.studentId, studentSubjects);
        }
        let subjectAcc = studentSubjects.get(assessment.subjectId);
        if (!subjectAcc) {
          subjectAcc = {
            subjectId: assessment.subjectId,
            subject: assessment.subject.name,
            components: new Map(),
            totalScore: 0,
            totalMax: 0,
          };
          studentSubjects.set(assessment.subjectId, subjectAcc);
        }

        accumulateAssessmentMark(subjectAcc.components, compName, weightRaw, score, maxMark);
      }
    }

    const subjectIds = [...new Set(assessments.map((a) => a.subjectId))];
    const subjectPctByStudent = new Map<string, Map<string, number>>();

    const reports = new Map<
      string,
      {
        subjects: Array<{
          subjectId: string;
          subject: string;
          categoryScores: Record<
            string,
            {
              percentage: number;
              weight: number;
              contribution: number;
              score?: number;
              maxMark?: number;
              marksDisplay?: string;
              rawMarksDisplay?: string;
              normalizedScore?: number;
              normalizedMax?: number;
            }
          >;
          totalScore: number;
          totalMax: number;
          percentage: number;
          defaultCourseMarks: number;
          hasComponentMarks: boolean;
          courseComplete: boolean;
          missingComponents: string[];
        }>;
        subjectRanks: Map<string, { rank: number; classSize: number }>;
        overallScore: number;
        overallRank: number;
        overallClassSize: number;
      }
    >();

    for (const [sid, subjectMap] of byStudent) {
      const subjectRows: Array<{
        subjectId: string;
        subject: string;
        categoryScores: Record<
          string,
          {
            percentage: number;
            weight: number;
            contribution: number;
            score?: number;
            maxMark?: number;
            marksDisplay?: string;
            rawMarksDisplay?: string;
            normalizedScore?: number;
            normalizedMax?: number;
          }
        >;
        totalScore: number;
        totalMax: number;
        percentage: number;
        defaultCourseMarks: number;
        hasComponentMarks: boolean;
        courseComplete: boolean;
        missingComponents: string[];
      }> = [];
      const pctMap = new Map<string, number>();

      for (const subjectId of subjectIds) {
        const acc = subjectMap.get(subjectId);
        if (!acc) continue;

        const subjectDcm = subjectDefaultMarks.get(subjectId) ?? defaultCourseMarks;
        const built = this.buildNormalizedSubjectScores(acc, subjectDcm, templateComponents);
        if (built.hasComponentMarks && built.courseComplete) {
          pctMap.set(subjectId, built.percentage);
        }
        subjectRows.push({
          subjectId: acc.subjectId,
          subject: acc.subject,
          ...built,
        });
      }

      subjectRows.sort((a, b) => a.subject.localeCompare(b.subject));
      subjectPctByStudent.set(sid, pctMap);

      const marked = subjectRows.filter((r) => r.hasComponentMarks);
      const overallScore =
        marked.length > 0
          ? (marked.reduce((s, r) => s + r.totalScore, 0) / marked.reduce((s, r) => s + r.totalMax, 0)) * 100
          : 0;

      reports.set(sid, {
        subjects: subjectRows,
        subjectRanks: new Map(),
        overallScore,
        overallRank: 1,
        overallClassSize: byStudent.size || 1,
      });
    }

    for (const subjectId of subjectIds) {
      const eligible = [...byStudent.keys()]
        .map((sid) => ({
          sid,
          pct: subjectPctByStudent.get(sid)?.get(subjectId) ?? -1,
        }))
        .filter((r) => r.pct >= 0);
      const rankMap = this.rankWithTies(eligible, (r) => r.pct);
      for (const entry of eligible) {
        const rep = reports.get(entry.sid);
        if (rep) {
          rep.subjectRanks.set(subjectId, {
            rank: rankMap.get(entry) ?? 1,
            classSize: eligible.length,
          });
        }
      }
    }

    const overallEligible = [...reports.entries()].map(([sid, rep]) => ({ sid, score: rep.overallScore }));
    const overallRankMap = this.rankWithTies(overallEligible, (r) => r.score);
    for (const entry of overallEligible) {
      const rep = reports.get(entry.sid);
      if (rep) {
        rep.overallRank = overallRankMap.get(entry) ?? 1;
        rep.overallClassSize = overallEligible.length || 1;
      }
    }

    return reports;
  }

  private async buildGrowthFromAssessments(organizationId: string, studentId: string, classId: string) {
    const marks = await prisma.assessmentMark.findMany({
      where: {
        organizationId,
        studentId,
        markStatus: 'PRESENT',
        assessment: { classId, status: { not: 'DRAFT' } },
      },
      include: {
        assessment: { include: { subject: true } },
      },
      orderBy: [{ assessment: { academicYear: 'asc' } }, { assessment: { term: 'asc' } }],
    });

    if (!marks.length) {
      return { termAverages: [], subjectGrowth: {}, overallGrowth: 0, trend: 'STABLE' };
    }

    const termGroups = new Map<string, number[]>();
    const subjectGrowth = new Map<string, Array<{ period: string; percentage: number }>>();

    for (const mark of marks) {
      const maxMark = Number(mark.maxMark ?? mark.assessment.maxMark ?? 0);
      if (maxMark <= 0 || mark.score == null) continue;
      const percentage = (Number(mark.score) / maxMark) * 100;
      const period = `${mark.assessment.academicYear} - ${mark.assessment.term}`;
      if (!termGroups.has(period)) termGroups.set(period, []);
      termGroups.get(period)!.push(percentage);

      const subjectName = mark.assessment.subject.name;
      if (!subjectGrowth.has(subjectName)) subjectGrowth.set(subjectName, []);
      subjectGrowth.get(subjectName)!.push({ period, percentage: Math.round(percentage * 100) / 100 });
    }

    const termAverages = [...termGroups.entries()].map(([period, values]) => ({
      period,
      averagePercentage: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
      subjectCount: values.length,
    }));

    let overallGrowth = 0;
    if (termAverages.length >= 2) {
      overallGrowth = termAverages[termAverages.length - 1].averagePercentage - termAverages[0].averagePercentage;
    }

    return {
      termAverages,
      subjectGrowth: Object.fromEntries(subjectGrowth),
      overallGrowth: Math.round(overallGrowth * 100) / 100,
      trend: overallGrowth > 0 ? 'IMPROVING' : overallGrowth < 0 ? 'DECLINING' : 'STABLE',
    };
  }

  async getTermlyGrowth(organizationId: string, studentId: string, classId: string) {
    const results = await prisma.studentResult.findMany({
      where: { organizationId, studentId, classId },
      include: { assignment: { include: { template: true } }, subject: true },
      orderBy: [{ academicYear: 'asc' }, { term: 'asc' }],
    });

    if (results.length === 0) {
      return { termAverages: [], subjectGrowth: {}, overallGrowth: 0, trend: 'STABLE' };
    }

    const termGroups = new Map<string, typeof results>();
    for (const result of results) {
      const key = `${result.academicYear} - ${result.term}`;
      if (!termGroups.has(key)) termGroups.set(key, []);
      termGroups.get(key)!.push(result);
    }

    const termAverages = Array.from(termGroups.entries()).map(([period, termResults]) => {
      const avg = termResults.reduce((sum, r) => sum + Number(r.percentage || 0), 0) / termResults.length;
      return {
        period,
        averagePercentage: Math.round(avg * 100) / 100,
        subjectCount: termResults.length,
      };
    });

    const subjectGrowth = new Map<string, Array<{ period: string; percentage: number }>>();
    for (const result of results) {
      const key = result.subject.name;
      if (!subjectGrowth.has(key)) subjectGrowth.set(key, []);
      subjectGrowth.get(key)!.push({
        period: `${result.academicYear} - ${result.term}`,
        percentage: Number(result.percentage || 0),
      });
    }

    let overallGrowth = 0;
    if (termAverages.length >= 2) {
      overallGrowth = termAverages[termAverages.length - 1].averagePercentage - termAverages[0].averagePercentage;
    }

    return {
      termAverages,
      subjectGrowth: Object.fromEntries(subjectGrowth),
      overallGrowth: Math.round(overallGrowth * 100) / 100,
      trend: overallGrowth > 0 ? 'IMPROVING' : overallGrowth < 0 ? 'DECLINING' : 'STABLE',
    };
  }

  async listCourseDefaultMarks(
    organizationId: string,
    filters: { classId?: string; academicYear: string; term: string }
  ) {
    return listCourseDefaultMarksRows(organizationId, filters);
  }

  async upsertCourseDefaultMarksByClassId(
    organizationId: string,
    data: {
      classId: string;
      className?: string;
      subjectName: string;
      academicYear: string;
      term: string;
      defaultCourseMarks: number;
      updatedBy?: string;
    }
  ) {
    const cls = await resolveAcademicClass(organizationId, {
      classId: data.classId,
      className: data.className,
    });
    if (!cls) {
      throw new AppError(
        404,
        data.className
          ? `Class "${data.className}" could not be linked in Academic. Sync classes from Student Management first.`
          : 'Class not found'
      );
    }
    let subject = await prisma.subject.findFirst({
      where: {
        organizationId,
        name: { equals: data.subjectName.trim(), mode: 'insensitive' },
      },
    });
    if (!subject) {
      subject = await prisma.subject.create({
        data: { organizationId, name: data.subjectName.trim() },
      });
    }
    return this.upsertCourseDefaultMarks(organizationId, {
      classId: cls.id,
      subjectId: subject.id,
      academicYear: data.academicYear,
      term: data.term,
      defaultCourseMarks: data.defaultCourseMarks,
      updatedBy: data.updatedBy,
    });
  }

  async upsertCourseDefaultMarksByNames(
    organizationId: string,
    data: {
      className: string;
      subjectName: string;
      academicYear: string;
      term: string;
      defaultCourseMarks: number;
      updatedBy?: string;
    }
  ) {
    const cls = await resolveAcademicClass(organizationId, { className: data.className });
    if (!cls) throw new AppError(404, `Class "${data.className}" not found in Academic`);
    let subject = await prisma.subject.findFirst({
      where: {
        organizationId,
        name: { equals: data.subjectName.trim(), mode: 'insensitive' },
      },
    });
    if (!subject) {
      subject = await prisma.subject.create({
        data: { organizationId, name: data.subjectName.trim() },
      });
    }
    return this.upsertCourseDefaultMarks(organizationId, {
      classId: cls.id,
      subjectId: subject.id,
      academicYear: data.academicYear,
      term: data.term,
      defaultCourseMarks: data.defaultCourseMarks,
      updatedBy: data.updatedBy,
    });
  }

  async upsertCourseDefaultMarks(
    organizationId: string,
    data: {
      classId: string;
      subjectId: string;
      academicYear: string;
      term: string;
      defaultCourseMarks: number;
      updatedBy?: string;
    }
  ) {
    const value = Math.max(1, Math.min(1000, Number(data.defaultCourseMarks)));
    if (!Number.isFinite(value)) throw new AppError(400, 'Default course marks must be a positive number');

    const cls = await resolveAcademicClass(organizationId, { classId: data.classId });
    if (!cls) throw new AppError(404, 'Class not found');
    const subject = await resolveAcademicSubject(organizationId, { subjectId: data.subjectId });
    if (!subject) throw new AppError(404, 'Subject not found');

    return upsertCourseDefaultMarksRow({
      organizationId,
      classId: data.classId,
      subjectId: data.subjectId,
      academicYear: data.academicYear,
      term: data.term,
      defaultCourseMarks: value,
      updatedBy: data.updatedBy ?? null,
    });
  }

  /** Apply one course total to every class that has this subject on Timetable Config Class for the term. */
  async upsertCourseDefaultMarksForSubjectCatalog(
    organizationId: string,
    data: {
      subjectName: string;
      academicYear: string;
      term: string;
      defaultCourseMarks: number;
      updatedBy?: string;
    }
  ) {
    const subjectName = data.subjectName.trim();
    if (!subjectName) throw new AppError(400, 'subjectName is required');
    const subjectKey = normSubjectKey(subjectName);

    const catalog = await fetchTimetableClassCatalog(organizationId, {
      academicYear: data.academicYear,
      term: data.term,
    });

    const classTargets = new Map<string, { classId: string | null; className: string }>();
    for (const row of catalog) {
      for (const course of row.courses ?? []) {
        if (normSubjectKey(course.subjectName) !== subjectKey) continue;
        classTargets.set(row.className, { classId: row.classId, className: row.className });
      }
    }

    let updated = 0;
    const failures: string[] = [];
    for (const target of classTargets.values()) {
      try {
        if (target.classId) {
          await this.upsertCourseDefaultMarksByClassId(organizationId, {
            classId: target.classId,
            className: target.className,
            subjectName,
            academicYear: data.academicYear,
            term: data.term,
            defaultCourseMarks: data.defaultCourseMarks,
            updatedBy: data.updatedBy,
          });
        } else {
          await this.upsertCourseDefaultMarksByNames(organizationId, {
            className: target.className,
            subjectName,
            academicYear: data.academicYear,
            term: data.term,
            defaultCourseMarks: data.defaultCourseMarks,
            updatedBy: data.updatedBy,
          });
        }
        updated += 1;
      } catch (e) {
        failures.push(
          `${target.className}: ${e instanceof Error ? e.message : 'save failed'}`
        );
      }
    }

    return {
      subjectName,
      defaultCourseMarks: Math.max(1, Math.min(1000, Number(data.defaultCourseMarks))),
      classesMatched: classTargets.size,
      classesUpdated: updated,
      failures,
    };
  }

  async getAcademicDashboard(organizationId: string, academicYear: string, term?: string) {
    const where: any = { organizationId, academicYear };
    if (term) where.term = term;

    const [assessments, results, smStudents, smClasses, smSubjects] = await Promise.all([
      prisma.assessment.findMany({
        where,
        include: { _count: { select: { marks: true } }, class: { select: { id: true, name: true, stream: true } } },
      }),
      prisma.studentResult.findMany({ where }),
      smListStudents(organizationId, { status: 'ACTIVE' }).catch(() => []),
      smListClasses(organizationId).catch(() => []),
      smListSubjects(organizationId).catch(() => []),
    ]);

    const studentRows = Array.isArray(smStudents) ? smStudents : [];
    const classRows = Array.isArray(smClasses) ? smClasses : [];
    const subjectRows = Array.isArray(smSubjects) ? smSubjects : [];

    const totalStudents = studentRows.length || new Set(results.map((r) => r.studentId)).size;
    const totalClasses = classRows.length;
    const totalSubjects = subjectRows.length;
    const totalAssessments = assessments.length;
    const assessmentsWithMarks = assessments.filter((a) => (a._count?.marks ?? 0) > 0).length;
    const publishedResults = results.filter((r) => r.status === 'PUBLISHED' || r.status === 'FINALIZED').length;
    const schoolAvg = results.length > 0
      ? results.reduce((sum, r) => sum + Number(r.percentage || 0), 0) / results.length
      : 0;
    const passRate = results.length > 0
      ? (results.filter((r) => Number(r.percentage) >= 50).length / results.length) * 100
      : 0;

    const classLabel = (c: { name?: string | null; stream?: string | null; label?: string | null }) =>
      c.label?.trim() || [c.name, c.stream].filter(Boolean).join(' ').trim() || String(c.name ?? '');
    const classNameById = new Map(
      classRows.map((c: any) => [c.id, classLabel(c)]),
    );

    const levelPerformance = await prisma.studentResult.groupBy({
      by: ['classId'],
      where,
      _avg: { percentage: true },
    });

    const subjectPerf = await prisma.studentResult.groupBy({
      by: ['subjectId'],
      where,
      _avg: { percentage: true },
      _count: { studentId: true },
    });
    const subjects = await prisma.subject.findMany({
      where: { organizationId, id: { in: subjectPerf.map((s) => s.subjectId) } },
      select: { id: true, name: true },
    });
    const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
    const subjectAverages = subjectPerf.map((s) => ({
      subjectId: s.subjectId,
      subjectName: subjectName.get(s.subjectId) ?? s.subjectId,
      averagePercentage: s._avg.percentage != null ? Math.round(Number(s._avg.percentage) * 100) / 100 : 0,
      averageGrade: null as string | null,
      passRate: 0,
      studentCount: s._count.studentId,
      trend: 'STABLE',
    }));

    const gradeRows = await prisma.studentResult.groupBy({
      by: ['grade'],
      where,
      _count: { grade: true },
    });
    const gradeTotal = gradeRows.reduce((sum, g) => sum + g._count.grade, 0) || 1;
    const gradeDistribution = gradeRows
      .filter((g) => g.grade)
      .map((g) => ({
        grade: g.grade as string,
        minPercentage: 0,
        maxPercentage: 100,
        count: g._count.grade,
        percentage: Math.round((g._count.grade / gradeTotal) * 10000) / 100,
      }));

    const namedLevelPerformance = levelPerformance.map((lp) => {
      const fromSm = classNameById.get(lp.classId);
      const fromAssessment = assessments.find((a) => a.classId === lp.classId)?.class;
      const className =
        fromSm ||
        (fromAssessment ? classLabel(fromAssessment) : null) ||
        lp.classId;
      return { ...lp, className };
    });

    return {
      totalStudents,
      totalClasses,
      totalSubjects,
      totalAssessments,
      marksCompleted: totalAssessments > 0
        ? Math.round((assessmentsWithMarks / totalAssessments) * 10000) / 100
        : 0,
      resultsPublished: results.length > 0 ? Math.round((publishedResults / results.length) * 10000) / 100 : 0,
      schoolAverage: Math.round(schoolAvg * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      levelPerformance: namedLevelPerformance,
      subjectAverages,
      gradeDistribution,
    };
  }

  /** Lightweight class table data — one query path instead of N full report cards. */
  async getClassReportSummaries(
    organizationId: string,
    classId: string,
    academicYear: string,
    term?: string
  ) {
    const cls = await resolveAcademicClass(organizationId, { classId });
    if (!cls) throw new AppError(404, 'Class not found');

    const assessmentWhere: Record<string, unknown> = {
      organizationId,
      classId: cls.id,
      academicYear,
      status: { not: 'DRAFT' },
    };
    if (term) assessmentWhere.term = term;

    const assessments = await prisma.assessment.findMany({
      where: assessmentWhere,
      include: {
        subject: true,
        component: true,
        marks: { where: { markStatus: 'PRESENT' } },
      },
      orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
    });

    if (!assessments.length) {
      return { summaries: [] as Array<Record<string, unknown>>, generatedAt: new Date().toISOString() };
    }

    const primaryTemplateId = await this.resolveReportTemplateId(
      organizationId,
      cls.id,
      academicYear,
      term ?? assessments[0]?.term,
      assessments.map((a) => a.templateId)
    );
    const templateMeta = primaryTemplateId
      ? await prisma.assessmentTemplate.findUnique({
          where: { id: primaryTemplateId },
          include: { components: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
        })
      : null;
    const defaultCourseMarks = Math.max(1, Number(templateMeta?.defaultCourseMarks ?? 100));
    const templateComponents =
      templateMeta?.components.map((c) => ({
        name: c.name,
        weightPercentage: Number(c.weightPercentage ?? 0),
        sortOrder: c.sortOrder,
        code: c.code,
      })) ?? [];

    const classReports = this.buildClassSubjectReportsFromAssessments(assessments, {
      defaultCourseMarks,
      subjectDefaultMarks: new Map(),
      templateComponents,
    });

    const gradingScale = await this.resolveGradingScaleForOrg(organizationId, assessments, {
      name: cls.name,
      stream: cls.stream,
      category: (cls as { category?: string | null }).category ?? null,
    });

    const generatedAt = new Date().toISOString();
    const summaries = [...classReports.entries()].map(([studentId, report]) => {
      const avg = Math.round(report.overallScore * 100) / 100;
      const gradeEntry = this.matchGradeScale(avg, gradingScale);
      const hasMarks = report.subjects.some((s) => s.hasComponentMarks);
      const g = (gradeEntry?.grade ?? '').toUpperCase();
      let result: 'PASS' | 'FAIL' | '—' = '—';
      if (hasMarks && avg > 0) {
        result = g === 'F' || g === 'E' || avg < 50 ? 'FAIL' : 'PASS';
      }
      return {
        studentId,
        average: avg,
        position: report.overallRank,
        classSize: report.overallClassSize,
        overallGrade: gradeEntry?.grade ?? null,
        result,
        hasMarks,
        generatedAt,
      };
    });

    return { summaries, generatedAt };
  }
}

export const gradingEngineService = new GradingEngineService();
