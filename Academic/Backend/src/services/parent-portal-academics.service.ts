import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { classService } from './class.service';
import { gradingEngineService } from './grading-engine.service';

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

function classLabel(c: { name: string; stream?: string | null; grade?: { name?: string | null } | null }) {
  return [c.name, c.stream].filter(Boolean).join(' ').trim() || c.grade?.name || c.name;
}

function termMatches(a: string, b: string) {
  if (!a || !b) return true;
  return normalize(a) === normalize(b);
}

function yearMatches(a: string, b: string) {
  if (!a || !b) return true;
  return normalize(a) === normalize(b);
}

function pct(score: number, max: number) {
  if (!max) return null;
  return Math.round((score / max) * 1000) / 10;
}

function gradeFromPct(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 80) return 'A';
  if (n >= 75) return 'B+';
  if (n >= 70) return 'B';
  if (n >= 60) return 'B-';
  if (n >= 50) return 'C';
  if (n >= 40) return 'D';
  return 'E';
}

function stripCode(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

function codeEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  const sa = stripCode(a);
  const sb = stripCode(b);
  if (!sa || !sb) return false;
  if (sa === sb) return true;
  const na = sa.replace(/^0+/, '') || sa;
  const nb = sb.replace(/^0+/, '') || sb;
  return na === nb;
}

function nameMatches(
  student: { firstName: string; lastName: string },
  hint: string | null | undefined
): boolean {
  const h = normalize(hint ?? '');
  if (!h) return false;
  const full = normalize(`${student.firstName} ${student.lastName}`);
  return full === h || full.includes(h) || h.includes(full);
}

