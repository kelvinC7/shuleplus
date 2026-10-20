import type { CourseConfig, CourseSchedulingRules } from '@/types';

export const PERIOD_OPTIONS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'] as const;
export const WEEKDAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

export const DEFAULT_SCHEDULING_RULES: CourseSchedulingRules = {
  lessonDuration: 'SINGLE',
  doublePeriodMode: 'PREFER',
  doublePeriodPattern: 'ANY',
  roomRequirement: 'ANY',
  preferredLabRoom: null,
  preferredRoom: null,
  preferPreferredRoom: false,
  preferredDays: [],
  preferredPeriods: [],
  schedulingImportance: 'NORMAL',
};

export function importanceToPriority(importance: CourseSchedulingRules['schedulingImportance']): number {
  if (importance === 'CRITICAL') return 9;
  if (importance === 'IMPORTANT') return 7;
  return 5;
}

export function priorityToImportance(priority: number): CourseSchedulingRules['schedulingImportance'] {
  if (priority >= 8) return 'CRITICAL';
  if (priority >= 6) return 'IMPORTANT';
  return 'NORMAL';
}

export function parseSchedulingRules(raw: unknown): CourseSchedulingRules {
  const base = { ...DEFAULT_SCHEDULING_RULES };
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  return {
    lessonDuration: (r.lessonDuration as CourseSchedulingRules['lessonDuration']) ?? base.lessonDuration,
    doublePeriodMode: (r.doublePeriodMode as CourseSchedulingRules['doublePeriodMode']) ?? base.doublePeriodMode,
    doublePeriodPattern: (r.doublePeriodPattern as CourseSchedulingRules['doublePeriodPattern']) ?? base.doublePeriodPattern,
    roomRequirement: (r.roomRequirement as CourseSchedulingRules['roomRequirement']) ?? base.roomRequirement,
    preferredLabRoom: typeof r.preferredLabRoom === 'string' ? r.preferredLabRoom : null,
    preferredRoom: typeof r.preferredRoom === 'string' ? r.preferredRoom : null,
    preferPreferredRoom: Boolean(r.preferPreferredRoom),
    preferredDays: Array.isArray(r.preferredDays) ? (r.preferredDays as string[]) : [],
    preferredPeriods: Array.isArray(r.preferredPeriods) ? (r.preferredPeriods as string[]) : [],
    schedulingImportance:
      (r.schedulingImportance as CourseSchedulingRules['schedulingImportance']) ?? base.schedulingImportance,
  };
}

export function rulesFromCourseConfig(course: Partial<CourseConfig>): CourseSchedulingRules {
  const parsed = parseSchedulingRules(course.schedulingRules);
  let rules = { ...parsed };

  if (course.requiresLab && rules.roomRequirement === 'ANY') {
    rules.roomRequirement = 'REQUIRE_LAB';
  }
  if (course.prefersDoublePeriod && rules.lessonDuration === 'SINGLE') {
    rules.lessonDuration = 'DOUBLE';
  }
  if (course.priority != null && !course.schedulingRules) {
    rules.schedulingImportance = priorityToImportance(course.priority);
  }

  return rules;
}

export function courseConfigFromForm(
  course: CourseConfig,
  rules: CourseSchedulingRules,
): CourseConfig {
  const requiresLab = rules.roomRequirement === 'REQUIRE_LAB';
  const prefersDoublePeriod =
    rules.lessonDuration === 'DOUBLE' ||
    (rules.lessonDuration === 'FLEXIBLE' && rules.doublePeriodMode === 'PREFER');

  let timePreference = course.timePreference;
  if (timePreference === 'CUSTOM' && !course.customWindowStart && !course.customWindowEnd) {
    timePreference = 'ANY';
  }

  return {
    ...course,
    priority: importanceToPriority(rules.schedulingImportance ?? 'NORMAL'),
    requiresLab,
    prefersDoublePeriod,
    timePreference,
    schedulingRules: rules,
  };
}

export function formatCourseSummary(course: CourseConfig): string {
  const rules = rulesFromCourseConfig(course);
  const parts = [`${course.periodsPerWeek ?? 1} periods/week`];
  if (rules.lessonDuration === 'DOUBLE') parts.push('Double period');
  if (rules.roomRequirement === 'REQUIRE_LAB') parts.push('Lab required');
  else if (rules.roomRequirement === 'PREFER_LAB') parts.push('Prefers lab');
  if (rules.schedulingImportance && rules.schedulingImportance !== 'NORMAL') {
    parts.push(rules.schedulingImportance.toLowerCase());
  }
  return parts.join(' · ');
}
