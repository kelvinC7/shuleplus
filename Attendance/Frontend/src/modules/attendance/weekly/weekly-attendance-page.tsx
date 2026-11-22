'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, FileDown, Loader2, RefreshCw, Search, Users, UserSquare2, X } from 'lucide-react';
import { PageShell, Panel, KpiGrid } from '@/components/attendance-ui';
import { isoWeekNumber, shiftWeekIso, startOfWeekIso, weekDaysIso } from '@/components/attendance-filters';
import { ListPagination } from '@/components/list-pagination';
import { attendanceApi, type AttendanceRecord } from '@/services/attendance-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { buildSchoolPdfBranding, fetchSchoolOrganizationProfile } from '@/utils/school-pdf-branding';
import { exportWeeklyRegisterPdf, type WeeklyRegisterCell, type WeeklyRegisterDay, type WeeklyRegisterRow } from '@/utils/export-attendance-pdf';
import { formatAttendanceTime } from '@/utils/format-attendance-time';

type Audience = 'STUDENT' | 'STAFF';

type RosterPerson = {
  key: string;
  name: string;
  code?: string | null;
  group?: string | null;
  role?: string | null;
};

type DayRecord = AttendanceRecord & { synthetic?: boolean };

function longDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
function weekdayName(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });
}

function isFutureDay(iso: string) {
  const today = new Date();
  const t = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  return iso.slice(0,10) > t;
}

function personKeyFromRecord(r: DayRecord, audience: Audience) {
  const k = (r.studentId || r.studentCode || r.cardNumber || r.studentName || r.id || '').trim().toLowerCase();
  return `${audience}:${k || r.id}`;
}

function toCell(rec: DayRecord | undefined, dayIso: string): WeeklyRegisterCell {
  if (isFutureDay(dayIso)) return { status: 'FUTURE', raw: undefined };
  if (!rec) return { status: 'ABSENT' };
  const status = String(rec.attendanceStatus ?? rec.display?.attendanceStatus ?? rec.status ?? '').toUpperCase();
  const punctuality = String(rec.punctuality ?? rec.display?.punctuality ?? '').toUpperCase();
  const checkout = String(rec.checkoutStatus ?? rec.display?.checkoutStatus ?? '').toUpperCase();
  const inTime = rec.entryTime ?? null;
  const outTime = rec.exitTime ?? null;
  const base = { inTime, outTime, raw: rec as any };
  if (status === 'EXCUSED' || rec.status === 'EXCUSED') return { ...base, status: 'EXCUSED', detail: 'Approved excused' };
  if (status === 'HOLIDAY') return { ...base, status: 'HOLIDAY', detail: 'School closed' };
  if (status === 'ABSENT' || rec.synthetic || !inTime) {
    // if explicitly absent/synthetic/no tap
    if (!inTime && !outTime) return { ...base, status: 'ABSENT', detail: rec.synthetic ? 'No valid attendance / not tapped' : 'Absent' };
  }
  if (inTime && !outTime) {
    return { ...base, status: 'INCOMPLETE', detail: 'IN recorded, OUT missing' };
  }
  if (!inTime && outTime) {
    return { ...base, status: 'INCOMPLETE', detail: 'OUT recorded, IN missing' };
  }
  if (status === 'PRESENT' || inTime) {
    if (punctuality === 'LATE') return { ...base, status: 'LATE', detail: 'Arrived late' };
    if (checkout === 'PENDING' || checkout === 'MISSING') return { ...base, status: 'INCOMPLETE', detail: 'Check-out pending/missing' };
    return { ...base, status: 'PRESENT', detail: 'Valid attendance recorded' };
  }
  return { ...base, status: 'ABSENT', detail: 'No valid attendance' };
}

