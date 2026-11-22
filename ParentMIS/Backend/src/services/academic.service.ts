import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { resolveActiveStudent, resolveParentContext } from './parent-context.service';
import { academicsApi, StudentAcademics, MarkRecord } from './academics-api';
import {
  academicModuleApi,
  ParentCoursePerformancePayload,
  ParentMarkRecord,
  ParentScheduleItem,
} from './academic-module-api';
import type { StudentSelector } from '../utils/student-param';
import { resolveSchoolAcademicPeriod } from './iam-api';
import { academicTermsEqual, academicYearsEqual } from '../utils/academic-match';
import { feesApi } from './fees-api';

export interface ParentMarksFilters {
  academicYear: string;
  term: string;
  years: string[];
  terms: string[];
}

export interface ParentAcademicsResponse {
  student: { id: string; fullName: string; className: string; stream: string };
  terms: Array<{
    term: string;
    academicYear: string;
    gpa: number;
    classRank: number;
    totalStudents: number;
    subjects: Array<{
      subject: string;
      ca: number;
      exam: number;
      total: number;
      grade: string;
      rank: number;
    }>;
  }>;
  upcomingExams: Array<{
    id: string;
    subject: string;
    date: string;
    type: string;
    term?: string;
    academicYear?: string;
    status?: string;
  }>;
  publishedMarks: ParentMarkRecord[];
  schedule: ParentScheduleItem[];
  filters: ParentMarksFilters;
  schoolAcademic?: {
    academicYears: string[];
    terms: string[];
    currentAcademicYear: string | null;
    currentTerm: string | null;
  };
  /** Pay-to-view state for the Marks tab (mirrors report-card fee access). */
  marksLocked?: boolean;
  marksAccessMessage?: string | null;
  marksBalance?: number;
  marksPaymentStatus?: string;
  /** Raw SM exam mark rows before merge (internal). */
  smMarkRecords?: MarkRecord[];
  smYears?: string[];
  smTermsByYear?: Record<string, string[]>;
}

function studentDisplayName(student: { firstName: string; lastName: string }) {
  return [student.firstName, student.lastName].filter(Boolean).join(' ').trim();
}

function academicStudentCodes(student: { id: string; shuleCode: string }) {
  return [...new Set([student.id, student.shuleCode].map((c) => c?.trim()).filter(Boolean))];
}

function academicModuleOpts(
  student: { id: string; shuleCode: string; firstName: string; lastName: string; className: string | null },
  query?: { academicYear?: string; term?: string; subject?: string }
) {
  return {
    academicYear: query?.academicYear,
    term: query?.term,
    className: student.className || undefined,
    studentName: studentDisplayName(student),
    studentId: student.id,
    subject: query?.subject,
  };
}

export class AcademicService {
  private async schoolOrganizationId(
    organizationId: string,
    parentId: string,
    requestedStudentId?: StudentSelector
  ) {
    const ctx = await resolveParentContext(organizationId, parentId, requestedStudentId);
    return ctx.organizationId;
  }

  private async fetchAcademicModuleForStudent(
    schoolOrg: string,
    student: { id: string; shuleCode: string; firstName: string; lastName: string; className: string | null },
    query?: { academicYear?: string; term?: string }
  ) {
    const opts = academicModuleOpts(student, query);
    const codes = academicStudentCodes(student);
    let lastError: Error | null = null;
    for (const code of codes) {
      try {
        return await academicModuleApi.getParentAcademics(schoolOrg, code, opts);
      } catch (error) {
        lastError = error as Error;
      }
    }
    if (lastError) throw lastError;
    return null;
  }

  async list(
    organizationId: string,
    parentId: string,
    requestedStudentId?: StudentSelector,
    query?: { academicYear?: string; term?: string }
  ): Promise<ParentAcademicsResponse> {
    let student;
    try {
      student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);
    } catch (error) {
      if (error instanceof AppError && (error.statusCode === 403 || error.statusCode === 404)) {
        return this.emptyResponse();
      }
      throw error;
    }

    const smPromise = (async () => {
      try {
        return await academicsApi.getStudentAcademics(organizationId, student.shuleCode);
      } catch (error) {
        console.warn(
          `[academic] Student Management module unreachable (${(error as Error).message}); falling back to local data`
        );
        return null;
      }
    })();

    const modulePromise = (async () => {
      if (!academicModuleApi.enabled()) return null;
      try {
        const schoolOrg = await this.schoolOrganizationId(organizationId, parentId, requestedStudentId);
        return await this.fetchAcademicModuleForStudent(schoolOrg, student, query);
      } catch (error) {
        console.warn(`[academic] Academic module unreachable (${(error as Error).message})`);
        return null;
      }
    })();

