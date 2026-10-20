'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Loader2,
  Moon,
  RefreshCw,
  Sun,
  TrendingUp,
} from 'lucide-react';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  fetchMyAttendanceHistory,
  fetchMyAttendanceSummary,
  fetchMyAttendanceToday,
  submitAttendanceCorrection,
  workApiError,
  type MyAttendanceDay,
  type MyAttendanceSummary,
} from '@/services/teacher-work-api';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'present', label: 'Present' },
  { id: 'late', label: 'Late' },
  { id: 'absent', label: 'Absent' },
  { id: 'permission', label: 'Permission' },
  { id: 'missing_check_out', label: 'Missing Check-Out' },
];

export function MyAttendanceView() {
  const { term, academicYear, setTerm, setAcademicYear, settings } = useAcademicSettings();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState('all');
  const [summary, setSummary] = useState<MyAttendanceSummary | null>(null);
  const [today, setToday] = useState<(MyAttendanceDay & { schoolStart?: string; dateLabel?: string }) | null>(null);
  const [history, setHistory] = useState<MyAttendanceDay[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 15;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionDate, setCorrectionDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t, h] = await Promise.all([
        fetchMyAttendanceSummary({ month, year, term, academicYear }),
        fetchMyAttendanceToday(),
        fetchMyAttendanceHistory({ month, year, status: statusFilter === 'all' ? undefined : statusFilter }),
      ]);
      setSummary(s);
      setToday(t);
      setHistory(h);
    } catch (err) {
      setError(workApiError(err, 'Could not load your attendance'));
    } finally {
      setLoading(false);
    }
  }, [month, year, term, academicYear, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setHistoryPage(1);
  }, [statusFilter, month, year]);

  const historyTotalPages = Math.max(1, Math.ceil(history.length / historyPageSize));
  const historySlice = history.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize);

  async function handleCorrection(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await submitAttendanceCorrection({
        attendanceDate: String(fd.get('date')),
        correctionType: String(fd.get('type')),
        expectedTime: String(fd.get('expectedTime') || '') || undefined,
        reason: String(fd.get('reason')),
      });
      setCorrectionOpen(false);
      await load();
    } catch (err) {
      setError(workApiError(err, 'Could not submit correction'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 pb-8 sm:space-y-6">
      <Header
        term={term}
        academicYear={academicYear}
        settings={settings}
        onTerm={setTerm}
        onYear={setAcademicYear}
        onRefresh={() => void load()}
        loading={loading}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {summary ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <Kpi label="Attendance" value={`${summary.attendanceRate}%`} />
          <Kpi label="On Time" value={String(summary.onTime)} tone="emerald" />
          <Kpi label="Late Days" value={String(summary.late)} tone="amber" />
          <Kpi label="Absent" value={String(summary.absent)} tone="red" />
        </div>
      ) : null}

      {summary ? (
        <div className="grid gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Working Days" value={summary.workingDays} />
          <MiniStat label="Present" value={summary.present} />
          <MiniStat label="Approved Permission" value={summary.approvedPermission} />
          <MiniStat label="Lesson Check-Ins" value={summary.lessonCheckIns} hint="Classroom QR" />
        </div>
      ) : null}

      {today ? <TodayCard today={today} onRequestCorrection={() => { setCorrectionDate(today.date); setCorrectionOpen(true); }} /> : null}

      {summary ? <PunctualityChart summary={summary} /> : null}

      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-navy">Attendance History</h2>
          <div className="flex flex-wrap gap-2">
            <select className="input !w-auto !py-1.5 text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select className="input !w-auto !py-1.5 text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                statusFilter === f.id ? 'border-navy bg-navy text-white' : 'border-border text-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : (
          <>
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted">
                    <th className="px-3 py-2 w-12">#</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Morning</th>
                    <th className="px-3 py-2">Evening</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {historySlice.map((row, i) => (
                    <tr key={row.date} className="border-b border-border/60 hover:bg-slate-50/80">
                      <td className="px-3 py-2.5 font-mono text-xs text-muted">{(historyPage - 1) * historyPageSize + i + 1}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-navy">{row.date.slice(5)}</span>
                        <span className="ml-1 text-muted">{row.dayName}</span>
                      </td>
                      <td className="px-3 py-2.5"><TimeCell time={row.morningCheckIn} status={row.morningStatus} late={row.minutesLateMorning} /></td>
                      <td className="px-3 py-2.5"><TimeCell time={row.eveningCheckOut} status={row.eveningStatus} /></td>
                      <td className="px-3 py-2.5"><DayStatusBadge status={row.dayStatus} /></td>
                      <td className="px-3 py-2.5 text-muted">{row.workedHours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted">
              <span>
                {(historyPage - 1) * historyPageSize + 1}–{Math.min(historyPage * historyPageSize, history.length)} of {history.length}
              </span>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary !py-1 !px-2 text-xs" disabled={historyPage <= 1} onClick={() => setHistoryPage((p) => p - 1)}>Prev</button>
                <span>{historyPage}/{historyTotalPages}</span>
                <button type="button" className="btn-secondary !py-1 !px-2 text-xs" disabled={historyPage >= historyTotalPages} onClick={() => setHistoryPage((p) => p + 1)}>Next</button>
              </div>
            </div>
            <div className="mt-4 space-y-2 md:hidden">
              {historySlice.map((row) => (
                <div key={row.date} className="rounded-xl border border-border p-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-navy">{row.date}</span>
                    <DayStatusBadge status={row.dayStatus} />
                  </div>
                  <p className="mt-2 text-xs text-muted">🌅 {row.morningCheckIn ?? '—'} · 🌙 {row.eveningCheckOut ?? '—'}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {correctionOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center">
          <form onSubmit={(e) => void handleCorrection(e)} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-navy">Request Attendance Correction</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                Date
                <input name="date" type="date" className="input mt-1 w-full" defaultValue={correctionDate} required />
              </label>
              <label className="block text-sm">
                Type
                <select name="type" className="input mt-1 w-full" required>
                  <option value="Missing Check-In">Missing Check-In</option>
                  <option value="Missing Check-Out">Missing Check-Out</option>
                  <option value="Wrong Time">Wrong Time</option>
                </select>
              </label>
              <label className="block text-sm">
                Expected Time
                <input name="expectedTime" type="time" className="input mt-1 w-full" />
              </label>
              <label className="block text-sm">
                Reason *
                <textarea name="reason" className="input mt-1 min-h-[80px] w-full" required placeholder="Explain what happened…" />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setCorrectionOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Header({ term, academicYear, settings, onTerm, onYear, onRefresh, loading }: {
  term: string; academicYear: string; settings: { academicYears?: string[]; terms?: string[] } | null;
  onTerm: (v: string) => void; onYear: (v: string) => void; onRefresh: () => void; loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">My Attendance</p>
          <h1 className="text-xl font-bold text-navy sm:text-2xl">My Attendance</h1>
          <p className="mt-1 text-sm text-muted">Your daily RFID check-in/out times and attendance history.</p>
        </div>
        <button type="button" className="btn-secondary inline-flex items-center gap-2 text-sm" onClick={onRefresh}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-[10px] font-bold uppercase text-muted">Academic Year</span>
          <select className="input w-full py-2" value={academicYear} onChange={(e) => onYear(e.target.value)}>
            {(settings?.academicYears ?? [academicYear]).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[10px] font-bold uppercase text-muted">Term</span>
          <select className="input w-full py-2" value={term} onChange={(e) => onTerm(e.target.value)}>
            {(settings?.terms ?? [term]).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

function TodayCard({ today, onRequestCorrection }: { today: MyAttendanceDay & { schoolStart?: string; dateLabel?: string }; onRequestCorrection: () => void }) {
  const missingOut = today.morningCheckIn && !today.eveningCheckOut;
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">Today — {today.dateLabel ?? today.date}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SessionBlock
          icon={Sun}
          label="Morning · RFID Check-In"
          time={today.morningCheckIn}
          status={today.morningStatus}
          late={today.minutesLateMorning}
          extra={today.schoolStart ? `School start: ${today.schoolStart}` : undefined}
        />
        <SessionBlock
          icon={Moon}
          label="Evening · RFID Check-Out"
          time={today.eveningCheckOut}
          status={today.eveningStatus}
        />
      </div>
      {missingOut ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mb-1 inline h-4 w-4" /> Missing check-out — you checked in at {today.morningCheckIn} but no evening tap was recorded.
          <button type="button" className="btn-secondary ml-0 mt-2 block text-xs sm:ml-2 sm:mt-0 sm:inline" onClick={onRequestCorrection}>
            Request Correction
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SessionBlock({ icon: Icon, label, time, status, late, extra }: {
  icon: typeof Sun; label: string; time: string | null; status: string; late?: number; extra?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-slate-50/80 p-4">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-navy">{time ?? '—'}</p>
      <p className="mt-1 text-sm font-semibold">
        {!time ? '⚠ Not Recorded' : status === 'ON_TIME' ? '🟢 On Time' : status === 'LATE' ? `🟠 ${late ?? 0} min Late` : status === 'COMPLETED' ? '🟢 Completed' : status}
      </p>
      {extra ? <p className="mt-1 text-xs text-muted">{extra}</p> : null}
    </div>
  );
}

function PunctualityChart({ summary }: { summary: MyAttendanceSummary }) {
  const bars = [
    { label: 'On Time', pct: summary.punctuality.onTimePct, color: 'bg-emerald-500' },
    { label: 'Late', pct: summary.punctuality.latePct, color: 'bg-amber-500' },
    { label: 'Absent', pct: summary.punctuality.absentPct, color: 'bg-red-500' },
    { label: 'Permission', pct: summary.punctuality.permissionPct, color: 'bg-sky-500' },
  ];
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <p className="flex items-center gap-2 font-bold text-navy">
        <TrendingUp className="h-4 w-4" /> Punctuality
      </p>
      <div className="mt-4 space-y-3">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="mb-1 flex justify-between text-xs font-semibold">
              <span>{b.label}</span>
              <span>{b.pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">
        Working hours this month: ~{summary.workingHours.workedHours}h of {summary.workingHours.expectedHours}h expected
      </p>
    </div>
  );
}

function TimeCell({ time, status, late }: { time: string | null; status: string; late?: number }) {
  if (!time) return <span className="text-muted">—</span>;
  const icon = status === 'ON_TIME' || status === 'COMPLETED' ? '🟢' : status === 'LATE' ? '🟠' : '⚪';
  return (
    <span>
      {time} {icon}
      {late ? <span className="ml-1 text-xs text-amber-700">{late}m</span> : null}
    </span>
  );
}

function DayStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'Present' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : status === 'Late' ? 'bg-amber-50 text-amber-900 border-amber-200'
    : status === 'Absent' ? 'bg-red-50 text-red-800 border-red-200'
    : 'bg-sky-50 text-sky-800 border-sky-200';
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>{status}</span>;
}

function Kpi({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'emerald' | 'amber' | 'red' }) {
  const c = { default: 'text-navy', emerald: 'text-emerald-700', amber: 'text-amber-700', red: 'text-red-700' };
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-bold uppercase text-muted">{label}</p>
      <p className={`text-xl font-extrabold ${c[tone]}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-muted">{label}</p>
      <p className="text-lg font-bold text-navy">{value}</p>
      {hint ? <p className="text-[10px] text-muted">{hint}</p> : null}
    </div>
  );
}
