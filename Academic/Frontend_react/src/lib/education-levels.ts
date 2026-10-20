/** Same education levels as Student Management → Class → Level (category). */
export const EDUCATION_LEVELS = [
  { value: 'NURSERY', label: 'Nursery' },
  { value: 'PRIMARY', label: 'Primary' },
  { value: 'SECONDARY', label: 'Secondary' },
  { value: 'TVET', label: 'TVET' },
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number]['value'];

/** Legacy Academic template levels still stored on older rows. */
const LEGACY_LEVEL_TO_SM: Record<string, EducationLevel | string> = {
  O_LEVEL: 'SECONDARY',
  A_LEVEL: 'SECONDARY',
  UNIVERSITY: 'TVET',
};

export function educationLevelLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const hit = EDUCATION_LEVELS.find((l) => l.value === value);
  if (hit) return hit.label;
  if (value === 'O_LEVEL') return 'O-Level (Secondary)';
  if (value === 'A_LEVEL') return 'A-Level (Secondary)';
  if (value === 'UNIVERSITY') return 'University';
  return value;
}

export function classCategoryMatchesTemplateLevel(
  classCategory: string | null | undefined,
  templateLevel: string
): boolean {
  const cat = String(classCategory ?? '').trim().toUpperCase();
  const level = String(templateLevel ?? '').trim().toUpperCase();
  if (!cat || !level) return false;
  if (cat === level) return true;
  const mapped = LEGACY_LEVEL_TO_SM[level];
  if (mapped && cat === mapped) return true;
  return false;
}
