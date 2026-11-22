/** Placeholder for missing UI values (no em dash). */
export const EMPTY = '';

export function orEmpty(value: string | null | undefined): string {
  const v = value?.trim();
  return v ? v : EMPTY;
}

export function joinParts(parts: Array<string | null | undefined>, sep = ' · '): string {
  const filtered = parts.map((p) => p?.trim()).filter(Boolean) as string[];
  return filtered.length ? filtered.join(sep) : EMPTY;
}
