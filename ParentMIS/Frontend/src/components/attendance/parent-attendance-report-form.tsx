'use client';

import { useState } from 'react';
import { Clock, Send, XCircle } from 'lucide-react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

const REASONS = ['Sick', 'Medical appointment', 'Family emergency', 'Transport delay', 'Other'];

type Kind = 'ABSENT' | 'LATE';

type Props = {
  defaultDate?: string;
  onSuccess?: (message: string) => void;
  compact?: boolean;
};

export function ParentAttendanceReportForm({ defaultDate, onSuccess, compact = false }: Props) {
  const { studentParams } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(defaultDate ?? today);
  const [kind, setKind] = useState<Kind>('ABSENT');
  const [reason, setReason] = useState('Sick');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/attendance/report', {
        date,
        kind,
        reason,
        detail: detail.trim() || undefined,
        ...studentParams,
      });
      onSuccess?.(
        kind === 'LATE'
          ? 'Lateness reported. Your class teacher can see this on TichaPortal.'
          : 'Absence reported. Your class teacher and school attendance are notified.'
      );
      setDetail('');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not send report.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className={cn(
        'rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5',
        compact && 'border-dashed'
      )}
    >
      <div className="mb-4">
        <h2 className="text-base font-extrabold text-navy">Report absent or late</h2>
        <p className="mt-0.5 text-xs text-muted">
          Sent to your child&apos;s class teacher on TichaPortal and recorded for school attendance.
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setKind('ABSENT')}
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition',
            kind === 'ABSENT'
              ? 'border-rose-200 bg-rose-50 text-rose-900'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          )}
        >
          <XCircle className="size-4" />
          Absent
        </button>
        <button
          type="button"
          onClick={() => setKind('LATE')}
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition',
            kind === 'LATE'
              ? 'border-amber-200 bg-amber-50 text-amber-950'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          )}
        >
          <Clock className="size-4" />
          Late
        </button>
      </div>

      <label className="mb-3 block text-xs font-semibold text-slate-600">
        Date
        <input
          type="date"
          className="input mt-1 w-full"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>

      <p className="mb-2 text-xs font-semibold text-slate-600">Reason</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              reason === r ? 'bg-navy text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <label className="mb-4 block text-xs font-semibold text-slate-600">
        Note to teacher (optional)
        <textarea
          className="input mt-1 min-h-[72px] w-full resize-none"
          placeholder="e.g. Will arrive after 9:00, doctor visit in the morning…"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
      </label>

      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Sending…' : (
          <>
            <Send className="size-4" />
            Send to class teacher
          </>
        )}
      </button>
    </form>
  );
}
