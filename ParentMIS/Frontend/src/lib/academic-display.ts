/** Placeholder for missing academic values in the parent portal (not an em dash). */
export const ACADEMIC_EMPTY = 'N/A';

export function formatOptionalDate(iso: string | null | undefined, formatter: (d: string) => string): string {
  if (!iso) return ACADEMIC_EMPTY;
  return formatter(iso);
}

/** Normalize class labels for parent UI (e.g. "P1 - D" → "P1 D"). */
export function formatClassLabel(raw: string | null | undefined): string {
  if (!raw?.trim()) return ACADEMIC_EMPTY;
  return raw
    .replace(/\s*[-–—]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parent-facing assessment title: no em/en dashes; drop redundant subject when the row already has a subject column.
 * e.g. "QUIZ — Mathematics (Demo)" + subject Mathematics → "QUIZ (Demo)"
 */
export function formatAssessmentTitle(title: string | null | undefined, subject?: string | null): string {
  if (!title?.trim()) return ACADEMIC_EMPTY;
  let t = title
    .trim()
    .replace(/\s*[-–—]\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim();

  const sub = subject?.trim();
  if (sub) {
    const redundant = new RegExp(`\\s·\\s${escapeRegExp(sub)}(?=\\s|$|\\()`, 'i');
    t = t.replace(redundant, '').replace(/\s·\s*$/, '').trim();
  }

  return t || ACADEMIC_EMPTY;
}
