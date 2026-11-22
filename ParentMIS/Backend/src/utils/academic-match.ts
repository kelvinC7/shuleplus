/** Loose match for student codes across SM, ParentMIS, and Academic. */
export function normalizeStudentCode(code: string | null | undefined): string {
  return (code ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

export function studentCodesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeStudentCode(a);
  const nb = normalizeStudentCode(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 8 && nb.length >= 8 && (na.endsWith(nb) || nb.endsWith(na))) return true;
  return false;
}

function normTerm(t: string): string {
  return t.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

const ROMAN_TO_NUM: Record<string, string> = {
  i: '1',
  ii: '2',
  iii: '3',
  iv: '4',
  v: '5',
};

export function academicTermsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a?.trim() || !b?.trim()) return true;
  const na = normTerm(a);
  const nb = normTerm(b);
  if (na === nb) return true;
  const num = (s: string) => {
    const m = s.match(/(\d+)/);
    if (m) return m[1];
    const r = s.match(/\b(i|ii|iii|iv|v)\b/i);
    if (r) return ROMAN_TO_NUM[r[1].toLowerCase()] || '';
    return '';
  };
  const da = num(na);
  const db = num(nb);
  return Boolean(da && db && da === db);
}

export function academicYearsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a?.trim() || !b?.trim()) return true;
  const na = normTerm(a);
  const nb = normTerm(b);
  if (na === nb) return true;
  const ya = na.match(/\d{4}/)?.[0];
  const yb = nb.match(/\d{4}/)?.[0];
  if (ya && yb && ya === yb) return true;
  return na.startsWith(nb) || nb.startsWith(na);
}
