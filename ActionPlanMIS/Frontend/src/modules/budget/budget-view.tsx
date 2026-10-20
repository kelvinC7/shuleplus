'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { apApi } from '@/services/action-plan-api';
import { ApPageLayout } from '@/components/ap-page-layout';
import { formatRwf } from '@/lib/format-rwf';
import type { ActionPlan } from '@/types';

export function BudgetView({ emphasizeUtilization }: { emphasizeUtilization?: boolean }) {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apApi.listPlans({ limit: 100 })
      .then(({ data }) => setPlans(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalBudget = plans.reduce((s, p) => s + Number(p.budget), 0);
  const totalSpent = plans.reduce((s, p) => s + Number(p.actualCost), 0);
  const remaining = totalBudget - totalSpent;
  const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const plansWithBudget = plans.filter((p) => Number(p.budget) > 0);
  const allExpenses = plans.flatMap((p) =>
    (p.expenses ?? []).map((e) => ({ ...e, planTitle: p.title, planId: p.id }))
  );

  return (
    <ApPageLayout
      title={emphasizeUtilization ? 'Budget Utilization' : 'Activity Budget'}
      subtitle={
        emphasizeUtilization
          ? 'Spending rates and variance across action plans'
          : 'Budget allocation and expenses across action plans'
      }
      kpis={[
        { label: 'Total Budget', value: formatRwf(totalBudget) },
        { label: 'Total Spent', value: formatRwf(totalSpent) },
        { label: 'Remaining', value: formatRwf(remaining), hint: remaining < 0 ? 'Over budget!' : '' },
        { label: 'Utilization', value: `${Math.round(utilization)}%` },
      ]}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted">
          <Loader2 className="mr-2 animate-spin" size={16} />
          Loading…
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-navy">Budget Allocation by Plan</h3>
            <div className="space-y-3">
              {plansWithBudget.length === 0 ? (
                <p className="text-sm text-muted">No budget data available</p>
              ) : (
                plansWithBudget.map((p) => {
                  const pct = Number(p.budget) > 0 ? (Number(p.actualCost) / Number(p.budget)) * 100 : 0;
                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-navy truncate max-w-[300px]">{p.title}</span>
                        <span className="text-muted">
                          {new Intl.NumberFormat().format(Number(p.actualCost))} / {new Intl.NumberFormat().format(Number(p.budget))}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-4 text-sm font-semibold text-navy">Budget Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Total Allocated</span>
                  <span className="font-semibold text-navy">{new Intl.NumberFormat().format(totalBudget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Total Spent</span>
                  <span className="font-semibold text-navy">{new Intl.NumberFormat().format(totalSpent)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-muted">Remaining</span>
                  <span className={`font-bold ${remaining < 0 ? 'text-danger' : 'text-green-600'}`}>
                    {new Intl.NumberFormat().format(remaining)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Plans with Budget</span>
                  <span className="font-semibold text-navy">{plansWithBudget.length} / {plans.length}</span>
                </div>
              </div>
            </div>
            <div className="card">
              <h3 className="mb-4 text-sm font-semibold text-navy">Variance Analysis</h3>
              <div className="space-y-3">
                {plansWithBudget.slice(0, 5).map((p) => {
                  const variance = Number(p.budget) - Number(p.actualCost);
                  const isOver = variance < 0;
                  return (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      {isOver ? (
                        <TrendingUp size={12} className="text-danger" />
                      ) : (
                        <TrendingDown size={12} className="text-green-600" />
                      )}
                      <span className="flex-1 truncate text-navy">{p.title}</span>
                      <span className={isOver ? 'text-danger' : 'text-green-600'}>
                        {isOver ? '+' : ''}{new Intl.NumberFormat().format(Math.abs(variance))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {allExpenses.length > 0 && (
            <div className="card">
              <h3 className="mb-4 text-sm font-semibold text-navy">Recent Expenses</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase text-muted">
                    <tr>
                      <th className="pb-2 pr-3">Date</th>
                      <th className="pb-2 pr-3">Plan</th>
                      <th className="pb-2 pr-3">Description</th>
                      <th className="pb-2 pr-3">Amount</th>
                      <th className="pb-2">Funding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allExpenses.slice(0, 20).map((ex) => (
                      <tr key={ex.id} className="border-t border-slate-50">
                        <td className="py-2 pr-3 text-muted">{new Date(ex.expenseDate).toLocaleDateString()}</td>
                        <td className="py-2 pr-3 font-medium text-navy">{ex.planTitle}</td>
                        <td className="py-2 pr-3">{ex.description ?? ex.category}</td>
                        <td className="py-2 pr-3">{formatRwf(Number(ex.amount))}</td>
                        <td className="py-2 text-muted">{ex.fundingSource ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-muted">Record new expenses from each plan&apos;s Budget tab.</p>
            </div>
          )}
        </div>
      )}
    </ApPageLayout>
  );
}
