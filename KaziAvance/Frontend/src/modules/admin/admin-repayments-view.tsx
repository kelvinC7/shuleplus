"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Download,
  FileDown,
  MoreHorizontal,
  Printer,
  RotateCcw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { StatCard, StatsGrid } from "@/components/stat-card";
import { BarChart, ChartCard, DonutChart, LineChart, PRIMARY } from "@/components/charts/kazi-charts";
import { formatRwf } from "@/config/org-admin-nav";
import { downloadAuthenticated, printAuthenticated } from "@/lib/download";
import { adminApi } from "@/services/admin-api";
import { PageError, PageLoader, useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/shared/notifications";
import type { RepaymentRow } from "./types";

type QuickFilter = "All" | "Payroll" | "Manual" | "Failed" | "Upcoming" | "Overdue" | "Completed";

function exportCsv(rows: RepaymentRow[]) {
  const header = ["Request #", "Employee", "Department", "Amount", "Remaining", "Installment", "Status", "Next Payment"];
  const lines = rows.map((r) =>
    [
      r.requestNumber ?? r.id,
      r.employeeName,
      r.department ?? "",
      r.advanceAmount,
      r.remainingAmount,
      r.installmentAmount ?? r.monthlyDeduction ?? "",
      r.status,
      r.nextDeductionDate,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kaziavance-repayments-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPdf(rows: RepaymentRow[]) {
  const body = rows
    .map(
      (r) =>
        `<tr><td>${r.employeeName}</td><td>${r.advanceAmount.toLocaleString()}</td><td>${r.remainingAmount.toLocaleString()}</td><td>${(r.installmentAmount ?? 0).toLocaleString()}</td><td>${r.status}</td><td>${r.nextDeductionDate}</td></tr>`
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Repayment Tracking</title>
  <style>body{font-family:Segoe UI,sans-serif;padding:24px;color:#000435}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}th{background:#000435;color:#fff}</style></head>
  <body><h1>Repayment Tracking</h1><p>${new Date().toLocaleString()}</p>
  <table><thead><tr><th>Employee</th><th>Amount</th><th>Remaining</th><th>Installment</th><th>Status</th><th>Next</th></tr></thead><tbody>${body}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) setTimeout(() => w.print(), 400);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function AdminRepaymentsView() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(() => adminApi.getRepaymentsWorkspace(), []);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [status, setStatus] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [purposeType, setPurposeType] = useState("All");
  const [amountRange, setAmountRange] = useState("All");
  const [quick, setQuick] = useState<QuickFilter>("All");
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selected, setSelected] = useState<RepaymentRow | null>(null);

  const filtered = useMemo(() => {
    const rows = data?.data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (quick === "Payroll" && !(r.paidAmount > 0)) return false;
      if (quick === "Manual" && r.paymentMethod !== "Manual Payment") return false;
      if (quick === "Failed" && r.status !== "Overdue") return false;
      if (quick === "Upcoming" && r.status !== "Upcoming") return false;
      if (quick === "Overdue" && r.status !== "Overdue") return false;
      if (quick === "Completed" && r.status !== "Completed") return false;
      if (status !== "All" && r.status !== status) return false;
      if (department !== "All" && r.department !== department) return false;
      if (purposeType !== "All" && (r.purposeType || r.purpose) !== purposeType) return false;
      if (monthFilter !== "All" && r.nextDeductionDate !== "Completed" && r.nextDeductionDate !== "—") {
        const m = new Date(r.nextDeductionDate).getMonth();
        if (String(m) !== monthFilter) return false;
      }
      if (amountRange === "0-100k" && r.advanceAmount > 100000) return false;
      if (amountRange === "100k-500k" && (r.advanceAmount < 100000 || r.advanceAmount > 500000)) return false;
      if (amountRange === "500k+" && r.advanceAmount < 500000) return false;
      if (
        q &&
        !r.employeeName.toLowerCase().includes(q) &&
        !(r.requestNumber ?? "").toLowerCase().includes(q) &&
        !(r.department ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [data?.data, search, department, status, monthFilter, purposeType, amountRange, quick]);

  const pageSize = 10;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetFilters() {
    setSearch("");
    setDepartment("All");
    setStatus("All");
    setMonthFilter("All");
    setPurposeType("All");
    setAmountRange("All");
    setQuick("All");
    setPage(1);
  }

  async function handleDownload(row: RepaymentRow) {
    try {
      await downloadAuthenticated(
        `/api/org-admin/requests/${row.id}/receipt`,
        `advance-statement-${row.requestNumber ?? row.id}.html`
      );
      toast.success("Statement downloaded.", "Download");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed", "Error");
    }
  }

  if (loading && !data) return <PageLoader />;
  if (error || !data) return <PageError message={error ?? "Unable to load repayments"} onRetry={reload} />;

  const s = data.summary;

  return (
    <div className="space-y-6">
      <div className="hr-card p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">KaziAdvance Admin</p>
        <h1 className="mt-1 text-2xl font-semibold text-navy sm:text-3xl">Repayment Tracking</h1>
        <p className="mt-2 text-sm text-muted">
          Monitor payroll recoveries, overdue balances, and repayment schedules across your organization.
        </p>
      </div>

      <StatsGrid columns={3}>
        <StatCard label="Total Active Advances" value={s.totalActive} hint="In repayment" icon={<Wallet size={20} />} />
        <StatCard label="Outstanding Balance" value={formatRwf(s.outstandingBalance)} hint="All active" icon={<RotateCcw size={20} />} />
        <StatCard label="Recovered This Month" value={formatRwf(s.recoveredThisMonth)} hint="Payroll deductions" icon={<CheckCircle2 size={20} />} />
        <StatCard label="Upcoming Recoveries" value={s.upcomingCount} hint="Next 30 days" icon={<Calendar size={20} />} />
        <StatCard label="Overdue Payments" value={s.overdueCount} hint="Need action" icon={<AlertTriangle size={20} />} />
        <StatCard label="Recovery Success Rate" value={`${s.recoveryRate}%`} hint="Successful recoveries" icon={<CheckCircle2 size={20} />} />
      </StatsGrid>

      <div className="hr-card space-y-3 p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Smart Search Filters</p>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-10"
            placeholder="Search employee name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select className="input" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}>
            <option value="All">Department</option>
            {data.departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="All">Status</option>
            {["Upcoming", "Active", "Completed", "Overdue"].map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
          <select className="input" value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}>
            <option value="All">Recovery Month</option>
            {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
              <option key={m} value={String(i)}>{m}</option>
            ))}
          </select>
          <select className="input" value={purposeType} onChange={(e) => { setPurposeType(e.target.value); setPage(1); }}>
            <option value="All">Advance Type</option>
            {data.purposeTypes.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="input" value={amountRange} onChange={(e) => { setAmountRange(e.target.value); setPage(1); }}>
            <option value="All">Amount Range</option>
            <option value="0-100k">0 – 100,000</option>
            <option value="100k-500k">100,000 – 500,000</option>
            <option value="500k+">500,000+</option>
          </select>
          <select className="input" disabled>
            <option>Payment Method</option>
            <option>Payroll Deducted</option>
            <option>Manual Payment</option>
          </select>
          <select className="input" disabled>
            <option>Payroll Cycle</option>
            <option>Monthly</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={resetFilters}>Reset Filters</button>
          <button type="button" className="btn-secondary" onClick={() => { exportCsv(filtered); toast.success("CSV exported.", "Export"); }}>
            <FileDown size={14} /> Export Excel
          </button>
          <button type="button" className="btn-secondary" onClick={() => { exportPdf(filtered); toast.success("PDF ready to print.", "Export"); }}>
            <Printer size={14} /> Download PDF
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Recovery Performance" subtitle={`${s.recoveryRate}% successful recovery`} metric={`${s.recoveryRate}%`}>
          <BarChart
            data={data.monthlyRecovery}
            color={PRIMARY}
            valueFormatter={(v) => formatRwf(Math.round(v))}
          />
        </ChartCard>
        <ChartCard title="Monthly Recovery Trend" subtitle="Jan – Dec recoveries" metric={formatRwf(s.recoveredThisMonth)}>
          <LineChart data={data.monthlyRecovery} valueFormatter={(v) => formatRwf(Math.round(v))} />
        </ChartCard>
        <ChartCard title="Outstanding Balance Analytics" subtitle="Department analysis" metric={formatRwf(s.outstandingBalance)}>
          <DonutChart
            segments={
              data.departmentOutstanding.length
                ? data.departmentOutstanding
                : [{ label: "None", value: 1, color: "#e2e8f0" }]
            }
          />
        </ChartCard>
      </div>

      <div className="hr-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-navy">Repayment Tracking</h2>
            <p className="mt-0.5 text-xs text-muted">{filtered.length} matching records</p>
          </div>
          {quick !== "All" ? (
            <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setQuick("All")}>
              Clear filter ({quick})
            </button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left text-sm">
            <thead className="bg-navy text-[11px] font-semibold uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Remaining</th>
                <th className="px-4 py-3">Installment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Next Payment</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-muted">No repayments match your filters.</td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">{r.employeeName}</p>
                      <p className="text-[11px] text-muted">{r.requestNumber}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-navy">{formatRwf(r.advanceAmount)}</td>
                    <td className="px-4 py-3 text-navy/80">{formatRwf(r.remainingAmount)}</td>
                    <td className="px-4 py-3 text-navy/80">{formatRwf(r.installmentAmount ?? r.monthlyDeduction ?? 0)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-muted">{r.nextDeductionDate}</td>
                    <td className="px-4 py-3 text-right">
                      <RowMenu
                        open={menuId === r.id}
                        onToggle={() => setMenuId(menuId === r.id ? null : r.id)}
                        onClose={() => setMenuId(null)}
                        row={r}
                        onView={() => { setMenuId(null); setSelected(r); }}
                        onDownload={() => void handleDownload(r)}
                        onPrint={() => void printAuthenticated(`/api/org-admin/requests/${r.id}/receipt?print=1`)}
                        onNotify={() => toast.info(`Reminder queued for ${r.employeeName}.`, "Notification")}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-muted">
          <span>Page {page} of {Math.max(1, Math.ceil(filtered.length / pageSize))}</span>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" disabled={page >= Math.ceil(filtered.length / pageSize)} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </div>

      {selected ? (
        <ScheduleModal
          row={selected}
          onClose={() => setSelected(null)}
          onDownload={() => void handleDownload(selected)}
        />
      ) : null}
    </div>
  );
}

function RowMenu({
  open,
  onToggle,
  onClose,
  row,
  onView,
  onDownload,
  onPrint,
  onNotify,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  row: RepaymentRow;
  onView: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onNotify: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !btnRef.current) {
      setPos(null);
      return;
    }
    function place() {
      const rect = btnRef.current!.getBoundingClientRect();
      const menuW = 224;
      const menuH = 260;
      let left = rect.right - menuW;
      let top = rect.bottom + 6;
      if (left < 8) left = 8;
      if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
      if (top + menuH > window.innerHeight - 8) top = Math.max(8, rect.top - menuH - 6);
      setPos({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  const overdue = row.status === "Overdue";
  const completed = row.status === "Completed";

  const menu =
    open && pos && mounted
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[200] w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 shadow-[0_16px_40px_-12px_rgba(0,4,53,0.28)]"
            style={{ top: pos.top, left: pos.left }}
          >
            <MenuItem label="View Details" onClick={onView} />
            <MenuItem label="Repayment Schedule" onClick={onView} />
            {!completed ? <MenuItem label="Payroll History" onClick={onView} /> : null}
            <MenuItem label="Recovery History" onClick={onView} />
            <MenuItem label="Download Statement" onClick={onDownload} />
            {overdue ? (
              <>
                <MenuItem label="Send Reminder" onClick={onNotify} />
                <MenuItem label="Notify HR" onClick={onNotify} />
                <MenuItem label="Notify Payroll" onClick={onNotify} />
                <MenuItem label="Generate Report" onClick={onPrint} />
              </>
            ) : null}
            {completed ? (
              <>
                <MenuItem label="Generate Completion Letter" onClick={onPrint} />
                <MenuItem label="Archive Record" onClick={onClose} />
              </>
            ) : (
              <MenuItem label="Send Notification" onClick={onNotify} />
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="inline-flex items-center justify-end gap-2">
        <button type="button" className="btn-table-action" onClick={onView}>
          View
        </button>
        <button
          ref={btnRef}
          type="button"
          onClick={onToggle}
          className="btn-table-more"
          aria-label="More actions"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
      {menu}
    </>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block w-full px-3 py-2 text-left text-sm text-navy hover:bg-slate-50">
      {label}
    </button>
  );
}

function ScheduleModal({
  row,
  onClose,
  onDownload,
}: {
  row: RepaymentRow;
  onClose: () => void;
  onDownload: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const progress = row.progressPercent ?? 0;
  const schedule = row.schedule ?? [];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0 bg-navy/45 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between bg-navy px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Repayment Schedule</p>
            <h2 className="mt-1 text-lg font-semibold">{row.employeeName}</h2>
            <p className="mt-1 text-sm text-white/60">{row.requestNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-2">
            <Info label="Advance Amount" value={formatRwf(row.advanceAmount)} />
            <Info label="Remaining Balance" value={formatRwf(row.remainingAmount)} />
            <Info label="Monthly Deduction" value={formatRwf(row.monthlyDeduction ?? row.installmentAmount ?? 0)} />
            <Info label="Status" value={row.status} />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Recovery Progress</p>
            <p className="mt-1 text-2xl font-semibold text-navy">{progress}%</p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Recovery Schedule</p>
            {schedule.length === 0 ? (
              <p className="text-sm text-muted">No installment schedule available yet.</p>
            ) : (
              <ul className="space-y-2">
                {schedule.map((item) => (
                  <li key={item.installmentNumber} className="flex items-center justify-between rounded-2xl bg-[#F6F7FA] px-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-navy">{item.monthLabel}</p>
                      <p className="text-[11px] text-muted">{formatRwf(item.amount)}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" className="btn-secondary flex-1" onClick={onDownload}>
            <Download size={14} /> Download Statement
          </button>
          <button type="button" className="btn-primary flex-1" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F6F7FA] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}
