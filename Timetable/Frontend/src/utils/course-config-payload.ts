import type { CourseConfig } from '@/types';

/** Strip server-only fields and normalize types for course-config API writes. */
export function courseConfigWritePayload(
  course: CourseConfig,
  opts?: { newSubjectName?: string },
): Partial<CourseConfig> & { subjectName: string; newSubjectName?: string } {
  return {
    subjectName: course.subjectName.trim(),
    courseCode: course.courseCode ?? null,
    codeMode: course.codeMode ?? 'AUTOMATIC',
    color: course.color ?? null,
    priority: Number(course.priority ?? 5),
    periodsPerWeek: Number(course.periodsPerWeek ?? 1),
    requiresLab: Boolean(course.requiresLab),
    prefersDoublePeriod: Boolean(course.prefersDoublePeriod),
    timePreference: course.timePreference ?? 'ANY',
    customWindowStart: course.customWindowStart ?? null,
    customWindowEnd: course.customWindowEnd ?? null,
    schedulingRules: course.schedulingRules ?? {},
    isCore: course.isCore !== false,
    ...(opts?.newSubjectName ? { newSubjectName: opts.newSubjectName.trim() } : {}),
  };
}
