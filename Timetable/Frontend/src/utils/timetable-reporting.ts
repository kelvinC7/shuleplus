import type {
  CourseConfig,
  CoverageItem,
  PeriodSlotDefinition,
  TeacherProfile,
  TimetableRow,
} from '@/types';
import { WEEK_DAYS } from '@/types';
import {
  classStreamBase,
  groupClassesByStream,
  type ClassCatalogEntry,
} from '@/utils/timetable-summary';

export interface WorkloadThresholds {
  /** Per-teacher period count at which the teacher is considered high load. */
  high: number;
  /** Per-teacher period count at which the teacher is considered overloaded. */
  overloaded: number;
}

export const DEFAULT_WORKLOAD_THRESHOLDS: WorkloadThresholds = {
  high: 25,
  overloaded: 30,
};

export type TeacherLoadStatus = 'normal' | 'high' | 'overloaded';

export interface TeacherWorkloadSlot {
  key: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  periodLabel: string;
  subjectName: string;
  className: string;
  room: string | null;
  courseCode: string | null;
  rowIds: string[];
}

export interface TeacherWorkloadRow {
  teacherUserId: string;
  teacherName: string;
  employeeNumber: string | null;
  position: string | null;
  loginEmail: string | null;
  loginPhone: string | null;
  department: string;
  departmentSource: 'subject' | 'position' | 'default';
  totalPeriods: number;
  classCount: number;
  subjectCount: number;
  classes: string[];
  subjects: string[];
  dailyPeriods: Record<string, number>;
  slots: TeacherWorkloadSlot[];
  status: TeacherLoadStatus;
}

export interface ClassCompletionRow {
  className: string;
  group: string;
  expected: number;
  placed: number;
  missing: number;
  percent: number;
}

export interface TimetableOverviewData {
  totalClasses: number;
  totalStreams: number;
  totalTeachers: number;
  totalPeriods: number;
  expectedPeriods: number;
  placedPeriods: number;
  unassignedPeriods: number;
  completionPercent: number | null;
  subjectDistribution: Array<{ label: string; count: number }>;
  departmentDistribution: Array<{ label: string; count: number }>;
  dayDistribution: Array<{ label: string; count: number }>;
  teacherLoadBuckets: Array<{ label: string; count: number }>;
  classCompletion: ClassCompletionRow[];
}

const DEPARTMENT_RULES: Array<{ department: string; keywords: string[] }> = [
  {
    department: 'Mathematics',
    keywords: ['math', 'mathematics', 'algebra', 'geometry', 'statistics', 'calculus'],
  },
  {
    department: 'Languages',
    keywords: [
      'english',
      'literature',
      'kiswahili',
      'swahili',
      'french',
      'german',
      'arabic',
      'language',
      'reading',
      'writing',
    ],
  },
  {
    department: 'Sciences',
    keywords: [
      'physics',
      'chemistry',
      'biology',
      'science',
      'agriculture',
      'environmental',
      'health',
      'home science',
    ],
  },
  {
    department: 'Humanities',
    keywords: [
      'history',
      'geography',
      'social',
      'civics',
      'citizenship',
      'religious',
      'cre',
      'ire',
      're ',
      'philosophy',
      'psychology',
    ],
  },
  {
    department: 'Technology',
    keywords: [
      'ict',
      'computer',
      'computing',
      'informatics',
      'technology',
      'technical',
      'coding',
      'robotics',
    ],
  },
  {
    department: 'Business',
    keywords: ['business', 'account', 'commerce', 'economics', 'entrepreneur', 'finance'],
  },
  {
    department: 'Creative Arts',
    keywords: ['art', 'music', 'drama', 'theatre', 'theater', 'design', 'craft', 'dance'],
  },
  {
    department: 'Physical Education',
    keywords: ['physical', 'pe ', 'sport', 'games', 'athletics', 'swimming'],
  },
];

/** Derive a usable department label from the subjects a teacher actually teaches. */
export function deriveDepartment(subjects: string[], position?: string | null): {
  department: string;
  source: 'subject' | 'position' | 'default';
} {
  for (const subject of subjects) {
    const needle = ` ${subject.toLowerCase()} `;
    const rule = DEPARTMENT_RULES.find((entry) =>
      entry.keywords.some((keyword) => needle.includes(keyword))
    );
    if (rule) return { department: rule.department, source: 'subject' };
  }

  const pos = position?.trim();
  if (pos) {
    const upper = pos.toUpperCase();
    // Only use position when it clearly names an academic department/role.
    if (/HEAD OF|DEPARTMENT|DOS|DIRECTOR OF STUDIES/.test(upper)) {
      return { department: pos, source: 'position' };
    }
  }

  return { department: 'General Studies', source: 'default' };
}

export function normalizeDayOrder(day: string): number {
  const index = WEEK_DAYS.findIndex((d) => d.toLowerCase() === day.toLowerCase());
  return index < 0 ? WEEK_DAYS.length : index;
}

export function buildClassStreamGroups(
  classes: string[],
  catalog: ClassCatalogEntry[] = []
) {
  return groupClassesByStream([...new Set(classes.filter(Boolean))], catalog);
}

