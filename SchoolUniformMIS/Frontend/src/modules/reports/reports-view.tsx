"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Package,
  Scissors,
  Search,
  TrendingUp,
  UserX,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import {
  PlatformDataTable,
  type PlatformTableColumn,
} from "@/components/platform-data-table";
import { ListToolbar, StatusBadge } from "@/components/list-ui";
import { usePagedRows } from "@/hooks/use-paged-rows";
import { exportToExcel, exportToPdf } from "@/lib/export-utils";
import { useAuth } from "@/contexts/auth-context";
import { uniformApi } from "@/services/uniform-api";
import type { ReportResult } from "@/types";
import { cn } from "@/lib/utils";

type ReportDef = {
  type: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  statusOptions?: { value: string; label: string }[];
  supportsDate?: boolean;
};

const REPORTS: ReportDef[] = [
  {
    type: "sales",
    label: "Uniform Sales",
    description: "Invoices, customers, totals and payment status",
    icon: Wallet,
    tone: "bg-emerald-50 text-emerald-700",
    supportsDate: true,
    statusOptions: [
      { value: "PAID", label: "Paid" },
      { value: "PARTIAL", label: "Partial" },
      { value: "PENDING", label: "Pending" },
    ],
  },
  {
    type: "profit",
    label: "Profit Report",
    description: "Line-level revenue, cost and margin",
    icon: TrendingUp,
    tone: "bg-amber-50 text-amber-800",
    supportsDate: true,
  },
  {
    type: "stock",
    label: "Stock / Low Stock",
    description: "Available, reserved, sold and damaged units",
    icon: Package,
    tone: "bg-sky-50 text-sky-800",
    statusOptions: [
      { value: "low", label: "Low stock" },
      { value: "watch", label: "Watch" },
      { value: "ok", label: "Healthy" },
    ],
  },
  {
    type: "missing-students",
    label: "Student Uniform Status",
    description: "Students without owned uniform items",
    icon: UserX,
    tone: "bg-rose-50 text-rose-700",
  },
  {
    type: "fabric",
    label: "Fabric Consumption",
    description: "Meters issued by roll, tailor and date",
    icon: Layers,
    tone: "bg-violet-50 text-violet-800",
    supportsDate: true,
  },
  {
    type: "tailor",
    label: "Tailor Performance",
    description: "Production orders, output and cost",
    icon: Scissors,
    tone: "bg-navy/5 text-navy",
    supportsDate: true,
    statusOptions: [
      { value: "WAITING", label: "Waiting" },
      { value: "IN_PROGRESS", label: "In progress" },
      { value: "COMPLETED", label: "Completed" },
      { value: "CANCELLED", label: "Cancelled" },
    ],
  },
];

function prettyHeader(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function formatCell(key: string, value: unknown) {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    if (/total|revenue|cost|profit|price|amount/i.test(key)) {
      return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} RWF`;
    }
    if (/meter/i.test(key))
      return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} m`;
    return value.toLocaleString();
  }
  const s = String(value);
  if (/status/i.test(key)) return s;
  return s;
}

function statusTone(status: string) {
  const s = status.toUpperCase();
  if (["PAID", "COMPLETED", "OK"].includes(s)) return "success" as const;
  if (["PARTIAL", "WATCH", "IN_PROGRESS", "WAITING"].includes(s))
    return "warning" as const;
  if (["PENDING", "LOW", "CANCELLED"].includes(s)) return "danger" as const;
  return "neutral" as const;
}

