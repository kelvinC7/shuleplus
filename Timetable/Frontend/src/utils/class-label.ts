/** Display label: no stream → "N1"; with stream → "P1 A". */
export function formatClassLabel(name: string, stream?: string | null): string {
  const base = name.trim();
  const st = stream?.trim();
  return st ? `${base} ${st}`.trim() : base;
}

export function classOptionLabel(c: { name: string; stream?: string | null; label: string }): string {
  return c.label || formatClassLabel(c.name, c.stream);
}
