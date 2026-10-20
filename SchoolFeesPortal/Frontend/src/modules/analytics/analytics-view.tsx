'use client';

import { useEffect, useState } from 'react';
import { Download, Filter, Sparkles } from 'lucide-react';
import { api } from '@/services/api';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { FeesPageTitle } from '@/components/fees-page-title';
import { FeesChartCard } from '@/components/charts/fees-chart-card';
import {
  DonutChart,
  DualAreaChart,
  GroupedBarChart,
  LAVENDER,
  NAVY,
  PRIMARY,
  SingleAreaChart,
  TEAL,
} from '@/components/charts/fees-charts';

interface AnalyticsData {
  kpis: {
    totalCollectionsLabel: string;
    outstandingLabel: string;
    collectionPerformance: number;
    paymentSuccessRate: number;
    paidStudents: number;
    unpaidStudents: number;
    partiallyPaidStudents: number;
    scholarshipsLabel: string;
    activeInstallments: number;
  };
  revenue: {
    daily: { label: string; value: number }[];
    monthly: { label: string; value: number }[];
    forecast: { label: string; value: number }[];
    growth: number;
  };
  studentPayments: {
    paid: number;
    unpaid: number;
    partial: number;
    installments: number;
    scholarships: number;
  };
  feeCategories: { name: string; amount: number; label: string }[];
  paymentMethods: { method: string; amount: number; label: string }[];
  outstanding: {
    trend: { label: string; value: number }[];
    overdue: number;
    recoveryRate: number;
  };
  installments: { active: number; dueThisWeek: number; completed: number; failed: number };
  aiInsights: string[];
  heatMap: { className: string; values: number[] }[];
}

