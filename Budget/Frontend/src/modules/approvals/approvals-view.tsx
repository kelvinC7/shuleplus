'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { budgetApi, unwrap } from '@/services/budget-api';
import { StatusBadge } from '@/components/status-badge';
import { useToast } from '@/shared/notifications';
import { formatDate, formatRwf } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/api-error';
import type { BudgetStatus, SchoolBudget } from '@/types';

const STEPS: BudgetStatus[] = ['draft', 'pending_approval', 'approved'];

function stepIndex(status: BudgetStatus): number {
  if (status === 'rejected') return 1;
  if (status === 'closed') return 2;
  return Math.max(0, STEPS.indexOf(status));
}

function Timeline({ budget }: { budget: SchoolBudget }) {
  const idx = stepIndex(budget.status);
  const rejected = budget.status === 'rejected';
  const closed = budget.status === 'closed';

  return (
    <ol className="mt-3 flex flex-wrap gap-2">
      {STEPS.map((step, i) => {
        const done = i <= idx && !rejected;
        const fail = rejected && i === 1;
        return (
          <li
            key={step}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              fail
                ? 'bg-red-50 text-red-700'
                : done
                  ? 'bg-primary/20 text-navy'
                  : 'bg-slate-100 text-muted'
            }`}
          >
            {step.replace(/_/g, ' ')}
          </li>
        );
      })}
      {closed ? (
        <li className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-semibold uppercase text-slate-700">
          closed
        </li>
      ) : null}
    </ol>
  );
}

export function ApprovalsView() {
  const toast = useToast();
  const [budgets, setBudgets] = useState<SchoolBudget[]>([]);
  const [selected, setSelected] = useState<SchoolBudget | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await budgetApi.budgets();
      const list = unwrap(res.data);
      setBudgets(list);
      setSelected((prev) => list.find((b) => b.id === prev?.id) ?? list[0] ?? null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load budgets'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitDraft(id: string) {
    try {
      const detail = unwrap((await budgetApi.budget(id)).data);
      await budgetApi.updateBudget(id, {
        title: detail.title,
        academicYear: detail.academicYear,
        term: detail.term,
        budgetType: detail.budgetType,
        description: detail.description ?? undefined,
        startDate: detail.startDate?.slice(0, 10),
        endDate: detail.endDate?.slice(0, 10),
        submit: true,
        incomeSources: (detail.incomeSources ?? []).map((s) => ({
          incomeSourceKey: s.incomeSourceKey,
          expectedAmountRwf: s.expectedAmountRwf,
          configJson: s.configJson,
        })),
      });
      toast.success('Budget submitted for approval');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Submit failed'));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy sm:text-2xl">Approvals</h1>
        <p className="mt-1 text-sm text-muted">
          Track budget status timelines and submit drafts for manager review.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="hr-card divide-y divide-border overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-muted">Loading…</p>
          ) : budgets.length === 0 ? (
            <p className="p-6 text-sm text-muted">No budgets yet.</p>
          ) : (
            budgets.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(b)}
                className={`flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition ${
                  selected?.id === b.id ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-navy">
                    {b.budgetCode} · {b.title}
                  </p>
                  <p className="text-xs text-muted">
                    {b.academicYear} · {formatRwf(b.totalExpectedIncomeRwf)}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </button>
            ))
          )}
        </div>

        <div className="hr-card p-5 sm:p-6">
          {!selected ? (
            <p className="text-sm text-muted">Select a budget to view its timeline.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-navy">{selected.title}</h2>
                  <p className="text-sm text-muted">
                    {selected.budgetCode} · {selected.term} · {selected.budgetType}
                  </p>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <Timeline budget={selected} />
              <dl className="mt-5 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">Expected income</dt>
                  <dd className="font-semibold text-navy">
                    {formatRwf(selected.totalExpectedIncomeRwf)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">Allocated</dt>
                  <dd className="font-semibold text-navy">
                    {formatRwf(selected.totalAllocatedRwf)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">Submitted</dt>
                  <dd>{formatDate(selected.submittedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">Manager review</dt>
                  <dd>
                    {selected.managerReviewedByName
                      ? `${selected.managerReviewedByName} · ${formatDate(selected.managerReviewedAt)}`
                      : '—'}
                  </dd>
                </div>
              </dl>
              {selected.managerNotes ? (
                <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-navy">
                  Notes: {selected.managerNotes}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                {(selected.status === 'draft' || selected.status === 'rejected') && (
                  <>
                    <Link href={`/create?id=${selected.id}`} className="btn-primary text-sm">
                      Edit budget
                    </Link>
                    <button
                      type="button"
                      className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy"
                      onClick={() => void submitDraft(selected.id)}
                    >
                      Submit for approval
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
