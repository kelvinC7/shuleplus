'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, DollarSign, ShoppingCart, CheckCircle, Users } from 'lucide-react';
import Link from 'next/link';
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
import type { DepartmentDetailData, DepartmentSpendingData } from '@/types/analytics';
import { formatFrwCompact } from '@/utils/currency';
import {
  ReportFilterBar,
  filtersToParams,
  useReportFilters,
} from '@/components/reports/report-filter-bar';
import { HorizontalBarList, ReportSection } from '@/components/reports/report-charts';

export default function DepartmentSpendingPage() {
  const { filters, setFilters, applied, apply, reset, departments } = useReportFilters();
  const [data, setData] = useState<DepartmentSpendingData | null>(null);
  const [detail, setDetail] = useState<DepartmentDetailData | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await procurementApi.analytics.departmentSpending(filtersToParams(applied));
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

  const viewDepartment = async (departmentId: string) => {
    setSelectedDept(departmentId);
    try {
      const d = await procurementApi.analytics.departmentDetail(
        departmentId,
        filtersToParams(applied),
      );
      setDetail(d);
    } catch {
      setDetail(null);
    }
  };

  if (loading && !data) {
    return (
      <MainLayout>
        <PageLoading label="Loading department spending…" />
      </MainLayout>
    );
  }

  const kpis = data?.kpis;

  return (
    <MainLayout>
      <PlatformPageLayout
        subtitle="Department Spending — which departments are consuming your procurement budget?"
      >
        <ReportFilterBar
          filters={filters}
          onChange={setFilters}
          onApply={apply}
          onReset={reset}
          departments={departments}
          showDepartment
          showStatus={false}
        />

        {kpis ? (
          <StatsGrid columns={4} className="mt-4">
            <StatCard label="Total Departments" value={kpis.totalDepartments} icon={<Building2 size={20} />} />
            <StatCard label="Total Requested" value={formatFrwCompact(kpis.totalSpending)} icon={<DollarSign size={20} />} />
            <StatCard label="Total Approved" value={formatFrwCompact(kpis.totalApproved)} icon={<CheckCircle size={20} />} valueClassName="text-emerald-600" />
            <StatCard label="Total Purchased" value={formatFrwCompact(kpis.totalPurchased)} icon={<ShoppingCart size={20} />} />
          </StatsGrid>
        ) : null}

        <div className="mt-6 space-y-6">
          <ReportSection title="Department Ranking" subtitle="Ranked by purchase value">
            <DataTableCard>
              <DataTable minWidth="640px">
                <DataTableHead>
                  <DataTableTh className="w-12 text-center">#</DataTableTh>
                  <DataTableTh>Department</DataTableTh>
                  <DataTableTh className="text-right">Requests</DataTableTh>
                  <DataTableTh className="text-right">Purchased</DataTableTh>
                  <DataTableTh className="text-center">Action</DataTableTh>
                </DataTableHead>
                <tbody>
                  {(data?.ranking ?? []).map((row, i) => (
                    <tr key={row.departmentId} className="border-b border-border/60 hover:bg-slate-50">
                      <td className="px-4 py-3 text-center tabular-nums font-semibold text-muted">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-navy">{row.department}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.requests}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatFrwCompact(row.purchased)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => viewDepartment(row.departmentId)}
                          className="text-xs font-semibold text-[#fcb038] hover:underline"
                        >
                          View Department →
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!data?.ranking.length ? (
                    <DataTableEmpty colSpan={5} message="No department data for selected filters" />
                  ) : null}
                </tbody>
              </DataTable>
            </DataTableCard>
          </ReportSection>

          {detail && selectedDept ? (
            <ReportSection
              title={`${data?.ranking.find((r) => r.departmentId === selectedDept)?.department ?? 'Department'} Detail`}
              subtitle="Top categories, items, and requesters"
            >
              <div className="grid gap-6 lg:grid-cols-3">
                <div>
                  <h4 className="mb-2 text-sm font-bold text-navy">Top Categories</h4>
                  <HorizontalBarList
                    items={detail.topCategories.map((c) => ({
                      label: c.category,
                      value: c.total,
                    }))}
                  />
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-bold text-navy">Top Items</h4>
                  <ul className="space-y-1 text-sm">
                    {detail.topItems.map((item) => (
                      <li key={item.itemName} className="flex justify-between gap-2">
                        <span className="truncate text-navy">{item.itemName}</span>
                        <span className="text-muted">{item.count}×</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 flex items-center gap-1 text-sm font-bold text-navy">
                    <Users className="h-4 w-4" /> Requesters
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[10px] uppercase text-muted">
                          <th className="pb-1">User</th>
                          <th className="pb-1 text-right">Req</th>
                          <th className="pb-1 text-right">Requested</th>
                          <th className="pb-1 text-right">Purchased</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.requesters.map((r) => (
                          <tr key={r.name} className="border-t border-border/40">
                            <td className="py-1.5">{r.name}</td>
                            <td className="py-1.5 text-right tabular-nums">{r.requests}</td>
                            <td className="py-1.5 text-right tabular-nums">
                              {formatFrwCompact(r.value)}
                            </td>
                            <td className="py-1.5 text-right tabular-nums">
                              {formatFrwCompact(r.purchased)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Link
                    href="/reports/requester-analysis"
                    className="mt-2 inline-block text-xs font-semibold text-[#fcb038] hover:underline"
                  >
                    View Requester Analysis →
                  </Link>
                </div>
              </div>
            </ReportSection>
          ) : null}
        </div>
      </PlatformPageLayout>
    </MainLayout>
  );
}
