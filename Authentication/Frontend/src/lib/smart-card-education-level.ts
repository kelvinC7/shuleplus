/** Student Management class category from enrollment. */
export type StudentManagementEducationLevel = 'NURSERY' | 'PRIMARY' | 'SECONDARY' | 'TVET' | string;

type ParsedGrade = { type: 'N' | 'P' | 'S'; num: number };

/** First class token, normalized for grade parsing (handles spacing and separators). */
function firstClassToken(className: string): string {
  return className
    .trim()
    .toUpperCase()
    .split(/[\s/–—\-·]+/)[0]
    ?.replace(/\s+/g, '') ?? '';
}

function parseGradeFromClassName(className: string): ParsedGrade | null {
  const token = firstClassToken(className);
  const match = token.match(/^([NPS])([1-6])$/);
  if (!match) return null;

  const type = match[1] as ParsedGrade['type'];
  const num = Number.parseInt(match[2]!, 10);
  if (type === 'N' && num >= 1 && num <= 3) return { type, num };
  if (type === 'P' && num >= 1 && num <= 6) return { type, num };
  if (type === 'S' && num >= 1 && num <= 6) return { type, num };
  return null;
}

function isTvetClassName(className: string): boolean {
  const token = firstClassToken(className);
  if (/^(L[1-5]|Y[1-3])/i.test(token)) return true;
  return /\bTVET\b/i.test(className);
}

function isNurseryClassName(className: string): boolean {
  const token = firstClassToken(className);
  if (/^N[1-3]$/.test(token)) return true;
  return /nurs|baby/i.test(className);
}

/**
 * Derives the education level label printed on student smart cards.
 * Uses Student Management class category when available and parses the current class name.
 */
export function deriveSmartCardEducationLevel(
  className: string | null | undefined,
  educationLevel: StudentManagementEducationLevel | null | undefined,
): string {
  const cls = String(className ?? '').trim();
  const category = String(educationLevel ?? '').trim().toUpperCase();

  if (category === 'TVET' || isTvetClassName(cls)) {
    return cls || 'TVET';
  }

  const grade = parseGradeFromClassName(cls);
  if (grade) {
    if (grade.type === 'N') return 'Nursery';
    if (grade.type === 'P') {
      return grade.num <= 3 ? 'Lower Primary' : 'Upper Primary';
    }
    if (grade.type === 'S') {
      return grade.num <= 3 ? 'Ordinary Level' : 'Advanced Level';
    }
  }

  if (category === 'NURSERY' || isNurseryClassName(cls)) return 'Nursery';
  if (category === 'PRIMARY') return 'Primary';
  if (category === 'SECONDARY') return 'Secondary';

  return cls || 'Student';
}
