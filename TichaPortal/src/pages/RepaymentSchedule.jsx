import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { kaziGetAdvanceWorkspace } from "../services/kaziApi";
import TablePagination from "../components/TablePagination";
import { downloadReceiptPdf, openReceiptPrint } from "../utils/avanceReceiptPdf";
import {
  FILTERS,
  buildSchedule,
  currentAdvance,
  daysFromToday,
  displayAdvanceStatus,
  formatPlanDate,
  matchesFilter,
  money,
  nextPayment,
  parseFrequency,
  paymentHistory,
  statusPill,
  workspaceKpis,
} from "../utils/repaymentWorkspace";

function StatusPill({ status }) {
  const pill = statusPill(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${pill.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
      {pill.label}
    </span>
  );
}

function ProgressBar({ percent }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-[#fcb038]" style={{ width: `${p}%` }} />
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-[#000435]">{value}</span>
    </div>
  );
}

export default function RepaymentSchedule() {
  const { teacher } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [apiTeacher, setApiTeacher] = useState(null);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(null);
  const [payment, setPayment] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await kaziGetAdvanceWorkspace();
      setRows(data.rows);
      setSummary(data.summary || {});
      setApiTeacher(data.teacher);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Could not load repayment schedule.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const teacherInfo = useMemo(
    () => ({
      fullName: apiTeacher?.fullName || teacher?.full_name || teacher?.name,
      employeeCode: apiTeacher?.employeeCode || teacher?.id,
      school: apiTeacher?.school || teacher?.school_name || teacher?.school?.name,
      school_name: teacher?.school_name || teacher?.school?.name,
    }),
    [apiTeacher, teacher]
  );

  const kpis = useMemo(() => workspaceKpis(rows, summary), [rows, summary]);
  const active = useMemo(() => currentAdvance(rows), [rows]);
  const activeSchedule = useMemo(() => (active ? buildSchedule(active) : []), [active]);
  const activePaid = Number(active?.totalPaid) || 0;
  const activeRemaining = Number(active?.remainingBalance) || 0;
  const activePct = active
    ? active.progressPercent ?? (active.amount ? Math.round((activePaid / active.amount) * 100) : 0)
    : 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesFilter(row, filter)) return false;
      if (!q) return true;
      const id = String(row.requestNumber || row.requestNo || "").toLowerCase();
      return id.includes(q);
    });
  }, [rows, filter, query]);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const selectedView = useMemo(() => {
    if (!selected) return null;
    const schedule = buildSchedule(selected);
    const history = paymentHistory(schedule);
    const next = nextPayment(schedule);
    const status = displayAdvanceStatus(selected);
    const paidCount = schedule.filter((r) => r.status === "Paid").length;
    return {
      ...selected,
      displayStatus: status,
      frequency: parseFrequency(selected),
      schedule,
      history,
      next,
      paidCount,
      completed:
        status === "Completed" ||
        (["Approved", "Disbursed"].includes(selected.status) &&
          (Number(selected.remainingBalance) || 0) <= 0 &&
          paidCount > 0 &&
          paidCount === schedule.length),
    };
  }, [selected]);

  async function handleDownload(advance, pay = null) {
    setBusy(true);
    try {
      const schedule = buildSchedule(advance);
      await downloadReceiptPdf({
        advance: { ...advance, schedule, frequency: parseFrequency(advance), displayStatus: displayAdvanceStatus(advance) },
        teacher: teacherInfo,
        payment: pay,
      });
    } catch (e) {
      try {
        openReceiptPrint({
          advance: { ...advance, schedule: buildSchedule(advance), frequency: parseFrequency(advance) },
          teacher: teacherInfo,
          payment: pay,
        });
      } catch {
        setError(e.message || "Could not download receipt.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#000435]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-5 px-4 py-6 sm:px-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Ticha Avance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#000435]">Repayment Schedule</h1>
        <p className="mt-1 text-sm text-slate-500">Track every advance, upcoming payroll deductions, and download receipts.</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "Total Advances", value: kpis.totalAdvances },
          { label: "Active Advances", value: kpis.activeAdvances },
          { label: "Total Borrowed", value: money(kpis.totalBorrowed) },
          { label: "Remaining Balance", value: money(kpis.remainingBalance) },
          { label: "Completed", value: kpis.completed },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className="mt-2 text-xl font-bold tabular-nums text-[#000435]">{card.value}</p>
          </div>
        ))}
      </div>

      {active ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Current Advance</p>
              <p className="mt-1 font-mono text-sm font-semibold text-[#000435]">{active.requestNumber || active.requestNo}</p>
            </div>
            <p className="text-sm font-semibold text-[#000435]">{activePct}% Paid</p>
          </div>
          <div className="mt-3">
            <ProgressBar percent={activePct} />
          </div>
          <div className="mt-3 flex flex-wrap gap-6 text-sm">
            <span className="text-slate-500">Paid: <strong className="text-[#000435]">{money(activePaid)}</strong></span>
            <span className="text-slate-500">Remaining: <strong className="text-[#000435]">{money(activeRemaining)}</strong></span>
            {activeSchedule.length ? (
              <span className="text-slate-500">
                {activeSchedule.filter((r) => r.status === "Paid").length} of {activeSchedule.length} payments completed
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">All Advance Requests</p>
            <h2 className="text-base font-semibold text-[#000435]">Your advances</h2>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Advance ID"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-[#000435] outline-none focus:border-[#fcb038]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === f ? "bg-[#000435] text-white" : "bg-slate-100 text-[#000435] hover:bg-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {pageRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No advances match this filter.</p>
          ) : (
            pageRows.map((row) => {
              const status = displayAdvanceStatus(row);
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => { setSelected(row); setPayment(null); }}
                  className="w-full rounded-2xl border border-slate-100 p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-[#000435]">{row.requestNumber || row.requestNo}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatPlanDate(row.submittedAt || row.date)}</p>
                    </div>
                    <StatusPill status={status} />
                  </div>
                  <p className="mt-3 text-lg font-bold text-[#000435]">{money(row.amount)}</p>
                  <p className="mt-1 text-xs text-slate-500">Remaining {money(row.remainingBalance)}</p>
                </button>
              );
            })
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#000435] text-[11px] font-semibold uppercase tracking-wide text-white">
              <tr>
                <th className="px-5 py-3.5">Advance ID</th>
                <th className="px-5 py-3.5">Requested Date</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Period</th>
                <th className="px-5 py-3.5">Frequency</th>
                <th className="px-5 py-3.5">Paid</th>
                <th className="px-5 py-3.5">Remaining</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center text-slate-400">No advances match this filter.</td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const status = displayAdvanceStatus(row);
                  return (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-semibold text-[#000435]">{row.requestNumber || row.requestNo}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatPlanDate(row.submittedAt || row.date)}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#000435]">{money(row.amount)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">{row.months} Months</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">{parseFrequency(row)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">{money(row.totalPaid)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">{money(row.remainingBalance)}</td>
                      <td className="whitespace-nowrap px-5 py-4"><StatusPill status={status} /></td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <button
                          type="button"
                          className="inline-flex h-8 items-center rounded-lg bg-[#fcb038] px-3 text-[11px] font-semibold text-[#000435] hover:bg-[#febf10]"
                          onClick={() => { setSelected(row); setPayment(null); }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          pageSize={pageSize}
          itemCount={pageRows.length}
          pageStartIndex={filtered.length === 0 ? 0 : (page - 1) * pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        />
      </div>

      {selectedView
        ? createPortal(
            <AdvanceDrawer
              row={selectedView}
              payment={payment}
              busy={busy}
              onClose={() => { setSelected(null); setPayment(null); }}
              onSelectPayment={setPayment}
              onDownload={(pay) => handleDownload(selectedView, pay)}
            />,
            document.body
          )
        : null}
    </div>
  );
}

function AdvanceDrawer({ row, payment, busy, onClose, onSelectPayment, onDownload }) {
  const next = row.next;
  const overdueDays = next && next.status === "Overdue" ? Math.abs(daysFromToday(next.dueDate)) : 0;
  const upcomingDays = next && next.status !== "Overdue" ? daysFromToday(next.dueDate) : 0;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <button type="button" className="absolute inset-0 bg-[#000435]/40" aria-label="Close" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between bg-[#000435] px-5 py-4 text-white">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-white/50">Advance overview</p>
            <p className="mt-1 font-mono text-lg font-semibold">{row.requestNumber || row.requestNo}</p>
            <div className="mt-2"><StatusPill status={row.displayStatus} /></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {row.completed ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Advance completed</p>
              <p className="mt-1 text-xl font-bold text-[#000435]">{money(row.amount)} Fully repaid</p>
              <div className="mt-3 divide-y divide-emerald-100">
                <MetaRow label="Total Amount" value={money(row.amount)} />
                <MetaRow label="Total Paid" value={money(row.totalPaid || row.amount)} />
                <MetaRow label="Remaining" value={money(0)} />
                <MetaRow label="Completed Date" value={formatPlanDate(row.completedAt || row.schedule.at(-1)?.paidAt || row.schedule.at(-1)?.dueDate)} />
              </div>
              <p className="mt-3 text-sm font-semibold text-emerald-700">Fully repaid</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => onDownload(null)} className="rounded-xl bg-[#000435] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
                  Download Final Receipt
                </button>
                <button type="button" onClick={() => onSelectPayment(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-[#000435]">
                  View Repayment History
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 p-4">
              <p className="text-2xl font-bold text-[#000435]">{money(row.amount)}</p>
              <div className="mt-3 divide-y divide-slate-100">
                <MetaRow label="Requested" value={formatPlanDate(row.submittedAt)} />
                <MetaRow label="Approved" value={formatPlanDate(row.approvedAt)} />
                <MetaRow label="Start Date" value={formatPlanDate(row.startDate || row.disbursedAt || row.approvedAt)} />
                <MetaRow label="Loan Period" value={`${row.months} Months`} />
                <MetaRow label="Frequency" value={row.frequency} />
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Repayment progress</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Paid</p>
                <p className="mt-1 font-bold text-[#000435]">{money(row.totalPaid)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Remaining</p>
                <p className="mt-1 font-bold text-[#000435]">{money(row.remainingBalance)}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                <span>{row.progressPercent || 0}%</span>
                <span>{row.paidCount} of {row.schedule.length} payments completed</span>
              </div>
              <ProgressBar percent={row.progressPercent} />
            </div>
          </div>

          {next && !row.completed ? (
            <div className={`rounded-2xl border p-4 ${next.status === "Overdue" ? "border-red-100 bg-red-50" : "border-amber-100 bg-amber-50"}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {next.status === "Overdue" ? "Overdue repayment" : "Next repayment"}
              </p>
              <p className="mt-1 text-2xl font-bold text-[#000435]">{money(next.amount)}</p>
              <p className="mt-1 text-sm text-slate-600">Due {formatPlanDate(next.dueDate)}</p>
              <p className={`mt-1 text-sm font-semibold ${next.status === "Overdue" ? "text-red-700" : "text-amber-800"}`}>
                {next.status === "Overdue"
                  ? `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`
                  : `${Math.max(0, upcomingDays)} day${Math.abs(upcomingDays) === 1 ? "" : "s"} remaining`}
              </p>
              <button
                type="button"
                onClick={() => onSelectPayment(next)}
                className="mt-3 rounded-xl bg-[#000435] px-4 py-2 text-xs font-semibold text-white"
              >
                View Payment Details
              </button>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Repayment schedule</p>
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#000435] text-[11px] font-semibold uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {row.schedule.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Schedule appears after approval.</td></tr>
                  ) : (
                    row.schedule.map((item) => (
                      <tr
                        key={item.id}
                        className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        onClick={() => onSelectPayment(item)}
                      >
                        <td className="px-4 py-3 tabular-nums">{item.n}</td>
                        <td className="px-4 py-3">{formatPlanDate(item.dueDate)}</td>
                        <td className="px-4 py-3 font-semibold">{money(item.amount)}</td>
                        <td className="px-4 py-3">{money(item.paid)}</td>
                        <td className="px-4 py-3">{money(item.balance)}</td>
                        <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Payment history</p>
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#000435] text-[11px] font-semibold uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-4 py-3">Payment ID</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {row.history.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No completed repayments yet.</td></tr>
                  ) : (
                    row.history.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{item.id}</td>
                        <td className="px-4 py-3">{formatPlanDate(item.date)}</td>
                        <td className="px-4 py-3 font-semibold">{money(item.amount)}</td>
                        <td className="px-4 py-3">{item.method}</td>
                        <td className="px-4 py-3 font-mono text-xs">{item.reference}</td>
                        <td className="px-4 py-3">
                          <button type="button" disabled={busy} onClick={() => onDownload(item.installment)} className="text-xs font-semibold text-[#c87800] hover:underline disabled:opacity-50">
                            PDF
                          </button>
                          <button type="button" onClick={() => onSelectPayment(item.installment)} className="ml-3 text-xs font-semibold text-[#000435] hover:underline">
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {payment ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Payment details</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-[#000435]">{payment.reference}</p>
                </div>
                <button type="button" className="text-xs font-semibold text-slate-500" onClick={() => onSelectPayment(null)}>Close</button>
              </div>
              <div className="mt-3 divide-y divide-slate-200">
                <MetaRow label="Due date" value={formatPlanDate(payment.dueDate)} />
                <MetaRow label="Amount" value={money(payment.amount)} />
                <MetaRow label="Paid" value={money(payment.paid)} />
                <MetaRow label="Method" value={payment.method} />
                <MetaRow label="Status" value={payment.status} />
              </div>
              {payment.status === "Paid" ? (
                <button type="button" disabled={busy} onClick={() => onDownload(payment)} className="mt-4 rounded-xl bg-[#000435] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
                  Download Receipt
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
