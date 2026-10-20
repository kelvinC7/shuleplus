'use client';

import { useCallback, useEffect, useState } from 'react';
import { budgetApi, unwrap } from '@/services/budget-api';
import { StatusBadge } from '@/components/status-badge';
import { useToast } from '@/shared/notifications';
import { formatDate, formatRwf } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/api-error';
import type { ManagerOverview, SchoolBudget } from '@/types';

export function ManagerView() {
  const toast = useToast();
  const [overview, setOverview] = useState<ManagerOverview | null>(null);
  const [selected, setSelected] = useState<SchoolBudget | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await budgetApi.managerOverview();
      const data = unwrap(res.data);
      setOverview(data);
      setSelected((prev) => data.pending.find((b) => b.id === prev?.id) ?? data.pending[0] ?? null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load manager overview'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(decision: 'approve' | 'reject' | 'revision' | 'cancel') {
    if (!selected) return;
    if ((decision === 'reject' || decision === 'cancel') && !notes.trim()) {
      toast.error('Notes are required for reject/cancel');
      return;
    }
    setBusy(true);
    try {
      await budgetApi.reviewBudget(selected.id, { decision, notes: notes || undefined });
      const labels: Record<string, string> = {
        approve: 'Budget approved',
        reject: 'Budget rejected',
        revision: 'Revision requested',
        cancel: 'Budget cancelled',
      };
      toast.success(labels[decision] ?? 'Review saved');
      setNotes('');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Review failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy sm:text-2xl">Manager Review</h1>
        <p className="mt-1 text-sm text-muted">
          Approve, reject, request revision, or cancel pending budgets.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: overview?.counts.pending ?? 0 },
          { label: 'Approved', value: overview?.counts.approved ?? 0 },
          { label: 'Rejected', value: overview?.counts.rejected ?? 0 },
        ].map((k) => (
          <div key={k.label} className="hr-card px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{k.label}</p>
            <p className="mt-1 text-2xl font-bold text-navy">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="hr-card divide-y divide-border overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-muted">Loading…</p>
          ) : (overview?.pending.length ?? 0) === 0 ? (
            <p className="p-6 text-sm text-muted">No budgets awaiting review.</p>
          ) : (
            overview?.pending.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(b)}
                className={`flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left ${
                  selected?.id === b.id ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-navy">
                    {b.budgetCode} · {b.title}
                  </p>
                  <p className="text-xs text-muted">
                    Submitted {formatDate(b.submittedAt)} · {formatRwf(b.totalExpectedIncomeRwf)}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </button>
            ))
          )}
        </div>

        <div className="hr-card space-y-4 p-5 sm:p-6">
          {!selected ? (
            <p className="text-sm text-muted">Select a pending budget to review.</p>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-bold text-navy">{selected.title}</h2>
                <p className="text-sm text-muted">
                  {selected.budgetCode} · {selected.academicYear} · {selected.term}
                </p>
                <p className="mt-2 text-sm">
                  Expected <span className="font-bold">{formatRwf(selected.totalExpectedIncomeRwf)}</span>
                  {' · '}
                  Allocated <span className="font-bold">{formatRwf(selected.totalAllocatedRwf)}</span>
                </p>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase text-muted">
                  Review notes
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border px-3 py-2.5 text-sm"
                  placeholder="Required for reject or cancel"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="btn-primary disabled:opacity-50"
                  onClick={() => void decide('approve')}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 disabled:opacity-50"
                  onClick={() => void decide('revision')}
                >
                  Request revision
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"
                  onClick={() => void decide('reject')}
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-50"
                  onClick={() => void decide('cancel')}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
