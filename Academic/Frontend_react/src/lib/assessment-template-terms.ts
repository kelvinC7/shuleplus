/** Whole-year template — applies to Term 1, Term 2, and Term 3. */
export const ANNUAL_TEMPLATE_TERM = 'Annual';

const TERM_NUMBER_RE = /^term\s*([123])\b/i;

export function termOptionsForTemplate(settingsTerms: string[] | undefined): string[] {
  const base = settingsTerms?.length ? [...settingsTerms] : ['Term 1', 'Term 2', 'Term 3'];
  if (!base.includes(ANNUAL_TEMPLATE_TERM)) base.push(ANNUAL_TEMPLATE_TERM);
  return base;
}

/** List/filter: Term 1 also shows Annual templates. */
export function templateTermMatchesQuery(templateTerm: string, queryTerm: string): boolean {
  const t = String(templateTerm ?? '').trim();
  const q = String(queryTerm ?? '').trim();
  if (!q) return true;
  if (t === q) return true;
  if (t === ANNUAL_TEMPLATE_TERM && TERM_NUMBER_RE.test(q)) return true;
  return false;
}

export function termDisplayLabel(term: string): string {
  if (term === ANNUAL_TEMPLATE_TERM) return 'Annual (all terms)';
  return term;
}