export function rowsForClassGroup(rows: TimetableRow[], group: string): TimetableRow[] {
  return rows.filter((row) => classStreamBase(row.className) === group);
}

function isBreakLike(row: TimetableRow, periodSlots: PeriodSlotDefinition[]): boolean {
  if (/\b(break|lunch|assembly)\b/i.test(row.subjectName)) return true;
  return periodSlots.some(
    (slot) =>
      slot.isBreak &&
      slot.startTime === row.startTime &&
      slot.endTime === row.endTime
  );
}

function slotLabel(
  startTime: string,
  endTime: string,
  periodSlots: PeriodSlotDefinition[]
): string {
  const slot = periodSlots.find(
    (candidate) => candidate.startTime === startTime && candidate.endTime === endTime
  );
  if (slot) return slot.name;
  return `${startTime}–${endTime}`;
}

function courseCodeFor(subject: string, courses: CourseConfig[]): string | null {
  const course = courses.find((item) => item.subjectName === subject);
  return course?.courseCode ?? null;
}

function statusFor(totalPeriods: number, thresholds: WorkloadThresholds): TeacherLoadStatus {
  if (totalPeriods >= thresholds.overloaded) return 'overloaded';
  if (totalPeriods >= thresholds.high) return 'high';
  return 'normal';
}

/**
 * Build teacher workload from real scheduled timetable records.
 *
 * Rules:
 * - Only non-extra-activity teaching rows are counted.
 * - Break/lunch rows are ignored even if they were stored as timetable rows.
 * - A teacher's day + start/end time is one slot. Duplicate rows (same slot,
 *   multiple subjects/classes) are merged so the slot is counted once.
 * - Results respect the term/year of the rows supplied (already filtered by API).
 */
export function buildTeacherWorkload(
  rows: TimetableRow[],
  profiles: TeacherProfile[],
  periodSlots: PeriodSlotDefinition[],
  courses: CourseConfig[],
  thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS
): TeacherWorkloadRow[] {
  const profileById = new Map(profiles.map((profile) => [profile.teacherUserId, profile]));
  const seenRowIds = new Set<string>();
  const byTeacher = new Map<
    string,
    {
      teacherName: string;
      slots: Map<string, TeacherWorkloadSlot>;
      classes: Set<string>;
      subjects: Set<string>;
      rowIds: Set<string>;
    }
  >();

  for (const row of rows) {
    if (row.isExtraActivity) continue;
    if (!row.teacherUserId) continue;
    if (isBreakLike(row, periodSlots)) continue;
    if (seenRowIds.has(row.id)) continue;
    seenRowIds.add(row.id);

    const teacherKey = row.teacherUserId;
    const bucket =
      byTeacher.get(teacherKey) ??
      {
        teacherName: row.teacherName || profileById.get(teacherKey)?.teacherName || 'Teacher',
        slots: new Map<string, TeacherWorkloadSlot>(),
        classes: new Set<string>(),
        subjects: new Set<string>(),
        rowIds: new Set<string>(),
      };

    bucket.teacherName = row.teacherName || bucket.teacherName;
    bucket.classes.add(row.className);
    bucket.subjects.add(row.subjectName);
    bucket.rowIds.add(row.id);

    const key = `${row.dayOfWeek}|${row.startTime}|${row.endTime}`;
    const existing = bucket.slots.get(key);
    if (existing) {
      existing.rowIds.push(row.id);
      if (!existing.subjectName.split(' · ').includes(row.subjectName)) {
        existing.subjectName = `${existing.subjectName} · ${row.subjectName}`;
      }
      if (!existing.className.split(' · ').includes(row.className)) {
        existing.className = `${existing.className} · ${row.className}`;
      }
      if (row.room && !existing.room) existing.room = row.room;
    } else {
      bucket.slots.set(key, {
        key,
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
        periodLabel: slotLabel(row.startTime, row.endTime, periodSlots),
        subjectName: row.subjectName,
        className: row.className,
        room: row.room ?? null,
        courseCode: courseCodeFor(row.subjectName, courses),
        rowIds: [row.id],
      });
    }

    byTeacher.set(teacherKey, bucket);
  }

  const teacherIds = new Set<string>([...byTeacher.keys(), ...profiles.map((p) => p.teacherUserId)]);

  return [...teacherIds]
    .map((teacherUserId): TeacherWorkloadRow => {
      const bucket = byTeacher.get(teacherUserId);
      const profile = profileById.get(teacherUserId);
      const slots = bucket
        ? [...bucket.slots.values()].sort(
            (a, b) =>
              normalizeDayOrder(a.dayOfWeek) - normalizeDayOrder(b.dayOfWeek) ||
              a.startTime.localeCompare(b.startTime)
          )
        : [];
      const subjects = [...(bucket?.subjects ?? [])].sort((a, b) => a.localeCompare(b));
      const classes = [...(bucket?.classes ?? [])].sort((a, b) => a.localeCompare(b));
      const { department, source } = deriveDepartment(subjects, profile?.position);
      const dailyPeriods: Record<string, number> = {};
      for (const slot of slots) {
        dailyPeriods[slot.dayOfWeek] = (dailyPeriods[slot.dayOfWeek] ?? 0) + 1;
      }
      const totalPeriods = slots.length;

      return {
        teacherUserId,
        teacherName:
          bucket?.teacherName || profile?.teacherName || 'Teacher',
        employeeNumber: profile?.employeeNumber ?? null,
        position: profile?.position ?? null,
        loginEmail: profile?.loginEmail ?? null,
        loginPhone: profile?.loginPhone ?? null,
        department,
        departmentSource: source,
        totalPeriods,
        classCount: classes.length,
        subjectCount: subjects.length,
        classes,
        subjects,
        dailyPeriods,
        slots,
        status: statusFor(totalPeriods, thresholds),
      };
    })
    .sort(
      (a, b) =>
        b.totalPeriods - a.totalPeriods ||
        a.teacherName.localeCompare(b.teacherName)
    );
}