    const [sm, modulePayload, schoolPeriod] = await Promise.all([
      smPromise,
      modulePromise,
      resolveSchoolAcademicPeriod(organizationId, query).catch(() => undefined),
    ]);

    let result: ParentAcademicsResponse;
    if (!sm && !modulePayload) {
      const local = await this.fallbackLocal(organizationId, student.id);
      result = this.mergePayloads(local, null, query, schoolPeriod);
    } else {
      const smMapped = sm ? this.mapRemote(sm) : this.emptyResponse();
      result = this.mergePayloads(smMapped, modulePayload, query, schoolPeriod);
    }
    return await this.applyMarksFeeLock(organizationId, parentId, requestedStudentId, student, result);
  }

  /** Hide individual marks for terms whose report is pay-to-view and not yet paid. Fail open on upstream errors. */
  private async applyMarksFeeLock(
    organizationId: string,
    parentId: string,
    requestedStudentId: StudentSelector | undefined,
    student: { id: string; shuleCode: string; className: string | null },
    result: ParentAcademicsResponse
  ): Promise<ParentAcademicsResponse> {
    const academicYear = result.filters?.academicYear;
    const term = result.filters?.term;
    if (!academicYear || !term || !result.publishedMarks?.length) return result;
    try {
      const org = await this.schoolOrganizationId(organizationId, parentId, requestedStudentId);
      const access = await feesApi.getReportCardAccess(org, {
        studentId: student.id,
        studentCode: student.shuleCode,
        className: student.className || undefined,
        academicYear,
        term,
      });
      if (access.allowed === false) {
        return {
          ...result,
          publishedMarks: [],
          marksLocked: true,
          marksAccessMessage:
            access.message || 'Pay to view marks for this term. See the Reports tab for details.',
          marksBalance: access.balance,
          marksPaymentStatus: access.paymentStatus,
        };
      }
    } catch (error) {
      console.warn(`[academic] marks fee-access check unavailable: ${(error as Error).message}`);
    }
    return result;
  }

  private emptyResponse(): ParentAcademicsResponse {
    return {
      student: { id: '', fullName: '', className: '', stream: '' },
      terms: [],
      upcomingExams: [],
      publishedMarks: [],
      schedule: [],
      filters: { academicYear: '', term: '', years: [], terms: [] },
    };
  }

  private mergePayloads(
    sm: ParentAcademicsResponse,
    modulePayload: Awaited<ReturnType<typeof academicModuleApi.getParentAcademics>> | null,
    query?: { academicYear?: string; term?: string },
    schoolPeriod?: Awaited<ReturnType<typeof resolveSchoolAcademicPeriod>>
  ): ParentAcademicsResponse {
    const yearsSet = new Set<string>();
    const termsByYear = new Map<string, Set<string>>();

    const note = (year: string, term: string) => {
      if (!year) return;
      yearsSet.add(year);
      if (!termsByYear.has(year)) termsByYear.set(year, new Set());
      if (term) termsByYear.get(year)!.add(term);
    };

    for (const y of sm.smYears ?? sm.filters?.years ?? []) note(y, '');
    if (sm.smTermsByYear) {
      for (const [y, termList] of Object.entries(sm.smTermsByYear)) {
        for (const t of termList) note(y, t);
      }
    }
    for (const t of sm.terms) note(t.academicYear, t.term);
    if (modulePayload) {
      for (const y of modulePayload.filters.years) note(y, '');
      for (const t of modulePayload.filters.terms) note(modulePayload.filters.academicYear, t);
    }

    for (const y of schoolPeriod?.settings.academicYears ?? []) note(y, '');
    for (const t of schoolPeriod?.settings.terms ?? []) {
      const y = schoolPeriod?.settings.currentAcademicYear ?? schoolPeriod?.settings.academicYears[0];
      if (y) note(y, t);
    }

    const years = [...yearsSet].sort((a, b) => b.localeCompare(a));
    const schoolYears =
      schoolPeriod?.settings.academicYears?.length ? schoolPeriod.settings.academicYears : years;
    const mergedYears = [...new Set([...schoolYears, ...years])].sort((a, b) => b.localeCompare(a));

    const academicYear =
      query?.academicYear && mergedYears.includes(query.academicYear)
        ? query.academicYear
        : schoolPeriod?.academicYear ||
          modulePayload?.filters.academicYear ||
          mergedYears[0] ||
          '';
    const termOptionsRaw = academicYear
      ? [...(termsByYear.get(academicYear) ?? new Set<string>())]
      : [];
    const termOptions = (
      termOptionsRaw.length ? termOptionsRaw : schoolPeriod?.settings.terms ?? modulePayload?.filters.terms ?? []
    ).sort();
    const term =
      query?.term && termOptions.includes(query.term)
        ? query.term
        : schoolPeriod?.term || modulePayload?.filters.term || termOptions[0] || '';

    const inPeriod = (year: string, t: string) =>
      academicYearsEqual(year, academicYear) && academicTermsEqual(t, term);

    const isParentVisibleMarkStatus = (status?: string | null) => {
      const s = String(status ?? '').toUpperCase();
      // Only show marks that have been academically approved/published to parents.
      // Defensive filter: upstream modules may include submitted/reviewed records.
      return ['APPROVED', 'LOCKED', 'PUBLISHED', 'FINALIZED', 'RELEASED', 'COMPLETED', 'IN_PROGRESS'].includes(s);
    };

    const smMarks: ParentMarkRecord[] = (sm.smMarkRecords ?? [])
      .filter((m) => isParentVisibleMarkStatus((m as any).status))
      .map((m) => ({
        id: m.id,
        title: m.title,
        subject: m.subject,
        type: m.type,
        score: m.score,
        maxScore: m.maxScore,
        percentage: m.percentage,
        grade: m.grade,
        date: m.date,
        term: m.term,
        academicYear: m.academicYear,
        status: m.status,
      }));

    const moduleMarks = (modulePayload?.publishedMarks ?? []).filter((m) =>
      isParentVisibleMarkStatus(m.status)
    );
    const publishedMarks = [...moduleMarks, ...smMarks]
      .filter((m) => inPeriod(m.academicYear, m.term))
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

    const scheduleFromSm: ParentScheduleItem[] = sm.upcomingExams
      .filter((e) => inPeriod(e.academicYear ?? '', e.term ?? ''))
      .map((e) => ({
        id: e.id,
        title: e.subject,
        subject: e.subject,
        type: e.type,
        date: e.date,
        term: e.term ?? '',
        academicYear: e.academicYear ?? academicYear,
        status: e.status ?? 'UPCOMING',
        maxScore: 0,
        hasPublishedMark: false,
      }));

    const schedule = [...(modulePayload?.schedule ?? []), ...scheduleFromSm].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db;
    });

    const student = modulePayload?.student ?? sm.student;

    return {
      student: {
        id: student.id,
        fullName: student.fullName ?? '',
        className: student.className ?? '',
        stream: sm.student.stream ?? '',
      },
      terms: sm.terms.filter((t) => inPeriod(t.academicYear, t.term)),
      upcomingExams: sm.upcomingExams.filter((e) =>
        inPeriod(e.academicYear ?? '', e.term ?? '')
      ),
      publishedMarks,
      schedule,
      filters: { academicYear, term, years: mergedYears, terms: termOptions },
      schoolAcademic: schoolPeriod
        ? {
            academicYears: schoolPeriod.settings.academicYears,
            terms: schoolPeriod.settings.terms,
            currentAcademicYear: schoolPeriod.settings.currentAcademicYear,
            currentTerm: schoolPeriod.settings.currentTerm,
          }
        : undefined,
    } satisfies ParentAcademicsResponse;
  }

  private mapRemote(data: StudentAcademics): ParentAcademicsResponse {
    return {
      student: {
        id: data.student.id,
        fullName: data.student.fullName ?? '',
        className: data.student.className ?? '',
        stream: data.student.stream ?? '',
      },
      terms: data.terms.map((t) => ({
        term: t.term,
        academicYear: t.academicYear,
        gpa: t.gpa,
        classRank: t.classRank,
        totalStudents: t.totalStudents,
        subjects: t.subjects.map((s) => ({
          subject: s.subject,
          ca: s.ca,
          exam: s.exam,
          total: s.total,
          grade: s.grade,
          rank: s.rank,
        })),
      })),
      upcomingExams: data.upcomingExams.map((e) => ({
        id: e.id,
        subject: e.subject,
        date: e.date,
        type: e.type,
        term: e.term,
        academicYear: e.academicYear,
        status: e.status,
      })),
      smMarkRecords: data.markRecords,
      smYears: data.filters?.years,
      smTermsByYear: data.filters?.termsByYear,
      publishedMarks: [],
      schedule: [],
      filters: {
        academicYear: '',
        term: '',
        years: data.filters?.years ?? [],
        terms: [],
      },
    };
  }

  private async fallbackLocal(organizationId: string, studentId: string): Promise<ParentAcademicsResponse> {
    const [terms, student, upcomingExams] = await Promise.all([
      prisma.term.findMany({
        where: { organizationId },
        include: {
          grades: {
            where: { studentId },
            orderBy: { rank: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.student.findUnique({ where: { id: studentId } }),
      prisma.exam.findMany({
        where: { studentId, date: { gte: new Date() } },
        orderBy: { date: 'asc' },
        take: 8,
      }),
    ]);

    if (!student) throw new AppError(404, 'Student profile not found');

    const totalStudents = 42;
    const termsData = terms.map((term) => {
      const subjects = term.grades.map((g) => ({
        subject: g.subjectName,
        ca: g.ca,
        exam: g.exam,
        total: g.total,
        grade: g.grade ?? gradeFromScore(g.total),
        rank: g.rank ?? 0,
      }));
      const gpa = subjects.length
        ? Math.round((subjects.reduce((s, x) => s + x.total, 0) / subjects.length / 25) * 10) / 10
        : 0;
      const classRank = subjects.length ? Math.min(...subjects.map((s) => s.rank || 99)) : 0;
      return {
        term: term.name,
        academicYear: term.academicYear ?? '',
        gpa,
        classRank,
        totalStudents,
        subjects,
      };
    });

    return {
      student: {
        id: student.id,
        fullName: `${student.firstName} ${student.lastName}`,
        className: student.className ?? '',
        stream: student.stream ?? '',
      },
      terms: termsData,
      upcomingExams: upcomingExams.map((e) => ({
        id: e.id,
        subject: e.subject,
        date: e.date.toISOString(),
        type: e.type,
      })),
      publishedMarks: [],
      schedule: [],
      filters: { academicYear: '', term: '', years: [], terms: [] },
    };
  }

  async getCoursePerformance(
    organizationId: string,
    parentId: string,
    requestedStudentId: StudentSelector | undefined,
    query: { academicYear?: string; term?: string; subject?: string }
  ): Promise<ParentCoursePerformancePayload> {
    const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);
    const org = await this.schoolOrganizationId(organizationId, parentId, requestedStudentId);
    const perfOpts = academicModuleOpts(student, query);

    if (academicModuleApi.enabled()) {
      let lastErr: string | null = null;
      for (const code of academicStudentCodes(student)) {
        try {
          return await academicModuleApi.getParentCoursePerformance(org, code, perfOpts);
        } catch (error) {
          lastErr = (error as Error).message;
        }
      }
      if (lastErr) {
        console.warn(
          `[academic] course-performance via Academic module failed (${lastErr}); using marks feed`
        );
      }
    }

    const bundle = await this.list(organizationId, parentId, requestedStudentId, query);
    return this.coursePerformanceFromMarksBundle(bundle, student.id, query.subject);
  }

  private coursePerformanceFromMarksBundle(
    bundle: ParentAcademicsResponse,
    studentId: string,
    subjectFilter?: string
  ): ParentCoursePerformancePayload {
    const norm = (s: string) => s.trim().toLowerCase();
    const bySubject = new Map<string, ParentMarkRecord[]>();
    for (const m of bundle.publishedMarks) {
      if (!bySubject.has(m.subject)) bySubject.set(m.subject, []);
      bySubject.get(m.subject)!.push(m);
    }

    let courses = [...bySubject.entries()].map(([subjectName, marks]) => ({
      subjectId: subjectName,
      subjectName,
      defaultCourseMarks: 100,
      totalScore: 0,
      totalMax: 100,
      percentage: 0,
      grade: marks[0]?.grade ?? null,
      gradeDescription: null,
      marksEntered: marks.length > 0,
      courseComplete: false,
      missingComponents: [] as string[],
      categoryScores: {},
      rank: null,
      classSize: null,
      teacherMarks: marks.map((m) => ({
        id: m.id,
        assessmentId: m.assessmentId ?? m.id,
        title: m.title,
        componentName: m.type,
        subjectId: subjectName,
        subjectName: m.subject,
        score: m.score,
        maxMark: m.maxScore,
        percentage: m.percentage ?? 0,
        date: m.date,
        assessmentStatus: m.status,
        code: null,
      })),
    }));

    if (subjectFilter?.trim()) {
      courses = courses.filter((c) => norm(c.subjectName) === norm(subjectFilter));
    }

    return {
      student: {
        id: studentId || bundle.student.id,
        fullName: bundle.student.fullName,
        className: bundle.student.className,
      },
      filters: {
        academicYear: bundle.filters.academicYear,
        term: bundle.filters.term,
      },
      assessmentTemplate: null,
      componentOrder: [],
      courses,
    };
  }
}

function gradeFromScore(total: number): string {
  if (total >= 80) return 'A';
  if (total >= 75) return 'B+';
  if (total >= 70) return 'B';
  if (total >= 60) return 'B-';
  if (total >= 50) return 'C';
  if (total >= 40) return 'D';
  return 'E';
}

export const academicService = new AcademicService();
