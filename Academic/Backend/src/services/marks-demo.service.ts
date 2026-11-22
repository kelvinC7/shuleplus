import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { fetchTimetableClassCatalog } from '../clients/timetable.client';
import { smListStudents } from '../clients/student-management.client';
import { ensureAcademicStudent, resolveAcademicSubject } from './sm-resolve.service';
import { componentMidTermRole } from '../utils/mid-term-report-components';

export const MARKS_DEMO_TAG = '[marks-demo:v1]';

export type MarksDemoPhase = 'quiz' | 'exam' | 'all';

export type MarksDemoApplyInput = {
  organizationId: string;
  classId?: string;
  className?: string;
  /** When using className, limit to one stream (e.g. "D"). Omit to seed every stream (P1 A, P1 D, …). */
  stream?: string;
  academicYear: string;
  term: string;
  phase?: MarksDemoPhase;
};

export type MarksDemoResult = {
  organizationId: string;
  classId: string;
  className: string;
  academicYear: string;
  term: string;
  phase: MarksDemoPhase;
  templateId: string | null;
  students: number;
  subjects: string[];
  assessmentsCreated: number;
  assessmentsUpdated: number;
  marksWritten: number;
  /** When roster came from another year or current-class fallback (marks still use `academicYear`). */
  rosterNote?: string;
  classesTouched?: string[];
};

function academicYearVariants(year: string): string[] {
  const y = year.trim();
  const out = new Set<string>([y]);
  const range = y.match(/^(\d{4})\s*[-/]\s*(\d{2,4})$/);
  if (range) {
    const start = range[1];
    const endRaw = range[2];
    const end = endRaw.length === 2 ? `${start.slice(0, 2)}${endRaw}` : endRaw;
    for (const v of [`${start}-${end}`, `${start}/${end}`, `${start}-${endRaw}`, start]) {
      out.add(v);
    }
  } else if (/^\d{4}$/.test(y)) {
    out.add(`${y}-${Number(y) + 1}`);
    out.add(`${y}/${Number(y) + 1}`);
  }
  return [...out];
}

async function resolveEnrollmentsForDemo(
  organizationId: string,
  classId: string,
  classLabel: string,
  academicYear: string
) {
  const baseWhere = { organizationId, classId, status: 'ACTIVE' as const };

  for (const y of academicYearVariants(academicYear)) {
    for (const requireCurrent of [true, false] as const) {
      const rows = await prisma.enrollment.findMany({
        where: {
          ...baseWhere,
          academicYear: y,
          ...(requireCurrent ? { isCurrent: true } : {}),
        },
        include: { student: true },
        orderBy: { student: { lastName: 'asc' } },
      });
      if (!rows.length) continue;
      const rosterNote =
        y !== academicYear
          ? `Used ${rows.length} student(s) enrolled in ${y} (format variant of ${academicYear}). Marks saved under ${academicYear}.`
          : requireCurrent
            ? undefined
            : `Used ${rows.length} student(s) enrolled in ${y} (isCurrent=false). Marks saved under ${academicYear}.`;
      return { rows, rosterNote };
    }
  }

  const current = await prisma.enrollment.findMany({
    where: { ...baseWhere, isCurrent: true },
    include: { student: true },
    orderBy: { student: { lastName: 'asc' } },
  });
  if (current.length) {
    const rosterYear = current[0].academicYear;
    return {
      rows: current,
      rosterNote: `No roster for ${academicYear}. Used ${current.length} current student(s) from enrollment year ${rosterYear}. Marks saved under ${academicYear} — use the same year in Report Cards.`,
    };
  }

  const grouped = await prisma.enrollment.groupBy({
    by: ['academicYear'],
    where: { organizationId, classId, status: 'ACTIVE' },
    _count: { _all: true },
  });
  const hint = grouped.length
    ? ` Active enrollments exist for: ${grouped.map((g) => `${g.academicYear} (${g._count._all})`).join(', ')}. Try that --year or enroll students in ${academicYear}.`
    : ' Enroll students in this class first (Academic → Students / Promotion).';

  throw new AppError(404, `No enrollments for class ${classLabel} in ${academicYear}.${hint}`);
}

