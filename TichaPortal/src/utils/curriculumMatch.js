function normKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

const SUBJECT_GROUPS = [
  ['mathematics', 'math', 'maths'],
  ['set', 'est', 'studiesinenvironmentandtechnology', 'environmentandtechnology'],
  ['english', 'eng'],
  ['kinyarwanda', 'kin'],
  ['french', 'fre'],
  ['science', 'sci'],
  ['socialstudies', 'social'],
];

function subjectGroupKeys(name) {
  const key = normKey(name);
  const keys = new Set([key]);
  for (const group of SUBJECT_GROUPS) {
    if (group.some((g) => key === g || key.includes(g) || g.includes(key))) {
      for (const g of group) keys.add(g);
    }
  }
  return keys;
}

export function subjectsMatch(a, b) {
  if (!a || !b) return false;
  const ga = subjectGroupKeys(a);
  const gb = subjectGroupKeys(b);
  for (const x of ga) {
    if (gb.has(x)) return true;
  }
  const ak = normKey(a);
  const bk = normKey(b);
  return ak === bk || ak.includes(bk) || bk.includes(ak);
}

export function extractGradeFromClass(className) {
  if (!className) return null;
  const s = String(className).trim();
  const p = s.match(/\bP\s*(\d)\b/i);
  if (p) return `P${p[1]}`;
  if (/^P\d/i.test(s)) return s.match(/^P\d/i)[0].toUpperCase();
  const g = s.match(/\b(?:grade|primary|year)\s*(\d)\b/i);
  if (g) return `P${g[1]}`;
  return null;
}

export function gradesMatch(bookGrade, className) {
  if (!bookGrade) return true;
  const bg = normKey(bookGrade);
  const fromClass = extractGradeFromClass(className);
  const cg = fromClass ? normKey(fromClass) : normKey(className);
  if (!cg) return true;
  return bg === cg || bg.includes(cg) || cg.includes(bg);
}

/** Published books for this assignment: grade first, then subject (with EST/SET etc.). */
export function booksForAssignment(allBooks, assignment) {
  const books = Array.isArray(allBooks) ? allBooks : [];
  if (!assignment) return books;

  const byGrade = books.filter((b) => gradesMatch(b.grade, assignment.className));
  const pool = byGrade.length ? byGrade : books;

  const bySubject = pool.filter((b) => subjectsMatch(b.subject, assignment.subjectName));
  const list = bySubject.length ? bySubject : pool;

  return [...list].sort((a, b) => {
    const aMatch = subjectsMatch(a.subject, assignment.subjectName) ? 0 : 1;
    const bMatch = subjectsMatch(b.subject, assignment.subjectName) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return String(a.title).localeCompare(String(b.title));
  });
}
