'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Banknote,
  CircleDollarSign,
  PiggyBank,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { budgetApi, unwrap } from '@/services/budget-api';
import { BudgetSelector } from '@/components/budget-selector';
import { StatusBadge } from '@/components/status-badge';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { formatDate, formatRwf, formatRwfStat } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/api-error';
import type { DashboardSummary, SchoolBudget } from '@/types';

export function DashboardView() {
  const { summary: authSummary } = useAuth();
  const [budgetId, setBudgetId] = useState('');
  const [budgets, setBudgets] = useState<SchoolBudget[]>([]);
  const [data, setData] = useState<DashboardSummary | null>(authSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await budgetApi.budgets();
        setBudgets(unwrap(res.data));
      } catch {
        /* ignore list errors on dashboard */
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await budgetApi.dashboard(budgetId || undefined);
        setData(unwrap(res.data));
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load dashboard'));
      } finally {
        setLoading(false);
      }
    })();
  }, [budgetId]);

  const kpis = data?.kpis;
  const byDept = data?.byDepartment ?? [];
  const maxPlanned = Math.max(...byDept.map((d) => d.planned), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy sm:text-2xl">Budget Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Track expected income, allocation, and spend in one place.
          </p>
        </div>
        <BudgetSelector budgets={budgets} value={budgetId} onChange={setBudgetId} />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <StatsGrid>
        <StatCard
          label="Expected Income"
          value={formatRwfStat(kpis?.expected)}
          delta={`${kpis?.budgets ?? 0} budgets`}
          icon={<Banknote size={20} />}
        />
        <StatCard
          label="Allocated"
          value={formatRwfStat(kpis?.allocated)}
          delta={`${formatRwfStat(kpis?.unallocated)} unallocated`}
          icon={<Wallet size={20} />}
        />
        <StatCard
          label="Spent"
          value={formatRwfStat(kpis?.spent)}
          delta={`${kpis?.pending ?? 0} pending review`}
          icon={<CircleDollarSign size={20} />}
        />
        <StatCard
          label="Available"
          value={formatRwfStat(kpis?.available)}
          delta={loading ? 'Refreshing…' : 'After actual usage'}
          icon={<PiggyBank size={20} />}
        />
      </StatsGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="hr-card p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy">
            Spend by Department
          </h2>
          <div className="mt-4 space-y-3">
            {byDept.length === 0 ? (
              <p className="text-sm text-muted">No department allocations yet.</p>
            ) : (
              byDept.map((d) => {
                const label = d.label ?? d.department ?? '—';
                const pct = Math.round((d.planned / maxPlanned) * 100);
                const usedPct = d.planned > 0 ? Math.round((d.used / d.planned) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-navy">{label}</span>
                      <span className="text-muted">
                        {formatRwf(d.used)} / {formatRwf(d.planned)}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-navy/15"
                        style={{ width: `${pct}%` }}
                      >
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${usedPct}%` }}
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
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy">Alerts</h2>
          </div>
          <ul className="mt-4 space-y-2">
            {(data?.alerts ?? []).length === 0 ? (
              <li className="text-sm text-muted">No critical line alerts.</li>
            ) : (
              data?.alerts.map((a) => (
                <li
                  key={a.lineId}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy">{a.lineName}</p>
                    <p className="text-xs text-muted">
                      {formatRwf(a.used)} of {formatRwf(a.planned)}
                    </p>
                  </div>
                  <StatusBadge status={a.severity} />
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="hr-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy">Recent Budgets</h2>
          <Link href="/create" className="btn-primary text-xs">
            Create Budget
          </Link>
        </div>
        <div className="divide-y divide-border">
          {(data?.recentBudgets ?? []).length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">No budgets yet. Create your first draft.</p>
          ) : (
            data?.recentBudgets.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div>
                  <p className="text-sm font-semibold text-navy">
                    {b.budgetCode} · {b.title}
                  </p>
                  <p className="text-xs text-muted">
                    {b.academicYear} · {b.term} · {formatDate(b.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-navy">
                    {formatRwf(b.totalExpectedIncomeRwf)}
                  </span>
                  <StatusBadge status={b.status} />
                  <Link href={`/approvals`} className="text-xs font-semibold text-primary">
                    View
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
