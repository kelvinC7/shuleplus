import type { Enrollment, Student } from '@/types';

export function normalizeAcademicYear(year: string): string {
  return year.replace(/\s/g, '').replace(/–/g, '-');
}

export function getEnrollmentForYear(student: Student, year: string, currentYear?: string): Enrollment | undefined {
  if (!year) return student.enrollments.find((e) => e.isCurrent) ?? student.enrollments[0];
  const normalized = normalizeAcademicYear(year);
  const isCurrentYear = currentYear && normalizeAcademicYear(currentYear) === normalized;
  if (isCurrentYear) {
    const current = student.enrollments.find((e) => e.isCurrent);
    if (current) return current;
  }
  const byYear = student.enrollments.find((e) => normalizeAcademicYear(e.academicYear) === normalized);
  if (byYear) return byYear;
  return student.enrollments.find((e) => e.isCurrent) ?? student.enrollments[0];
}

export function getClassNameForYear(student: Student, year: string, currentYear?: string): string {
  const enrollment = getEnrollmentForYear(student, year, currentYear);
  if (!enrollment?.class) return '—';
  return enrollment.class.stream ? `${enrollment.class.name} ${enrollment.class.stream}` : enrollment.class.name;
}
