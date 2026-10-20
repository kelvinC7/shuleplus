const LEGACY_LEVEL_TO_SM: Record<string, string> = {
  O_LEVEL: 'SECONDARY',
  A_LEVEL: 'SECONDARY',
  UNIVERSITY: 'TVET',
};

export function classCategoryMatchesTemplateLevel(
  classCategory: string | null | undefined,
  templateLevel: string
): boolean {
  const cat = String(classCategory ?? '').trim().toUpperCase();
  const level = String(templateLevel ?? '').trim().toUpperCase();
  if (!cat || !level) return false;
  if (cat === level) return true;
  const mapped = LEGACY_LEVEL_TO_SM[level];
  return mapped ? cat === mapped : false;
}
