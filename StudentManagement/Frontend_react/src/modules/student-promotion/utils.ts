import type { ApiClass, Enrollment, Student } from '@/types';
import type { PromotionCandidate, PromotionGroup, PromotionRecord, PromotionRule, PromotionStats, ValidationIssue } from './types';

const NAVY = '#000435';
const GOLD = '#FCB038';

export { NAVY, GOLD };

export const DEFAULT_PROMOTION_RULES: PromotionRule[] = [
  { from: 'P1', to: 'P2' },
  { from: 'P2', to: 'P3' },
  { from: 'P3', to: 'P4' },
  { from: 'P4', to: 'P5' },
  { from: 'P5', to: 'P6' },
  { from: 'P6', to: 'S1' },
  { from: 'S1', to: 'S2' },
  { from: 'S2', to: 'S3' },
  { from: 'S3', to: 'S4' },
  { from: 'S4', to: 'S5' },
  { from: 'S5', to: 'S6' },
];

export function formatYearDisplay(year: string): string {
  return year.replace(/-/g, '–');
}

export function nextAcademicYear(year: string, years: string[]): string | null {
  const idx = years.indexOf(year);
  if (idx >= 0 && idx < years.length - 1) return years[idx + 1];
  const match = year.match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;
  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);
  return `${start + 1}-${end + 1}`;
}

export function classLabel(c: ApiClass): string {
  const parts = [c.name];
  if (c.combination?.name) parts.push(c.combination.name);
  if (c.stream) parts.push(c.stream);
  return parts.join(' ');
}

export function shortClassLabel(c: ApiClass): string {
  return c.stream ? `${c.name} ${c.stream}` : c.name;
}

export function normalizeAcademicYear(year: string): string {
  return year.replace(/\s/g, '').replace(/–/g, '-');
}

export function getEnrollmentForYear(student: Student, year: string): Enrollment | undefined {
  if (!year) return undefined;
  const normalized = normalizeAcademicYear(year);
  const byYear = student.enrollments.find((e) => normalizeAcademicYear(e.academicYear) === normalized);
  if (byYear) return byYear;
  // Students API often returns only the current enrollment — use it for promotion listing.
  const current = student.enrollments.find((e) => e.isCurrent);
  if (current) return current;
  return student.enrollments[0];
}

export function getActiveEnrollmentForYear(student: Student, year: string): Enrollment | undefined {
  const enrollment = getEnrollmentForYear(student, year);
  if (!enrollment) return undefined;
  if (enrollment.status === 'WITHDRAWN' || enrollment.status === 'TRANSFERRED') return enrollment;
  return enrollment;
}

export function suggestTargetClass(fromClass: ApiClass, classes: ApiClass[], rules = DEFAULT_PROMOTION_RULES): ApiClass | null {
  const rule = rules.find((r) => r.from === fromClass.name);
  const nextName = rule?.to;
  if (!nextName) {
    const numMatch = fromClass.name.match(/^(.+?)(\d+)$/);
    if (numMatch) {
      const prefix = numMatch[1];
      const num = parseInt(numMatch[2], 10);
      const inferred = `${prefix}${num + 1}`;
      return (
        classes.find((c) => c.name === inferred && c.stream === fromClass.stream) ??
        classes.find((c) => c.name === inferred) ??
        null
      );
    }
    return null;
  }
  return (
    classes.find((c) => c.name === nextName && c.stream === fromClass.stream) ??
    classes.find((c) => c.name === nextName) ??
    null
  );
}

export function resolveTargetClassForStudent(
  sourceClass: ApiClass,
  defaultToClass: ApiClass | null,
  classes: ApiClass[]
): ApiClass | null {
  if (!defaultToClass) return null;
  if (sourceClass.stream) {
    const match = classes.find((c) => c.name === defaultToClass.name && c.stream === sourceClass.stream);
    if (match) return match;
  }
  return defaultToClass;
}

export function validateCandidate(
  student: Student,
  enrollment: Enrollment,
  targetClassId: string | null,
  toYear: string,
  classes: ApiClass[]
): ValidationIssue | null {
  if (student.status === 'WITHDRAWN') {
    return { type: 'withdrawn', message: 'Student is withdrawn' };
  }
  if (enrollment.status === 'WITHDRAWN') {
    return { type: 'withdrawn', message: 'Enrollment is withdrawn' };
  }
  if (enrollment.status === 'PROMOTED' && enrollment.promotedToYear === toYear) {
    return { type: 'already_promoted', message: 'Already promoted to target year' };
  }
  const existingTarget = student.enrollments.find((e) => e.academicYear === toYear);
  if (existingTarget && existingTarget.status !== 'WITHDRAWN') {
    return { type: 'already_enrolled', message: 'Already enrolled in target academic year' };
  }
  if (!targetClassId) {
    return { type: 'missing_class', message: 'Missing new class assignment' };
  }
  if (!classes.some((c) => c.id === targetClassId)) {
    return { type: 'missing_class', message: 'Invalid target class' };
  }
  if (enrollment.status !== 'ACTIVE' && enrollment.status !== 'PROMOTED') {
    return { type: 'inactive', message: `Enrollment status: ${enrollment.status}` };
  }
  return null;
}

export function buildCandidate(
  student: Student,
  fromYear: string,
  toYear: string,
  targetClassId: string | null,
  classes: ApiClass[]
): PromotionCandidate | null {
  const enrollment = getEnrollmentForYear(student, fromYear);
  if (!enrollment?.class) return null;
  const targetClass = targetClassId ? classes.find((c) => c.id === targetClassId) ?? null : null;
  const issue = validateCandidate(student, enrollment, targetClassId, toYear, classes);
  return {
    student,
    enrollment,
    sourceClass: enrollment.class,
    targetClassId,
    targetClass,
    issue,
  };
}

export function computePromotionStats(students: Student[], fromYear: string, toYear: string): PromotionStats {
  let promoted = 0;
  let notPromoted = 0;

  for (const student of students) {
    const fromEnrollment = getEnrollmentForYear(student, fromYear);
    if (!fromEnrollment || fromEnrollment.status === 'WITHDRAWN') continue;

    const toEnrollment = getEnrollmentForYear(student, toYear);
    const wasPromoted =
      toEnrollment != null ||
      (fromEnrollment.status === 'PROMOTED' && fromEnrollment.promotedToYear === toYear);

    if (wasPromoted) promoted += 1;
    else notPromoted += 1;
  }

  const total = promoted + notPromoted;
  return {
    total,
    promoted,
    pending: notPromoted,
    notPromoted,
  };
}

export function studentDisplayName(student: Student): string {
  return `${student.firstName} ${student.lastName}`.trim();
}

export function promotionGroupKey(record: PromotionRecord): string {
  return `${record.classId}|${record.promotedToClassId ?? ''}|${record.academicYear}|${record.promotedToYear ?? ''}`;
}

export function groupPromotionRecords(records: PromotionRecord[]): PromotionGroup[] {
  const map = new Map<string, PromotionGroup>();

  for (const record of records) {
    const key = promotionGroupKey(record);
    const existing = map.get(key);
    if (existing) {
      existing.records.push(record);
      existing.studentCount += 1;
      if (record.updatedAt > existing.updatedAt) existing.updatedAt = record.updatedAt;
    } else {
      map.set(key, {
        id: key,
        fromClassId: record.classId,
        toClassId: record.promotedToClassId ?? '',
        fromYear: record.academicYear,
        toYear: record.promotedToYear ?? '',
        fromClass: record.class,
        toClass: record.promotedToClass,
        studentCount: 1,
        records: [record],
        updatedAt: record.updatedAt,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
