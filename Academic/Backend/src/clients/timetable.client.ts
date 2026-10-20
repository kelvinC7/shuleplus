import { env } from '../config/env';

export type TimetableClassCourse = {
  id: string;
  subjectName: string;
  courseCode: string;
  periodsPerWeek: number;
  defaultCourseMarks?: number | null;
  teacherName: string;
  room: string | null;
  isCore?: boolean;
};

export type TimetableCourseCatalogRow = {
  id: string;
  subjectName: string;
  courseCode: string | null;
  isCore: boolean;
  periodsPerWeek: number;
  priority: number;
  color: string | null;
  requiresLab: boolean;
  prefersDoublePeriod: boolean;
};

export type TimetableClassCatalog = {
  className: string;
  classId: string | null;
  level: string;
  stream: string | null;
  section: string | null;
  studentCount: number;
  courseCount: number;
  teacherCount: number;
  totalPeriods: number;
  readinessPercent: number;
  status: 'ready' | 'incomplete' | 'missing';
  courses: TimetableClassCourse[];
};

function yearVariants(year?: string): Array<string | undefined> {
  if (!year?.trim()) return [undefined];
  const y = year.trim();
  const out: string[] = [y];
  const range = y.match(/^(\d{4})\s*[-/]\s*(\d{2,4})$/);
  if (range) {
    const start = range[1];
    const endRaw = range[2];
    const end = endRaw.length === 2 ? `${start.slice(0, 2)}${endRaw}` : endRaw;
    for (const v of [`${start}-${end}`, `${start}/${end}`, start, `${start}-${Number(start) + 1}`]) {
      if (!out.includes(v)) out.push(v);
    }
  } else if (/^\d{4}$/.test(y)) {
    for (const v of [`${y}-${Number(y) + 1}`, `${y}/${Number(y) + 1}`]) {
      if (!out.includes(v)) out.push(v);
    }
  }
  return out;
}

function termVariants(term?: string): Array<string | undefined> {
  if (!term?.trim()) return [undefined];
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

function courseTotal(rows: TimetableClassCatalog[]) {
  return rows.reduce((n, r) => n + (r.courses?.length ?? r.courseCount ?? 0), 0);
}

function timetableBaseUrl() {
  return env.TIMETABLE_API_URL.replace(/\/$/, '');
}

function timetableReachabilityHint() {
  const base = timetableBaseUrl();
  if (/localhost:3010\b/.test(base)) {
    return ` Check TIMETABLE_API_URL (currently ${base}); on the server it must be http://localhost:4014/api while Timetable is running.`;
  }
  return ` Timetable API base: ${base}.`;
}

async function ttFetch<T>(path: string, organizationId: string, query?: Record<string, string | undefined>) {
  const url = new URL(`${timetableBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`);
  url.searchParams.set('organizationId', organizationId);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'academic',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(
      /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(message)
        ? `Timetable unreachable (${message}).${timetableReachabilityHint()}`
        : `${message}.${timetableReachabilityHint()}`
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Timetable ${res.status}: ${body || res.statusText}.${timetableReachabilityHint()}`);
  }
  const json: any = await res.json();
  return (json.data ?? json) as T;
}

export async function fetchTimetableClassCatalog(
  organizationId: string,
  opts?: { term?: string; academicYear?: string }
) {
  const years = yearVariants(opts?.academicYear);
  const terms = termVariants(opts?.term);
  const attempts: Array<{ term?: string; academicYear?: string }> = [];
  for (const academicYear of years) {
    for (const term of terms) attempts.push({ term, academicYear });
  }
  for (const academicYear of years) attempts.push({ academicYear });
  for (const term of terms) attempts.push({ term });
  attempts.push({});

  let best: TimetableClassCatalog[] = [];
  let lastError: Error | null = null;
  const seen = new Set<string>();

  for (const query of attempts) {
    const key = `${query.term ?? ''}::${query.academicYear ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const data = await ttFetch<TimetableClassCatalog[]>('/internal/class-config', organizationId, query);
      const rows = Array.isArray(data) ? data : [];
      if (courseTotal(rows) > courseTotal(best)) best = rows;
      const exact =
        (query.academicYear ?? '') === (opts?.academicYear ?? '') &&
        (query.term ?? '') === (opts?.term ?? '');
      if (exact && courseTotal(rows) > 0) return rows;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn('[academic] Timetable class catalog failed:', lastError.message, query);
    }
  }

  if (courseTotal(best) > 0) return best;
  if (best.length) return best;
  if (lastError) throw lastError;
  return [];
}

export async function fetchTimetableCourseCatalog(organizationId: string): Promise<TimetableCourseCatalogRow[]> {
  try {
    const data = await ttFetch<TimetableCourseCatalogRow[]>('/internal/course-config', organizationId);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[academic] Timetable course catalog unavailable:', err instanceof Error ? err.message : err);
    return [];
  }
}

export async function fetchTimetableCourseCoreFlags(organizationId: string): Promise<Map<string, boolean>> {
  try {
    const data = await ttFetch<Array<{ subjectName: string; isCore: boolean }>>(
      '/internal/course-config-flags',
      organizationId
    );
    const map = new Map<string, boolean>();
    for (const row of Array.isArray(data) ? data : []) {
      const key = row.subjectName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (key) map.set(key, row.isCore !== false);
    }
    return map;
  } catch (err) {
    console.warn('[academic] Timetable course core flags unavailable:', err instanceof Error ? err.message : err);
    return new Map();
  }
}
