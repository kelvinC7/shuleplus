import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { classService } from './class.service';

const PUBLISHED_STATUSES = ['SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED'] as const;

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
    filters?: { academicYear?: string; term?: string; className?: string }
  ) {
    const student = await prisma.student.findFirst({
      where: {
        organizationId,
        OR: [{ studentCode }, { studentUid: studentCode }],
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

    const enrollment = student?.enrollments[0];
    const enrollmentClassName = enrollment?.class ? classLabel(enrollment.class) : null;
    const classHint = filters?.className?.trim() || enrollmentClassName || undefined;

    const { classId, className } = await resolveClassId(
      organizationId,
      enrollment?.classId,
      classHint
    );

    if (!student && !classId) {
      throw new AppError(404, 'Student not found');
    }

    const filterYear = filters?.academicYear?.trim() ?? '';
    const filterTerm = filters?.term?.trim() ?? '';

    const baseAssessmentWhere = classId
      ? { organizationId, classId, status: { not: 'DRAFT' as const } }
      : null;

    const [markRows, classAssessmentsRaw] = await Promise.all([
      student
        ? prisma.assessmentMark.findMany({
            where: {
              organizationId,
              studentId: student.id,
              score: { not: null },
              assessment: { status: { in: [...PUBLISHED_STATUSES] } },
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

    const publishedIds = new Set(publishedMarks.map((m) => m.assessmentId));

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
        hasPublishedMark: publishedIds.has(a.id),
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
}

export const parentPortalAcademicsService = new ParentPortalAcademicsService();
