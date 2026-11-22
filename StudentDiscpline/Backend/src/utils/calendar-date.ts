/** Parse YYYY-MM-DD as UTC calendar date (matches @db.Date storage, no timezone shift). */
export function parseCalendarDateInput(value: string | undefined | null, fallback = new Date()): Date {
  const raw = String(value ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    return new Date(Date.UTC(y, mo - 1, d));
  }
  const parsed = raw ? new Date(raw) : fallback;
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

export function formatCalendarDateIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