function computeWeekly(days: WeeklyRegisterDay[], cells: Record<string, WeeklyRegisterCell>) {
  let presentDays = 0;
  let eligibleDays = 0;
  for (const d of days) {
    const c = cells[d.iso];
    if (!c) continue;
    if (c.status === 'FUTURE' || c.status === 'HOLIDAY') continue;
    if (c.status === 'EXCUSED') continue; // excluded from eligible per spec
    eligibleDays += 1;
    if (c.status === 'PRESENT' || c.status === 'LATE' || c.status === 'INCOMPLETE') {
      // Incomplete flagged separately but person attended in some form; count as present-day attendance signal?
      // Spec says "flagged separately and not silently counted as absent" - we count as present for % but show I.
      presentDays += 1;
    }
    // ABSENT not counted
  }
  const weeklyPercent = eligibleDays > 0 ? (presentDays / eligibleDays) * 100 : null;
  return { weeklyPercent, presentDays, eligibleDays };
}

async function fetchDay(audience: Audience, date: string, filters: { className?: string; department?: string; staffRole?: string; q?: string }) {
  const limit = 100;
  const all: DayRecord[] = [];
  for (let page = 1; page <= 30; page++) {
    const params: any = { date, page, limit, sortBy: 'name', sortDir: 'asc' };
    if (audience === 'STUDENT') {
      if (filters.className) params.className = filters.className;
    } else {
      if (filters.department) params.department = filters.department;
      if (filters.staffRole) params.staffRole = filters.staffRole;
    }
    if (filters.q) params.q = filters.q;
    const { data } = audience === 'STUDENT' ? await attendanceApi.studentRoster(params) : await attendanceApi.staffRoster(params);
    const batch = (data.data?.items ?? []) as DayRecord[];
    all.push(...batch);
    if (batch.length < limit) break;
  }
  return all;
}

