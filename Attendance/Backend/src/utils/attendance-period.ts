import type { AcademicContext, TermDateRange } from "../clients/academic-settings.client";

export interface PeriodQuery {
  date?: string;
  from?: string;
  to?: string;
  academicYear?: string;
  term?: string;
}

export interface ResolvedPeriod {
  from: string;
  to: string;
  label: string;
  termRange?: TermDateRange;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Full-term weekday count + elapsed slice for attendance performance. */
export function resolveTermWeekdayMetrics(
  period: ResolvedPeriod,
  academic: AcademicContext,
  query?: PeriodQuery
): { termRange?: TermDateRange; termTotalDays?: number; elapsedWeekdays: number } {
  const elapsedWeekdays = countWeekdays(period.from, period.to);
  let termRange = period.termRange;
  if (!termRange && query?.term) {
    termRange = findTermRange(query.term, academic, query.academicYear) ?? undefined;
  }
  if (!termRange && academic.currentTerm) {
    termRange = findTermRange(academic.currentTerm, academic, query?.academicYear) ?? undefined;
  }
  const termTotalDays = termRange
    ? countWeekdays(termRange.start, termRange.end)
    : undefined;
  return { termRange, termTotalDays, elapsedWeekdays };
}

export function academicYearRange(year: string): TermDateRange | null {
  const m = year.match(/^(\d{4})-(\d{4})$/);
  if (!m) return null;
  return { start: `${m[1]}-09-01`, end: `${m[2]}-07-31` };
}

/** Rwanda-style term windows when IAM has no termDates map. */
export function approximateTermRange(term: string, academicYear: string): TermDateRange | null {
  const m = academicYear.match(/^(\d{4})-(\d{4})$/);
  if (!m) return academicYearRange(academicYear);
  const y1 = m[1];
  const y2 = m[2];
  const label = term.trim().toLowerCase();
  if (label.includes("1")) return { start: `${y1}-09-01`, end: `${y1}-12-20` };
  if (label.includes("2")) return { start: `${y2}-01-07`, end: `${y2}-04-04` };
  if (label.includes("3")) return { start: `${y2}-04-21`, end: `${y2}-07-31` };
  return academicYearRange(academicYear);
}

export function findTermRange(
  term: string,
  academic: AcademicContext,
  academicYearOverride?: string
): TermDateRange | null {
  if (academic.termDates?.[term]) return academic.termDates[term];
  const normalized = term.trim().toLowerCase();
  for (const [key, range] of Object.entries(academic.termDates ?? {})) {
    if (key.trim().toLowerCase() === normalized) return range;
  }
  const year =
    academicYearOverride?.trim() ||
    academic.currentAcademicYear ||
    academic.academicYears[0] ||
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  return approximateTermRange(term, year);
}

function periodToDate(toIso: string, today: string) {
  return toIso > today ? today : toIso;
}

export function resolvePeriod(query: PeriodQuery | undefined, academic: AcademicContext): ResolvedPeriod {
  const today = todayIso();

  if (query?.date && DATE_RE.test(query.date)) {
    return { from: query.date, to: query.date, label: query.date };
  }

  if (query?.from && query?.to && DATE_RE.test(query.from) && DATE_RE.test(query.to)) {
    const from = query.from <= query.to ? query.from : query.to;
    const to = query.from <= query.to ? query.to : query.from;
    return { from, to, label: `${from} → ${to}` };
  }

  if (query?.term) {
    const range = findTermRange(query.term, academic, query.academicYear);
    if (range) {
      const to = periodToDate(range.end, today);
      return {
        from: range.start,
        to: to >= range.start ? to : range.start,
        label: query.term,
        termRange: range,
      };
    }
  }

  if (query?.academicYear) {
    const range = academicYearRange(query.academicYear);
    if (range) {
      const to = periodToDate(range.end, today);
      return {
        from: range.start,
        to,
        label: query.academicYear,
        termRange: range,
      };
    }
  }

  if (academic.currentTerm) {
    const range = findTermRange(academic.currentTerm, academic);
    if (range) {
      const to = periodToDate(range.end, today);
      return {
        from: range.start,
        to: to >= range.start ? to : range.start,
        label: academic.currentTerm,
        termRange: range,
      };
    }
  }

  return { from: today, to: today, label: "Today" };
}

export function isWeekendIso(iso: string): boolean {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/** Inclusive list of calendar days from `fromIso` through `toIso` (YYYY-MM-DD). */
export function eachDayIso(fromIso: string, toIso: string): string[] {
  const from = new Date(`${fromIso}T00:00:00Z`);
  const to = new Date(`${toIso}T00:00:00Z`);
  if (to < from) return [];

  const out: string[] = [];
  const d = new Date(from);
  while (d <= to) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function countWeekdays(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`);
  const to = new Date(`${toIso}T00:00:00Z`);
  if (to < from) return 0;

  let count = 0;
  const d = new Date(from);
  while (d <= to) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}

export function termElapsedPercent(termRange: TermDateRange | undefined, asOf = todayIso()): number {
  if (!termRange) return 0;
  const start = new Date(`${termRange.start}T00:00:00Z`).getTime();
  const end = new Date(`${termRange.end}T00:00:00Z`).getTime();
  const now = new Date(`${asOf}T00:00:00Z`).getTime();
  if (end <= start) return 0;
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

const PRESENT_STATUSES = new Set(["PRESENT", "LATE", "ENTERED_ONLY"]);

export function attendanceRate(presentDays: number, expectedDays: number): number {
  if (expectedDays <= 0) return 0;
  return Math.min(100, Math.round((presentDays / expectedDays) * 100));
}

export function isPresentStatus(status: string): boolean {
  return PRESENT_STATUSES.has(status);
}