function demoScore(studentIndex: number, subjectIndex: number, maxMark: number): number {
  const max = Math.max(1, Math.floor(maxMark));
  const spread = Math.max(1, max - 4);
  const raw = 8 + ((studentIndex * 5 + subjectIndex * 7) % spread);
  return Math.min(max, Math.max(1, raw));
}

function componentMaxMark(maxMark: Decimal | null | undefined, fallback: number): number {
  const n = Number(maxMark ?? 0);
  if (Number.isFinite(n) && n > 0) return n;
  return fallback;
}

function pickComponentsForPhase(
  components: Array<{ id: string; name: string; code: string; maxMark: Decimal | null; isActive: boolean }>,
  phase: MarksDemoPhase
) {
  const active = components.filter((c) => c.isActive);
  const continuous = active.filter((c) => componentMidTermRole(c.name, c.code) === 'continuous');
  const exam = active.filter((c) => componentMidTermRole(c.name, c.code) === 'exam');
  const unknown = active.filter((c) => componentMidTermRole(c.name, c.code) === 'unknown');

  if (phase === 'quiz') {
    if (continuous.length) return continuous;
    const nonExam = active.filter((c) => componentMidTermRole(c.name, c.code) !== 'exam');
    return nonExam.length ? nonExam.slice(0, 1) : active.slice(0, 1);
  }
  if (phase === 'exam') {
    if (exam.length) return exam;
    const fromUnknown = unknown.filter((c) => /\bexam\b/i.test(`${c.name} ${c.code}`));
    return fromUnknown.length ? fromUnknown : active.slice(-1);
  }
  const merged = [...continuous, ...exam];
  if (merged.length) return merged;
  return active;
}

async function resolveClass(organizationId: string, classId?: string, className?: string) {
  if (classId?.trim()) {
    const row = await prisma.class.findFirst({ where: { id: classId.trim(), organizationId } });
    if (row) return row;
  }
  const wanted = className?.trim();
  if (wanted) {
    const rows = await prisma.class.findMany({ where: { organizationId } });
    const n = wanted.toLowerCase();
    const hit =
      rows.find((r) => r.name.toLowerCase() === n) ||
      rows.find((r) => [r.name, r.stream].filter(Boolean).join(' ').toLowerCase() === n) ||
      rows.find((r) => r.name.toLowerCase().includes(n));
    if (hit) return hit;
  }
  throw new AppError(404, 'Class not found. Pass --class-id or --class name (e.g. "P1").');
}

async function resolveTargetClasses(
  organizationId: string,
  classId?: string,
  className?: string,
  stream?: string
) {
  if (classId?.trim()) {
    const row = await resolveClass(organizationId, classId, undefined);
    return [row];
  }
  const wanted = className?.trim();
  if (!wanted) {
    throw new AppError(404, 'Pass --class-id or --class name (e.g. "P1").');
  }
  const rows = await prisma.class.findMany({
    where: { organizationId, name: { equals: wanted, mode: 'insensitive' } },
    orderBy: [{ sortOrder: 'asc' }, { stream: 'asc' }],
  });
  if (!rows.length) {
    return [await resolveClass(organizationId, undefined, wanted)];
  }
  if (stream?.trim()) {
    const s = stream.trim();
    const filtered = rows.filter((r) => (r.stream ?? '') === s);
    if (!filtered.length) {
      throw new AppError(
        404,
        `No class "${wanted}" with stream "${s}". Available streams: ${rows.map((r) => r.stream || '(none)').join(', ')}`
      );
    }
    return filtered;
  }
  return rows;
}

function preferStreamClassesOnly<T extends { stream: string | null }>(targets: T[]): T[] {
  const withStream = targets.filter((t) => t.stream);
  return withStream.length ? withStream : targets;
}

