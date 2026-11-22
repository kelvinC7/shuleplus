import { WEEK_DAYS } from '@/types';
import { shortCourseCode } from '@/utils/course-code';

const ACTIVE_DAYS = [...WEEK_DAYS].slice(0, 5);

export interface TimetableSummaryLesson {
  className: string;
  subjectName: string;
  teacherUserId: string;
  teacherName: string;
  dayOfWeek: string;
  isExtraActivity?: boolean;
}

export interface CoursePeriodSummary {
  subjectName: string;
  courseCode: string;
  teacherName: string;
  periodsPerWeek: number;
  /** Average periods per active school day for this course. */
  periodsPerDay: number;
  /** Same as periods/week for the selected term (weekly grid × one term). */
  periodsPerTerm: number;
  byDay: Record<string, number>;
}

export interface ClassSummaryCard {
  className: string;
  group: string;
  courseCount: number;
  totalPeriodsWeek: number;
  totalPeriodsTerm: number;
  avgPeriodsPerDay: number;
  teacherCount: number;
  courses: CoursePeriodSummary[];
}

export interface TeacherSummaryCard {
  teacherUserId: string;
  teacherName: string;
  classCount: number;
  courseCount: number;
  totalPeriodsWeek: number;
  totalPeriodsTerm: number;
  avgPeriodsPerDay: number;
  classes: string[];
  courses: CoursePeriodSummary[];
}

export interface ClassCatalogEntry {
  name: string;
  stream?: string | null;
  label?: string | null;
}

export interface ClassStreamMember {
  /** Label exactly as used by timetable rows (e.g. "P6 A"). */
  className: string;
  /** Stream name for display (e.g. "A"). Empty when the class has no stream. */
  stream: string;
}

export interface ClassStreamGroup {
  group: string;
  /** Timetable class labels that belong to this base class. */
  classes: string[];
  /** Ordered stream members, one per distinct stream. */
  members: ClassStreamMember[];
}

/** Compare class labels ignoring case, spacing and separators. */
export function normalizeClassName(className: string): string {
  return className.trim().toLowerCase().replace(/[\s_\-/.]+/g, ' ').trim();
}

function compactClassName(className: string): string {
  return normalizeClassName(className).replace(/\s+/g, '');
}

/**
 * Group "S3 A" / "S3A" / "S3 - A" / "S3 B" under base "S3".
 *
 * Student Management stores the class and its stream separately, so a parsed
 * label is only a fallback. Callers can pass the real catalog to make the
 * grouping exact.
 */
export function classStreamBase(className: string): string {
  const raw = className.trim().replace(/\s+/g, ' ');

  // "P6 A", "P6 - A", "P6/A", "P6.A", "Form 1 A"
  const separated = raw.match(/^(.+?)(?:\s*[-–—_/.]\s*|\s+)([A-Za-z]{1,2})$/);
  if (separated) return separated[1].trim();

  // "P6A" / "S3B"
  const glued = raw.match(/^([A-Za-z]+\d+)([A-Za-z]{1,2})$/);
  if (glued) return glued[1];

  // "6A" / "6B"
  const numeric = raw.match(/^(\d+)([A-Za-z]{1,2})$/);
  if (numeric) return numeric[1];

  return raw;
}

/** Extract the stream part of a label once the base class is known. */
function streamFromLabel(label: string, base: string): string {
  if (normalizeClassName(label) === normalizeClassName(base)) return '';
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = label.match(new RegExp(`^\\s*${escaped}\\s*[-–—_/.]?\\s*(.*)$`, 'i'));
  const remainder = match?.[1]?.trim() ?? '';
  if (remainder && remainder.length <= 24) return remainder;
  return '';
}

/**
 * Build base-class groups.
 *
 * When `catalog` (Student Management classes with separate `name` + `stream`)
 * is supplied, grouping uses those real fields instead of guessing from text.
 * Duplicate labels such as "P6 A" and "P6A" collapse into one stream member;
 * the first label seen wins, so callers should pass timetable row labels first.
 */
export function groupClassesByStream(
  classes: string[],
  catalog: ClassCatalogEntry[] = []
): ClassStreamGroup[] {
  const catalogByLabel = new Map<string, ClassCatalogEntry>();
  for (const entry of catalog) {
    const label = entry.label?.trim() || `${entry.name ?? ''} ${entry.stream ?? ''}`.trim();
    const key = compactClassName(label);
    if (key) catalogByLabel.set(key, entry);
  }

  const baseMap = new Map<string, { group: string; members: Map<string, ClassStreamMember> }>();

  for (const raw of classes) {
    const label = raw?.trim();
    if (!label) continue;

    const entry = catalogByLabel.get(compactClassName(label));
    const base = entry?.name?.trim() || classStreamBase(label);
    if (!base) continue;

    const stream =
      (entry?.stream?.trim() ?? '') || streamFromLabel(label, base);
    const streamKey = stream ? compactClassName(stream) : '';

    const baseKey = normalizeClassName(base);
    let bucket = baseMap.get(baseKey);
    if (!bucket) {
      bucket = { group: base, members: new Map() };
      baseMap.set(baseKey, bucket);
    }
    if (!bucket.members.has(streamKey)) {
      bucket.members.set(streamKey, { className: label, stream });
    }
  }

  return [...baseMap.values()]
    .map(({ group, members }) => {
      const list = [...members.values()].sort((a, b) =>
        a.stream.localeCompare(b.stream, undefined, { numeric: true })
      );
      return { group, classes: list.map((member) => member.className), members: list };
    })
    .sort((a, b) => a.group.localeCompare(b.group, undefined, { numeric: true }));
}

