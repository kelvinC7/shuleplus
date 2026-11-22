export interface DateRange {
  gte?: Date;
  lte?: Date;
}

export interface DateFilterInput {
  /** Specific calendar day, `YYYY-MM-DD`. */
  date?: string;
  /** Inclusive range start, `YYYY-MM-DD`. */
  dateFrom?: string;
  /** Inclusive range end, `YYYY-MM-DD`. */
  dateTo?: string;
  /** ISO week, `YYYY-Www` (as produced by an `<input type="week" />`). */
  week?: string;
}

function startOfDay(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function endOfDay(value: string): Date | null {
  const parsed = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Parses an ISO week (`2026-W45`) into its Monday–Sunday range.
 * Week 1 is the week containing January 4th, matching ISO-8601.
 */
export function parseIsoWeek(week: string): DateRange | null {
  const match = /^(\d{4})-W(\d{1,2})$/.exec(week.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const weekNumber = Number(match[2]);
  if (!Number.isFinite(year) || weekNumber < 1 || weekNumber > 53) return null;

  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const isoDay = januaryFourth.getUTCDay() || 7;
  const firstMonday = new Date(januaryFourth);
  firstMonday.setUTCDate(januaryFourth.getUTCDate() - (isoDay - 1));

  const start = new Date(firstMonday);
  start.setUTCDate(firstMonday.getUTCDate() + (weekNumber - 1) * 7);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);

  return { gte: start, lte: end };
}

/**
 * Resolves the supported "time period" filters into a single range.
 * Priority: ISO week → specific date → date range.
 */
export function resolveDateRange(input?: DateFilterInput | null): DateRange | null {
  if (!input) return null;

  if (input.week) {
    const weekRange = parseIsoWeek(input.week);
    if (weekRange) return weekRange;
  }

  if (input.date) {
    const start = startOfDay(input.date);
    if (start) {
      const end = endOfDay(input.date);
      return end ? { gte: start, lte: end } : { gte: start };
    }
  }

  if (input.dateFrom || input.dateTo) {
    const range: DateRange = {};
    if (input.dateFrom) {
      const start = startOfDay(input.dateFrom);
      if (start) range.gte = start;
    }
    if (input.dateTo) {
      const end = endOfDay(input.dateTo);
      if (end) range.lte = end;
    }
    return range.gte || range.lte ? range : null;
  }

  return null;
}

/** Applies a resolved range to a Prisma `where` object for a date field. */
export function applyDateFilter(
  where: Record<string, any>,
  field: string,
  input?: DateFilterInput | null,
): void {
  const range = resolveDateRange(input);
  if (!range) return;
  where[field] = range;
}