async function resolveStudentsForDemoClass(
  organizationId: string,
  cls: { id: string; name: string; stream: string | null },
  academicYear: string,
  classLabel: string
) {
  try {
    const resolved = await resolveEnrollmentsForDemo(organizationId, cls.id, classLabel, academicYear);
    const seen = new Set<string>();
    const fromEnroll = resolved.rows
      .map((e) => e.student)
      .filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
    if (fromEnroll.length) {
      return { students: fromEnroll, rosterNote: resolved.rosterNote };
    }
  } catch {
    /* fall back to SM roster */
  }

  type SmRow = { id: string; studentCode?: string; fullName?: string; gender?: string | null };
  const smRows = (await smListStudents(organizationId, {
    classId: cls.id,
    className: classLabel,
    academicYear,
    status: 'ACTIVE',
  }).catch(() => [])) as SmRow[];

  const students: Awaited<ReturnType<typeof ensureAcademicStudent>>[] = [];
  const seen = new Set<string>();
  for (const row of smRows) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    students.push(
      await ensureAcademicStudent(organizationId, {
        studentId: row.id,
        studentCode: row.studentCode,
        fullName: row.fullName,
        gender: row.gender,
      })
    );
  }
  if (students.length) {
    return {
      students,
      rosterNote: `Used ${students.length} Student Management roster student(s) for ${classLabel} (no Academic enrollments for ${academicYear}).`,
    };
  }
  return { students: [], rosterNote: undefined };
}

function termVariants(term: string): string[] {
  const t = term.trim();
  const out = new Set<string>([t]);
  const roman: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4 };
  const m = t.match(/(?:term\s*)?(\d+|iv|i{1,3})\b/i);
  if (m) {
    const token = m[1].toLowerCase();
    const n = roman[token] ?? Number(token);
    if (n >= 1 && n <= 4) {
      out.add(`Term ${n}`);
      out.add(`TERM ${n}`);
      out.add(`Term ${['I', 'II', 'III', 'IV'][n - 1]}`);
    }
  }
  return [...out];
}

type TemplateComponents = Array<{
  id: string;
  name: string;
  code: string;
  maxMark: Decimal | null;
  isActive: boolean;
}>;

async function loadTemplateWithComponents(templateId: string): Promise<TemplateComponents> {
  const row = await prisma.assessmentTemplate.findUnique({
    where: { id: templateId },
    include: { components: { orderBy: { sortOrder: 'asc' } } },
  });
  return row?.components ?? [];
}

