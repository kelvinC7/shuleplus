"use client";

import { useState } from "react";
import { KaziPageLayout } from "@/components/kazi-page-layout";
import { KaziDataTable, type KaziTableColumn } from "@/components/kazi-data-table";
import { formatRwf } from "@/config/org-admin-nav";
import { adminApi } from "@/services/admin-api";
import { PageError, PageLoader, useAsyncData } from "@/hooks/use-async-data";
import type { ActiveAdvanceRow } from "./types";

export function AdminActiveAdvancesView() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsyncData(
    () => adminApi.getActiveAdvances().then((r) => r.data),
    []
  );

  const pageSize = 10;
  const advances = data ?? [];
  const paged = advances.slice((page - 1) * pageSize, page * pageSize);
  const totalOutstanding = advances.reduce((s, a) => s + a.remainingBalance, 0);

  const columns: KaziTableColumn<ActiveAdvanceRow>[] = [
    { key: "emp", header: "Employee", render: (r) => r.employeeName },
    { key: "code", header: "ID", render: (r) => <span className="font-mono text-xs">{r.employeeCode}</span> },
    { key: "approved", header: "Approved Amount", render: (r) => formatRwf(r.approvedAmount) },
    { key: "remaining", header: "Remaining", render: (r) => formatRwf(r.remainingBalance) },
    { key: "deduction", header: "Monthly Deduction", render: (r) => formatRwf(r.monthlyDeduction) },
    { key: "start", header: "Start Date", render: (r) => r.startDate },
    { key: "end", header: "End Date", render: (r) => r.endDate },
    {
      key: "progress",
      header: "Progress",
      render: (r) => (
        <div className="min-w-[100px]">
          <div className="text-xs font-semibold text-navy">{r.progressPercent}%</div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary" style={{ width: `${r.progressPercent}%` }} />
          </div>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: () => (
        <button type="button" className="btn-table-action">
          View
        </button>
      ),
    },
  ];

  if (loading && !data) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={reload} />;

  return (
    <KaziPageLayout
      kpis={[
        { label: "Active Advances", value: advances.length },
        { label: "Total Outstanding", value: formatRwf(totalOutstanding) },
        { label: "Avg. Progress", value: advances.length ? `${Math.round(advances.reduce((s, a) => s + a.progressPercent, 0) / advances.length)}%` : "0%" },
      ]}
    >
      <KaziDataTable columns={columns} rows={paged} rowKey={(r) => r.id} page={page} pageSize={pageSize} total={advances.length} onPageChange={setPage} emptyMessage="No active advances." />
    </KaziPageLayout>
  );
}
