import type { CourseConfig } from '@/types';

export type CourseCodeMode = 'AUTOMATIC' | 'MANUAL';

export function subjectPrefix(subjectName: string): string {
  const words = subjectName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 4);
  }
  const letters = subjectName.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return letters.slice(0, 4) || 'CRS';
}

export function normalizeCourseCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '-');
}

export function isValidCourseCode(code: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]{1,19}$/.test(normalizeCourseCode(code));
}

export function previewAutoCourseCode(subjectName: string, existingCodes: string[]): string {
  const prefix = subjectPrefix(subjectName);
  let max = 0;
  for (const code of existingCodes) {
    if (!code.startsWith(`${prefix}-`)) continue;
    const n = parseInt(code.slice(prefix.length + 1), 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

/** CHEM-001 → CHEM, BIOLOGY → BIO (prefix only, no numbers). */
export function shortCourseCode(
  courseCode?: string | null,
  subjectName?: string | null
): string {
  const raw = (courseCode ?? '').trim().toUpperCase();
  if (raw) {
    const prefix = raw.split(/[-_\s]/)[0]?.replace(/[^A-Z]/g, '') ?? '';
    if (prefix) return prefix.slice(0, 6);
  }
  if (subjectName?.trim()) return subjectPrefix(subjectName);
  return 'CRS';
}

export function formatPreferredTime(course: Pick<CourseConfig, 'timePreference'>): string {
  if (course.timePreference === 'MORNING') return 'Morning';
  if (course.timePreference === 'AFTERNOON') return 'Afternoon';
  if (course.timePreference === 'CUSTOM') return 'Custom';
  return 'Any';
}