function buildCourseSummaries(
  lessons: TimetableSummaryLesson[],
  courses: Array<{ subjectName: string; courseCode?: string | null }>
): CoursePeriodSummary[] {
  const bySubject = new Map<string, TimetableSummaryLesson[]>();
  for (const lesson of lessons) {
    if (lesson.isExtraActivity) continue;
    const list = bySubject.get(lesson.subjectName) ?? [];
    list.push(lesson);
    bySubject.set(lesson.subjectName, list);
  }

  return [...bySubject.entries()]
    .map(([subjectName, subjectLessons]) => {
      const byDay: Record<string, number> = {};
      for (const day of ACTIVE_DAYS) byDay[day] = 0;
      for (const l of subjectLessons) {
        byDay[l.dayOfWeek] = (byDay[l.dayOfWeek] ?? 0) + 1;
      }
      const periodsPerWeek = subjectLessons.length;
      const daysWithLessons = ACTIVE_DAYS.filter((d) => (byDay[d] ?? 0) > 0).length;
      const periodsPerDay =
        daysWithLessons > 0
          ? Math.round((periodsPerWeek / ACTIVE_DAYS.length) * 10) / 10
          : 0;
      const cfg = courses.find((c) => c.subjectName === subjectName);
      const teachers = [...new Set(subjectLessons.map((l) => l.teacherName).filter(Boolean))];
      return {
        subjectName,
        courseCode: shortCourseCode(cfg?.courseCode, subjectName),
        teacherName: teachers.join(', ') || '—',
        periodsPerWeek,
        periodsPerDay,
        periodsPerTerm: periodsPerWeek,
        byDay,
      };
    })
    .sort((a, b) => b.periodsPerWeek - a.periodsPerWeek || a.subjectName.localeCompare(b.subjectName));
}

export function buildClassSummaries(
  rows: TimetableSummaryLesson[],
  courses: Array<{ subjectName: string; courseCode?: string | null }> = []
): ClassSummaryCard[] {
  const byClass = new Map<string, TimetableSummaryLesson[]>();
  for (const row of rows) {
    if (row.isExtraActivity) continue;
    const list = byClass.get(row.className) ?? [];
    list.push(row);
    byClass.set(row.className, list);
  }

  return [...byClass.entries()]
    .map(([className, lessons]) => {
      const courseSummaries = buildCourseSummaries(lessons, courses);
      const totalPeriodsWeek = lessons.length;
      return {
        className,
        group: classStreamBase(className),
        courseCount: courseSummaries.length,
        totalPeriodsWeek,
        totalPeriodsTerm: totalPeriodsWeek,
        avgPeriodsPerDay: Math.round((totalPeriodsWeek / ACTIVE_DAYS.length) * 10) / 10,
        teacherCount: new Set(lessons.map((l) => l.teacherUserId).filter(Boolean)).size,
        courses: courseSummaries,
      };
    })
    .sort((a, b) => a.className.localeCompare(b.className));
}

export function buildTeacherSummaries(
  rows: TimetableSummaryLesson[],
  courses: Array<{ subjectName: string; courseCode?: string | null }> = []
): TeacherSummaryCard[] {
  const byTeacher = new Map<string, TimetableSummaryLesson[]>();
  for (const row of rows) {
    if (row.isExtraActivity || !row.teacherUserId) continue;
    const list = byTeacher.get(row.teacherUserId) ?? [];
    list.push(row);
    byTeacher.set(row.teacherUserId, list);
  }

  return [...byTeacher.entries()]
    .map(([teacherUserId, lessons]) => {
      const courseSummaries = buildCourseSummaries(lessons, courses);
      const totalPeriodsWeek = lessons.length;
      const classes = [...new Set(lessons.map((l) => l.className))].sort();
      return {
        teacherUserId,
        teacherName: lessons[0]?.teacherName ?? 'Teacher',
        classCount: classes.length,
        courseCount: courseSummaries.length,
        totalPeriodsWeek,
        totalPeriodsTerm: totalPeriodsWeek,
        avgPeriodsPerDay: Math.round((totalPeriodsWeek / ACTIVE_DAYS.length) * 10) / 10,
        classes,
        courses: courseSummaries,
      };
    })
    .sort((a, b) => a.teacherName.localeCompare(b.teacherName));
}
