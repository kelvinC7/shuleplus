'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarCheck,
  Clock,
  CreditCard,
  MapPin,
  Send,
  X,
  XCircle,
} from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { KpiCard, StatsGrid } from '@/components/shared/stat-card';
import { useStudentFetch } from '@/hooks/use-fetch';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  notes: string | null;
  cardNumber?: string | null;
  gateName?: string | null;
  source?: string | null;
}

interface AttendanceResponse {
  student?: {
    studentCode: string;
    studentName: string | null;
    className: string | null;
    cardNumber: string | null;
  } | null;
  summary: {
    monthlyPresent: number;
    monthlyAbsent: number;
    monthlyLate: number;
    monthlyExcused: number;
    attendanceRate: number;
  };
  records: AttendanceRecord[];
  todayStatus?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
}

function statusMeta(status: string) {
  const s = status.toUpperCase();
  if (s === 'PRESENT') {
    return { label: 'Present', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', cell: 'bg-emerald-500 text-white' };
  }
  if (s === 'LATE') {
    return { label: 'Late', pill: 'bg-amber-50 text-amber-700 ring-amber-200', cell: 'bg-amber-400 text-navy' };
  }
  if (s === 'EXCUSED' || s === 'SICK') {
    return { label: s === 'SICK' ? 'Sick' : 'Excused', pill: 'bg-sky-50 text-sky-700 ring-sky-200', cell: 'bg-sky-500 text-white' };
  }
  if (s === 'ABSENT') {
    return { label: 'Absent', pill: 'bg-rose-50 text-rose-700 ring-rose-200', cell: 'bg-rose-500 text-white' };
  }
  return { label: status, pill: 'bg-slate-100 text-slate-500 ring-slate-200', cell: 'bg-slate-100 text-slate-400' };
}

export default function AttendancePage() {
  const { data, loading, error, reload } = useStudentFetch<AttendanceResponse>('/attendance');
  const { studentParams } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [dayModal, setDayModal] = useState<{ date: string; record: AttendanceRecord | null } | null>(
    null
  );
  const [absReason, setAbsReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const records = data?.records ?? [];
  const summary = data?.summary;
  const today = new Date().toISOString().slice(0, 10);

  const monthKeys = useMemo(() => {
    const keys = Array.from(new Set(records.map((r) => r.date.slice(0, 7)))).sort().reverse();
    const current = today.slice(0, 7);
    if (!keys.includes(current)) keys.unshift(current);
    return keys;
  }, [records, today]);

  const activeMonth = selectedMonth ?? monthKeys[0] ?? today.slice(0, 7);
  const monthLabel = new Date(`${activeMonth}-01T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const monthRecords = records.filter((r) => r.date.slice(0, 7) === activeMonth);
  const statusByDay = new Map<number, AttendanceRecord>();
  monthRecords.forEach((r) => {
    const day = Number(r.date.slice(8, 10));
    statusByDay.set(day, r);
  });

  const firstDay = new Date(`${activeMonth}-01T12:00:00`).getDay();
  const daysInMonth = new Date(
    Number(activeMonth.slice(0, 4)),
    Number(activeMonth.slice(5, 7)),
    0
  ).getDate();

  async function submitAbsence(e: React.FormEvent) {
    e.preventDefault();
    if (!dayModal?.date) return;
    setSubmitting(true);
    setSubmitError(null);
    setSuccess(null);
    try {
      await api.post('/attendance/absence', {
        date: dayModal.date,
        reason: absReason,
        ...studentParams,
      });
      setSuccess('Absence note sent to the school.');
      setAbsReason('');
      setDayModal(null);
      reload();
    } catch (err: unknown) {
      setSubmitError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not report absence.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openDay(day: number) {
    const date = `${activeMonth}-${String(day).padStart(2, '0')}`;
    if (date > today) return;
    const record = statusByDay.get(day) ?? null;
    setAbsReason(record?.notes && record.status === 'EXCUSED' ? record.notes : '');
    setSubmitError(null);
    setDayModal({ date, record });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        action={
          <div className="flex flex-wrap gap-2">
            {data?.student?.cardNumber ? (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                <CreditCard className="size-4 text-primary" />
                {data.student.cardNumber}
              </div>
            ) : null}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
              <CalendarCheck className="size-4 text-primary" />
              {summary ? `${summary.attendanceRate}% this month` : '—'}
            </div>
          </div>
        }
      />

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      {loading ? (
        <div className="hr-card space-y-3 p-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertCircle className="text-red-500" />}
          title="Unable to load attendance"
          description={error}
          action={
            <button type="button" className="btn-primary" onClick={() => void reload()}>
              Try again
            </button>
          }
        />
      ) : (
        <>
          <StatsGrid>
            <KpiCard label="Present" value={String(summary?.monthlyPresent ?? 0)} accent="emerald" />
            <KpiCard label="Absent" value={String(summary?.monthlyAbsent ?? 0)} accent="red" />
            <KpiCard label="Late" value={String(summary?.monthlyLate ?? 0)} accent="amber" />
            <KpiCard label="Excused" value={String(summary?.monthlyExcused ?? 0)} accent="blue" />
          </StatsGrid>

          <div className="hr-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-extrabold text-navy">{monthLabel}</h2>
                <p className="text-xs text-muted">Tap a day for details or to report an absence</p>
              </div>
              <select
                className="input max-w-[200px] py-2 text-sm"
                value={activeMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {monthKeys.map((m) => (
                  <option key={m} value={m}>
                    {new Date(`${m}-01T12:00:00`).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-7 gap-1.5 p-4 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 px-4 pb-5">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const date = `${activeMonth}-${String(day).padStart(2, '0')}`;
                const record = statusByDay.get(day);
                const isFuture = date > today;
                const isWeekend =
                  new Date(`${date}T12:00:00`).getDay() === 0 ||
                  new Date(`${date}T12:00:00`).getDay() === 6;
                const meta = record ? statusMeta(record.status) : null;
                const isToday = date === today;

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isFuture}
                    onClick={() => openDay(day)}
                    className={cn(
                      'relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-bold transition',
                      isFuture && 'cursor-default opacity-40',
                      !isFuture && 'hover:ring-2 hover:ring-primary/40',
                      isToday && 'ring-2 ring-navy',
                      meta
                        ? meta.cell
                        : isWeekend
                          ? 'bg-slate-50 text-slate-300'
                          : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    <span>{day}</span>
                    {meta ? (
                      <span className="mt-0.5 text-[9px] font-semibold uppercase opacity-90">
                        {meta.label.slice(0, 3)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Present
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Absent (no card)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Late
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Excused
              </span>
            </div>
          </div>
        </>
      )}

      {dayModal ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-navy/50 p-4 sm:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Day details</p>
                <h3 className="text-lg font-extrabold text-navy">
                  {new Date(`${dayModal.date}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
              </div>
              <button
                type="button"
                className="rounded-xl border border-border p-2 text-muted hover:bg-slate-50"
                onClick={() => setDayModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {dayModal.record ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1',
                      statusMeta(dayModal.record.status).pill
                    )}
                  >
                    {statusMeta(dayModal.record.status).label}
                  </span>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] font-bold uppercase text-slate-400">Check in</p>
                      <p className="font-semibold text-navy">
                        {dayModal.record.checkInTime || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase text-slate-400">Check out</p>
                      <p className="font-semibold text-navy">
                        {dayModal.record.checkOutTime || '—'}
                      </p>
                    </div>
                    {dayModal.record.gateName ? (
                      <div className="col-span-2 flex items-center gap-2 text-slate-600">
                        <MapPin size={14} /> {dayModal.record.gateName}
                      </div>
                    ) : null}
                    {dayModal.record.notes ? (
                      <p className="col-span-2 text-sm text-slate-600">{dayModal.record.notes}</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
                  <XCircle className="mt-0.5 shrink-0" size={18} />
                  No card tap for this school day.
                </div>
              )}

              <form onSubmit={(e) => void submitAbsence(e)} className="space-y-3">
                <p className="text-sm font-bold text-navy">Report / excuse absence</p>
                <textarea
                  className="input min-h-[90px]"
                  placeholder="Reason for absence (optional note to school)"
                  value={absReason}
                  onChange={(e) => setAbsReason(e.target.value)}
                  required
                />
                {submitError ? <p className="text-sm text-rose-600">{submitError}</p> : null}
                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? <Clock className="animate-spin" size={16} /> : <Send size={16} />}
                  Send absence note
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
