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

export interface ClassStreamGroup {
  group: string;
  classes: string[];
}

/** Group "S3 A" / "S3A" / "S3 B" under base "S3". */
export function classStreamBase(className: string): string {
  const raw = className.trim();
  const spaced = raw.match(/^(.+?)\s+([A-Za-z])$/);
  if (spaced) return spaced[1].trim();
  const glued = raw.match(/^([A-Za-z]+\d+)([A-Za-z])$/);
  if (glued) return glued[1];
  return raw;
}

export function groupClassesByStream(classes: string[]): ClassStreamGroup[] {
  const map = new Map<string, string[]>();
  for (const c of [...classes].sort()) {
    const base = classStreamBase(c);
    const list = map.get(base) ?? [];
    list.push(c);
    map.set(base, list);
  }
  return [...map.entries()]
    .map(([group, classList]) => ({ group, classes: classList }))
    .sort((a, b) => a.group.localeCompare(b.group));
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
