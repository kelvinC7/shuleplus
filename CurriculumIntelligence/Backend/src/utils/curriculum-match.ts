/** Normalize subject/grade labels for cross-module matching (timetable vs curriculum library). */

function normKey(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

const SUBJECT_GROUPS: string[][] = [
  ['mathematics', 'math', 'maths'],
  ['set', 'est', 'studiesinenvironmentandtechnology', 'environmentandtechnology'],
  ['english', 'eng'],
  ['kinyarwanda', 'kin'],
  ['french', 'fre'],
  ['science', 'sci'],
  ['socialstudies', 'social'],
];

function subjectGroupKeys(name: string): Set<string> {
  const key = normKey(name);
  const keys = new Set<string>([key]);
  for (const group of SUBJECT_GROUPS) {
    if (group.some((g) => key === g || key.includes(g) || g.includes(key))) {
      for (const g of group) keys.add(g);
    }
  }
  return keys;
}

export function subjectMatchesFilter(bookSubject: string, filterSubject: string): boolean {
  const a = subjectGroupKeys(bookSubject);
  const b = subjectGroupKeys(filterSubject);
  for (const x of a) {
    if (b.has(x)) return true;
  }
  const bk = normKey(bookSubject);
  const fk = normKey(filterSubject);
  return bk === fk || bk.includes(fk) || fk.includes(bk);
}

export function extractGradeLabel(classOrGrade: string | undefined | null): string | null {
  if (!classOrGrade) return null;
  const s = String(classOrGrade).trim();
  const p = s.match(/\bP\s*(\d)\b/i);
  if (p) return `P${p[1]}`;
  if (/^P\d/i.test(s)) return s.match(/^P\d/i)![0].toUpperCase();
  const g = s.match(/\b(?:grade|primary|year)\s*(\d)\b/i);
  if (g) return `P${g[1]}`;
  return null;
}

export function gradeMatchesFilter(bookGrade: string, filterGrade: string): boolean {
  const bg = normKey(bookGrade);
  const fg = normKey(filterGrade);
  if (bg === fg) return true;
  const extracted = extractGradeLabel(filterGrade);
  if (extracted && normKey(extracted) === bg) return true;
  if (bg.includes(fg) || fg.includes(bg)) return true;
  return false;
}