export function buildClassCompletion(coverage: CoverageItem[]): ClassCompletionRow[] {
  const byClass = new Map<string, { expected: number; placed: number }>();
  for (const item of coverage) {
    const bucket = byClass.get(item.className) ?? { expected: 0, placed: 0 };
    bucket.expected += item.expected;
    bucket.placed += item.placed;
    byClass.set(item.className, bucket);
  }

  return [...byClass.entries()]
    .map(([className, bucket]) => {
      const missing = Math.max(0, bucket.expected - bucket.placed);
      const percent =
        bucket.expected > 0
          ? Math.min(100, Math.round((bucket.placed / bucket.expected) * 100))
          : 0;
      return {
        className,
        group: classStreamBase(className),
        expected: bucket.expected,
        placed: bucket.placed,
        missing,
        percent,
      };
    })
    .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
}

export function buildTimetableOverview(
  rows: TimetableRow[],
  classes: string[],
  profiles: TeacherProfile[],
  periodSlots: PeriodSlotDefinition[],
  coverage: CoverageItem[],
  courses: CourseConfig[],
  thresholds: WorkloadThresholds = DEFAULT_WORKLOAD_THRESHOLDS
): TimetableOverviewData {
  const uniqueClasses = [...new Set(classes.filter(Boolean))];
  const teachingRows = rows.filter(
    (row) => !row.isExtraActivity && !isBreakLike(row, periodSlots)
  );
  const uniqueRows = new Map(teachingRows.map((row) => [row.id, row]));
  const deduped = [...uniqueRows.values()];

  const subjectCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();
  for (const row of deduped) {
    subjectCounts.set(row.subjectName, (subjectCounts.get(row.subjectName) ?? 0) + 1);
    dayCounts.set(row.dayOfWeek, (dayCounts.get(row.dayOfWeek) ?? 0) + 1);
  }

  const workload = buildTeacherWorkload(
    deduped,
    profiles,
    periodSlots,
    courses,
    thresholds
  );

  const departmentCounts = new Map<string, number>();
  for (const teacher of workload) {
    if (!teacher.totalPeriods) continue;
    departmentCounts.set(
      teacher.department,
      (departmentCounts.get(teacher.department) ?? 0) + teacher.totalPeriods
    );
  }

  const expectedPeriods = coverage.reduce((sum, item) => sum + item.expected, 0);
  const placedPeriods = coverage.reduce((sum, item) => sum + item.placed, 0);
  const unassignedPeriods = Math.max(0, expectedPeriods - placedPeriods);
  const completionPercent =
    expectedPeriods > 0 ? Math.min(100, Math.round((placedPeriods / expectedPeriods) * 100)) : null;

  const loadBuckets = [
    { label: '0 periods', min: 0, max: 0 },
    { label: '1–10', min: 1, max: 10 },
    { label: '11–20', min: 11, max: 20 },
    { label: '21–30', min: 21, max: 30 },
    { label: '30+', min: 31, max: Number.POSITIVE_INFINITY },
  ].map((bucket) => ({
    label: bucket.label,
    count: workload.filter(
      (teacher) => teacher.totalPeriods >= bucket.min && teacher.totalPeriods <= bucket.max
    ).length,
  }));

  const days = [...new Set([...WEEK_DAYS, ...dayCounts.keys()])].sort(
    (a, b) => normalizeDayOrder(a) - normalizeDayOrder(b)
  );

  return {
    totalClasses: new Set(uniqueClasses.map((label) => classStreamBase(label))).size,
    totalStreams: uniqueClasses.length,
    totalTeachers: new Set(deduped.map((row) => row.teacherUserId).filter(Boolean)).size,
    totalPeriods: deduped.length,
    expectedPeriods,
    placedPeriods,
    unassignedPeriods,
    completionPercent,
    subjectDistribution: [...subjectCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    departmentDistribution: [...departmentCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    dayDistribution: days
      .filter((day) => dayCounts.has(day))
      .map((label) => ({ label, count: dayCounts.get(label) ?? 0 })),
    teacherLoadBuckets: loadBuckets,
    classCompletion: buildClassCompletion(coverage),
  };
}
