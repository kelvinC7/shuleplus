/** Same academic year stored as 2026, 2026-2027, or 2026/2027. */
export function academicYearVariants(year?: string): string[] {
  if (!year?.trim()) return [];
  const y = year.trim();
  const out = new Set<string>([y]);
  const range = y.match(/^(\d{4})\s*[-/]\s*(\d{2,4})$/);
  if (range) {
    const start = range[1];
    const endRaw = range[2];
    const end = endRaw.length === 2 ? `${start.slice(0, 2)}${endRaw}` : endRaw;
    out.add(`${start}-${end}`);
    out.add(`${start}/${end}`);
    out.add(start);
    out.add(`${start}-${Number(start) + 1}`);
  } else if (/^\d{4}$/.test(y)) {
    out.add(`${y}-${Number(y) + 1}`);
    out.add(`${y}/${Number(y) + 1}`);
  }
  return [...out];
}

/** Same term stored as "Term 1", "TERM 1", or "Term I". */
export function termVariants(term?: string): string[] {
  if (!term?.trim()) return [];
  const t = term.trim();
  const out = new Set<string>([t]);
  const roman: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4 };
  const m = t.match(/(?:term\s*)?(\d+|iv|i{1,3})\b/i);
  if (m) {
    const token = m[1].toLowerCase();
    const n = roman[token] ?? Number(token);
    if (n >= 1 && n <= 4) {
      out.add(`Term ${n}`);
      out.add(`TERM ${n}`);
      out.add(`Term ${['I', 'II', 'III', 'IV'][n - 1]}`);
    }
  }
  return [...out];
}

export function prismaStringIn(values: string[]): string | { in: string[] } {
  if (values.length === 1) return values[0]!;
  return { in: values };
}
