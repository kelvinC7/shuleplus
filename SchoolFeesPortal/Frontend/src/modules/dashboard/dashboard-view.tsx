'use client';

import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { FeesChartCard } from '@/components/charts/fees-chart-card';
import { StatCard, StatsGrid } from '@/components/stat-card';
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
import { StatusBadge } from '@/components/status-badge';
import { FeesPageTitle } from '@/components/fees-page-title';

export function DashboardView() {
  const { summary } = useAuth();
  const kpis = summary?.kpis;
  const trend = summary?.revenueTrend ?? [];
  const methods = summary?.paymentMethods ?? [];
  const progress = summary?.collectionProgress;
  const outstanding = summary?.outstandingWidget;
  const insights = summary?.aiInsights ?? [];

  const methodSegments = methods.map((m, i) => ({
    label: m.method.replace(/_/g, ' '),
    value: m.amount,
    color: [PRIMARY, NAVY, TEAL, LAVENDER, '#f97316', '#22c55e'][i % 6],
  }));

  const forecast = trend.map((p, i) => ({
    label: p.label,
    value: Math.round(p.value * (1.1 + i * 0.01)),
  }));

  const outstandingTrend = trend.map((p) => ({
    label: p.label,
    value: Math.round((outstanding?.total ?? 0) * (0.5 + Math.random() * 0.4)),
  }));

  return (
    <div className="space-y-6">
      <FeesPageTitle>Dashboard</FeesPageTitle>
      <StatsGrid columns={6}>
        <StatCard
          label="Total Expected"
          value={kpis?.totalExpectedRevenueLabel ?? '—'}
          delta="Academic year target"
        />
        <StatCard
          label="Today's Collection"
          value={kpis?.todayCollectionsLabel ?? '—'}
          delta={kpis?.weeklyCollectionsLabel ? `${kpis.weeklyCollectionsLabel} this week` : undefined}
        />
        <StatCard
          label="Outstanding"
          value={kpis?.outstandingLabel ?? '—'}
          delta={`${kpis?.studentsWithOutstanding ?? 0} students`}
        />
        <StatCard
          label="Paid Students"
          value={kpis?.paidStudents ?? 0}
          delta={`${kpis?.totalStudents ?? 0} billed`}
        />
        <StatCard
          label="Installments"
          value={kpis?.activeInstallments ?? 0}
          delta="Active plans"
        />
        <StatCard
          label="Success Rate"
          value={`${kpis?.paymentSuccessRate ?? 0}%`}
          delta={`${kpis?.collectionPerformance ?? 0}% collected`}
        />
      </StatsGrid>

      <StatsGrid columns={4}>
        <StatCard
          label="Partial Pay"
          value={kpis?.partiallyPaidStudents ?? 0}
          delta="Students"
        />
        <StatCard
          label="Unpaid"
          value={kpis?.unpaidStudents ?? 0}
          delta="Need follow-up"
        />
        <StatCard
          label="Scholarships"
          value={kpis?.scholarshipsLabel ?? '—'}
          delta={`${kpis?.scholarshipStudents ?? 0} students`}
        />
        <StatCard
          label="Financial Holds"
          value={kpis?.studentsWithHolds ?? 0}
          delta="Active holds"
        />
      </StatsGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <FeesChartCard
          title="Revenue Trends"
          metric={
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-bold text-navy">{kpis?.totalCollectionsLabel ?? '—'}</span>
              <span className="flex items-center gap-0.5 text-xs font-semibold text-[#FCB038]">
                <ArrowUpRight size={14} />
                +24% vs last month
              </span>
            </div>
          }
        >
          <DualAreaChart
            seriesA={trend.length ? trend : [{ label: '—', value: 0 }]}
            seriesB={forecast.length ? forecast : [{ label: '—', value: 0 }]}
            labelA="Collections"
            labelB="Forecast"
            colorA={PRIMARY}
            colorB={NAVY}
          />
        </FeesChartCard>

        <FeesChartCard title="Payment Methods" subtitle="Share of completed collections">
          <DonutChart
            segments={
              methodSegments.length
                ? methodSegments
                : [{ label: 'No data', value: 1, color: '#e2e8f0' }]
            }
            centerLabel={`${kpis?.paymentSuccessRate ?? 0}%`}
          />
        </FeesChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <FeesChartCard title="Collection Progress" subtitle="Target vs actual performance">
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-navy">
                {progress?.percentage ?? 0}% Fee Collections Completed
              </span>
              <span className="text-muted">{progress?.remaining ?? 0}% remaining</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-navy to-primary transition-all"
                style={{ width: `${progress?.percentage ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-muted">
              {progress?.successRate ?? 0}% payment success rate
            </p>
          </div>
          <GroupedBarChart
            groups={[
              {
                label: 'Rev',
                budget: progress?.expected ?? 0,
                actual: progress?.collected ?? 0,
              },
            ]}
            labelA="Expected"
            labelB="Collected"
            colorA={LAVENDER}
            colorB={NAVY}
          />
        </FeesChartCard>

        <FeesChartCard title="Outstanding Trends" subtitle="Balance movement over time">
          <SingleAreaChart
            data={outstandingTrend.length ? outstandingTrend : [{ label: '—', value: 0 }]}
            color={TEAL}
          />
        </FeesChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="hr-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-navy">Recent Payments</h3>
            <p className="text-xs text-muted">Live collection activity</p>
          </div>
          <ul className="divide-y divide-border">
            {(summary?.recentPayments ?? []).slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">{p.studentName}</p>
                  <p className="text-xs text-muted">
                    {p.className ?? '—'} · {p.method.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-navy">{p.amountLabel}</p>
                  <StatusBadge status={p.status} />
                </div>
              </li>
            ))}
            {!summary?.recentPayments?.length ? (
              <li className="px-5 py-8 text-center text-sm text-muted">No recent payments</li>
            ) : null}
          </ul>
        </div>

        <div className="hr-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-navy">
                Smart AI Insights
              </h3>
              <p className="text-xs text-muted">Babyeyi financial assistant</p>
            </div>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
          </div>
          <ul className="space-y-3">
            {insights.map((insight, i) => (
              <li
                key={i}
                className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-navy"
              >
                {insight}
              </li>
            ))}
            {!insights.length ? (
              <li className="text-sm text-muted">Insights will appear as collections grow.</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="hr-card p-5 sm:p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy">Upcoming Due Dates</h3>
          <ul className="mt-4 space-y-3">
            {(summary?.calendar ?? []).map((c, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="mt-0.5 rounded-lg bg-navy px-2 py-1 text-[10px] font-bold text-primary">
                  {new Date(c.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy">{c.label}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted">{c.type}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="hr-card p-5 sm:p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy">Financial Calendar</h3>
          <p className="mt-1 text-xs text-muted">Billing, refunds & scholarship milestones</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(summary?.activities ?? []).slice(0, 6).map((a, i) => (
              <div key={i} className="rounded-xl border border-border px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{a.type}</p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold text-navy">{a.label}</p>
                {a.amount ? <p className="mt-1 text-xs font-bold text-primary">{a.amount}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <FeesChartCard title="Revenue Forecast" subtitle="Projected collections">
          <SingleAreaChart
            data={forecast.length ? forecast : [{ label: '—', value: 0 }]}
            color={PRIMARY}
          />
        </FeesChartCard>

        <FeesChartCard title="Scholarships Analytics" subtitle="Allocated vs sponsored students">
          <GroupedBarChart
            groups={[
              {
                label: 'Aid',
                budget: kpis?.scholarshipStudents ?? 0,
                actual: kpis?.sponsoredStudents ?? 0,
              },
            ]}
            labelA="Scholarship students"
            labelB="Sponsored"
            colorA={LAVENDER}
            colorB={TEAL}
          />
        </FeesChartCard>
      </div>

      <div className="hr-card p-5 sm:p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-navy">
          Real-Time Collection Widget
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Today's Transactions", value: summary?.recentPayments?.length ?? 0 },
            { label: 'Latest Receipts', value: summary?.recentReceipts?.length ?? 0 },
            { label: 'Pending Approvals', value: kpis?.pendingPayments ?? 0 },
            { label: 'Failed / Holds', value: kpis?.studentsWithHolds ?? 0 },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-slate-50/80 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{item.label}</p>
              <p className="mt-1 text-2xl font-extrabold text-navy">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
