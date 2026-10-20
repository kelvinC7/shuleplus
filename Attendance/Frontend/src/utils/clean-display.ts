/** Strip stray backslashes and collapse whitespace for UI labels. */
export function cleanDisplayText(value: string | null | undefined, fallback = ''): string {
  if (value == null) return fallback;
  return String(value)
    .replace(/\\+/g, '')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
}
