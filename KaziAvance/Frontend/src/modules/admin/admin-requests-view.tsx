"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  Check,
  Clock,
  Download,
  FileDown,
  FileText,
  MoreHorizontal,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { StatCard, StatsGrid } from "@/components/stat-card";
import { formatRwf } from "@/config/org-admin-nav";
import { API_URL } from "@/lib/api";
import { downloadAuthenticated, printAuthenticated } from "@/lib/download";
import { adminApi } from "@/services/admin-api";
import { PageError, PageLoader, useAsyncData } from "@/hooks/use-async-data";
import { useToast } from "@/shared/notifications";
import type { AdvanceRequestRow, AdminEmployee, RequestStatus } from "./types";

type QuickFilter =
  | "All"
  | "Pending"
  | "Approved"
  | "Active"
  | "Completed"
  | "Overdue";

const PURPOSES = ["Medical", "Education", "Emergency", "Rent", "Business", "Family", "Others"];

function matchesQuick(row: AdvanceRequestRow, quick: QuickFilter, overdueIds: Set<string>) {
  if (quick === "All") return true;
  if (quick === "Pending") return row.status === "Pending" || row.status === "Under Review";
  if (quick === "Approved") return row.status === "Approved";
  if (quick === "Active") return row.status === "Disbursed" || (row.status === "Approved" && (row.remainingBalance ?? 0) > 0);
  if (quick === "Completed") return row.status === "Completed";
  if (quick === "Overdue") return overdueIds.has(row.id);
  return true;
}

