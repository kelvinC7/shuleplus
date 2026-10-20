'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  DollarSign,
  CheckCircle,
  ShoppingCart,
  Clock,
  XCircle,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { MainLayout } from '@/layouts/main-layout';
import { PlatformPageLayout } from '@/components/platform-page-layout';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { PageLoading } from '@/components/list-ui';
import { procurementApi } from '@/services/procurement-api';
import type { ProcurementAnalyticsData } from '@/types/analytics';
import { formatFrw, formatFrwCompact } from '@/utils/currency';
import {
  ReportFilterBar,
  filtersToParams,
  useReportFilters,
} from '@/components/reports/report-filter-bar';
import {
  TrendChart,
  PipelineStages,
  ReportSection,
} from '@/components/reports/report-charts';

export default function ProcurementAnalyticsPage() {
  const { filters, setFilters, applied, apply, reset, departments } = useReportFilters();
  const [data, setData] = useState<ProcurementAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendKey, setTrendKey] = useState<'requests' | 'purchased'>('requests');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await procurementApi.analytics.procurement(filtersToParams(applied));
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <MainLayout>
        <PageLoading label="Loading procurement analytics…" />
      </MainLayout>
    );
  }

  const kpis = data?.kpis;

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle="Procurement Analytics — complete overview of procurement activity for your selected filters."
      >
        <ReportFilterBar
          filters={filters}
          onChange={setFilters}
          onApply={apply}
          onReset={reset}
          departments={departments}
          comparisonNote="Compared with: Previous Term / Previous Academic Year (when historical data is available)"
        />

        {kpis ? (
          <StatsGrid columns={4} className="mt-4">
            <StatCard label="Total Requests" value={kpis.totalRequests} icon={<FileText size={20} />} />
            <StatCard label="Requested Value" value={formatFrwCompact(kpis.requestedValue)} icon={<DollarSign size={20} />} />
            <StatCard label="Approved Value" value={formatFrwCompact(kpis.approvedValue)} icon={<CheckCircle size={20} />} />
            <StatCard label="Purchased Value" value={formatFrwCompact(kpis.purchasedValue)} icon={<ShoppingCart size={20} />} />
            <StatCard label="Pending Value" value={formatFrwCompact(kpis.pendingValue)} icon={<Clock size={20} />} valueClassName="text-amber-600" />
            <StatCard label="Rejected Value" value={formatFrwCompact(kpis.rejectedValue)} icon={<XCircle size={20} />} valueClassName="text-red-600" />
            <StatCard label="Average Request" value={formatFrwCompact(kpis.averageRequest)} icon={<TrendingUp size={20} />} />
            <StatCard label="Completion Rate" value={`${kpis.completionRate}%`} icon={<Percent size={20} />} />
          </StatsGrid>
        ) : null}

        <div className="mt-6 space-y-6">
          <ReportSection title="Procurement Trend" subtitle="Monthly procurement activity">
            <div className="mb-4 flex flex-wrap gap-2">
              {(['requests', 'purchased'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTrendKey(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    trendKey === key
                      ? 'bg-navy text-white'
                      : 'bg-slate-100 text-muted hover:bg-slate-200'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
            <TrendChart data={data?.trend ?? []} dataKey={trendKey} />
          </ReportSection>

          <ReportSection title="Procurement Pipeline" subtitle="Click a stage to review requests in that status">
            <PipelineStages
              stages={[
                { label: 'Submitted', count: data?.pipeline.submitted ?? 0 },
                { label: 'Under Review', count: data?.pipeline.underReview ?? 0 },
                { label: 'Approved', count: data?.pipeline.approved ?? 0 },
                { label: 'Ordered', count: data?.pipeline.ordered ?? 0 },
                { label: 'Received', count: data?.pipeline.received ?? 0 },
                { label: 'Completed', count: data?.pipeline.completed ?? 0 },
              ]}
            />
          </ReportSection>

          {data?.budget.annual ? (
            <ReportSection title="Budget vs Procurement" subtitle="Annual budget utilization">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-bold uppercase text-muted">Annual Budget</p>
                  <p className="text-xl font-bold text-navy">{formatFrw(data.budget.annual)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-muted">Committed</p>
                  <p className="text-xl font-bold text-navy">{formatFrwCompact(data.budget.committed)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-muted">Purchased</p>
                  <p className="text-xl font-bold text-navy">{formatFrwCompact(data.budget.purchased)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-muted">Remaining</p>
                  <p className="text-xl font-bold text-emerald-600">{formatFrwCompact(data.budget.remaining)}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted">Utilization</span>
                  <span className="font-semibold text-navy">{data.budget.utilizationPct}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-navy to-[#fcb038]"
                    style={{ width: `${Math.min(100, data.budget.utilizationPct)}%` }}
                  />
                </div>
              </div>
            </ReportSection>
          ) : null}

          <ReportSection title="Most Requested Items">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-[10px] font-bold uppercase tracking-wide text-muted">
                    <th className="pb-2 pr-4">Item</th>
                    <th className="pb-2 pr-4">Requests</th>
                    <th className="pb-2 pr-4">Quantity</th>
                    <th className="pb-2 pr-4">Requested</th>
                    <th className="pb-2">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topItems ?? []).map((item) => (
                    <tr key={item.itemName} className="border-b border-border/50">
                      <td className="py-3 font-medium text-navy">{item.itemName}</td>
                      <td className="py-3 tabular-nums">{item.requests}</td>
                      <td className="py-3 tabular-nums">{item.quantity.toLocaleString()}</td>
                      <td className="py-3 tabular-nums">{formatFrwCompact(item.requested)}</td>
                      <td className="py-3 tabular-nums">{formatFrwCompact(item.approved)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>
        </div>
      </PlatformPageLayout>
    </MainLayout>
  );
}
