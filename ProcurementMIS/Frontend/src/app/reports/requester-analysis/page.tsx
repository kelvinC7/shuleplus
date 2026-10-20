'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  FileText,
  DollarSign,
  AlertTriangle,
  ShoppingCart,
  CheckCircle,
} from 'lucide-react';
import { MainLayout } from '@/layouts/main-layout';
import { PlatformPageLayout } from '@/components/platform-page-layout';
import { StatCard, StatsGrid } from '@/components/stat-card';
import {
  DataTable,
  DataTableCard,
  DataTableEmpty,
  DataTableHead,
  DataTableTh,
  PageLoading,
} from '@/components/list-ui';
import { procurementApi } from '@/services/procurement-api';
import type { RequesterAnalysisData, RequesterProfileData } from '@/types/analytics';
import { formatFrw, formatFrwCompact } from '@/utils/currency';
import {
  ReportFilterBar,
  filtersToParams,
  useReportFilters,
} from '@/components/reports/report-filter-bar';
import {
  TrendChart,
  CategoryDonut,
  ReportSection,
} from '@/components/reports/report-charts';

type SortKey = 'requests' | 'requested' | 'averageRequest' | 'approved' | 'rejected';

export default function RequesterAnalysisPage() {
  const { filters, setFilters, applied, apply, reset, departments } = useReportFilters();
  const [data, setData] = useState<RequesterAnalysisData | null>(null);
  const [profile, setProfile] = useState<RequesterProfileData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('requests');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await procurementApi.analytics.requesterAnalysis(filtersToParams(applied));
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

  const viewProfile = async (requesterId: string) => {
    setSelectedId(requesterId);
    try {
      const p = await procurementApi.analytics.requesterProfile(
        requesterId,
        filtersToParams(applied),
      );
      setProfile(p);
    } catch {
      setProfile(null);
    }
  };

  const sorted = [...(data?.topRequesters ?? [])].sort((a, b) => {
    if (sortKey === 'requests') return b.requests - a.requests;
    if (sortKey === 'requested') return b.requested - a.requested;
    if (sortKey === 'averageRequest') return b.averageRequest - a.averageRequest;
    if (sortKey === 'approved') return b.approved - a.approved;
    return b.rejected - a.rejected;
  });

  if (loading && !data) {
    return (
      <MainLayout>
        <PageLoading label="Loading requester analysis…" />
      </MainLayout>
    );
  }

  const kpis = data?.kpis;

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle="Requester Analysis — who is requesting the most, what are they requesting, and how much?"
      >
        <ReportFilterBar
          filters={filters}
          onChange={setFilters}
          onApply={apply}
          onReset={reset}
          departments={departments}
          showDepartment
        />

        {kpis ? (
          <StatsGrid columns={4} className="mt-4">
            <StatCard label="Total Requesters" value={kpis.totalRequesters} icon={<Users size={20} />} />
            <StatCard label="Active Requesters" value={kpis.activeRequesters} icon={<UserCheck size={20} />} />
            <StatCard label="Total Requests" value={kpis.totalRequests} icon={<FileText size={20} />} />
            <StatCard label="Total Requested" value={formatFrwCompact(kpis.totalRequested)} icon={<DollarSign size={20} />} />
            <StatCard label="Total Approved" value={formatFrwCompact(kpis.totalApproved)} icon={<CheckCircle size={20} />} valueClassName="text-emerald-600" />
            <StatCard label="Total Purchased" value={formatFrwCompact(kpis.totalPurchased)} icon={<ShoppingCart size={20} />} />
          </StatsGrid>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ['requests', 'Most Requests'],
              ['requested', 'Highest Amount'],
              ['averageRequest', 'Highest Average'],
              ['approved', 'Most Approved'],
              ['rejected', 'Most Rejected'],
            ] as [SortKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortKey(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                sortKey === key ? 'bg-navy text-white' : 'bg-slate-100 text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-6">
          <ReportSection title="Top Requesters">
            <DataTableCard>
              <DataTable minWidth="960px">
                <DataTableHead>
                  <DataTableTh className="w-12 text-center">#</DataTableTh>
                  <DataTableTh>Requester</DataTableTh>
                  <DataTableTh>Department</DataTableTh>
                  <DataTableTh className="text-right">Requests</DataTableTh>
                  <DataTableTh className="text-right">Requested</DataTableTh>
                  <DataTableTh className="text-right">Approved</DataTableTh>
                  <DataTableTh className="text-right">Purchased</DataTableTh>
                  <DataTableTh className="text-right">Approval %</DataTableTh>
                  <DataTableTh className="text-center">Profile</DataTableTh>
                </DataTableHead>
                <tbody>
                  {sorted.map((row, i) => (
                    <tr key={row.requesterId} className="border-b border-border/60 hover:bg-slate-50">
                      <td className="px-4 py-3 text-center tabular-nums font-semibold text-muted">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-navy">{row.name}</td>
                      <td className="px-4 py-3 text-muted">{row.department}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.requests}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatFrwCompact(row.requested)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatFrwCompact(row.approved)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatFrwCompact(row.purchased)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.approvalRate}%</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => viewProfile(row.requesterId)}
                          className="text-xs font-semibold text-[#fcb038] hover:underline"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!sorted.length ? (
                    <DataTableEmpty colSpan={9} message="No requester data" />
                  ) : null}
                </tbody>
              </DataTable>
            </DataTableCard>
          </ReportSection>

          {data?.anomalies.length ? (
            <ReportSection title="Requester Anomaly Detection" subtitle="Flags for review — not automatic wrongdoing">
              <div className="space-y-2">
                {data.anomalies.map((a, i) => (
                  <div
                    key={i}
                    className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>{a.message}</span>
                  </div>
                ))}
              </div>
            </ReportSection>
          ) : null}

          {profile && selectedId ? (
            <ReportSection title={`${profile.name} — Requester Profile`}>
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-muted">Requests</p>
                  <p className="text-xl font-bold text-navy">{profile.requests}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-muted">Requested</p>
                  <p className="text-xl font-bold text-navy">{formatFrwCompact(profile.requested)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-muted">Approved</p>
                  <p className="text-xl font-bold text-navy">{formatFrwCompact(profile.approved)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-muted">Purchased</p>
                  <p className="text-xl font-bold text-navy">{formatFrwCompact(profile.purchased)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-muted">Approval Rate</p>
                  <p className="text-xl font-bold text-emerald-600">{profile.approvalRate}%</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-sm font-bold text-navy">Request Activity (monthly)</h4>
                  <TrendChart
                    data={profile.monthlyActivity.map((m) => ({
                      period: m.month,
                      requests: m.count,
                    }))}
                    dataKey="requests"
                  />
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-bold text-navy">Categories</h4>
                  <CategoryDonut
                    data={profile.categories.map((c) => ({
                      category: c.category,
                      total: c.total,
                      percentage: c.percentage,
                    }))}
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-sm font-bold text-navy">Most Requested Items</h4>
                  <ul className="space-y-1 text-sm">
                    {profile.topItems.map((item) => (
                      <li key={item.itemName} className="flex justify-between">
                        <span>{item.itemName}</span>
                        <span className="text-muted">{item.count} requests</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-bold text-navy">Performance</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted">Avg request frequency</dt>
                      <dd className="font-medium">{profile.averageFrequency.toFixed(1)}/month</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Avg request value</dt>
                      <dd className="font-medium">{formatFrw(profile.averageRequestValue)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Rejected requests</dt>
                      <dd className="font-medium">{profile.rejected}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </ReportSection>
          ) : null}
        </div>
      </PlatformPageLayout>
    </MainLayout>
  );
}
