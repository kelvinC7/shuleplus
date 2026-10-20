import { prisma } from '../config/database';

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
  return /^[A-Z0-9][A-Z0-9-]{1,19}$/.test(code);
}

export async function generateUniqueCourseCode(
  organizationId: string,
  subjectName: string,
  excludeId?: string
): Promise<string> {
  const prefix = subjectPrefix(subjectName);
  const existing = await prisma.timetableCourseConfig.findMany({
    where: {
      organizationId,
      courseCode: { startsWith: `${prefix}-` },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { courseCode: true },
  });

  let max = 0;
  for (const row of existing) {
    if (!row.courseCode) continue;
    const match = row.courseCode.match(/-(\d+)$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }

  let candidate = `${prefix}-${String(max + 1).padStart(3, '0')}`;
  let attempt = max + 1;
  while (attempt < 999) {
    const clash = await prisma.timetableCourseConfig.findFirst({
      where: {
        organizationId,
        courseCode: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (!clash) return candidate;
    attempt += 1;
    candidate = `${prefix}-${String(attempt).padStart(3, '0')}`;
  }

  return `${prefix}-${Date.now().toString().slice(-3)}`;
}

export async function assertUniqueCourseCode(
  organizationId: string,
  courseCode: string,
  excludeId?: string
) {
  const normalized = normalizeCourseCode(courseCode);
  if (!isValidCourseCode(normalized)) {
    throw new Error('Course code must be uppercase letters, numbers, and hyphens (2–20 chars)');
  }
  const clash = await prisma.timetableCourseConfig.findFirst({
    where: {
      organizationId,
      courseCode: normalized,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  if (clash) {
    throw new Error(`Course code "${normalized}" is already used by ${clash.subjectName}`);
  }
  return normalized;
}