export function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    academicYear: '2025-2026',
    term: 'Term II',
    className: '',
    method: '',
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { data: res } = await api.get('/analytics', { params: filters });
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const methodSegments = (data?.paymentMethods ?? []).map((m, i) => ({
    label: m.method.replace(/_/g, ' '),
    value: m.amount,
    color: [PRIMARY, NAVY, TEAL, LAVENDER, '#f97316'][i % 5],
  }));

  const studentSegments = [
    { label: 'Paid', value: data?.studentPayments.paid ?? 0, color: NAVY },
    { label: 'Partial', value: data?.studentPayments.partial ?? 0, color: PRIMARY },
    { label: 'Unpaid', value: data?.studentPayments.unpaid ?? 0, color: '#ef4444' },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-6">
      <div className="hr-card flex flex-wrap items-end justify-between gap-4 p-4 sm:p-5">
        <div>
          <FeesPageTitle className="text-lg font-bold text-navy">Fee Analytics</FeesPageTitle>
          <p className="text-sm text-muted">Interactive revenue, collection & risk intelligence</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-xs">
            <Download size={14} /> PDF
          </button>
          <button type="button" className="btn-secondary text-xs">
            <Download size={14} /> Excel
          </button>
          <button type="button" className="btn-secondary text-xs">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="hr-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <div>
          <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted">
            <Filter size={12} /> Academic Year
          </label>
          <select
            className="input py-2.5"
            value={filters.academicYear}
            onChange={(e) => setFilters((f) => ({ ...f, academicYear: e.target.value }))}
          >
            <option>2025-2026</option>
            <option>2024-2025</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">Term</label>
          <select
            className="input py-2.5"
            value={filters.term}
            onChange={(e) => setFilters((f) => ({ ...f, term: e.target.value }))}
          >
            <option>Term I</option>
            <option>Term II</option>
            <option>Term III</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">Class</label>
          <select
            className="input py-2.5"
            value={filters.className}
            onChange={(e) => setFilters((f) => ({ ...f, className: e.target.value }))}
          >
            <option value="">All classes</option>
            <option>S3 A</option>
            <option>S4 Science</option>
            <option>P6 B</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted">
            Payment Method
          </label>
          <select
            className="input py-2.5"
            value={filters.method}
            onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}
          >
            <option value="">All methods</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading analytics…</p>
      ) : (
        <>
          <StatsGrid columns={4}>
            <StatCard
              label="Total Collections"
              value={data?.kpis.totalCollectionsLabel ?? '—'}
              delta={`+${data?.revenue.growth ?? 0}% growth`}
            />
            <StatCard
              label="Outstanding"
              value={data?.kpis.outstandingLabel ?? '—'}
              delta={`${data?.outstanding.overdue ?? 0} overdue`}
            />
            <StatCard
              label="Collection Performance"
              value={`${data?.kpis.collectionPerformance ?? 0}%`}
              delta={`${data?.kpis.paymentSuccessRate ?? 0}% success`}
            />
            <StatCard
              label="Active Installments"
              value={data?.installments.active ?? 0}
              delta={`${data?.installments.dueThisWeek ?? 0} due this week`}
            />
          </StatsGrid>

          <div className="grid gap-4 xl:grid-cols-2">
            <FeesChartCard title="Revenue Growth" subtitle="Daily collections">
              <SingleAreaChart
                data={data?.revenue.daily?.length ? data.revenue.daily : [{ label: '—', value: 0 }]}
                color={PRIMARY}
              />
            </FeesChartCard>
            <FeesChartCard title="Monthly Revenue vs Forecast">
              <DualAreaChart
                seriesA={data?.revenue.monthly ?? [{ label: '—', value: 0 }]}
                seriesB={data?.revenue.forecast ?? [{ label: '—', value: 0 }]}
                labelA="Actual"
                labelB="Forecast"
                colorA={NAVY}
                colorB={LAVENDER}
              />
            </FeesChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <FeesChartCard title="Student Payment Analytics">
              <DonutChart
                segments={
                  studentSegments.length
                    ? studentSegments
                    : [{ label: 'No data', value: 1, color: '#e2e8f0' }]
                }
                centerLabel={`${(data?.studentPayments.paid ?? 0) + (data?.studentPayments.partial ?? 0) + (data?.studentPayments.unpaid ?? 0)}`}
              />
            </FeesChartCard>
            <FeesChartCard title="Payment Methods">
              <DonutChart
                segments={
                  methodSegments.length
                    ? methodSegments
                    : [{ label: 'No data', value: 1, color: '#e2e8f0' }]
                }
                centerLabel="Mix"
              />
            </FeesChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <FeesChartCard title="Fee Categories" subtitle="Highest revenue categories">
              <GroupedBarChart
                groups={(data?.feeCategories ?? []).slice(0, 4).map((c) => ({
                  label: c.name.slice(0, 6),
                  budget: c.amount,
                  actual: Math.round(c.amount * 0.85),
                }))}
                labelA="Billed"
                labelB="Collected"
                colorA={LAVENDER}
                colorB={TEAL}
              />
            </FeesChartCard>
            <FeesChartCard title="Outstanding Analytics" subtitle="Recovery performance">
              <SingleAreaChart
                data={data?.outstanding.trend ?? [{ label: '—', value: 0 }]}
                color="#ef4444"
              />
              <p className="mt-3 text-xs font-semibold text-muted">
                Recovery rate: {data?.outstanding.recoveryRate ?? 0}%
              </p>
            </FeesChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="hr-card p-5">
              <h3 className="text-sm font-bold text-navy">Installment Analytics</h3>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex justify-between"><span className="text-muted">Active</span><strong>{data?.installments.active}</strong></li>
                <li className="flex justify-between"><span className="text-muted">Due this week</span><strong>{data?.installments.dueThisWeek}</strong></li>
                <li className="flex justify-between"><span className="text-muted">Completed</span><strong>{data?.installments.completed}</strong></li>
                <li className="flex justify-between"><span className="text-muted">Failed</span><strong className="text-danger">{data?.installments.failed}</strong></li>
              </ul>
            </div>
            <div className="hr-card p-5">
              <h3 className="text-sm font-bold text-navy">Scholarship Analytics</h3>
              <p className="mt-3 text-3xl font-extrabold text-navy">{data?.kpis.scholarshipsLabel}</p>
              <p className="mt-1 text-xs text-muted">
                {data?.studentPayments.scholarships ?? 0} scholarship students tracked
              </p>
            </div>
            <div className="hr-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-navy">AI Insights</h3>
              </div>
              <ul className="space-y-2">
                {(data?.aiInsights ?? []).slice(0, 4).map((t, i) => (
                  <li key={i} className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-navy">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="hr-card p-5">
            <h3 className="text-sm font-bold text-navy">Collection Heat Map by Class</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead>
                  <tr className="text-muted">
                    <th className="pb-2 font-semibold">Class</th>
                    {['T1', 'T2', 'T3', 'T4', 'T5', 'T6'].map((h) => (
                      <th key={h} className="pb-2 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.heatMap ?? []).map((row) => (
                    <tr key={row.className}>
                      <td className="py-1.5 font-semibold text-navy">{row.className}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="py-1.5">
                          <span
                            className="inline-flex h-8 w-10 items-center justify-center rounded-lg text-[10px] font-bold text-navy"
                            style={{
                              backgroundColor: `rgba(252, 176, 56, ${0.15 + (v / 100) * 0.7})`,
                            }}
                          >
                            {v}%
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