async function resolveTemplateId(
  organizationId: string,
  classId: string,
  academicYear: string,
  term: string
): Promise<{ templateId: string | null; components: TemplateComponents }> {
  const years = academicYearVariants(academicYear);
  const terms = termVariants(term);

  for (const y of years) {
    for (const tm of terms) {
      const assigned = await prisma.templateAssignment.findFirst({
        where: {
          classId,
          academicYear: y,
          term: tm,
          status: 'ACTIVE',
          template: { organizationId, status: 'ACTIVE' },
        },
        orderBy: { assignedAt: 'desc' },
        include: {
          template: {
            include: { components: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      });
      if (assigned?.template?.components?.length) {
        return { templateId: assigned.templateId, components: assigned.template.components };
      }
    }
  }

  const anyAssignment = await prisma.templateAssignment.findFirst({
    where: {
      classId,
      status: 'ACTIVE',
      template: { organizationId, status: 'ACTIVE' },
    },
    orderBy: { assignedAt: 'desc' },
    include: {
      template: {
        include: { components: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });
  if (anyAssignment?.template?.components?.length) {
    return { templateId: anyAssignment.templateId, components: anyAssignment.template.components };
  }

  for (const y of years) {
    for (const tm of terms) {
      const fallback = await prisma.assessmentTemplate.findFirst({
        where: { organizationId, academicYear: y, term: tm, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        include: { components: { orderBy: { sortOrder: 'asc' } } },
      });
      if (fallback?.components?.length) {
        return { templateId: fallback.id, components: fallback.components };
      }
    }
  }

  const orgTemplate = await prisma.assessmentTemplate.findFirst({
    where: {
      organizationId,
      status: 'ACTIVE',
      components: { some: { isActive: true } },
    },
    orderBy: { updatedAt: 'desc' },
    include: { components: { orderBy: { sortOrder: 'asc' } } },
  });
  if (orgTemplate?.components?.length) {
    return { templateId: orgTemplate.id, components: orgTemplate.components };
  }

  return { templateId: null, components: [] };
}

async function listCatalogSubjects(
  organizationId: string,
  cls: { id: string; name: string; stream: string | null },
  academicYear: string,
  term: string
): Promise<string[]> {
  try {
    const catalog = await fetchTimetableClassCatalog(organizationId, { academicYear, term });
    const label = [cls.name, cls.stream].filter(Boolean).join(' ').trim().toLowerCase();
    const row =
      catalog.find((c) => c.classId === cls.id) ||
      catalog.find((c) => c.className.trim().toLowerCase() === label) ||
      catalog.find((c) => c.className.trim().toLowerCase() === cls.name.toLowerCase());
    const names = (row?.courses ?? [])
      .map((c) => String(c.subjectName ?? '').trim())
      .filter(Boolean);
    if (names.length) return [...new Set(names)];
  } catch {
    /* optional */
  }
  return [];
}

function demoDescription(phase: MarksDemoPhase, componentCode: string) {
  return `${MARKS_DEMO_TAG} phase=${phase} component=${componentCode}`;
}

export class MarksDemoService {
  async status(organizationId: string, classId?: string) {
    const where: { organizationId: string; description: { contains: string }; classId?: string } = {
      organizationId,
      description: { contains: MARKS_DEMO_TAG },
    };
    if (classId) where.classId = classId;

    const assessments = await prisma.assessment.findMany({
      where,
      select: {
        id: true,
        title: true,
        classId: true,
        term: true,
        academicYear: true,
        status: true,
        _count: { select: { marks: true } },
      },
    });
    return {
      enabled: assessments.length > 0,
      assessmentCount: assessments.length,
      markRows: assessments.reduce((n, a) => n + a._count.marks, 0),
      assessments,
    };
  }

  async remove(organizationId: string, classId?: string) {
    const where: { organizationId: string; description: { contains: string }; classId?: string } = {
      organizationId,
      description: { contains: MARKS_DEMO_TAG },
    };
    if (classId) where.classId = classId;

    const ids = (await prisma.assessment.findMany({ where, select: { id: true } })).map((a) => a.id);
    if (!ids.length) {
      return { deletedAssessments: 0 };
    }
    const deleted = await prisma.assessment.deleteMany({ where: { id: { in: ids } } });
    return { deletedAssessments: deleted.count };
  }

  async apply(input: MarksDemoApplyInput): Promise<MarksDemoResult> {
    const phase = input.phase ?? 'quiz';
    const organizationId = input.organizationId.trim();
    const academicYear = input.academicYear.trim();
    const term = input.term.trim();

    let targets = await resolveTargetClasses(
      organizationId,
      input.classId,
      input.className,
      input.stream
    );
    if (!input.classId?.trim()) {
      targets = preferStreamClassesOnly(targets);
    }

    let assessmentsCreated = 0;
    let assessmentsUpdated = 0;
    let marksWritten = 0;
    let totalStudents = 0;
    let templateId: string | null = null;
    let rosterNote: string | undefined;
    const classesTouched: string[] = [];
    let subjectNamesOut: string[] = [];

    for (const cls of targets) {
      const classLabel = [cls.name, cls.stream].filter(Boolean).join(' ');
      classesTouched.push(classLabel);

      const { students, rosterNote: rn } = await resolveStudentsForDemoClass(
        organizationId,
        cls,
        academicYear,
        classLabel
      );
      if (!rosterNote && rn) rosterNote = rn;
      if (!students.length) continue;

      totalStudents += students.length;

      const resolved = await resolveTemplateId(organizationId, cls.id, academicYear, term);
      templateId = resolved.templateId;
      const picked = pickComponentsForPhase(resolved.components, phase);
      if (!picked.length) {
        throw new AppError(
          404,
          'No assessment template components found. In Academic → Assessment templates, activate a template with Quiz/CAT and Exam components, assign it to this class (Assignments), then retry.'
        );
      }

      let subjectNames = await listCatalogSubjects(organizationId, cls, academicYear, term);
      if (!subjectNames.length) {
        const existing = await prisma.assessment.findMany({
          where: { organizationId, classId: cls.id, academicYear, term },
          distinct: ['subjectId'],
          include: { subject: true },
        });
        subjectNames = existing.map((a) => a.subject.name);
      }
      if (!subjectNames.length) {
        const subs = await prisma.subject.findMany({
          where: { organizationId },
          take: 8,
          orderBy: { name: 'asc' },
        });
        subjectNames = subs.map((s) => s.name);
      }
      if (!subjectNames.length) continue;

      subjectNamesOut = subjectNames;

      const subjects: Array<{ id: string; name: string }> = [];
      for (const name of subjectNames) {
        const sub = await resolveAcademicSubject(organizationId, { subjectName: name });
        if (!sub) continue;
        subjects.push({ id: sub.id, name: sub.name });
      }
      if (!subjects.length) continue;

      for (let si = 0; si < subjects.length; si++) {
        const subject = subjects[si];
        for (const component of picked) {
          const desc = demoDescription(phase, component.code);
          const maxMark =
            phase === 'quiz'
              ? componentMaxMark(component.maxMark, 20)
              : componentMaxMark(component.maxMark, 40);

          let assessment = await prisma.assessment.findFirst({
            where: {
              organizationId,
              classId: cls.id,
              subjectId: subject.id,
              componentId: component.id,
              academicYear,
              term,
              description: { contains: MARKS_DEMO_TAG },
            },
          });

          if (!assessment) {
            assessment = await prisma.assessment.create({
              data: {
                organizationId,
                templateId: resolved.templateId,
                componentId: component.id,
                subjectId: subject.id,
                classId: cls.id,
                title: `${component.name} — ${subject.name} (Demo)`,
                assessmentCode: `DEMO-${component.code}-${subject.id.slice(0, 8)}`,
                description: desc,
                academicYear,
                term,
                maxMark,
                assessmentDate: new Date(),
                status: 'SUBMITTED',
                createdBy: 'marks-demo',
              },
            });
            assessmentsCreated++;
          } else {
            assessment = await prisma.assessment.update({
              where: { id: assessment.id },
              data: {
                maxMark,
                status: 'SUBMITTED',
                description: desc,
              },
            });
            assessmentsUpdated++;
          }

          for (let st = 0; st < students.length; st++) {
            const student = students[st];
            const score = demoScore(st, si, maxMark);
            await prisma.assessmentMark.upsert({
              where: {
                assessmentId_studentId: { assessmentId: assessment.id, studentId: student.id },
              },
              create: {
                organizationId,
                assessmentId: assessment.id,
                studentId: student.id,
                score,
                maxMark,
                markStatus: 'PRESENT',
                enteredBy: 'marks-demo',
                enteredAt: new Date(),
              },
              update: {
                score,
                maxMark,
                markStatus: 'PRESENT',
                lastModifiedBy: 'marks-demo',
                lastModifiedAt: new Date(),
              },
            });
            marksWritten++;
          }
        }
      }
    }

    if (!marksWritten) {
      throw new AppError(
        404,
        `No demo marks written. Check enrollments for ${classesTouched.join(', ') || 'class'} in ${academicYear}.`
      );
    }

    const first = targets[0];
    const classLabel = classesTouched.length > 1 ? `${first.name} (${classesTouched.length} streams)` : classesTouched[0] ?? first.name;

    return {
      organizationId,
      classId: first.id,
      className: classLabel,
      academicYear,
      term,
      phase,
      templateId,
      students: totalStudents,
      subjects: subjectNamesOut,
      assessmentsCreated,
      assessmentsUpdated,
      marksWritten,
      rosterNote,
      classesTouched,
    };
  }
}

export const marksDemoService = new MarksDemoService();
