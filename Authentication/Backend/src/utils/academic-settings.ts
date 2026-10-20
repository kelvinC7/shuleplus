export interface TermDateRange {
  start: string;
  end: string;
}

export interface ReportCardSettings {
  verifyBaseUrl?: string | null;
  enableClassTeacherComments?: boolean;
  enableHeadTeacherComments?: boolean;
  defaultHeadTeacherComment?: string | null;
  classTeacherCommentHint?: string | null;
}

export interface AcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
  /** Per-term calendar window (YYYY-MM-DD). Used by Attendance performance bars. */
  termDates?: Record<string, TermDateRange>;
  reportCard?: ReportCardSettings;
}

function parseReportCardSettings(raw: unknown): ReportCardSettings | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  return {
    verifyBaseUrl: typeof o.verifyBaseUrl === 'string' ? o.verifyBaseUrl : null,
    enableClassTeacherComments: o.enableClassTeacherComments !== false,
    enableHeadTeacherComments: o.enableHeadTeacherComments !== false,
    defaultHeadTeacherComment:
      typeof o.defaultHeadTeacherComment === 'string' ? o.defaultHeadTeacherComment : null,
    classTeacherCommentHint:
      typeof o.classTeacherCommentHint === 'string' ? o.classTeacherCommentHint : null,
  };
}

const YEAR_PATTERN = /^\d{4}-\d{4}$/;

export function defaultAcademicSettings(): AcademicSettings {
  const start = new Date().getFullYear();
  const year = `${start}-${start + 1}`;
  return {
    academicYears: [year],
    terms: ['Term 1', 'Term 2', 'Term 3'],
    currentAcademicYear: year,
    currentTerm: 'Term 1',
  };
}

export function parseAcademicSettings(raw: unknown): AcademicSettings {
  const defaults = defaultAcademicSettings();
  if (!raw || typeof raw !== 'object') return defaults;
  const obj = raw as Record<string, unknown>;
  const academicYears = Array.isArray(obj.academicYears)
    ? obj.academicYears.filter((y): y is string => typeof y === 'string' && YEAR_PATTERN.test(y))
    : defaults.academicYears;
  const terms = Array.isArray(obj.terms)
    ? obj.terms.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : defaults.terms;
  const currentAcademicYear =
    typeof obj.currentAcademicYear === 'string' && YEAR_PATTERN.test(obj.currentAcademicYear)
      ? obj.currentAcademicYear
      : academicYears[0] ?? defaults.currentAcademicYear;
  const currentTerm =
    typeof obj.currentTerm === 'string' && terms.includes(obj.currentTerm)
      ? obj.currentTerm
      : terms[0] ?? defaults.currentTerm;

  const termDates = parseTermDates(obj.termDates, terms);
  const reportCard = parseReportCardSettings(obj.reportCard);

  return {
    academicYears: academicYears.length ? [...new Set(academicYears)] : defaults.academicYears,
    terms: terms.length ? [...new Set(terms)] : defaults.terms,
    currentAcademicYear,
    currentTerm,
    termDates,
    reportCard,
  };
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseTermDates(raw: unknown, terms: string[]): Record<string, TermDateRange> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, TermDateRange> = {};
  for (const term of terms) {
    const entry = (raw as Record<string, unknown>)[term];
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const start = typeof e.start === 'string' && DATE_PATTERN.test(e.start) ? e.start : null;
    const end = typeof e.end === 'string' && DATE_PATTERN.test(e.end) ? e.end : null;
    if (start && end && start <= end) out[term] = { start, end };
  }
  return Object.keys(out).length ? out : undefined;
}

export function validateAcademicYear(value: string): boolean {
  if (!YEAR_PATTERN.test(value)) return false;
  const [a, b] = value.split('-').map(Number);
  return b === a + 1;
}
