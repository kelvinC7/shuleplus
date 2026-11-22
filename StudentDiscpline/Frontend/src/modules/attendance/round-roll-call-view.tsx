'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  History,
  RefreshCw,
  Save,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import { DisciplinePageLayout } from '@/components/discipline-page-layout';
import { FormField } from '@/components/discipline-modal';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { RollCallRow, RollCallSession, SmClass } from '@/types/discipline';
import { toast } from 'sonner';

type Tab = 'take' | 'history';

const STATUS_OPTIONS = [
  { key: 'present' as const, label: 'P', title: 'Present', active: 'bg-emerald-600 text-white border-emerald-600' },
  { key: 'absent' as const, label: 'A', title: 'Absent', active: 'bg-rose-600 text-white border-rose-600' },
  { key: 'excused' as const, label: 'E', title: 'Excused', active: 'bg-amber-500 text-white border-amber-500' },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function prettyDate(value: string) {
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function RoundRollCallView() {
  const { confirm, dialog } = useConfirmDialog();
  const [tab, setTab] = useState<Tab>('take');
  const [classes, setClasses] = useState<SmClass[]>([]);
  const [className, setClassName] = useState('');
  const [date, setDate] = useState(todayIso);
  const [label, setLabel] = useState('Class attendance');
  const [subject, setSubject] = useState('');
  const [period, setPeriod] = useState('');
  const [roster, setRoster] = useState<RollCallRow[]>([]);
  const [logExists, setLogExists] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [sessions, setSessions] = useState<RollCallSession[]>([]);
  const [historyQuery, setHistoryQuery] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewSession, setViewSession] = useState<RollCallSession | null>(null);

  const loadClasses = useCallback(async () => {
    try {
      const { data } = await disciplineApi.classes();
      const rows = data.data ?? [];
      setClasses(rows);
      setClassName((prev) => prev || rows[0]?.label || '');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load classes'));
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  // Preserve deep links from the teacher portal (period attendance).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const requestedClass = params.get('className') || params.get('class_name');
    const requestedDate = params.get('date');
    const requestedLabel = params.get('rollName') || params.get('roll_label') || params.get('label');
    const requestedSubject = params.get('subject');
    const requestedPeriod = params.get('periodLabel') || params.get('period');
    if (requestedClass) setClassName(requestedClass);
    if (requestedDate && /^\d{4}-\d{2}-\d{2}/.test(requestedDate)) setDate(requestedDate.slice(0, 10));
    if (requestedLabel) setLabel(requestedLabel);
    if (requestedSubject) {
      setSubject(requestedSubject);
      setLabel((prev) => (prev === 'Class attendance' ? requestedSubject : prev));
    }
    if (requestedPeriod) setPeriod(requestedPeriod);
  }, []);

  const loadRoster = useCallback(async () => {
    if (!className) return;
    setLoadingRoster(true);
    try {
      const { data } = await disciplineApi.rollCallRoster({
        className,
        date,
        label: label.trim() || 'Class attendance',
        subject: subject.trim() || undefined,
        period: period.trim() || undefined,
      });
      setRoster(data.data.roster ?? []);
      setLogExists(Boolean(data.data.logExists));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not load the roster'));
      setRoster([]);
    } finally {
      setLoadingRoster(false);
    }
  }, [className, date, label, subject, period]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data } = await disciplineApi.rollCallHistory({ q: historyQuery.trim() || undefined });
      setSessions(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not load roll call history'));
    } finally {
      setLoadingHistory(false);
    }
  }, [historyQuery]);

  useEffect(() => {
    if (tab === 'take') void loadRoster();
    else void loadHistory();
  }, [tab, loadRoster, loadHistory]);

  const filteredRoster = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (r) => r.name?.toLowerCase().includes(q) || String(r.studentCode || '').toLowerCase().includes(q)
    );
  }, [roster, search]);

  const counts = useMemo(
    () => ({
      present: roster.filter((r) => r.status === 'present').length,
      absent: roster.filter((r) => r.status === 'absent').length,
      excused: roster.filter((r) => r.status === 'excused').length,
    }),
    [roster]
  );

  function changeStatus(id: string, status: RollCallRow['status']) {
    setRoster((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  function changeRemarks(id: string, remarks: string) {
    setRoster((prev) => prev.map((r) => (r.id === id ? { ...r, remarks } : r)));
  }

  async function saveRollCall() {
    if (!className) {
      toast.error('Choose a class first');
      return;
    }
    if (!roster.length) {
      toast.error('No students on this roster');
      return;
    }
    if (logExists) {
      const ok = await confirm({
        title: 'Replace saved roll call?',
        message: `${label || 'Class attendance'} for ${className} on ${prettyDate(date)} already exists. Saving will replace it.`,
        confirmLabel: 'Replace roll call',
        tone: 'warning',
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      const effectiveLabel = label.trim() || 'Class attendance';
      const { data } = await disciplineApi.saveRollCall({
        className,
        date,
        label: effectiveLabel,
        subject: subject.trim() || undefined,
        period: period.trim() || undefined,
        records: roster,
      });
      toast.success(`Saved ${effectiveLabel} for ${data.data.presentCount} present / ${data.data.absentCount} absent`);
      setLogExists(true);
      await loadHistory();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save roll call'));
    } finally {
      setSaving(false);
    }
  }

  async function openSession(sessionId: string) {
    try {
      const { data } = await disciplineApi.rollCallSession(sessionId);
      setViewSession(data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not load this roll call'));
    }
  }

  const sessionColumns = useMemo(
    () => [
      {
        key: 'date',
        header: 'Date',
        render: (s: RollCallSession) => (
          <div>
            <p className="font-semibold text-[#000435]">{prettyDate(s.date)}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ),
      },
      { key: 'class', header: 'Class', render: (s: RollCallSession) => <span className="font-medium text-[#000435]">{s.className}</span> },
      { key: 'by', header: 'Recorded by', render: (s: RollCallSession) => <span className="text-slate-600">{s.createdByName || '—'}</span> },
      {
        key: 'counts',
        header: 'Present / Absent / Excused',
        render: (s: RollCallSession) => (
          <span className="font-semibold text-[#000435]">
            <span className="text-emerald-600">{s.presentCount}</span> /{' '}
            <span className="text-rose-600">{s.absentCount}</span> /{' '}
            <span className="text-amber-600">{s.excusedCount}</span>
          </span>
        ),
      },
    ],
    []
  );

  return (
    <DisciplinePageLayout
      title="Round Roll Call"
      subtitle="Take a whole-class roll and keep a dated attendance history"
      actions={
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setTab('take')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              tab === 'take' ? 'bg-[#000435] text-white shadow' : 'text-slate-500 hover:text-[#000435]'
            }`}
          >
            <ClipboardCheck size={15} /> Take roll
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              tab === 'history' ? 'bg-[#000435] text-white shadow' : 'text-slate-500 hover:text-[#000435]'
            }`}
          >
            <History size={15} /> All roll calls
          </button>
        </div>
      }
      kpis={[
        { label: 'On roster', value: roster.length, hint: tab === 'take' ? className || 'No class selected' : 'Saved sessions' },
        { label: 'Present', value: counts.present, hint: 'Marked P' },
        { label: 'Absent', value: counts.absent, hint: 'Marked A' },
        { label: 'Excused', value: counts.excused, hint: 'Marked E' },
      ]}
    >
      {tab === 'take' ? (
        <div className="space-y-6">
          <section className="hr-card p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <FormField label="Class" required>
                <select className="discipline-input" value={className} onChange={(e) => setClassName(e.target.value)}>
                  <option value="">Select a class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Date">
                <input className="discipline-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </FormField>
              <FormField label="Roll label">
                <input className="discipline-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Class attendance" />
              </FormField>
              <FormField label="Subject (optional)">
                <input className="discipline-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" />
              </FormField>
              <FormField label="Period (optional)">
                <input className="discipline-input" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. Period 3" />
              </FormField>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" className="btn-secondary" disabled={loadingRoster || !className} onClick={() => void loadRoster()}>
                <RefreshCw size={15} className={loadingRoster ? 'animate-spin' : ''} /> Load roster
              </button>
              {logExists ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  <CheckCircle2 size={13} /> Saved for this date — saving again will replace it
                </span>
              ) : null}
            </div>
          </section>

          <section className="hr-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#000435]/10 text-[#000435]">
                  <Users size={19} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#000435]">Student roster</h2>
                  <p className="text-xs text-slate-500">Students are listed A–Z. Tap P, A or E for each student.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="discipline-input w-48 !py-2 pl-8"
                    placeholder="Search student"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button type="button" className="btn-primary" disabled={saving || loadingRoster || !roster.length} onClick={() => void saveRollCall()}>
                  <Save size={15} /> {saving ? 'Saving…' : logExists ? 'Update roll' : 'Save roll'}
                </button>
              </div>
            </div>

            {loadingRoster ? (
              <p className="py-12 text-center text-sm text-slate-500">
                <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#000435]" /> Loading students…
              </p>
            ) : filteredRoster.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                {className ? 'No students found for this class.' : 'Choose a class to load the roster.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 w-12">#</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRoster.map((student, index) => (
                      <tr key={student.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#000435]">{student.name}</p>
                          <p className="text-xs text-slate-500">{student.studentCode || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-1.5">
                            {STATUS_OPTIONS.map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                title={option.title}
                                aria-label={`${option.title}: ${student.name}`}
                                aria-pressed={student.status === option.key}
                                onClick={() => changeStatus(student.id, option.key)}
                                className={`h-8 w-8 rounded-lg border text-xs font-bold transition ${
                                  student.status === option.key
                                    ? option.active
                                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="discipline-input !py-2"
                            placeholder="Remarks"
                            value={student.remarks || ''}
                            onChange={(e) => changeRemarks(student.id, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="hr-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <ClipboardList size={19} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#000435]">All roll calls</h2>
                <p className="text-xs text-slate-500">Saved sessions, newest first</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="discipline-input w-56 !py-2 pl-8"
                  placeholder="Search class or label"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void loadHistory();
                  }}
                />
              </div>
              <button type="button" className="btn-secondary" disabled={loadingHistory} onClick={() => void loadHistory()}>
                <RefreshCw size={15} className={loadingHistory ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {loadingHistory ? (
            <p className="py-12 text-center text-sm text-slate-500">Loading history…</p>
          ) : sessions.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">No roll calls saved yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {sessionColumns.map((col) => (
                      <th key={col.key} className="px-4 py-3">
                        {col.header}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50/60">
                      {sessionColumns.map((col) => (
                        <td key={col.key} className="px-4 py-3">
                          {col.render(session)}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <button type="button" className="btn-secondary !py-1 text-xs" onClick={() => void openSession(session.id)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {dialog}

      {viewSession ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#000435]/50 p-4 backdrop-blur-sm" onClick={() => setViewSession(null)}>
          <div className="hr-card max-h-[85dvh] w-full max-w-2xl overflow-hidden p-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-[#000435]">{viewSession.label}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {viewSession.className} · {prettyDate(viewSession.date)} · {viewSession.createdByName || '—'}
                </p>
              </div>
              <button type="button" className="btn-secondary !py-1 text-xs" onClick={() => setViewSession(null)}>Close</button>
            </div>
            <div className="max-h-[65dvh] overflow-y-auto px-5 py-4">
              <div className="mb-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                  <CheckCircle2 size={13} /> {viewSession.presentCount} present
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-rose-700">
                  <XCircle size={13} /> {viewSession.absentCount} absent
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                  <CalendarDays size={13} /> {viewSession.excusedCount} excused
                </span>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2">Student</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewSession.roster.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-2 font-medium text-[#000435]">
                          {row.name}
                          <span className="ml-2 text-xs text-slate-400">{row.studentCode}</span>
                        </td>
                        <td className="px-4 py-2 capitalize text-slate-600">{row.status}</td>
                        <td className="px-4 py-2 text-slate-500">{row.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DisciplinePageLayout>
  );
}
