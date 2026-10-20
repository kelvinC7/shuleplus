/** Strip stray backslashes and collapse whitespace for UI labels. */
export function cleanDisplayText(value: string | null | undefined, fallback = ''): string {
  if (!value) return fallback;
  return value
    .replace(/\\+/g, '')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
}
