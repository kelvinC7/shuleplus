"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CalendarRange,
  Download,
  Eye,
  FileText,
  Pencil,
  Printer,
  Search,
  Star,
  Trash2,
  Wallet,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { StatCard, StatsGrid } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { downloadAuthenticated, openAuthenticated, printAuthenticated } from "@/lib/download";
import { currency, formatDate } from "@/modules/employee/types";
import { AdvanceRequestModal } from "@/modules/employee/advance-request-modal";
import { useToast } from "@/shared/notifications";

type Repayment = {
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: string;
  monthLabel: string;
};

type TimelineStep = { step: string; date: string | null; done: boolean };

type HistoryRow = {
  id: string;
  requestNo: string;
  amount: number;
  purpose: string;
  purposeType: string;
  description?: string | null;
  months: number;
  date: string;
  submittedAt: string;
  approvedAt?: string | null;
  disbursedAt?: string | null;
  status: string;
  monthlyDeduction?: number | null;
  remainingBalance: number;
  progressPercent: number;
  installmentsLeft: number;
  totalPaid: number;
  canEdit: boolean;
  canDelete: boolean;
  repayments: Repayment[];
  timeline: TimelineStep[];
  notifications: { title: string; date: string }[];
};

type Summary = {
  totalAdvances: number;
  totalReceived: number;
  outstanding: number;
  completed: number;
  activeAdvances: number;
  totalRepaid: number;
  availableLimit: number;
  maxEligibleAmount: number;
  creditScore: number;
  advanceScore: number;
  highestAdvance: number;
  lowestAdvance: number;
  averageAdvance: number;
  completedRate: number;
  repaymentScore: number;
  latePayments: number;
  missedDeductions: number;
  financialRating: number;
};

const STATUS_FILTERS = [
  "All",
  "Pending",
  "Approved",
  "Rejected",
  "Disbursed",
  "Completed",
  "Cancelled",
] as const;

const TYPE_FILTERS = ["All", "Emergency", "Medical", "Education", "Personal", "Business", "Family", "Other"] as const;

const DATE_FILTERS = ["All", "Today", "This Month", "This Year"] as const;

const AMOUNT_FILTERS = [
  { id: "All", label: "All amounts" },
  { id: "0-100k", label: "0 – 100,000" },
  { id: "100k-500k", label: "100,000 – 500,000" },
  { id: "500k+", label: "500,000+" },
] as const;

