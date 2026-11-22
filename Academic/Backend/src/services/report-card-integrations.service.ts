import { env } from '../config/env';

type AttendanceOverview = {
  records?: Array<{ date?: string; status?: string }>;
  summary?: { attendanceRate?: number; monthlyPresent?: number; monthlyAbsent?: number };
};

type DisciplineCaseRow = {
  appliedPoints?: number | null;
  incidentDate?: string | Date | null;
  status?: string | null;
};

type TermRange = { start: string; end: string };

function serviceHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-service-key': env.SERVICE_API_KEY,
    'x-source-service': 'academic',
  };
}

function uniqueCodes(codes: Array<string | null | undefined>) {
  return [...new Set(codes.map((c) => String(c ?? '').trim()).filter(Boolean))];
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function approximateTermRange(term: string, academicYear: string): TermRange | null {
  const m = academicYear.match(/^(\d{4})-(\d{4})$/);
  if (!m) return null;
  const y1 = m[1];
  const y2 = m[2];
  const label = term.trim().toLowerCase();
  if (label.includes('1')) return { start: `${y1}-09-01`, end: `${y1}-12-20` };
  if (label.includes('2')) return { start: `${y2}-01-07`, end: `${y2}-04-04` };
  if (label.includes('3')) return { start: `${y2}-04-21`, end: `${y2}-07-31` };
  return { start: `${y1}-09-01`, end: `${y2}-07-31` };
}

function countWeekdays(fromIso: string, toIso: string): number {
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

function isWeekendIso(day: string) {
  const d = new Date(`${day}T00:00:00Z`).getUTCDay();
  return d === 0 || d === 6;
}

function isPresentStatus(status: string) {
  return status === 'PRESENT' || status === 'LATE' || status === 'ENTERED_ONLY';
}

function termAttendanceRate(
  records: Array<{ date?: string; status?: string }>,
  termRange: TermRange
): { rate: number; present: number; absent: number; late: number; days: number } {
  const today = todayIso();
  const periodEnd = termRange.end > today ? today : termRange.end;
  const inTerm = records.filter((r) => {
    const day = r.date?.slice(0, 10);
    return day && day >= termRange.start && day <= periodEnd;
  });

  const presentDays = new Set<string>();
  let absent = 0;
  let late = 0;
  for (const r of inTerm) {
    const day = r.date!.slice(0, 10);
    const st = r.status ?? '';
    if (st === 'LATE') late += 1;
    if (isPresentStatus(st) && !isWeekendIso(day)) presentDays.add(day);
    else if (st === 'ABSENT' && !isWeekendIso(day)) absent += 1;
  }

  const termTotalDays = countWeekdays(termRange.start, termRange.end);
  const present = presentDays.size;
  const rate =
    termTotalDays > 0 ? Math.min(100, Math.round((present / termTotalDays) * 100)) : 0;

  return { rate, present, absent, late, days: termTotalDays };
}

export async function fetchReportAttendance(
  organizationId: string,
  studentKeys: string[],
  opts?: { academicYear?: string; term?: string | null }
): Promise<{
  available: boolean;
  rate?: number | null;
  days?: number | null;
  present?: number | null;
  absent?: number | null;
  late?: number | null;
  message?: string;
}> {
  const codes = uniqueCodes(studentKeys);
  if (!organizationId || !codes.length) {
    return { available: false, message: 'Student identity missing for attendance lookup.' };
  }

  try {
    const q = new URLSearchParams({ organizationId });
    for (const code of codes) q.append('studentCode', code);
    const res = await fetch(`${env.ATTENDANCE_API_URL.replace(/\/$/, '')}/service/attendance?${q}`, {
      headers: serviceHeaders(),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      return { available: false, message: 'Attendance module unavailable.' };
    }
    const json = (await res.json()) as { data?: AttendanceOverview };
    const data = json.data;
    const records = (data?.records ?? []).filter((r) => r.status && r.status !== 'EXCUSED');

    const term = opts?.term?.trim();
    const year = opts?.academicYear?.trim();
    if (term && year) {
      const range = approximateTermRange(term, year);
      if (range && records.length) {
        const stats = termAttendanceRate(records, range);
        return {
          available: true,
          rate: stats.rate,
          days: stats.days,
          present: stats.present,
          absent: stats.absent,
          late: stats.late,
        };
      }
    }

    if (records.length) {
      const present = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
      const late = records.filter((r) => r.status === 'LATE').length;
      const absent = records.filter((r) => r.status === 'ABSENT').length;
      const rate = Math.round((present / records.length) * 1000) / 10;
      return {
        available: true,
        rate,
        days: records.length,
        present,
        absent,
        late,
      };
    }
    const summary = data?.summary;
    if (summary?.attendanceRate != null) {
      return {
        available: true,
        rate: summary.attendanceRate,
        present: summary.monthlyPresent ?? null,
        absent: summary.monthlyAbsent ?? null,
      };
    }
    return { available: false, message: 'No attendance records for this learner yet.' };
  } catch {
    return { available: false, message: 'Could not reach Attendance module.' };
  }
}

function caseInTerm(c: DisciplineCaseRow, range: TermRange | null): boolean {
  if (!range) return true;
  const raw = c.incidentDate;
  if (!raw) return true;
  const day = typeof raw === 'string' ? raw.slice(0, 10) : raw.toISOString().slice(0, 10);
  return day >= range.start && day <= range.end;
}

export async function fetchReportDiscipline(
  organizationId: string,
  studentCode: string,
  opts?: { academicYear?: string; term?: string | null }
): Promise<{
  available: boolean;
  score?: number | null;
  maxScore?: number;
  incidents?: number;
  record?: string | null;
  message?: string;
}> {
  const code = studentCode?.trim();
  if (!organizationId || !code) {
    return { available: false, message: 'Student code missing for discipline lookup.' };
  }

  const termRange =
    opts?.term?.trim() && opts?.academicYear?.trim()
      ? approximateTermRange(opts.term, opts.academicYear)
      : null;

  try {
    const q = new URLSearchParams({ organizationId, studentCode: code });
    const res = await fetch(
      `${env.DISCIPLINE_API_URL.replace(/\/$/, '')}/service/discipline/cases?${q}`,
      { headers: serviceHeaders(), signal: AbortSignal.timeout(12000) }
    );
    if (!res.ok) {
      return { available: false, message: 'Discipline module unavailable.' };
    }
    const json = (await res.json()) as { data?: DisciplineCaseRow[] };
    const cases = (Array.isArray(json.data) ? json.data : []).filter((c) => caseInTerm(c, termRange));
    const maxScore = 100;
    let score = maxScore;
    for (const c of cases) {
      const pts = Number(c.appliedPoints);
      if (Number.isFinite(pts)) score += pts;
    }
    score = Math.max(0, Math.min(maxScore, Math.round(score * 10) / 10));
    const incidents = cases.length;
    if (!incidents && score === maxScore) {
      return {
        available: true,
        score,
        maxScore,
        incidents: 0,
        record: `${score}/${maxScore}`,
        message: 'No discipline incidents this period.',
      };
    }
    return {
      available: true,
      score,
      maxScore,
      incidents,
      record: `${score}/${maxScore}`,
    };
  } catch {
    return { available: false, message: 'Could not reach Discipline module.' };
  }
}
