"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { StatCard, StatsGrid } from "@/components/stat-card";
import { BarChart, ChartCard, DonutChart, PRIMARY } from "@/components/charts/kazi-charts";
import { formatRwf } from "@/config/org-admin-nav";
import { adminApi } from "@/services/admin-api";
import { PageError, PageLoader, useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/shared/notifications";
import type { ReportId } from "./types";

const REPORT_ORDER: ReportId[] = ["requests", "approved", "rejected", "active", "repayment", "usage"];

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "No data\n";
  const keys = Object.keys(rows[0]);
  const lines = rows.map((r) =>
    keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  return [keys.join(","), ...lines].join("\n");
}

function exportCsv(reportId: ReportId, rows: Record<string, unknown>[]) {
  downloadBlob(
    toCsv(rows),
    `kaziavance-${reportId}-${new Date().toISOString().slice(0, 10)}.csv`,
    "text/csv;charset=utf-8"
  );
}

function exportExcel(reportId: ReportId, title: string, rows: Record<string, unknown>[]) {
  const table =
    rows.length === 0
      ? "<tr><td>No data</td></tr>"
      : (() => {
          const keys = Object.keys(rows[0]);
          const head = `<tr>${keys.map((k) => `<th>${k}</th>`).join("")}</tr>`;
          const body = rows
            .map(
              (r) =>
                `<tr>${keys.map((k) => `<td>${String(r[k] ?? "")}</td>`).join("")}</tr>`
            )
            .join("");
          return head + body;
        })();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title></head>
  <body><table>${table}</table></body></html>`;
  downloadBlob(
    html,
    `kaziavance-${reportId}-${new Date().toISOString().slice(0, 10)}.xls`,
    "application/vnd.ms-excel"
  );
}

function exportPdf(title: string, rows: Record<string, unknown>[]) {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const head = keys.map((k) => `<th>${k}</th>`).join("");
  const body = rows
    .slice(0, 200)
    .map((r) => `<tr>${keys.map((k) => `<td>${String(r[k] ?? "")}</td>`).join("")}</tr>`)
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
  <style>body{font-family:Segoe UI,sans-serif;padding:24px;color:#000435}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #e2e8f0;padding:6px;text-align:left}th{background:#000435;color:#fff}</style></head>
  <body><h1>${title}</h1><p>${new Date().toLocaleString()} · ${rows.length} rows</p>
  <table><thead><tr>${head}</tr></thead><tbody>${body || "<tr><td>No data</td></tr>"}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) setTimeout(() => w.print(), 400);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function filterByMonth<
  T extends {
    createdAt?: string;
    requestDate?: string;
    dueDate?: string;
    approvedAt?: string;
    rejectedAt?: string;
    startDate?: string;
  },
>(rows: T[], month: string, field: keyof T) {
  if (month === "All") return rows;
  const m = Number(month);
  return rows.filter((r) => {
    const raw = String(r[field] ?? "");
    if (!raw || raw === "—") return false;
    const d = new Date(raw);
    return !Number.isNaN(d.getTime()) && d.getMonth() === m;
  });
}

export function AdminReportsView() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(() => adminApi.getReportsWorkspace(), []);
  const [selected, setSelected] = useState<ReportId>("requests");
  const [month, setMonth] = useState("All");
  const [department, setDepartment] = useState("All");

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const r of data?.datasets.requests ?? []) set.add(r.department);
    return ["All", ...[...set].sort()];
  }, [data]);

  const previewRows = useMemo(() => {
    if (!data) return [] as Record<string, unknown>[];
    let rows: Record<string, unknown>[] = data.datasets[selected] as unknown as Record<string, unknown>[];

    if (department !== "All") {
      rows = rows.filter((r) => String(r.department ?? "") === department);
    }

    if (selected === "requests") {
      rows = filterByMonth(rows as { createdAt?: string }[], month, "createdAt") as Record<string, unknown>[];
    } else if (selected === "approved") {
      rows = filterByMonth(rows as { approvedAt?: string }[], month, "approvedAt") as Record<string, unknown>[];
    } else if (selected === "rejected") {
      rows = filterByMonth(rows as { rejectedAt?: string }[], month, "rejectedAt") as Record<string, unknown>[];
    } else if (selected === "active") {
      rows = filterByMonth(rows as { startDate?: string }[], month, "startDate") as Record<string, unknown>[];
    } else if (selected === "repayment") {
      rows = filterByMonth(rows as { dueDate?: string }[], month, "dueDate") as Record<string, unknown>[];
    }

    return rows;
  }, [data, selected, month, department]);

  if (loading && !data) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={reload} />;
  if (!data) return null;

  const s = data.summary;
  const catalog = data.catalogs[selected];
  const chartRequests = data.monthlyTrend.map((m) => ({ label: m.label, value: m.requests }));

  const runExport = (format: "csv" | "excel" | "pdf") => {
    if (previewRows.length === 0) {
      toast.error("No rows to export for the current filters.");
      return;
    }
    if (format === "csv") exportCsv(selected, previewRows);
    else if (format === "excel") exportExcel(selected, catalog.title, previewRows);
    else exportPdf(catalog.title, previewRows);
    toast.success(`${catalog.title} exported as ${format.toUpperCase()}.`);
  };

  const previewKeys = previewRows.length ? Object.keys(previewRows[0]).slice(0, 8) : [];

  return (
    <div className="space-y-6">
      <StatsGrid>
        <StatCard label="Total requests" value={s.totalRequests} icon={<FileText />} hint={`${s.pending} pending`} />
        <StatCard label="Active advances" value={s.active} icon={<Wallet />} hint={formatRwf(s.outstanding)} />
        <StatCard
          label="Disbursed this month"
          value={formatRwf(s.disbursedThisMonth)}
          icon={<BarChart3 />}
          hint={`${s.approvalRate}% approval`}
        />
        <StatCard
          label="Recovered this month"
          value={formatRwf(s.recoveredThisMonth)}
          icon={<Download />}
          hint={`${s.recoveryRate}% recovery`}
        />
      </StatsGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Requests by month" subtitle="Current year volume">
            <BarChart data={chartRequests} color={PRIMARY} height={220} />
          </ChartCard>
        </div>
        <ChartCard title="Usage by department" subtitle="Disbursed amount mix" metric={formatRwf(s.outstanding)}>
          <DonutChart
            segments={
              data.departmentUsage.length
                ? data.departmentUsage
                : [{ label: "None", value: 1, color: "#e2e8f0" }]
            }
          />
        </ChartCard>
      </div>

      <div className="hr-card p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[140px] flex-1 text-xs font-semibold text-muted">
            Month
            <select className="input mt-1" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="All">All months</option>
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(
                (label, i) => (
                  <option key={label} value={String(i)}>
                    {label}
                  </option>
                )
              )}
            </select>
          </label>
          <label className="min-w-[140px] flex-1 text-xs font-semibold text-muted">
            Department
            <select
              className="input mt-1"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setMonth("All");
              setDepartment("All");
            }}
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={() => runExport("pdf")}>
              <Download size={14} />
              PDF
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={() => runExport("excel")}>
              <FileSpreadsheet size={14} />
              Excel
            </button>
            <button type="button" className="btn-primary text-xs" onClick={() => runExport("csv")}>
              CSV
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_ORDER.map((id) => {
          const report = data.catalogs[id];
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={`hr-card flex flex-col p-5 text-left transition sm:p-6 ${
                active ? "ring-2 ring-primary/40 shadow-md" : "hover:-translate-y-0.5 hover:shadow-md"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/10 text-navy">
                <FileText size={20} />
              </div>
              <h3 className="mt-4 text-sm font-bold text-navy">{report.title}</h3>
              <p className="mt-2 flex-1 text-xs text-muted">{report.description}</p>
              <p className="mt-3 text-xs font-semibold text-navy">{report.rowCount} records</p>
            </button>
          );
        })}
      </div>

      <div className="hr-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h3 className="text-sm font-bold text-navy">{catalog.title}</h3>
            <p className="text-xs text-muted">
              Preview · {previewRows.length} row{previewRows.length === 1 ? "" : "s"}
            </p>
          </div>
          <button type="button" className="btn-secondary text-xs" onClick={() => reload()}>
            <RotateCcw size={14} />
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                {previewKeys.map((k) => (
                  <th key={k} className="px-4 py-3 font-semibold">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(previewKeys.length, 1)} className="px-4 py-10 text-center text-muted">
                    No rows for the selected filters.
                  </td>
                </tr>
              ) : (
                previewRows.slice(0, 25).map((row) => (
                  <tr key={String(row.id)} className="border-t border-border/70 hover:bg-slate-50/80">
                    {previewKeys.map((k) => (
                      <td key={k} className="px-4 py-2.5 text-navy">
                        {typeof row[k] === "number" && String(k).toLowerCase().includes("amount")
                          ? formatRwf(Number(row[k]))
                          : typeof row[k] === "number" &&
                              (String(k).toLowerCase().includes("balance") ||
                                String(k).toLowerCase().includes("salary") ||
                                String(k).toLowerCase().includes("deduction") ||
                                String(k).toLowerCase().includes("requested"))
                            ? formatRwf(Number(row[k]))
                            : String(row[k] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {previewRows.length > 25 ? (
          <p className="border-t border-border px-4 py-3 text-xs text-muted">
            Showing first 25 of {previewRows.length}. Export for the full dataset.
          </p>
        ) : null}
      </div>
    </div>
  );
}
