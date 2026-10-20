'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  ChevronRight,
  History,
  Loader2,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  createRollCallSession,
  fetchRollCallClasses,
  fetchRollCallDashboard,
  fetchRollCallSessions,
  fetchRollCallTemplates,
  rollCallApiError,
} from '@/services/roll-call-api';
import type { RollCallClassOption, RollCallSessionSummary, RollCallTemplate } from '@/types/roll-call';
import { StartRollCallModal } from './start-roll-call-modal';

const ATTENDANCE_TYPES = [
  { value: 'general', label: 'General Roll Call' },
  { value: 'daily', label: 'Daily' },
  { value: 'event', label: 'Event' },
  { value: 'boarding', label: 'Boarding' },
  { value: 'weekend', label: 'Weekend' },
];

export function RollCallView() {
  const router = useRouter();
  const { term, academicYear } = useAcademicSettings();
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof fetchRollCallDashboard>> | null>(null);
  const [history, setHistory] = useState<RollCallSessionSummary[]>([]);
  const [classes, setClasses] = useState<RollCallClassOption[]>([]);
  const [templates, setTemplates] = useState<RollCallTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterType, setFilterType] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, hist, cls, tmpl] = await Promise.all([
        fetchRollCallDashboard(),
        fetchRollCallSessions({ search: search || undefined, className: filterClass || undefined, attendanceType: filterType || undefined }),
        fetchRollCallClasses(),
        fetchRollCallTemplates(),
      ]);
      setDashboard(dash);
      setHistory(hist);
      setClasses(cls);
      setTemplates(tmpl);
    } catch (err) {
      setError(rollCallApiError(err, 'Could not load roll calls'));
    } finally {
      setLoading(false);
    }
  }, [search, filterClass, filterType]);

  useEffect(() => {
    void load();
  }, [load]);

  const todayLabel = useMemo(() => {
    const d = dashboard?.date ? new Date(`${dashboard.date}T12:00:00`) : new Date();
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [dashboard?.date]);

  async function handleStart(body: Parameters<typeof createRollCallSession>[0]) {
    setCreating(true);
    setError(null);
    try {
      const session = await createRollCallSession({
        ...body,
        academicYear,
        term,
      });
      setModalOpen(false);
      router.push(`/roll-call/${session.id}`);
    } catch (err) {
      setError(rollCallApiError(err, 'Could not start roll call'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Round Roll Call</h1>
          <p className="mt-1 text-sm text-muted">
            Take attendance for activities outside regular lessons.
          </p>
          <p className="mt-2 text-sm text-navy">
            <Calendar className="mr-1 inline h-4 w-4 text-muted" />
            Today · {todayLabel}
          </p>
          <p className="text-xs text-muted">
            Academic Year {academicYear} · {term}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => setShowHistory((v) => !v)}>
            <History className="h-4 w-4" /> History
          </button>
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Start New Roll Call
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading && !dashboard ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : null}

      {dashboard && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Calendar} label="Today's Calls" value={dashboard.kpis.todayCalls} />
            <Kpi icon={Users} label="Students" value={dashboard.kpis.students} />
            <Kpi icon={Users} label="Present" value={dashboard.kpis.present} tone="emerald" />
            <Kpi icon={Users} label="Attendance Rate" value={`${dashboard.kpis.rate}%`} tone="primary" />
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Today&apos;s Roll Calls</h2>
            {dashboard.todaySessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center">
                <p className="font-semibold text-navy">No roll calls started today</p>
                <p className="mt-1 text-sm text-muted">Create Evening Prep, Assembly, or any custom roll call.</p>
                <button type="button" className="btn-primary mt-4" onClick={() => setModalOpen(true)}>
                  + Start Roll Call
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboard.todaySessions.map((s) => (
                  <RollCallCard key={s.id} session={s} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {(showHistory || history.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Roll Call History</h2>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-white p-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="input w-full !py-2 pl-9"
                placeholder="Search roll call name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="input !w-auto !py-2" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.label}>{c.label}</option>
              ))}
            </select>
            <select className="input !w-auto !py-2" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All types</option>
              {ATTENDANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-gradient-to-r from-slate-50 to-white text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Roll Call</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Present</th>
                  <th className="px-4 py-3">Absent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-border/60 hover:bg-slate-50/80">
                    <td className="px-4 py-3">{h.date}</td>
                    <td className="px-4 py-3 font-semibold text-navy">{h.name}</td>
                    <td className="px-4 py-3">{h.className}</td>
                    <td className="px-4 py-3 text-emerald-700">{h.present}</td>
                    <td className="px-4 py-3 text-red-700">{h.absent}</td>
                    <td className="px-4 py-3">
                      {h.status === 'COMPLETED' ? '✅' : '📝 Draft'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/roll-call/${h.id}`} className="text-sm font-semibold text-navy underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!history.length && (
              <p className="p-6 text-center text-sm text-muted">No roll call history yet.</p>
            )}
          </div>
        </section>
      )}

      <StartRollCallModal
        open={modalOpen}
        creating={creating}
        classes={classes}
        templates={templates}
        defaultDate={dashboard?.date ?? new Date().toISOString().slice(0, 10)}
        attendanceTypes={ATTENDANCE_TYPES}
        onClose={() => setModalOpen(false)}
        onSubmit={handleStart}
      />
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  tone?: 'default' | 'emerald' | 'primary';
}) {
  const bg = tone === 'emerald' ? 'bg-emerald-50 border-emerald-100' : tone === 'primary' ? 'bg-primary/10 border-primary/20' : 'bg-white border-border';
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${bg}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-2 text-2xl font-extrabold text-navy">{value}</p>
    </div>
  );
}

function RollCallCard({ session }: { session: RollCallSessionSummary }) {
  const done = session.status === 'COMPLETED';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div>
        <p className="font-bold text-navy">{session.name}</p>
        <p className="text-sm text-muted">
          {session.className} · {session.total} students
          {session.startTime ? ` · ${session.startTime}` : ''}
        </p>
        {done ? (
          <p className="mt-1 text-xs text-emerald-700">
            {session.present} present · {session.absent} absent · {session.late} late
          </p>
        ) : (
          <p className="mt-1 text-xs font-semibold text-amber-700">Not started / In progress</p>
        )}
      </div>
      <Link
        href={`/roll-call/${session.id}`}
        className="inline-flex items-center gap-1 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
      >
        {done ? 'View' : 'Start'}
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