export function HistoryView() {
  const toast = useToast();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [type, setType] = useState<(typeof TYPE_FILTERS)[number]>("All");
  const [dateFilter, setDateFilter] = useState<(typeof DATE_FILTERS)[number]>("All");
  const [amountFilter, setAmountFilter] = useState<(typeof AMOUNT_FILTERS)[number]["id"]>("All");
  const [selected, setSelected] = useState<HistoryRow | null>(null);
  const [editRow, setEditRow] = useState<HistoryRow | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch<{ data: HistoryRow[]; summary: Summary }>("/api/employee/advance-history");
      setRows(res.data ?? []);
      setSummary(res.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    return rows.filter((r) => {
      if (q && !r.requestNo.toLowerCase().includes(q) && !r.purpose.toLowerCase().includes(q)) {
        return false;
      }
      if (status !== "All" && r.status !== status) return false;
      if (type !== "All") {
        const pt = (r.purposeType || r.purpose).toLowerCase();
        if (!pt.includes(type.toLowerCase())) return false;
      }
      if (dateFilter !== "All") {
        const d = new Date(r.submittedAt);
        if (dateFilter === "Today" && d.toDateString() !== now.toDateString()) return false;
        if (
          dateFilter === "This Month" &&
          (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())
        ) {
          return false;
        }
        if (dateFilter === "This Year" && d.getFullYear() !== now.getFullYear()) return false;
      }
      if (amountFilter === "0-100k" && r.amount > 100000) return false;
      if (amountFilter === "100k-500k" && (r.amount < 100000 || r.amount > 500000)) return false;
      if (amountFilter === "500k+" && r.amount < 500000) return false;
      return true;
    });
  }, [rows, search, status, type, dateFilter, amountFilter]);

  async function handleDownload(id: string, requestNo: string) {
    try {
      await downloadAuthenticated(`/api/advance/requests/${id}/receipt`, `advance-receipt-${requestNo}.html`);
      toast.success("Receipt downloaded.", "Download");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed", "Error");
    }
  }

  async function handleView(id: string) {
    try {
      await openAuthenticated(`/api/advance/requests/${id}/receipt?view=1`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open receipt", "Error");
    }
  }

  async function handlePrint(id: string) {
    try {
      await printAuthenticated(`/api/advance/requests/${id}/receipt?print=1`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not print", "Error");
    }
  }

  async function handleDelete(row: HistoryRow) {
    if (!row.canDelete) {
      toast.warning("Approved or disbursed requests cannot be deleted.", "Locked");
      return;
    }
    if (!window.confirm(`Delete request ${row.requestNo}? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/advance/requests/${row.id}`, { method: "DELETE" });
      toast.success(`${row.requestNo} deleted.`, "Deleted");
      if (selected?.id === row.id) setSelected(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed", "Error");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-white" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/5 px-5 py-6 text-sm text-danger">
        {error}
      </div>
    );
  }

  const s = summary;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-navy via-[#12164a] to-[#1a1f5c] px-6 py-7 text-white shadow-lg">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">KaziAdvance</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">My Advance History</h1>
        <p className="mt-2 max-w-xl text-sm text-white/65">
          Track every salary advance — receipts, timelines, repayments, and your advance score.
        </p>
      </div>

      {s ? (
        <StatsGrid columns={4}>
          <StatCard label="Total Advances" value={String(s.totalAdvances)} delta="All requests" icon={<FileText size={20} />} />
          <StatCard label="Total Received" value={currency(s.totalReceived)} delta="Approved & disbursed" icon={<Wallet size={20} />} />
          <StatCard label="Outstanding" value={currency(s.outstanding)} delta="Active balance" icon={<CalendarRange size={20} />} />
          <StatCard label="Completed" value={String(s.completed)} delta={`${s.completedRate}% rate`} icon={<Star size={20} />} />
          <StatCard label="Active Advances" value={String(s.activeAdvances)} delta="In repayment" icon={<Wallet size={20} />} />
          <StatCard label="Total Repaid" value={currency(s.totalRepaid)} delta="Payroll deductions" icon={<FileText size={20} />} />
          <StatCard label="Available Limit" value={currency(s.availableLimit)} delta={`Max ${currency(s.maxEligibleAmount)}`} icon={<Wallet size={20} />} />
          <StatCard label="Credit Score" value={`${s.creditScore}/100`} delta="Advance behavior" icon={<Star size={20} />} />
        </StatsGrid>
      ) : null}

      <div className="hr-card space-y-4 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-10"
            placeholder="Search receipt number (ADV-2026-XXXX)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterRow label="Status" options={STATUS_FILTERS} value={status} onChange={setStatus} />
        <FilterRow label="Advance Type" options={TYPE_FILTERS} value={type} onChange={setType} />
        <FilterRow label="Date" options={DATE_FILTERS} value={dateFilter} onChange={setDateFilter} />
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Amount</p>
          <div className="flex flex-wrap gap-2">
            {AMOUNT_FILTERS.map((f) => (
              <Chip key={f.id} active={amountFilter === f.id} onClick={() => setAmountFilter(f.id)} label={f.label} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="hr-card px-6 py-14 text-center">
              <p className="font-semibold text-navy">No advances match your filters</p>
              <Link href="/request" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">
                Request a new advance
              </Link>
            </div>
          ) : (
            filtered.map((row) => (
              <article key={row.id} className="hr-card hr-card-hover p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-navy">{row.purposeType || row.purpose} Advance</h3>
                    <p className="mt-1 text-2xl font-extrabold text-navy">{currency(row.amount)}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>

                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <Meta label="Receipt" value={row.requestNo} mono />
                  <Meta label="Submitted" value={formatDate(row.submittedAt)} />
                  <Meta label="Approved" value={row.approvedAt ? formatDate(row.approvedAt) : "—"} />
                  <Meta label="Disbursed" value={row.disbursedAt ? formatDate(row.disbursedAt) : "—"} />
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-navy/70">
                    <span>{row.months} Months</span>
                    <span>{row.progressPercent}% Completed</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all"
                      style={{ width: `${row.progressPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    <span>
                      Outstanding: <strong className="text-navy">{currency(row.remainingBalance)}</strong>
                    </span>
                    <span className="text-muted">{row.installmentsLeft} installments left</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionBtn icon={<Download size={14} />} label="Download Receipt" onClick={() => void handleDownload(row.id, row.requestNo)} />
                  <ActionBtn icon={<Eye size={14} />} label="View Details" onClick={() => setSelected(row)} />
                  <ActionBtn icon={<FileText size={14} />} label="Repayment Schedule" onClick={() => setSelected(row)} />
                  {row.canEdit ? (
                    <ActionBtn icon={<Pencil size={14} />} label="Edit" onClick={() => setEditRow(row)} />
                  ) : null}
                  {row.canDelete ? (
                    <ActionBtn icon={<Trash2 size={14} />} label="Delete" danger onClick={() => void handleDelete(row)} />
                  ) : null}
                </div>
              </article>
            ))
          )}

          <div className="hr-card overflow-x-auto p-0">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-navy text-[11px] font-bold uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Outstanding</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={`t-${row.id}`} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{row.requestNo}</td>
                    <td className="px-4 py-3 font-semibold">{currency(row.amount)}</td>
                    <td className="px-4 py-3">{row.purposeType}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3">
                      {["Pending", "Rejected", "Cancelled"].includes(row.status)
                        ? "—"
                        : `${row.progressPercent}%`}
                    </td>
                    <td className="px-4 py-3">{currency(row.remainingBalance)}</td>
                    <td className="px-4 py-3 text-muted">{row.date}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="btn-table-action"
                        onClick={() => setSelected(row)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4">
          {s ? (
            <div className="hr-card p-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Advance Score</p>
              <p className="mt-1 text-4xl font-extrabold text-navy">{s.advanceScore}/100</p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">
                {s.advanceScore >= 90 ? "Excellent" : s.advanceScore >= 75 ? "Good" : "Fair"}
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <SideRow label="Completed Advances" value={String(s.completed)} />
                <SideRow label="Late Payments" value={String(s.latePayments)} />
                <SideRow label="Missed Deductions" value={String(s.missedDeductions)} />
                <SideRow label="Eligible for" value={currency(s.maxEligibleAmount)} />
                <SideRow
                  label="Financial Rating"
                  value={"★".repeat(s.financialRating) + "☆".repeat(Math.max(0, 5 - s.financialRating))}
                />
              </div>
            </div>
          ) : null}

          {s ? (
            <div className="hr-card p-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Your Statistics</p>
              <div className="mt-3 space-y-2 text-sm">
                <SideRow label="Total Advances" value={String(s.totalAdvances)} />
                <SideRow label="Highest Advance" value={currency(s.highestAdvance)} />
                <SideRow label="Lowest Advance" value={currency(s.lowestAdvance)} />
                <SideRow label="Average Advance" value={currency(s.averageAdvance)} />
                <SideRow label="Completed Rate" value={`${s.completedRate}%`} />
                <SideRow label="Repayment Score" value={`${s.repaymentScore}%`} />
              </div>
            </div>
          ) : null}

          <div className="hr-card space-y-2 p-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Quick Actions</p>
            <Link href="/request" className="btn-primary w-full">
              Request New Advance
            </Link>
            {filtered[0] ? (
              <>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => void handleDownload(filtered[0].id, filtered[0].requestNo)}
                >
                  Download Receipt
                </button>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => void handlePrint(filtered[0].id)}
                >
                  Print Receipt
                </button>
                <button type="button" className="btn-secondary w-full" onClick={() => setSelected(filtered[0])}>
                  View Schedule
                </button>
              </>
            ) : null}
          </div>
        </aside>
      </div>

      {selected ? (
        <DetailDrawer
          row={selected}
          onClose={() => setSelected(null)}
          onDownload={() => void handleDownload(selected.id, selected.requestNo)}
          onView={() => void handleView(selected.id)}
          onPrint={() => void handlePrint(selected.id)}
          onEdit={() => {
            if (!selected.canEdit) {
              toast.warning("Approved or disbursed requests cannot be edited.", "Locked");
              return;
            }
            setEditRow(selected);
          }}
          onDelete={() => void handleDelete(selected)}
        />
      ) : null}

      <AdvanceRequestModal
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        editRequest={
          editRow
            ? {
                id: editRow.id,
                amount: editRow.amount,
                months: editRow.months,
                purpose: editRow.purpose.startsWith("Others:")
                  ? "Others"
                  : editRow.purposeType || editRow.purpose,
                purposeOther: editRow.purpose.startsWith("Others:")
                  ? editRow.purpose.replace(/^Others:\s*/i, "")
                  : "",
                description: editRow.description ?? "",
              }
            : undefined
        }
        onSuccess={() => {
          setEditRow(null);
          setSelected(null);
          void reload();
        }}
      />
    </div>
  );
}

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Chip key={opt} active={value === opt} onClick={() => onChange(opt)} label={opt} />
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-navy text-white" : "bg-slate-100 text-muted hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-[#F6F7FA] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold text-navy ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-navy">{value}</span>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
        danger
          ? "border-red-100 text-danger hover:bg-red-50"
          : "border-slate-200 text-navy hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function DetailDrawer({
  row,
  onClose,
  onDownload,
  onView,
  onPrint,
  onEdit,
  onDelete,
}: {
  row: HistoryRow;
  onClose: () => void;
  onDownload: () => void;
  onView: () => void;
  onPrint: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const paid = row.repayments.filter((r) => r.status === "Paid").length;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-navy/40 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="font-mono text-lg font-bold text-navy">{row.requestNo}</p>
            <div className="mt-2">
              <StatusBadge status={row.status} />
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-1.5 text-sm font-semibold text-muted hover:bg-slate-100">
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Repayment Progress</p>
            <p className="mt-1 text-3xl font-extrabold text-navy">{row.progressPercent}%</p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-primary" style={{ width: `${row.progressPercent}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">
              {paid}/{row.repayments.length || row.months} paid · Outstanding {currency(row.remainingBalance)}
            </p>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted">Approval Timeline</p>
            <ol className="space-y-0">
              {row.timeline.map((step, i) => (
                <li key={step.step} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < row.timeline.length - 1 ? (
                    <span
                      className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 ${
                        step.done ? "bg-emerald-400" : "bg-slate-200"
                      }`}
                    />
                  ) : null}
                  <span
                    className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                      step.done ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    {step.done ? "✓" : i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy">{step.step}</p>
                    <p className="text-xs text-muted">{step.date ? formatDate(step.date) : "Pending"}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
              Payroll Deduction History
            </p>
            {row.repayments.length === 0 ? (
              <p className="text-sm text-muted">Schedule appears after approval.</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-[#F6F7FA] text-[11px] uppercase text-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Month</th>
                      <th className="px-3 py-2 text-left">Amount</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.repayments.map((r) => (
                      <tr key={r.installmentNumber} className="border-t border-slate-100">
                        <td className="px-3 py-2">{r.monthLabel}</td>
                        <td className="px-3 py-2 font-semibold">{currency(r.amount)}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-slate-100 bg-[#F6F7FA] px-3 py-2 text-sm font-bold text-navy">
                  Total Paid {currency(row.totalPaid)}
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Notifications</p>
            <ul className="space-y-2">
              {row.notifications.map((n) => (
                <li key={`${n.title}-${n.date}`} className="rounded-xl bg-[#F6F7FA] px-3 py-2 text-sm">
                  <p className="font-semibold text-navy">{n.title}</p>
                  <p className="text-xs text-muted">{formatDate(n.date)}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Downloads</p>
            <div className="flex flex-wrap gap-2">
              <ActionBtn icon={<Download size={14} />} label="Download Receipt" onClick={onDownload} />
              <ActionBtn icon={<Eye size={14} />} label="View / Verify" onClick={onView} />
              <ActionBtn icon={<Printer size={14} />} label="Print Receipt" onClick={onPrint} />
              <ActionBtn icon={<FileText size={14} />} label="Download PDF" onClick={onDownload} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
          {row.canEdit ? (
            <button type="button" className="btn-secondary" onClick={onEdit}>
              <Pencil size={14} /> Edit
            </button>
          ) : null}
          {row.canDelete ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-red-100 px-4 py-2.5 text-sm font-semibold text-danger hover:bg-red-50"
              onClick={onDelete}
            >
              <Trash2 size={14} /> Delete
            </button>
          ) : (
            <p className="text-xs text-muted">Edit & delete locked after approval or disbursement.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
