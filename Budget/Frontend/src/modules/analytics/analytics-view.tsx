'use client';

import { useEffect, useState } from 'react';
import { budgetApi, unwrap } from '@/services/budget-api';
import { BudgetSelector } from '@/components/budget-selector';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { useToast } from '@/shared/notifications';
import { formatRwf, formatRwfStat } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/api-error';
import type { AnalyticsData, SchoolBudget } from '@/types';

export function AnalyticsView() {
  const toast = useToast();
  const [budgets, setBudgets] = useState<SchoolBudget[]>([]);
  const [budgetId, setBudgetId] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [bRes, aRes] = await Promise.all([
          budgetApi.budgets(),
          budgetApi.analytics(budgetId || undefined),
        ]);
        setBudgets(unwrap(bRes.data));
        setData(unwrap(aRes.data));
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Failed to load analytics'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetId]);

  const byDept = data?.byDepartment ?? [];
  const byCat = data?.byCategory ?? [];
  const maxDept = Math.max(...byDept.map((d) => d.planned), 1);
  const maxCat = Math.max(...byCat.map((c) => c.planned), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy sm:text-2xl">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Allocation and spend charts from the analytics API.
          </p>
        </div>
        <BudgetSelector budgets={budgets} value={budgetId} onChange={setBudgetId} />
      </div>

      {loading ? <p className="text-sm text-muted">Loading analytics…</p> : null}

      <StatsGrid>
        <StatCard label="Expected" value={formatRwfStat(data?.kpis.expected)} />
        <StatCard label="Allocated" value={formatRwfStat(data?.kpis.allocated)} />
        <StatCard label="Spent" value={formatRwfStat(data?.kpis.spent)} />
        <StatCard label="Available" value={formatRwfStat(data?.kpis.available)} />
      </StatsGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="hr-card p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy">By department</h2>
          <div className="mt-4 space-y-3">
            {byDept.length === 0 ? (
              <p className="text-sm text-muted">No department data.</p>
            ) : (
              byDept.map((d) => {
                const label = d.label ?? d.department ?? '—';
                return (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-navy">{label}</span>
                      <span className="text-muted">{formatRwf(d.used)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-navy"
                        style={{ width: `${Math.round((d.planned / maxDept) * 100)}%` }}
                      >
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${d.planned > 0 ? Math.round((d.used / d.planned) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="hr-card p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy">By category</h2>
          <div className="mt-4 space-y-3">
            {byCat.length === 0 ? (
              <p className="text-sm text-muted">No category data.</p>
            ) : (
              byCat.map((c) => (
                <div key={c.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-navy">{c.label}</span>
                    <span className="text-muted">
                      {formatRwf(c.used)} / {formatRwf(c.planned)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((c.planned / maxCat) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="hr-card p-5 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy">Alerts</h2>
        <ul className="mt-3 space-y-2">
          {(data?.alerts ?? []).length === 0 ? (
            <li className="text-sm text-muted">No alerts.</li>
          ) : (
            data?.alerts.map((a) => (
              <li
                key={a.lineId}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
              >
                <span className="text-sm font-medium text-navy">{a.lineName}</span>
                <StatusBadge status={a.severity} />
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