type StudentWithEnrollment = NonNullable<Awaited<ReturnType<typeof resolveStudentByCode>>>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveStudentByCode(organizationId: string, studentCode: string) {
  const code = studentCode.trim();
  if (!code) return null;
  const or: Array<Record<string, unknown>> = [
    { studentCode: code },
    { studentUid: code },
    { sdmCode: code },
    { studentCode: { equals: code, mode: 'insensitive' } },
    { studentUid: { equals: code, mode: 'insensitive' } },
    { sdmCode: { equals: code, mode: 'insensitive' } },
  ];
  if (UUID_RE.test(code)) {
    or.unshift({ id: code });
  }
  return prisma.student.findFirst({
    where: {
      organizationId,
      OR: or,
    },
    include: {
      enrollments: {
        where: { isCurrent: true },
        include: { class: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
}

/** Resolve learner for parent APIs (code, class, name); may use the student's true school org. */
async function resolveStudentForParent(
  requestedOrganizationId: string,
  studentCode: string,
  hints?: { className?: string; studentName?: string; studentId?: string }
): Promise<{ student: StudentWithEnrollment | null; organizationId: string }> {
  const code = studentCode.trim();
  const linkedId = hints?.studentId?.trim();
  if (linkedId) {
    const byLinked = await resolveStudentByCode(requestedOrganizationId, linkedId);
    if (byLinked) {
      return { student: byLinked, organizationId: byLinked.organizationId };
    }
    const globalLinked = await prisma.student.findFirst({
      where: { id: linkedId },
      include: {
        enrollments: {
          where: { isCurrent: true },
          include: { class: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (globalLinked) {
      return { student: globalLinked, organizationId: globalLinked.organizationId };
    }
  }

  if (!code) {
    return { student: null, organizationId: requestedOrganizationId };
  }

  let student = await resolveStudentByCode(requestedOrganizationId, code);
  if (student) {
    return { student, organizationId: student.organizationId };
  }

  const classHint = hints?.className?.trim();
  if (classHint) {
    const { classId } = await resolveClassId(requestedOrganizationId, null, classHint);
    if (classId) {
      const inClass = await prisma.student.findMany({
        where: {
          organizationId: requestedOrganizationId,
          enrollments: { some: { classId, isCurrent: true } },
        },
        include: {
          enrollments: {
            where: { isCurrent: true },
            include: { class: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        take: 200,
      });
      const byCode = inClass.filter(
        (s) =>
          codeEquals(s.studentCode, code) ||
          codeEquals(s.studentUid, code) ||
          codeEquals(s.sdmCode, code)
      );
      if (byCode.length === 1) {
        return { student: byCode[0]!, organizationId: byCode[0]!.organizationId };
      }
      const nameHint = hints?.studentName?.trim();
      if (nameHint) {
        const byName = inClass.filter((s) => nameMatches(s, nameHint));
        if (byName.length === 1) {
          return { student: byName[0]!, organizationId: byName[0]!.organizationId };
        }
        if (byCode.length && byName.length === 1) {
          const both = byCode.filter((s) => nameMatches(s, nameHint));
          if (both.length === 1) {
            return { student: both[0]!, organizationId: both[0]!.organizationId };
          }
        }
      }
    }
  }

  const pool = await prisma.student.findMany({
    where: {
      OR: [
        { studentCode: { equals: code, mode: 'insensitive' } },
        { studentUid: { equals: code, mode: 'insensitive' } },
        { sdmCode: { equals: code, mode: 'insensitive' } },
      ],
    },
    include: {
      enrollments: {
        where: { isCurrent: true },
        include: { class: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    take: 30,
  });

  let matches = pool.filter(
    (s) =>
      codeEquals(s.studentCode, code) ||
      codeEquals(s.studentUid, code) ||
      codeEquals(s.sdmCode, code)
  );

  if (classHint && matches.length > 1) {
    const hint = normalize(classHint);
    matches = matches.filter((s) => {
      const label = s.enrollments[0]?.class ? classLabel(s.enrollments[0].class) : '';
      const n = normalize(label);
      return n === hint || n.includes(hint) || hint.includes(n);
    });
  }

  const nameHint = hints?.studentName?.trim();
  if (nameHint && matches.length > 1) {
    matches = matches.filter((s) => nameMatches(s, nameHint));
  }

  if (matches.length === 1) {
    student = matches[0]!;
    return { student, organizationId: student.organizationId };
  }

  const inRequested = matches.find((s) => s.organizationId === requestedOrganizationId);
  if (inRequested) {
    return { student: inRequested, organizationId: inRequested.organizationId };
  }

  if (matches[0]) {
    return { student: matches[0], organizationId: matches[0].organizationId };
  }

  return { student: null, organizationId: requestedOrganizationId };
}

async function resolveClassId(
  organizationId: string,
  classId: string | null | undefined,
  classNameHint?: string
): Promise<{ classId: string | null; className: string | null }> {
  if (classId) {
    const row = await prisma.class.findFirst({ where: { id: classId, organizationId } });
    if (row) return { classId: row.id, className: classLabel(row) };
  }
  const hint = classNameHint?.trim();
  if (!hint) return { classId: classId ?? null, className: null };

  const classes = await classService.list(organizationId);
  const target = normalize(hint);
  const match =
    classes.find((c) => normalize(classLabel(c)) === target) ??
    classes.find((c) => normalize(c.name) === target) ??
    classes.find((c) => {
      const label = normalize(classLabel(c));
      return label.startsWith(target) || target.startsWith(label);
    });

  return match
    ? { classId: match.id, className: classLabel(match) }
    : { classId: null, className: hint };
}

export class ParentPortalAcademicsService {
  async getForStudent(
    organizationId: string,
    studentCode: string,
    filters?: {
      academicYear?: string;
      term?: string;
      className?: string;
      studentName?: string;
      studentId?: string;
    }
  ) {
    const resolved = await resolveStudentForParent(organizationId, studentCode, {
      className: filters?.className,
      studentName: filters?.studentName,
      studentId: filters?.studentId,
    });
    let org = resolved.organizationId;
    let student = resolved.student;

    const enrollment = student?.enrollments[0];
    const enrollmentClassName = enrollment?.class ? classLabel(enrollment.class) : null;
    const classHint = filters?.className?.trim() || enrollmentClassName || undefined;

    let { classId, className } = await resolveClassId(org, enrollment?.classId, classHint);
    if (!classId && org !== organizationId) {
      org = organizationId;
      ({ classId, className } = await resolveClassId(org, enrollment?.classId, classHint));
    }
    if (student && student.organizationId !== org) {
      org = student.organizationId;
      ({ classId, className } = await resolveClassId(org, enrollment?.classId, classHint));
    }

    if (!student && !classId) {
      throw new AppError(404, 'Student not found');
    }

    const filterYear = filters?.academicYear?.trim() ?? '';
    const filterTerm = filters?.term?.trim() ?? '';

    const baseAssessmentWhere = classId
      ? { organizationId: org, classId, status: { not: 'DRAFT' as const } }
      : null;

    const parentVisibleAssessmentStatuses = ['APPROVED', 'LOCKED'] as const;

    const [markRows, classAssessmentsRaw] = await Promise.all([
      student
        ? prisma.assessmentMark.findMany({
            where: {
              organizationId: org,
              studentId: student.id,
              score: { not: null },
              assessment: { status: { in: [...parentVisibleAssessmentStatuses] } },
            },
            include: {
              assessment: {
                include: { subject: true, component: true, template: true },
              },
            },
            orderBy: [{ assessment: { assessmentDate: 'desc' } }, { assessment: { title: 'asc' } }],
          })
        : Promise.resolve([]),
      baseAssessmentWhere
        ? prisma.assessment.findMany({
            where: baseAssessmentWhere,
            include: { subject: true, component: true, class: true },
            orderBy: [{ assessmentDate: 'asc' }, { title: 'asc' }],
          })
        : Promise.resolve([]),
    ]);

    const classAssessments = classAssessmentsRaw;

    const yearsSet = new Set<string>();
    const termsByYear = new Map<string, Set<string>>();

    const noteYearTerm = (year: string, term: string) => {
      if (!year) return;
      yearsSet.add(year);
      if (!termsByYear.has(year)) termsByYear.set(year, new Set());
      if (term) termsByYear.get(year)!.add(term);
    };

    if (filterYear) noteYearTerm(filterYear, filterTerm);
    for (const m of markRows) noteYearTerm(m.assessment.academicYear, m.assessment.term);
    for (const a of classAssessments) noteYearTerm(a.academicYear, a.term);

    const years = [...yearsSet].sort((a, b) => b.localeCompare(a));
    const academicYear = filterYear || years[0] || '';
    const termOptions = academicYear
      ? [...(termsByYear.get(academicYear) ?? new Set(filterTerm ? [filterTerm] : []))].sort()
      : filterTerm
        ? [filterTerm]
        : [];
    const term = filterTerm || termOptions[0] || '';

    const inPeriod = (year: string, t: string) =>
      yearMatches(year, academicYear || year) && termMatches(t, term || t);

    const publishedMarks = markRows
      .filter((m) => inPeriod(m.assessment.academicYear, m.assessment.term))
      .map((m) => {
        const a = m.assessment;
        const max = Number(m.maxMark ?? a.maxMark ?? 0);
        const score = Number(m.score);
        const percentage = pct(score, max);
        const kind =
          a.component?.name?.trim() ||
          a.template?.name?.trim() ||
          (a.title.toLowerCase().includes('exam') ? 'Exam' : 'Assessment');
        return {
          id: m.id,
          assessmentId: a.id,
          title: a.title,
          subject: a.subject.name,
          type: kind,
          score,
          maxScore: max,
          percentage,
          grade: gradeFromPct(percentage),
          date: a.assessmentDate?.toISOString() ?? a.publishedAt?.toISOString() ?? null,
          term: a.term,
          academicYear: a.academicYear,
          status: a.status,
          code: a.assessmentCode,
        };
      });

    const studentAssessmentIds = new Set(
      markRows
        .filter((m) => inPeriod(m.assessment.academicYear, m.assessment.term))
        .map((m) => m.assessment.id)
    );

    const schedule = classAssessments
      .filter((a) => inPeriod(a.academicYear, a.term))
      .map((a) => ({
        id: a.id,
        title: a.title,
        subject: a.subject.name,
        type: a.component?.name?.trim() || 'Assessment',
        date: a.assessmentDate?.toISOString() ?? null,
        term: a.term,
        academicYear: a.academicYear,
        status: a.status,
        maxScore: Number(a.maxMark),
        hasPublishedMark: studentAssessmentIds.has(a.id),
        code: a.assessmentCode,
        className: a.class ? classLabel(a.class) : className,
      }));

    return {
      student: {
        id: student?.id ?? '',
        fullName: student
          ? [student.firstName, student.lastName].filter(Boolean).join(' ').trim()
          : '',
        className: className ?? enrollmentClassName,
      },
      filters: {
        academicYear,
        term,
        years: years.length ? years : filterYear ? [filterYear] : [],
        terms: termOptions.length ? termOptions : filterTerm ? [filterTerm] : [],
      },
      publishedMarks,
      schedule,
    };
  }

  async getCoursePerformance(
    organizationId: string,
    studentCode: string,
    filters?: {
      academicYear?: string;
      term?: string;
      className?: string;
      subject?: string;
      studentName?: string;
      studentId?: string;
    }
  ) {
    const resolved = await resolveStudentForParent(organizationId, studentCode, {
      className: filters?.className,
      studentName: filters?.studentName,
      studentId: filters?.studentId,
    });
    const student = resolved.student;
    if (!student) throw new AppError(404, 'Student not found');

    const org = student.organizationId;
    const enrollment = student.enrollments[0];
    const classHint = filters?.className?.trim() || (enrollment?.class ? classLabel(enrollment.class) : undefined);
    const { classId } = await resolveClassId(org, enrollment?.classId, classHint);
    if (!classId) throw new AppError(400, 'Student class could not be resolved');

    const base = await this.getForStudent(organizationId, studentCode, {
      academicYear: filters?.academicYear,
      term: filters?.term,
      className: classHint,
      studentName: filters?.studentName,
      studentId: filters?.studentId,
    });

    const performance = await gradingEngineService.getParentCoursePerformance(org, {
      studentId: student.id,
      classId,
      academicYear: base.filters.academicYear,
      term: base.filters.term || undefined,
      subject: filters?.subject,
    });

    return {
      student: base.student,
      filters: performance.filters,
      assessmentTemplate: performance.assessmentTemplate,
      componentOrder: performance.componentOrder,
      courses: performance.courses,
    };
  }
}

export const parentPortalAcademicsService = new ParentPortalAcademicsService();
