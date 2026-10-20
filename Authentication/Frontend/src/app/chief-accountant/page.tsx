'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchCaOverview } from '@/lib/chief-accountant-api';
import { formatRwf } from '@/lib/rep-finance-utils';
import { CaFilterBar } from '@/components/chief-accountant/ca-filter-bar';
import { StatCard } from '@/components/school-representative/stat-card';
import { useCaContext } from '@/components/chief-accountant/ca-context';

export default function ChiefAccountantOverviewPage() {
  const { orgScope, academicYear, term, financialPeriod } = useCaContext();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCaOverview>> | null>(null);
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => {
    const p: Record<string, string> = { financialPeriod };
    if (orgScope !== 'all') p.organizationId = orgScope;
    if (academicYear) p.academicYear = academicYear;
    if (term) p.term = term;
    return p;
  }, [orgScope, academicYear, term, financialPeriod]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchCaOverview(params));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-navy">Overview</h1>

      <CaFilterBar onRefresh={load} refreshing={loading} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={formatRwf(data?.summary?.totalRevenue)}
          hint="Collected school fees (verified)"
          accent
        />
        <StatCard label="Total expenses" value={formatRwf(data?.summary?.totalExpenses)} hint="Approved expenditure" />
        <StatCard label="Cash position" value={formatRwf(data?.summary?.cashPosition)} hint="Reconciled basis" />
        <StatCard
          label="Pending approvals"
          value={data?.summary?.pendingApprovals ?? 0}
          hint="Awaiting action"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="mb-1 font-semibold text-navy">Revenue vs expenses</p>
          <p className="mb-4 text-xs text-muted">Selected period · monthly trend (collections)</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.collectionTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => formatRwf(Number(v ?? 0))} />
                <Line type="monotone" dataKey="amount" name="Collections" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <dt className="text-muted">Revenue</dt>
              <dd className="font-semibold text-navy">{formatRwf(data?.performance?.revenue)}</dd>
            </div>
            <div>
              <dt className="text-muted">Expenses</dt>
              <dd className="font-semibold text-navy">{formatRwf(data?.performance?.expenses)}</dd>
            </div>
            <div>
              <dt className="text-muted">Net</dt>
              <dd className="font-semibold text-emerald-700">{formatRwf(data?.performance?.netPosition)}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="mb-4 font-semibold text-navy">School comparison</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.bySchool ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => formatRwf(Number(v ?? 0))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="revenue" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outstandingFees" name="Outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Outstanding fees" value={formatRwf(data?.summary?.feesOutstanding)} hint="Student balances" />
        <StatCard label="Payroll spend" value={formatRwf(data?.summary?.payrollExpenditure)} hint="Period total" />
        <StatCard
          label="Unreconciled"
          value={data?.summary?.unreconciledTransactions ?? 0}
          hint="Transactions pending match"
        />
      </div>
    </div>
  );
}