function exportCsv(rows: AdvanceRequestRow[]) {
  const header = ["Request #", "Employee", "Department", "Amount", "Months", "Purpose", "Status", "Date"];
  const lines = rows.map((r) =>
    [
      r.requestNumber,
      r.employeeName,
      r.department ?? "",
      r.amount,
      r.repaymentMonths ?? "",
      r.purpose,
      r.status,
      r.requestDate,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kaziavance-requests-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPdfHtml(rows: AdvanceRequestRow[], title: string) {
  const body = rows
    .map(
      (r) =>
        `<tr><td>${r.requestNumber}</td><td>${r.employeeName}</td><td>${r.department ?? "—"}</td><td>${r.amount.toLocaleString()} RWF</td><td>${r.repaymentMonths ?? "—"}</td><td>${r.status}</td><td>${r.requestDate}</td></tr>`
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
  <style>body{font-family:Segoe UI,sans-serif;padding:24px;color:#000435}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}th{background:#000435;color:#fff}</style></head>
  <body><h1>${title}</h1><p>Generated ${new Date().toLocaleString()}</p>
  <table><thead><tr><th>Request</th><th>Employee</th><th>Dept</th><th>Amount</th><th>Months</th><th>Status</th><th>Date</th></tr></thead>
  <tbody>${body}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) setTimeout(() => w.print(), 400);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function AdminRequestsView() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsyncData(() => adminApi.getRequestsWorkspace(), []);
  const { data: employees } = useAsyncData(() => adminApi.getEmployees().then((r) => r.data), []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "All">("All");
  const [department, setDepartment] = useState("All");
  const [purposeType, setPurposeType] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [amountRange, setAmountRange] = useState("All");
  const [quick, setQuick] = useState<QuickFilter>("All");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdvanceRequestRow | null>(null);
  const [detail, setDetail] = useState<AdvanceRequestRow | null>(null);
  const [comment, setComment] = useState("");
  const [acting, setActing] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const overdueIds = useMemo(
    () => new Set((data?.overdueList ?? []).map((r) => r.id)),
    [data?.overdueList]
  );

  const filtered = useMemo(() => {
    const rows = data?.data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!matchesQuick(r, quick, overdueIds)) return false;
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (department !== "All" && r.department !== department) return false;
      if (purposeType !== "All" && (r.purposeType || r.purpose) !== purposeType) return false;
      if (monthFilter !== "All") {
        const m = new Date(r.createdAt || r.requestDate).getMonth();
        if (String(m) !== monthFilter) return false;
      }
      if (amountRange === "0-100k" && r.amount > 100000) return false;
      if (amountRange === "100k-500k" && (r.amount < 100000 || r.amount > 500000)) return false;
      if (amountRange === "500k+" && r.amount < 500000) return false;
      if (
        q &&
        !r.employeeName.toLowerCase().includes(q) &&
        !r.requestNumber.toLowerCase().includes(q) &&
        !(r.department ?? "").toLowerCase().includes(q) &&
        !r.purpose.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [data?.data, search, statusFilter, department, purposeType, monthFilter, amountRange, quick, overdueIds]);

  const pageSize = 10;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const summary = data?.summary;

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setDepartment("All");
    setPurposeType("All");
    setMonthFilter("All");
    setAmountRange("All");
    setQuick("All");
    setPage(1);
  }

  async function openDetails(row: AdvanceRequestRow) {
    setMenuId(null);
    setSelected(row);
    setComment(row.reviewComment ?? "");
    try {
      const full = await adminApi.getRequest(row.id);
      setDetail(full);
    } catch {
      setDetail(row);
    }
  }

  async function handleAction(id: string, action: string) {
    setActing(true);
    try {
      await adminApi.updateRequest(id, action, comment.trim() ? { comment: comment.trim() } : undefined);
      toast.success(`Request ${action}d successfully.`, "Updated");
      setSelected(null);
      setDetail(null);
      setMenuId(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed", "Error");
    } finally {
      setActing(false);
    }
  }

  async function handleDownload(id: string, requestNumber: string) {
    try {
      await downloadAuthenticated(`/api/org-admin/requests/${id}/receipt`, `advance-receipt-${requestNumber}.html`);
      toast.success("Receipt downloaded.", "Download");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed", "Error");
    }
  }

  if (loading && !data) return <PageLoader />;
  if (error || !data) return <PageError message={error ?? "Unable to load requests"} onRetry={reload} />;

  const s = summary!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="hr-card flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">KaziAdvance Admin</p>
          <h1 className="mt-1 text-2xl font-semibold text-navy sm:text-3xl">Advance Requests Management</h1>
          <p className="mt-2 text-sm text-muted">Review · Approve · Reject · Track Salary Advances</p>
        </div>
        <button type="button" onClick={() => setManualOpen(true)} className="btn-primary">
          <Plus size={16} /> New Manual Request
        </button>
      </div>

      {/* Stats */}
      <StatsGrid columns={4}>
        <StatCard label="Total Requests" value={s.total} hint="All time" icon={<FileText size={20} />} />
        <StatCard label="Pending" value={s.pending} hint="Awaiting review" icon={<Clock size={20} />} />
        <StatCard label="Approved" value={s.approved} hint="Approved pipeline" icon={<Check size={20} />} />
        <StatCard label="Active" value={s.active} hint="Currently running" icon={<Wallet size={20} />} />
        <StatCard label="Rejected" value={s.rejected} hint="Denied" icon={<X size={20} />} />
        <StatCard label="Cancelled" value={s.cancelled} hint="Withdrawn" icon={<RotateCcw size={20} />} />
        <StatCard label="Completed" value={s.completed} hint="Fully paid" icon={<Check size={20} />} />
        <StatCard label="This Month" value={s.thisMonth} hint="New submissions" icon={<FileText size={20} />} />
      </StatsGrid>

      {/* Smart search */}
      <div className="hr-card space-y-3 p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Smart Search</p>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-10"
            placeholder="Search employee name, request #, purpose…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <select
            className="input"
            value={quick}
            onChange={(e) => {
              setQuick(e.target.value as QuickFilter);
              setStatusFilter("All");
              setPage(1);
            }}
          >
            <option value="All">All requests</option>
            <option value="Pending">Pending Requests ({s.pending})</option>
            <option value="Approved">Approved Requests ({s.approved})</option>
            <option value="Active">Active Advances ({s.active})</option>
            <option value="Completed">Completed Advances ({s.completed})</option>
            <option value="Overdue">Overdue Recoveries ({s.overdue})</option>
          </select>
          <select className="input" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}>
            <option value="All">Department</option>
            {data.departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select className="input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as RequestStatus | "All"); setPage(1); }}>
            <option value="All">Status</option>
            {["Pending", "Under Review", "Approved", "Rejected", "Disbursed", "Completed", "Cancelled"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="input" value={purposeType} onChange={(e) => { setPurposeType(e.target.value); setPage(1); }}>
            <option value="All">Advance Type</option>
            {data.purposeTypes.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select className="input" value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}>
            <option value="All">Month</option>
            {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
              <option key={m} value={String(i)}>{m}</option>
            ))}
          </select>
          <select className="input" value={amountRange} onChange={(e) => { setAmountRange(e.target.value); setPage(1); }}>
            <option value="All">Amount Range</option>
            <option value="0-100k">0 – 100,000</option>
            <option value="100k-500k">100,000 – 500,000</option>
            <option value="500k+">500,000+</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={resetFilters}>Reset</button>
          <button type="button" className="btn-secondary" onClick={() => { exportCsv(filtered); toast.success("CSV exported.", "Export"); }}>
            <FileDown size={14} /> Export Excel
          </button>
          <button type="button" className="btn-secondary" onClick={() => { exportPdfHtml(filtered, "Advance Requests"); toast.success("PDF ready to print.", "Export"); }}>
            <Printer size={14} /> Generate PDF
          </button>
        </div>
      </div>

      {/* Modern table */}
      <div className="hr-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-navy">All Advance Requests</h2>
            <p className="mt-0.5 text-xs text-muted">{filtered.length} matching records</p>
          </div>
          {quick !== "All" ? (
            <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setQuick("All")}>
              Clear quick filter ({quick})
            </button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full text-left text-sm">
            <thead className="bg-navy text-[11px] font-semibold uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Installments</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-muted">No requests match your filters.</td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">{r.employeeName}</p>
                      <p className="text-[11px] text-muted">{r.requestNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-navy/80">{r.department || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-navy">{formatRwf(r.amount)}</td>
                    <td className="px-4 py-3 text-navy/80">{r.repaymentMonths ?? "—"} Months</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-muted">{r.requestDate}</td>
                    <td className="relative px-4 py-3 text-right">
                      <RowMenu
                        open={menuId === r.id}
                        onToggle={() => setMenuId(menuId === r.id ? null : r.id)}
                        onClose={() => setMenuId(null)}
                        row={r}
                        onView={() => void openDetails(r)}
                        onApprove={() => void handleAction(r.id, "approve")}
                        onReject={() => void handleAction(r.id, "reject")}
                        onDisburse={() => void handleAction(r.id, "disburse")}
                        onDownload={() => void handleDownload(r.id, r.requestNumber)}
                        onPrint={() => void printAuthenticated(`/api/org-admin/requests/${r.id}/receipt?print=1`)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-muted">
          <span>
            Page {page} of {Math.max(1, Math.ceil(filtered.length / pageSize))}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              disabled={page >= Math.ceil(filtered.length / pageSize)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selected || detail ? (
        <DetailsModal
          row={detail ?? selected!}
          comment={comment}
          setComment={setComment}
          acting={acting}
          onClose={() => {
            setSelected(null);
            setDetail(null);
          }}
          onApprove={() => void handleAction((detail ?? selected)!.id, "approve")}
          onReject={() => void handleAction((detail ?? selected)!.id, "reject")}
          onDisburse={() => void handleAction((detail ?? selected)!.id, "disburse")}
          onDownload={() => void handleDownload((detail ?? selected)!.id, (detail ?? selected)!.requestNumber)}
        />
      ) : null}

      {manualOpen ? (
        <ManualRequestModal
          employees={employees ?? []}
          onClose={() => setManualOpen(false)}
          onCreated={async () => {
            setManualOpen(false);
            toast.success("Manual request created.", "Created");
            await reload();
          }}
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
  onApprove,
  onReject,
  onDisburse,
  onDownload,
  onPrint,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  row: AdvanceRequestRow;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDisburse: () => void;
  onDownload: () => void;
  onPrint: () => void;
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
      const menuH = 280;
      const pad = 8;
      let left = rect.right - menuW;
      let top = rect.bottom + 6;
      if (left < pad) left = pad;
      if (left + menuW > window.innerWidth - pad) left = window.innerWidth - menuW - pad;
      if (top + menuH > window.innerHeight - pad) {
        top = Math.max(pad, rect.top - menuH - 6);
      }
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
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const pending = row.status === "Pending" || row.status === "Under Review";
  const approved = row.status === "Approved";
  const active = row.status === "Disbursed";
  const completed = row.status === "Completed";

  const menu = open && pos && mounted
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[200] w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 shadow-[0_16px_40px_-12px_rgba(0,4,53,0.28)]"
          style={{ top: pos.top, left: pos.left }}
        >
          <MenuItem label="View Details" onClick={onView} />
          {pending ? (
            <>
              <MenuItem label="Approve Request" onClick={onApprove} />
              <MenuItem label="Reject Request" onClick={onReject} danger />
              <MenuItem label="Forward Request" onClick={onApprove} />
              <MenuItem label="Request Documents" onClick={onView} />
              <Link
                href="/org-admin/employees"
                className="block px-3 py-2 text-left text-sm text-navy hover:bg-slate-50"
                onClick={onClose}
              >
                View Employee Profile
              </Link>
            </>
          ) : null}
          {approved ? (
            <>
              <MenuItem label="Disburse Advance" onClick={onDisburse} />
              <MenuItem label="Generate Agreement" onClick={onDownload} />
              <MenuItem label="Print Approval Letter" onClick={onPrint} />
              <MenuItem label="View Payroll Schedule" onClick={onView} />
            </>
          ) : null}
          {active ? (
            <>
              <MenuItem label="Repayment Schedule" onClick={onView} />
              <MenuItem label="Recovery History" onClick={onView} />
              <MenuItem label="Download Statement" onClick={onDownload} />
            </>
          ) : null}
          {completed ? (
            <>
              <MenuItem label="Download Statement" onClick={onDownload} />
              <MenuItem label="Print Completion Letter" onClick={onPrint} />
            </>
          ) : null}
          <MenuItem label="Download Receipt" onClick={onDownload} />
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
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="More actions"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
      {menu}
    </>
  );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
        danger ? "text-danger" : "text-navy"
      }`}
    >
      {label}
    </button>
  );
}

function DetailsModal({
  row,
  comment,
  setComment,
  acting,
  onClose,
  onApprove,
  onReject,
  onDisburse,
  onDownload,
}: {
  row: AdvanceRequestRow;
  comment: string;
  setComment: (v: string) => void;
  acting: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDisburse: () => void;
  onDownload: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const pending = row.status === "Pending" || row.status === "Under Review";
  const approved = row.status === "Approved";
  const timeline = row.timeline ?? [
    { step: "Submitted", date: row.createdAt ?? row.requestDate, done: true },
    { step: "Approved", date: row.approvedAt, done: Boolean(row.approvedAt) },
    { step: "Disbursed Successfully", date: row.disbursedAt, done: Boolean(row.disbursedAt) },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0 bg-navy/45 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 bg-navy px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Advance Request Details</p>
            <h2 className="mt-1 font-mono text-lg font-semibold">{row.requestNumber}</h2>
            <div className="mt-2"><StatusBadge status={row.status} /></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-white/10"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Employee Information</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Info label="Employee ID" value={row.employeeCode} />
              <Info label="Name" value={row.employeeName} />
              <Info label="Department" value={row.department || "—"} />
              <Info label="Position" value={row.position || "—"} />
              <Info label="Net Salary" value={formatRwf(row.netSalary)} />
              <Info label="Phone" value={row.employeePhone || "—"} />
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Advance Information</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Info label="Requested Amount" value={formatRwf(row.amount)} />
              <Info label="Maximum Eligible" value={formatRwf(row.availableLimit)} />
              <Info label="Repayment Period" value={`${row.repaymentMonths ?? "—"} Months`} />
              <Info label="Monthly Deduction" value={row.monthlyDeduction != null ? formatRwf(row.monthlyDeduction) : "—"} />
              <Info label="Purpose" value={row.purpose} />
              <Info label="Outstanding" value={formatRwf(row.remainingBalance ?? 0)} />
            </div>
            {row.description ? (
              <p className="mt-2 rounded-2xl bg-[#F6F7FA] px-3 py-2 text-sm text-navy/75">{row.description}</p>
            ) : null}
          </section>

          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Approval Workflow</h3>
            <ol className="space-y-0">
              {timeline.map((step, i) => (
                <li key={step.step} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < timeline.length - 1 ? (
                    <span className={`absolute left-[11px] top-6 h-[calc(100%-10px)] w-0.5 ${step.done ? "bg-emerald-400" : "bg-slate-200"}`} />
                  ) : null}
                  <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${step.done ? "bg-emerald-500" : "bg-slate-300"}`}>
                    {step.done ? "✓" : i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy">{step.step}</p>
                    <p className="text-xs text-muted">{step.date ? new Date(step.date).toLocaleDateString() : "Pending"}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {row.signatureFile ? (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Signature</h3>
              {row.signatureMimeType?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${API_URL}/uploads/${row.signatureFile}`} alt="Signature" className="mt-2 max-h-28 rounded-xl border object-contain" />
              ) : (
                <a href={`${API_URL}/uploads/${row.signatureFile}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-primary">
                  Open signature file
                </a>
              )}
            </section>
          ) : null}

          {(pending || approved) && (
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Review comment</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="Optional note…"
              />
            </label>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" className="btn-secondary" onClick={onDownload}>
            <Download size={14} /> Receipt
          </button>
          {pending ? (
            <>
              <button type="button" disabled={acting} className="flex-1 rounded-2xl bg-danger px-4 py-2.5 text-sm font-semibold text-white" onClick={onReject}>
                Reject
              </button>
              <button type="button" disabled={acting} className="flex-1 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white" onClick={onApprove}>
                Approve
              </button>
            </>
          ) : null}
          {approved ? (
            <button type="button" disabled={acting} className="flex-1 rounded-2xl bg-navy px-4 py-2.5 text-sm font-semibold text-white" onClick={onDisburse}>
              Disburse
            </button>
          ) : null}
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

function ManualRequestModal({
  employees,
  onClose,
  onCreated,
}: {
  employees: AdminEmployee[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const toast = useToast();
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState(250000);
  const [months, setMonths] = useState(6);
  const [purpose, setPurpose] = useState("Emergency");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!employeeId) {
      toast.warning("Select an employee.", "Required");
      return;
    }
    setSaving(true);
    try {
      await adminApi.createManualRequest({ employeeId, amount, months, purpose, description: description || undefined });
      await onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create request", "Error");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-navy/45" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy">New Manual Request</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-muted">Employee</span>
            <select className="input mt-1" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Select employee…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-muted">Amount</span>
              <input type="number" className="input mt-1" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Months</span>
              <select className="input mt-1" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                {[3, 6, 9, 12].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-muted">Purpose</span>
            <select className="input mt-1" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted">Description (optional)</span>
            <textarea className="input mt-1" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary flex-1" disabled={saving} onClick={() => void submit()}>
            {saving ? "Creating…" : "Create request"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
