'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Save,
  Search,
  Users,
} from 'lucide-react';
import {
  completeRollCall,
  fetchRollCallSession,
  rollCallApiError,
  rollCallIncompleteCounts,
  saveRollCallDraft,
} from '@/services/roll-call-api';
import type { RollCallRow, RollCallRowStatus, RollCallSessionDetail } from '@/types/roll-call';
import {
  ABSENT_REASONS,
  EXCUSED_REASONS,
  LATE_REASONS,
  STATUS_OPTIONS,
  countRows,
  currentTimeHm,
} from './constants';
import {
  AttendanceStatusBadge,
  AttendanceStatusButton,
  AttendanceStatLine,
  AttendanceToolbarButton,
} from '@/components/attendance-status-ui';

type LocalRow = RollCallRow;

export function RollCallSessionView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<RollCallSessionDetail | null>(null);
  const [rows, setRows] = useState<LocalRow[]>([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showMarkAll, setShowMarkAll] = useState(false);
  const [showIncomplete, setShowIncomplete] = useState<Record<string, number> | null>(null);
  const [completed, setCompleted] = useState<RollCallSessionDetail | null>(null);
  const [viewDetails, setViewDetails] = useState(false);
  const [reasonModal, setReasonModal] = useState<{ code: string; status: RollCallRowStatus } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRollCallSession(sessionId);
      setSession(data);
      setRows(data.rows);
      setSessionNotes(data.sessionNotes ?? '');
      if (data.status === 'COMPLETED') setCompleted(data);
    } catch (err) {
      setError(rollCallApiError(err, 'Could not load roll call'));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.studentCode.toLowerCase().includes(q) ||
        (r.rollNumber ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const counts = useMemo(() => countRows(rows), [rows]);
  const marked = counts.present + counts.late + counts.absent + counts.excused;
  const progressPct = counts.total ? Math.round((marked / counts.total) * 100) : 0;
  const readonly = session?.status === 'COMPLETED';

  function updateRow(code: string, patch: Partial<LocalRow>) {
    setRows((prev) => prev.map((r) => (r.studentCode === code ? { ...r, ...patch } : r)));
  }

  function applyStatus(code: string, status: RollCallRowStatus) {
    if (status === 'ABSENT' || status === 'LATE' || status === 'EXCUSED') {
      setReasonModal({ code, status });
      return;
    }
    updateRow(code, {
      status,
      reason: null,
      arrivalTime: status === 'PRESENT' ? null : undefined,
      markedAt: new Date().toISOString(),
    });
  }

  function confirmReason(code: string, status: RollCallRowStatus, reason: string, arrivalTime?: string) {
    updateRow(code, {
      status,
      reason: reason || null,
      arrivalTime: status === 'LATE' ? arrivalTime ?? currentTimeHm() : null,
      markedAt: new Date().toISOString(),
    });
    setReasonModal(null);
  }

  function markAllPresent() {
    const now = new Date().toISOString();
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        status: 'PRESENT',
        reason: null,
        arrivalTime: null,
        markedAt: now,
      }))
    );
    setShowMarkAll(false);
  }

  function rowsPayload() {
    return rows.map((r) => ({
      studentCode: r.studentCode,
      status: r.status,
      reason: r.reason,
      arrivalTime: r.arrivalTime,
      notes: r.notes,
    }));
  }

  async function handleSaveDraft() {
    setSaving(true);
    setError(null);
    try {
      const data = await saveRollCallDraft(sessionId, { rows: rowsPayload(), sessionNotes });
      setSession(data);
      setRows(data.rows);
    } catch (err) {
      setError(rollCallApiError(err, 'Could not save draft'));
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(allowIncomplete = false) {
    setCompleting(true);
    setError(null);
    try {
      const data = await completeRollCall(sessionId, {
        allowIncomplete,
        rows: rowsPayload(),
      });
      setCompleted(data);
      setSession(data);
      setShowIncomplete(null);
    } catch (err) {
      const incomplete = rollCallIncompleteCounts(err);
      if (incomplete) {
        setShowIncomplete(incomplete);
      } else {
        setError(rollCallApiError(err, 'Could not complete roll call'));
      }
    } finally {
      setCompleting(false);
    }
  }

  const dateLabel = session
    ? new Date(`${session.sessionDate}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  if (loading && !session) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading roll call…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted">Roll call not found.</p>
        <Link href="/roll-call" className="btn-primary inline-block">
          Back to Roll Calls
        </Link>
      </div>
    );
  }

  if ((completed || session.status === 'COMPLETED') && !viewDetails) {
    const done = completed ?? session;
    const finalCounts = countRows(done.rows);
    return (
      <div className="mx-auto max-w-lg space-y-6 py-10 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        <div>
          <h1 className="text-2xl font-bold text-navy">Roll Call Completed</h1>
          <p className="mt-2 font-semibold text-navy">{done.name}</p>
          <p className="text-sm text-muted">
            {done.className} · {finalCounts.total} students
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-6 text-left text-sm space-y-1">
          <AttendanceStatLine status="PRESENT" count={finalCounts.present} />
          <AttendanceStatLine status="LATE" count={finalCounts.late} />
          <AttendanceStatLine status="ABSENT" count={finalCounts.absent} />
          <AttendanceStatLine status="EXCUSED" count={finalCounts.excused} />
          {done.completedAt && (
            <p className="mt-4 text-xs text-muted">
              Completed at{' '}
              {new Date(done.completedAt).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          {done.reference && (
            <p className="mt-1 font-mono text-xs text-muted">Ref {done.reference}</p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="btn-secondary" onClick={() => setViewDetails(true)}>
            View Details
          </button>
          <Link href="/roll-call" className="btn-primary">
            Back to Roll Calls
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-navy"
            onClick={() => router.push('/roll-call')}
          >
            <ArrowLeft className="h-4 w-4" /> Round Roll Call
          </button>
          <h1 className="text-2xl font-bold text-navy">{session.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {session.className}
            {session.classLabel && session.classLabel !== session.className
              ? ` · ${session.classLabel}`
              : ''}{' '}
            · {counts.total} students
          </p>
          <p className="text-sm text-muted">
            {dateLabel}
            {session.startTime ? ` · ${session.startTime}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            disabled={saving}
            onClick={() => void handleSaveDraft()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={completing}
            onClick={() => void handleComplete()}
          >
            {completing ? 'Completing…' : 'Complete Roll Call'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={counts.total} />
        <StatCard label="Present" value={counts.present} tone="emerald" />
        <StatCard label="Absent" value={counts.absent} tone="red" />
        <StatCard label="Late" value={counts.late} tone="amber" />
      </div>

      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="mb-2 flex justify-between text-xs font-semibold text-muted">
          <span>Attendance progress</span>
          <span>
            {marked} / {counts.total} marked · {progressPct}%
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="sticky top-0 z-10 space-y-3 rounded-2xl border border-border bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap gap-2">
          <AttendanceToolbarButton
            status="PRESENT"
            label="Mark All Present"
            variant="primary"
            onClick={() => setShowMarkAll(true)}
          />
          {STATUS_OPTIONS.map((s) => (
            <AttendanceToolbarButton
              key={s.value}
              status={s.value}
              onClick={() =>
                setRows((prev) =>
                  prev.map((r) => ({
                    ...r,
                    status: s.value,
                    reason: null,
                    arrivalTime: s.value === 'LATE' ? currentTimeHm() : null,
                    markedAt: new Date().toISOString(),
                  }))
                )
              }
            />
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input w-full !py-2 pl-9"
            placeholder="Search student name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-muted">Session Notes</label>
        <textarea
          className="input mt-1 min-h-[72px] w-full resize-y"
          placeholder="General notes for this roll call…"
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
        />
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-gradient-to-r from-slate-50 to-white text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <StudentTableRow
                key={row.studentCode}
                index={idx}
                row={row}
                readonly={readonly}
                onStatus={(s) => applyStatus(row.studentCode, s)}
                onNotes={(notes) => updateRow(row.studentCode, { notes })}
              />
            ))}
          </tbody>
        </table>
        {!filteredRows.length && (
          <p className="p-6 text-center text-sm text-muted">No students match your search.</p>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filteredRows.map((row, idx) => (
          <StudentCard
            key={row.studentCode}
            index={idx}
            row={row}
            readonly={readonly}
            onStatus={(s) => applyStatus(row.studentCode, s)}
            onNotes={(notes) => updateRow(row.studentCode, { notes })}
          />
        ))}
      </div>

      {showMarkAll && (
        <ConfirmModal
          title="Mark All Present?"
          body={`${counts.total} students will be marked Present. You can still change individual students afterward.`}
          confirmLabel="Mark All Present"
          onClose={() => setShowMarkAll(false)}
          onConfirm={markAllPresent}
        />
      )}

      {showIncomplete && (
        <IncompleteModal
          counts={showIncomplete}
          completing={completing}
          onClose={() => setShowIncomplete(null)}
          onCompleteAnyway={() => void handleComplete(true)}
        />
      )}

      {reasonModal && (
        <ReasonModal
          row={rows.find((r) => r.studentCode === reasonModal.code)!}
          status={reasonModal.status}
          onClose={() => setReasonModal(null)}
          onConfirm={(reason, arrivalTime) =>
            confirmReason(reasonModal.code, reasonModal.status, reason, arrivalTime)
          }
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'emerald' | 'red' | 'amber';
}) {
  const bg =
    tone === 'emerald'
      ? 'bg-emerald-50 border-emerald-100'
      : tone === 'red'
        ? 'bg-red-50 border-red-100'
        : tone === 'amber'
          ? 'bg-amber-50 border-amber-100'
          : 'bg-white border-border';
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${bg}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
        <Users className="h-4 w-4" /> {label}
      </div>
      <p className="mt-2 text-2xl font-extrabold text-navy">{value}</p>
    </div>
  );
}

function StudentTableRow({
  index,
  row,
  readonly,
  onStatus,
  onNotes,
}: {
  index: number;
  row: LocalRow;
  readonly: boolean;
  onStatus: (s: RollCallRowStatus) => void;
  onNotes: (notes: string) => void;
}) {
  return (
    <tr className="border-b border-border/60 hover:bg-slate-50/80">
      <td className="px-4 py-3 text-muted">{row.rollNumber ?? String(index + 1).padStart(2, '0')}</td>
      <td className="px-4 py-3 font-semibold text-navy">{row.fullName}</td>
      <td className="px-4 py-3 font-mono text-xs text-muted">{row.studentCode}</td>
      <td className="px-4 py-3">
        <div className="space-y-2">
          {row.status && row.status !== 'UNMARKED' && (
            <AttendanceStatusBadge status={row.status} />
          )}
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((s) => (
              <AttendanceStatusButton
                key={s.value}
                status={s.value}
                active={row.status === s.value}
                disabled={readonly}
                onClick={() => onStatus(s.value)}
              />
            ))}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted">{row.reason ?? '—'}</td>
      <td className="px-4 py-3 text-xs text-muted">{row.arrivalTime ?? '—'}</td>
      <td className="px-4 py-3">
        <input
          className="input !py-1 text-xs"
          placeholder="Notes…"
          disabled={readonly}
          value={row.notes ?? ''}
          onChange={(e) => onNotes(e.target.value)}
        />
      </td>
    </tr>
  );
}

function StudentCard({
  index,
  row,
  readonly,
  onStatus,
  onNotes,
}: {
  index: number;
  row: LocalRow;
  readonly: boolean;
  onStatus: (s: RollCallRowStatus) => void;
  onNotes: (notes: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted">{row.rollNumber ?? String(index + 1).padStart(2, '0')}</p>
          <p className="font-bold text-navy">{row.fullName}</p>
          <p className="font-mono text-xs text-muted">{row.studentCode}</p>
        </div>
        <AttendanceStatusBadge status={row.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((s) => (
          <AttendanceStatusButton
            key={s.value}
            status={s.value}
            active={row.status === s.value}
            disabled={readonly}
            onClick={() => onStatus(s.value)}
          />
        ))}
      </div>
      {(row.reason || row.arrivalTime) && (
        <p className="mt-2 text-xs text-muted">
          {row.reason}
          {row.arrivalTime ? ` · ${row.arrivalTime}` : ''}
        </p>
      )}
      <input
        className="input mt-2 w-full !py-1.5 text-xs"
        placeholder="Notes…"
        disabled={readonly}
        value={row.notes ?? ''}
        onChange={(e) => onNotes(e.target.value)}
      />
    </div>
  );
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-navy">{title}</h3>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function IncompleteModal({
  counts,
  completing,
  onClose,
  onCompleteAnyway,
}: {
  counts: Record<string, number>;
  completing: boolean;
  onClose: () => void;
  onCompleteAnyway: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
          <div>
            <h3 className="text-lg font-bold text-navy">Attendance Not Complete</h3>
            <p className="mt-1 text-sm text-muted">
              {counts.unmarked ?? 0} students have not been marked.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-1 text-sm">
          <p>Present · {counts.present ?? 0}</p>
          <p>Late · {counts.late ?? 0}</p>
          <p>Absent · {counts.absent ?? 0}</p>
          <p className="font-semibold text-amber-800">Unmarked · {counts.unmarked ?? 0}</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Return to Students
          </button>
          <button type="button" className="btn-primary" disabled={completing} onClick={onCompleteAnyway}>
            Complete Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

function ReasonModal({
  row,
  status,
  onClose,
  onConfirm,
}: {
  row: LocalRow;
  status: RollCallRowStatus;
  onClose: () => void;
  onConfirm: (reason: string, arrivalTime?: string) => void;
}) {
  const reasons =
    status === 'ABSENT' ? ABSENT_REASONS : status === 'LATE' ? LATE_REASONS : EXCUSED_REASONS;
  const [reason, setReason] = useState(row.reason ?? reasons[0]);
  const [arrivalTime, setArrivalTime] = useState(row.arrivalTime ?? currentTimeHm());
  const title =
    status === 'ABSENT' ? 'Absent Reason' : status === 'LATE' ? 'Late Reason' : 'Excused Reason';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-navy">{title}</h3>
        <p className="mt-1 text-sm text-muted">{row.fullName}</p>
        <div className="mt-4 space-y-2">
          {reasons.map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="reason"
                checked={reason === r}
                onChange={() => setReason(r)}
              />
              {r}
            </label>
          ))}
        </div>
        {status === 'LATE' && (
          <div className="mt-4">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Arrival Time</label>
            <input
              type="time"
              className="input mt-1 w-full"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
            />
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={() => onConfirm(reason, arrivalTime)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