export function ReportsView() {
  const { user, summary } = useAuth();
  const orgName =
    (summary as { organizationName?: string } | null)?.organizationName ??
    "ShulePlus Uniforms";

  const [activeType, setActiveType] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [preset, setPreset] = useState("");

  const active = REPORTS.find((r) => r.type === activeType) ?? null;
  const rows = (result?.rows ?? []) as Record<string, unknown>[];
  const paging = usePagedRows(rows, 10);

  const columns: PlatformTableColumn<Record<string, unknown>>[] =
    useMemo(() => {
      const keys = rows[0] ? Object.keys(rows[0]) : [];
      return keys.map((key) => ({
        key,
        header: prettyHeader(key),
        className:
          /total|revenue|cost|profit|available|qty|meters|received/i.test(key)
            ? "text-right"
            : undefined,
        render: (row) => {
          const val = row[key];
          if (/status/i.test(key) && val != null && String(val)) {
            return (
              <StatusBadge tone={statusTone(String(val))}>
                {String(val)}
              </StatusBadge>
            );
          }
          const formatted = formatCell(key, val);
          return (
            <span
              className={cn(
                "text-sm text-navy",
                /total|revenue|cost|profit|available|qty|meters/i.test(key) &&
                  "tabular-nums font-semibold",
              )}
            >
              {formatted}
            </span>
          );
        },
      }));
    }, [rows]);

  const applyPreset = useCallback((value: string) => {
    setPreset(value);
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    if (!value) {
      setDateFrom("");
      setDateTo("");
      return;
    }
    const from = new Date(today);
    if (value === "7d") from.setDate(from.getDate() - 6);
    else if (value === "30d") from.setDate(from.getDate() - 29);
    else if (value === "90d") from.setDate(from.getDate() - 89);
    else if (value === "ytd") {
      from.setMonth(0, 1);
    } else if (value === "month") {
      from.setDate(1);
    }
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to);
  }, []);

  async function runReport(
    type: string,
    next?: Partial<{
      search: string;
      status: string;
      dateFrom: string;
      dateTo: string;
    }>,
  ) {
    setActiveType(type);
    setLoading(true);
    try {
      const data = await uniformApi.reports.get(type, {
        search: next?.search ?? search,
        status: next?.status ?? status,
        dateFrom: next?.dateFrom ?? dateFrom,
        dateTo: next?.dateTo ?? dateTo,
      });
      setResult(data);
    } catch {
      toast.error("Failed to load report");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setSearch("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setPreset("");
    if (activeType)
      void runReport(activeType, {
        search: "",
        status: "",
        dateFrom: "",
        dateTo: "",
      });
  }

  function backToCatalog() {
    setActiveType(null);
    setResult(null);
    setSearch("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setPreset("");
    setFiltersOpen(false);
  }

  async function handlePdf() {
    if (!rows.length || !active) return;
    setExporting("pdf");
    try {
      await exportToPdf({
        title: active.label,
        subtitle: orgName,
        organizationName: orgName,
        userName: user?.email,
        columns: columns.map((c) => ({ header: c.header, accessor: c.key })),
        data: rows.map((r) =>
          Object.fromEntries(
            Object.entries(r).map(([k, v]) => [k, formatCell(k, v)]),
          ),
        ),
        orientation: "landscape",
      });
      toast.success("PDF exported");
    } catch {
      toast.error("PDF export failed");
    } finally {
      setExporting(null);
    }
  }

  function handleExcel() {
    if (!rows.length || !active) return;
    setExporting("excel");
    try {
      exportToExcel({
        title: active.label,
        subtitle: orgName,
        organizationName: orgName,
        userName: user?.email,
        columns: columns.map((c) => ({ header: c.header, accessor: c.key })),
        data: rows.map((r) =>
          Object.fromEntries(
            Object.entries(r).map(([k, v]) => [k, formatCell(k, v)]),
          ),
        ),
      });
      toast.success("Excel exported");
    } finally {
      setExporting(null);
    }
  }

  if (!active) {
    return (
      <PlatformPageLayout
        title="Reports"
        subtitle="Select a report to view and filter results."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {REPORTS.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.type}
                type="button"
                onClick={() => void runReport(r.type)}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-navy/15 hover:shadow-md"
              >
                <span
                  className={cn(
                    "inline-flex h-11 w-11 items-center justify-center rounded-xl",
                    r.tone,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-base font-semibold text-navy">
                  {r.label}
                </p>
                <p className="mt-1 text-sm text-muted">{r.description}</p>
                <p className="mt-4 text-xs font-semibold text-navy/60 transition group-hover:text-navy">
                  Open report →
                </p>
              </button>
            );
          })}
        </div>
      </PlatformPageLayout>
    );
  }

  const Icon = active.icon;

  return (
    <PlatformPageLayout
      title={active.label}
      subtitle={active.description}
      actions={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={backToCatalog}>
            <ArrowLeft className="h-4 w-4" /> All reports
          </button>
          <button
            type="button"
            className="btn-secondary !py-2"
            disabled={!!exporting || !rows.length}
            onClick={() => void handlePdf()}
          >
            <FileText size={15} />
            {exporting === "pdf" ? "Exporting…" : "PDF"}
          </button>
          <button
            type="button"
            className="btn-secondary !py-2"
            disabled={!!exporting || !rows.length}
            onClick={handleExcel}
          >
            <FileSpreadsheet size={15} />
            {exporting === "excel" ? "Exporting…" : "Excel"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="input !rounded-xl pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search this report…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void runReport(active.type);
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={cn(
                  "btn-secondary !rounded-xl !py-2",
                  filtersOpen && "ring-2 ring-primary/40",
                )}
                onClick={() => setFiltersOpen((v) => !v)}
              >
                <Filter size={15} />
                Filters
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition",
                    filtersOpen && "rotate-180",
                  )}
                />
              </button>
              <button
                type="button"
                className="btn-primary !rounded-xl !py-2"
                onClick={() => void runReport(active.type)}
              >
                Apply
              </button>
            </div>
          </div>

          {filtersOpen ? (
            <div className="space-y-4 border-b border-slate-100 bg-slate-50/70 p-4 sm:p-5">
              {active.supportsDate ? (
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "", label: "All time" },
                    { value: "7d", label: "Last 7 days" },
                    { value: "30d", label: "Last 30 days" },
                    { value: "month", label: "This month" },
                    { value: "90d", label: "Last 90 days" },
                    { value: "ytd", label: "Year to date" },
                  ].map((p) => (
                    <button
                      key={p.value || "all"}
                      type="button"
                      onClick={() => applyPreset(p.value)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        preset === p.value
                          ? "border-navy bg-navy text-white"
                          : "border-slate-200 bg-white text-navy hover:border-navy/20",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {active.supportsDate ? (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                        From date
                      </span>
                      <input
                        type="date"
                        className="input !rounded-xl"
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.target.value);
                          setPreset("");
                        }}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                        To date
                      </span>
                      <input
                        type="date"
                        className="input !rounded-xl"
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.target.value);
                          setPreset("");
                        }}
                      />
                    </label>
                  </>
                ) : null}

                {active.statusOptions?.length ? (
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Status
                    </span>
                    <select
                      className="input !rounded-xl"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">All statuses</option>
                      {active.statusOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <div className="flex items-end">
                  <button
                    type="button"
                    className="btn-ghost !rounded-xl"
                    onClick={resetFilters}
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl",
                active.tone,
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy">
                {loading
                  ? "Loading…"
                  : `${rows.length} row${rows.length === 1 ? "" : "s"}`}
              </p>
              <p className="text-xs text-muted">
                {dateFrom || dateTo
                  ? `Range ${dateFrom || "…"} → ${dateTo || "…"}`
                  : "Showing all available records"}
              </p>
            </div>
          </div>
        </div>

        <PlatformDataTable
          variant="soft"
          showRowNumbers
          columns={columns}
          data={paging.pageRows}
          rowKey={(r) =>
            [
              r.invoiceNumber,
              r.invoice,
              r.studentId,
              r.fabric,
              r.product,
              r.size,
              r.tailor,
              r.date,
              r.updatedAt,
              r.available,
              JSON.stringify(r),
            ]
              .filter((v) => v != null && v !== "")
              .join("|")
          }
          loading={loading}
          emptyMessage="No rows match these filters"
          page={paging.page}
          pageSize={paging.pageSize}
          total={rows.length}
          totalPages={paging.totalPages}
          onPageChange={paging.setPage}
          onPageSizeChange={paging.setPageSize}
          toolbar={
            <ListToolbar
              resultLabel={`${rows.length} result${rows.length === 1 ? "" : "s"}`}
              pageSize={paging.pageSize}
              onPageSizeChange={paging.setPageSize}
            />
          }
        />
      </div>
    </PlatformPageLayout>
  );
}
