import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { resolveActiveStudent } from './parent-context.service';
import { academicsApi, StudentAcademics, MarkRecord } from './academics-api';
import { academicModuleApi, ParentMarkRecord, ParentScheduleItem } from './academic-module-api';
import type { StudentSelector } from '../utils/student-param';
import { resolveSchoolAcademicPeriod } from './iam-api';

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
  /** Raw SM exam mark rows before merge (internal). */
  smMarkRecords?: MarkRecord[];
  smYears?: string[];
  smTermsByYear?: Record<string, string[]>;
}

export class AcademicService {
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

    let sm: StudentAcademics | null = null;
    try {
      sm = await academicsApi.getStudentAcademics(organizationId, student.shuleCode);
    } catch (error) {
      console.warn(
        `[academic] Student Management module unreachable (${(error as Error).message}); falling back to local data`
      );
    }

    let modulePayload = null;
    if (academicModuleApi.enabled()) {
      try {
        modulePayload = await academicModuleApi.getParentAcademics(
          student.organizationId || organizationId,
          student.shuleCode,
          query?.academicYear,
          query?.term,
          student.className || undefined
        );
      } catch (error) {
        console.warn(`[academic] Academic module unreachable (${(error as Error).message})`);
      }
    }

    if (!sm && !modulePayload) {
      const local = await this.fallbackLocal(organizationId, student.id);
      const schoolPeriod = await resolveSchoolAcademicPeriod(organizationId, query);
      return this.mergePayloads(local, null, query, schoolPeriod);
    }

    const smMapped = sm ? this.mapRemote(sm) : this.emptyResponse();
    const schoolPeriod = await resolveSchoolAcademicPeriod(organizationId, query);
    return this.mergePayloads(smMapped, modulePayload, query, schoolPeriod);
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
      (!academicYear || year === academicYear) && (!term || t === term);

    const smMarks: ParentMarkRecord[] = (sm.smMarkRecords ?? []).map((m) => ({
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

    const moduleMarks = modulePayload?.publishedMarks ?? [];
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
    const [terms, student] = await Promise.all([
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

    const upcomingExams = await prisma.exam.findMany({
      where: { studentId, date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 8,
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