function StatusPill({ status }: { status: WeeklyRegisterCell['status'] }) {
  const map: Record<string, string> = {
    PRESENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    LATE: 'bg-amber-50 text-amber-700 border-amber-200',
    ABSENT: 'bg-red-50 text-red-700 border-red-200',
    INCOMPLETE: 'bg-sky-50 text-sky-700 border-sky-200',
    EXCUSED: 'bg-violet-50 text-violet-700 border-violet-200',
    HOLIDAY: 'bg-slate-100 text-slate-600 border-slate-200',
    FUTURE: 'bg-slate-50 text-slate-400 border-slate-200',
  };
  const label: Record<string, string> = { PRESENT: 'P', LATE: 'L', ABSENT: 'A', INCOMPLETE: 'I', EXCUSED: 'E', HOLIDAY: 'H', FUTURE: '—' };
  return <span className={`inline-flex min-w-[22px] items-center justify-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${map[status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>{label[status] || '—'}</span>;
}

export function WeeklyAttendancePage() {
  const toast = useToast();
  const [audience, setAudience] = useState<Audience>('STUDENT');
  const [weekStart, setWeekStart] = useState(startOfWeekIso());
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [streamOrRole, setStreamOrRole] = useState('');
  const [threshold, setThreshold] = useState<string>('');
  const [belowOnly, setBelowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filterOptions, setFilterOptions] = useState<{ classes: string[]; departments: string[]; staffRoles: string[] }>({ classes: [], departments: [], staffRoles: [] });
  const [schoolName, setSchoolName] = useState('School');
  const [rows, setRows] = useState<Array<RosterPerson & { days: Record<string, WeeklyRegisterCell>; weeklyPercent: number | null; presentDays: number; eligibleDays: number }>>([]);
  const [drawer, setDrawer] = useState<{ person: RosterPerson; dayIso: string; cell: WeeklyRegisterCell } | null>(null);

  const days: WeeklyRegisterDay[] = useMemo(() => {
    const all = weekDaysIso(weekStart);
    return all.slice(0, 5).map((iso) => ({ iso, weekday: weekdayName(iso), label: shortDate(iso) }));
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    const from = days[0]?.iso || weekStart;
    const to = days[4]?.iso || weekStart;
    return `${longDate(from)} – ${longDate(to)} (Week ${isoWeekNumber(from)})`;
  }, [days, weekStart]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [fo, profile] = await Promise.all([
          attendanceApi.attendanceFilterOptions().then((r) => r.data.data).catch(() => null),
          fetchSchoolOrganizationProfile().catch(() => null),
        ]);
        if (!mounted) return;
        if (fo) setFilterOptions({ classes: fo.classes || [], departments: fo.departments || [], staffRoles: fo.staffRoles || [] });
        if (profile?.schoolName) setSchoolName(profile.schoolName);
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => { setPage(1); }, [audience, weekStart, search, group, streamOrRole, threshold, belowOnly]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        className: audience === 'STUDENT' ? (group || undefined) : undefined,
        department: audience === 'STAFF' ? (group || undefined) : undefined,
        staffRole: audience === 'STAFF' ? (streamOrRole || undefined) : undefined,
        q: search.trim() || undefined,
      };
      const perDay = await Promise.all(days.map((d) => fetchDay(audience, d.iso, filters).catch(() => [] as DayRecord[])));
      const byKey = new Map<string, RosterPerson & { days: Record<string, WeeklyRegisterCell> }>();
      for (let i = 0; i < days.length; i++) {
        const dayIso = days[i].iso;
        for (const rec of perDay[i] || []) {
          const key = personKeyFromRecord(rec, audience);
          if (!byKey.has(key)) {
            byKey.set(key, {
              key,
              name: rec.studentName || 'Unknown',
              code: rec.studentCode || null,
              group: audience === 'STUDENT' ? (rec.className || rec.groupLabel || null) : (rec.department || rec.className || rec.groupLabel || null),
              role: audience === 'STAFF' ? (rec.staffRole || null) : null,
              days: {},
            });
          }
          const entry = byKey.get(key)!;
          // keep best record for the day (prefer one with entryTime)
          const existing = entry.days[dayIso]?.raw as any;
          if (!existing || (rec.entryTime && !existing.entryTime)) {
            entry.days[dayIso] = toCell(rec, dayIso);
          }
          // update name/group if better
          if (rec.studentName && (!entry.name || entry.name === 'Unknown')) entry.name = rec.studentName;
          if (audience === 'STUDENT' && rec.className) entry.group = rec.className;
          if (audience === 'STAFF' && (rec.department || rec.className)) entry.group = rec.department || rec.className || entry.group;
        }
      }
      // ensure all days present
      const computed = [...byKey.values()].map((p) => {
        const dayCells: Record<string, WeeklyRegisterCell> = {};
        for (const d of days) dayCells[d.iso] = p.days[d.iso] || toCell(undefined, d.iso);
        const stats = computeWeekly(days, dayCells);
        return { ...p, days: dayCells, ...stats };
      }).sort((a, b) => a.name.localeCompare(b.name) || (a.group || '').localeCompare(b.group || ''));

      // client filters: stream/position for students? stream not explicit in rosters; we only have group/className filter applied server-side.
      let filtered = computed;
      const th = Number(threshold);
      if (belowOnly && Number.isFinite(th) && th >= 0) {
        filtered = filtered.filter((r) => r.weeklyPercent != null && r.weeklyPercent < th);
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter((r) => r.name.toLowerCase().includes(q) || (r.code || '').toLowerCase().includes(q) || (r.group || '').toLowerCase().includes(q));
      }
      setRows(filtered);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load weekly attendance'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [audience, days, group, search, streamOrRole, belowOnly, threshold, toast]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const pageRows = useMemo(() => rows.slice((page - 1) * limit, page * limit), [rows, page, limit]);

  const stats = useMemo(() => {
    const totalPeople = rows.length;
    let presentDays = 0;
    let absentDays = 0;
    let pctSum = 0;
    let pctCount = 0;
    for (const r of rows) {
      for (const d of days) {
        const c = r.days[d.iso];
        if (!c || c.status === 'FUTURE' || c.status === 'HOLIDAY' || c.status === 'EXCUSED') continue;
        if (c.status === 'ABSENT') absentDays += 1; else presentDays += 1;
      }
      if (r.weeklyPercent != null) { pctSum += r.weeklyPercent; pctCount += 1; }
    }
    return { totalPeople, presentDays, absentDays, weeklyPercent: pctCount ? pctSum / pctCount : null };
  }, [rows, days]);

  async function doExport() {
    setExporting(true);
    try {
      const profile = await fetchSchoolOrganizationProfile().catch(() => null);
      const groupLabel = group || (audience === 'STUDENT' ? 'All classes' : 'All departments');
      const meta = buildSchoolPdfBranding(profile, weekLabel, {
        title: 'Weekly Attendance Report',
        subtitle: `Week: ${weekLabel}`,
        audienceLabel: `${audience === 'STUDENT' ? 'Students' : 'Staff'} · ${groupLabel}${streamOrRole ? ' · ' + streamOrRole : ''}`,
      });
      const exportRows: WeeklyRegisterRow[] = rows.map((r, i) => ({
        no: i + 1,
        key: r.key,
        name: r.name,
        code: r.code,
        group: r.group,
        days: r.days,
        weeklyPercent: r.weeklyPercent,
        presentDays: r.presentDays,
        eligibleDays: r.eligibleDays,
      }));
      await exportWeeklyRegisterPdf({ ...meta, weekLabel }, days, exportRows, stats);
      toast.success('Weekly attendance PDF exported');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to export weekly attendance PDF'));
    } finally {
      setExporting(false);
    }
  }

  const kpis = [
    { label: 'Total People', value: stats.totalPeople },
    { label: 'Weekly Attendance', value: stats.weeklyPercent == null ? '—' : `${stats.weeklyPercent.toFixed(1)}%` },
    { label: 'Present Days', value: stats.presentDays },
    { label: 'Absent Days', value: stats.absentDays },
  ];

  return (
    <PageShell
      title="Weekly Attendance"
      subtitle="Monitor daily IN/OUT attendance and weekly performance (Monday–Friday register)."
      actions={(
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Refresh
          </button>
          <button type="button" className="btn-primary" onClick={() => void doExport()} disabled={exporting || loading || rows.length === 0}>
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} Export PDF
          </button>
        </div>
      )}
    >
      <KpiGrid items={kpis} columns={4} />

      <Panel title="Filters" action={<span className="text-xs text-muted">{weekLabel}</span>}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button type="button" onClick={() => { setAudience('STUDENT'); setGroup(''); setStreamOrRole(''); }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${audience==='STUDENT'?'bg-white text-navy shadow-sm':'text-muted'}`}><Users size={15}/> Students</button>
              <button type="button" onClick={() => { setAudience('STAFF'); setGroup(''); setStreamOrRole(''); }} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${audience==='STAFF'?'bg-white text-navy shadow-sm':'text-muted'}`}><UserSquare2 size={15}/> Staff</button>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1">
              <button type="button" className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-navy" onClick={() => setWeekStart(shiftWeekIso(weekStart, -1))} aria-label="Previous week"><ChevronLeft size={16}/></button>
              <div className="relative">
                <CalendarRange className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <input type="date" className="w-[150px] rounded-lg border-0 bg-transparent py-1.5 pl-8 pr-1 text-xs font-semibold text-navy outline-none" value={startOfWeekIso(weekStart)} onChange={(e) => setWeekStart(startOfWeekIso(e.target.value))} />
              </div>
              <button type="button" className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-navy" onClick={() => setWeekStart(shiftWeekIso(weekStart, 1))} aria-label="Next week"><ChevronRight size={16}/></button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <label className="text-xs font-semibold text-muted">
              {audience === 'STUDENT' ? 'Class' : 'Department'}
              <select className="input mt-1 !py-2" value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="">{audience === 'STUDENT' ? 'All classes' : 'All departments'}</option>
                {(audience === 'STUDENT' ? filterOptions.classes : filterOptions.departments).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted">
              {audience === 'STUDENT' ? 'Stream' : 'Position'}
              <select className="input mt-1 !py-2" value={streamOrRole} onChange={(e) => setStreamOrRole(e.target.value)} disabled={audience==='STUDENT'}>
                <option value="">{audience === 'STUDENT' ? 'All streams' : 'All positions'}</option>
                {audience === 'STAFF' ? filterOptions.staffRoles.map((v) => <option key={v} value={v}>{v}</option>) : null}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted lg:col-span-2">
              Search
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input className="input !py-2 pl-9" placeholder={audience==='STUDENT' ? 'Search student name or code' : 'Search staff name or ID'} value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </label>
            <label className="text-xs font-semibold text-muted">
              Below threshold (%)
              <input className="input mt-1 !py-2" type="number" min={0} max={100} placeholder="e.g. 75" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </label>
            <label className="flex items-end gap-2 pb-1 text-xs font-semibold text-muted">
              <input type="checkbox" className="h-4 w-4 accent-[#000435]" checked={belowOnly} onChange={(e) => setBelowOnly(e.target.checked)} />
              Show below threshold only
            </label>
          </div>
          <p className="text-[11px] text-muted">Weekly % = Days Present / Eligible working days (Mon–Fri). Future days and excused/holiday days are excluded from eligible days where detected. Incomplete IN/OUT is flagged and not silently counted as absent.</p>
        </div>
      </Panel>

      <Panel
        title={`Weekly Attendance Register · ${audience === 'STUDENT' ? 'Students' : 'Staff'}`}
        action={<span className="text-xs text-muted">{rows.length} person(s)</span>}
        flush
      >
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse text-sm">
            <thead>
              <tr className="bg-navy text-white">
                <th rowSpan={2} className="sticky left-0 z-20 border-r border-white/10 bg-navy px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide">No.</th>
                <th rowSpan={2} className="sticky left-[44px] z-20 min-w-[220px] border-r border-white/10 bg-navy px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide">Name</th>
                {days.map((d) => (
                  <th key={d.iso} colSpan={3} className="border-l border-white/10 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide">
                    <div>{d.weekday}</div>
                    <div className="text-[10px] font-medium text-white/70 normal-case">{d.label}</div>
                  </th>
                ))}
                <th rowSpan={2} className="sticky right-0 z-20 border-l border-white/10 bg-navy px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide">Weekly %</th>
              </tr>
              <tr className="bg-[#0b2a5a] text-white/90">
                {days.map((d) => (
                  <FragmentCols key={d.iso} />
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={2 + days.length * 3 + 1} className="px-4 py-10 text-center text-sm text-muted"><div className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin"/> Loading weekly register…</div></td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={2 + days.length * 3 + 1} className="px-4 py-10 text-center text-sm text-muted">No records found for the selected filters.</td></tr>
              ) : pageRows.map((r, idx) => {
                const no = (page - 1) * limit + idx + 1;
                return (
                  <tr key={r.key} className="border-b border-border/70 hover:bg-slate-50/70">
                    <td className="sticky left-0 z-10 border-r border-border/60 bg-white px-3 py-2 text-xs text-muted">{no}</td>
                    <td className="sticky left-[44px] z-10 min-w-[220px] border-r border-border/60 bg-white px-3 py-2">
                      <div className="font-semibold text-navy">{r.name}</div>
                      <div className="text-[11px] text-muted">{[r.code, r.group, r.role].filter(Boolean).join(' · ') || '—'}</div>
                    </td>
                    {days.map((d) => {
                      const c = r.days[d.iso] || { status: 'ABSENT' as const };
                      return (
                        <td key={d.iso} colSpan={3} className="border-l border-border/60 px-1.5 py-1.5">
                          <button
                            type="button"
                            className="grid w-full grid-cols-3 items-center gap-1 rounded-lg px-1 py-1 text-center hover:bg-slate-100"
                            onClick={() => setDrawer({ person: r, dayIso: d.iso, cell: c })}
                            title="View day details"
                          >
                            <span className="font-mono text-[11px] text-navy">{c.inTime ? formatAttendanceTime(c.inTime) : '—'}</span>
                            <span className="font-mono text-[11px] text-navy">{c.outTime ? formatAttendanceTime(c.outTime) : '—'}</span>
                            <span className="flex justify-center"><StatusPill status={c.status} /></span>
                          </button>
                        </td>
                      );
                    })}
                    <td className="sticky right-0 z-10 border-l border-border/60 bg-white px-3 py-2 text-center font-bold text-navy">
                      {r.weeklyPercent == null ? '—' : `${Math.round(r.weeklyPercent)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border/60 p-3 sm:p-4">
          <ListPagination
            page={page}
            totalPages={totalPages}
            limit={limit}
            total={rows.length}
            onPageChange={setPage}
            onLimitChange={(n) => { setLimit(n); setPage(1); }}
          />
        </div>
      </Panel>

      {drawer ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/40">
          <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-navy">Day attendance details</h3>
                <p className="mt-0.5 text-sm text-muted">{drawer.person.name} · {longDate(drawer.dayIso)}</p>
              </div>
              <button type="button" className="btn-ghost !p-2" onClick={() => setDrawer(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-border bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">Status</span>
                  <StatusPill status={drawer.cell.status} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-muted">IN time</dt><dd className="font-semibold text-navy">{formatAttendanceTime(drawer.cell.inTime)}</dd></div>
                  <div><dt className="text-xs text-muted">OUT time</dt><dd className="font-semibold text-navy">{formatAttendanceTime(drawer.cell.outTime)}</dd></div>
                  <div><dt className="text-xs text-muted">Group</dt><dd className="font-semibold text-navy">{drawer.person.group || '—'}</dd></div>
                  <div><dt className="text-xs text-muted">Code</dt><dd className="font-semibold text-navy">{drawer.person.code || '—'}</dd></div>
                </dl>
                {drawer.cell.detail ? <p className="mt-3 text-xs text-muted">{drawer.cell.detail}</p> : null}
              </div>
              <div className="rounded-xl border border-border p-4">
                <h4 className="text-sm font-semibold text-navy">Source / record</h4>
                {drawer.cell.raw ? (
                  <dl className="mt-2 space-y-2 text-xs">
                    <div className="flex justify-between gap-3"><dt className="text-muted">Record ID</dt><dd className="font-mono text-navy">{String((drawer.cell.raw as any).id || '—')}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Device / Gate</dt><dd className="text-navy">{String((drawer.cell.raw as any).gateName || (drawer.cell.raw as any).deviceCode || '—')}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Card</dt><dd className="text-navy">{String((drawer.cell.raw as any).cardNumber || '—')}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Direction</dt><dd className="text-navy">{String((drawer.cell.raw as any).direction || '—')}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Schedule rule</dt><dd className="text-navy">{String((drawer.cell.raw as any).scheduleRuleName || '—')}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-muted">Synthetic/derived</dt><dd className="text-navy">{(drawer.cell.raw as any).synthetic ? 'Yes' : 'No'}</dd></div>
                  </dl>
                ) : (
                  <p className="mt-2 text-xs text-muted">No original attendance event found for this day (absent/not tapped, future, or excluded). Manual correction history is shown when available in the source record.</p>
                )}
              </div>
              <p className="text-[11px] text-muted">If a person has multiple scans, the day record reflects the configured/recorded IN and OUT times. Raw event audit details depend on available attendance data.</p>
            </div>
          </div>
          <button type="button" className="flex-1" aria-label="Close drawer" onClick={() => setDrawer(null)} />
        </div>
      ) : null}
    </PageShell>
  );
}

function FragmentCols() {
  return (
    <>
      <th className="border-l border-white/10 px-2 py-1.5 text-center text-[10px] font-semibold">IN</th>
      <th className="border-l border-white/10 px-2 py-1.5 text-center text-[10px] font-semibold">OUT</th>
      <th className="border-l border-white/10 px-2 py-1.5 text-center text-[10px] font-semibold">Status</th>
    </>
  );
}
