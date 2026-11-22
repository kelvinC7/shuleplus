import {
  addPaymentInterval,
  firstPaymentDate,
  formatFrw,
  formatPlanDate,
  frequencyLabel,
  computeAvancePlan,
} from "./avanceRepayment";

/**
 * Helpers for the Repayment Schedule page (src/pages/RepaymentSchedule.jsx).
 *
 * NOTE: this file was empty in the uploaded project, so it was rebuilt from how the page
 * and the receipt PDF code use it. If you have the original version in git, prefer that.
 */

export { formatPlanDate };

/** Filter chips shown above the table. */
export const FILTERS = ["All", "Active", "Pending", "Completed", "Rejected"];

/** Currency formatter used across the page ("150,000 Frw", or "-" when not a number). */
export function money(n) {
  return formatFrw(n);
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function num(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Whole days from today to `date` (negative when the date is in the past). */
export function daysFromToday(date) {
  const d = toDate(date);
  if (!d) return 0;
  const ms = startOfDay(d).getTime() - startOfDay(new Date()).getTime();
  return Math.round(ms / 86_400_000);
}

/** Lower-case, trimmed raw status from the API (e.g. "pending_accountant", "Disbursed"). */
function rawStatus(row) {
  return String(row?.status ?? "").trim().toLowerCase();
}

function isRejected(s) {
  return s.startsWith("reject") || s.startsWith("declin");
}

function isPending(s) {
  return (
    !s ||
    s.startsWith("pending") ||
    s === "sent_to_manager" ||
    s === "submitted" ||
    s === "waiting" ||
    s === "draft"
  );
}

/** Frequency label for a request: "Daily" | "Weekly" | "Monthly". */
export function parseFrequency(row) {
  const raw = String(row?.frequency ?? row?.paymentFrequency ?? row?.repaymentFrequency ?? "")
    .trim()
    .toLowerCase();
  if (raw.startsWith("day")) return frequencyLabel("daily");
  if (raw.startsWith("week")) return frequencyLabel("weekly");
  return frequencyLabel("monthly");
}

function frequencyKey(row) {
  return parseFrequency(row).toLowerCase();
}

/** Installments the backend already provides, if any. */
function apiInstallments(advance) {
  const list = advance?.schedule ?? advance?.installments ?? advance?.repayments;
  return Array.isArray(list) && list.length ? list : null;
}

function normalizeInstallmentStatus(value) {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "paid" || s === "completed" || s === "settled") return "Paid";
  if (s === "overdue" || s === "late") return "Overdue";
  if (s === "partial" || s === "partially paid") return "Partial";
  return "Upcoming";
}

/**
 * Repayment schedule for one advance.
 * Uses installments from the API when present; otherwise generates an even schedule from
 * amount / months / frequency and marks installments as paid from `totalPaid`.
 * Pending and rejected requests have no schedule.
 */
export function buildSchedule(advance) {
  if (!advance) return [];
  const reqNo = advance.requestNumber || advance.requestNo || advance.id || "ADV";
  const today = startOfDay(new Date());

  const fromApi = apiInstallments(advance);
  if (fromApi) {
    return fromApi.map((r, i) => {
      const amount = num(r.amount ?? r.dueAmount) ?? 0;
      const dueDate = r.dueDate ?? r.due ?? r.date ?? null;
      let status = normalizeInstallmentStatus(r.status);
      const paid = num(r.paid ?? r.paidAmount) ?? (status === "Paid" ? amount : 0);
      const due = toDate(dueDate);
      if (status === "Upcoming" && due && startOfDay(due) < today && paid < amount) {
        status = "Overdue";
      }
      return {
        id: r.id ?? `${reqNo}-${i + 1}`,
        n: r.n ?? i + 1,
        dueDate,
        amount,
        paid,
        balance: num(r.balance) ?? Math.max(0, amount - paid),
        status,
        method: r.method ?? r.paymentMethod ?? "Payroll deduction",
        reference: r.reference ?? (status === "Paid" ? `${reqNo}-P${i + 1}` : "-"),
        date: r.paidAt ?? r.date ?? dueDate,
        paidAt: r.paidAt ?? (status === "Paid" ? dueDate : null),
      };
    });
  }

  const s = rawStatus(advance);
  if (isRejected(s) || isPending(s) || s.startsWith("cancel")) return [];

  const months = Math.max(0, Math.floor(Number(advance.months) || 0));
  const principal = num(advance.amount) ?? 0;
  if (!months || principal <= 0) return [];

  const frequency = frequencyKey(advance);
  const plan = computeAvancePlan({
    amount: principal,
    periodCount: months,
    periodUnit: "months",
    frequency,
    serviceFee: advance.serviceFee,
    interest: advance.interest,
  });
  if (!plan.payments) return [];

  const startFrom =
    toDate(advance.startDate || advance.disbursedAt || advance.approvedAt || advance.submittedAt) ?? new Date();
  const first = firstPaymentDate(frequency, startFrom);

  // How much has been repaid so far (never trust a missing number).
  const remaining = num(advance.remainingBalance);
  let pool = num(advance.totalPaid);
  if (pool === null) pool = remaining !== null ? Math.max(0, plan.totalRepayment - remaining) : 0;

  return plan.schedule.map((item, i) => {
    const dueDate = addPaymentInterval(first, frequency, i);
    const paid = Math.min(item.amount, Math.max(0, pool));
    pool -= paid;
    let status = "Upcoming";
    if (paid >= item.amount) status = "Paid";
    else if (startOfDay(dueDate) < today) status = "Overdue";
    else if (paid > 0) status = "Partial";
    return {
      id: `${reqNo}-${item.n}`,
      n: item.n,
      dueDate,
      amount: item.amount,
      paid,
      balance: Math.max(0, item.amount - paid),
      status,
      method: advance.paymentMethod || "Payroll deduction",
      reference: status === "Paid" ? `${reqNo}-P${item.n}` : "-",
      date: status === "Paid" ? dueDate : null,
      paidAt: status === "Paid" ? dueDate : null,
    };
  });
}

/** Paid installments, shaped for the "Payment history" table. */
export function paymentHistory(schedule) {
  return (schedule || [])
    .filter((r) => r.status === "Paid")
    .map((r) => ({
      id: r.reference && r.reference !== "-" ? r.reference : r.id,
      date: r.paidAt || r.date || r.dueDate,
      amount: r.paid || r.amount,
      method: r.method,
      reference: r.reference,
      installment: r,
    }));
}

/** The next payment to collect: the oldest overdue one, otherwise the first unpaid. */
export function nextPayment(schedule) {
  const unpaid = (schedule || []).filter((r) => r.status !== "Paid");
  if (!unpaid.length) return null;
  return unpaid.find((r) => r.status === "Overdue") || unpaid[0];
}

/**
 * Label shown in the status pill:
 * "Pending" | "Rejected" | "Cancelled" | "Active" | "Overdue" | "Completed"
 */
export function displayAdvanceStatus(row) {
  const s = rawStatus(row);
  if (isRejected(s)) return "Rejected";
  if (s.startsWith("cancel")) return "Cancelled";
  if (isPending(s)) return "Pending";

  if (["completed", "paid", "repaid", "closed", "settled"].includes(s)) return "Completed";

  const schedule = buildSchedule(row);
  if (schedule.length && schedule.every((r) => r.status === "Paid")) return "Completed";
  if (schedule.some((r) => r.status === "Overdue")) return "Overdue";

  const remaining = num(row?.remainingBalance);
  if (remaining !== null && remaining <= 0 && (num(row?.totalPaid) ?? 0) > 0) return "Completed";

  if (["approved", "disbursed", "active", "ongoing", "overdue"].includes(s)) return "Active";
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Pending";
}

/** Does this request belong under the selected filter chip? */
export function matchesFilter(row, filter) {
  if (!filter || filter === "All") return true;
  const status = displayAdvanceStatus(row);
  if (filter === "Active") return status === "Active" || status === "Overdue";
  return status === filter;
}

/** The advance currently being repaid (most recently submitted active one), or null. */
export function currentAdvance(rows) {
  const active = (rows || []).filter((r) => matchesFilter(r, "Active"));
  if (!active.length) return null;
  const time = (r) => toDate(r.submittedAt || r.date || r.approvedAt)?.getTime() ?? 0;
  return [...active].sort((a, b) => time(b) - time(a))[0];
}

const PILLS = {
  Paid: { label: "Paid", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  Completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  Active: { label: "Active", className: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  Approved: { label: "Approved", className: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  Disbursed: { label: "Disbursed", className: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  Upcoming: { label: "Upcoming", className: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  Partial: { label: "Partial", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  Pending: { label: "Pending", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  Overdue: { label: "Overdue", className: "bg-red-50 text-red-700", dot: "bg-red-500" },
  Rejected: { label: "Rejected", className: "bg-red-50 text-red-700", dot: "bg-red-500" },
  Cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};

/** Styling for a status pill: { label, className, dot }. */
export function statusPill(status) {
  const key = String(status ?? "");
  return (
    PILLS[key] || {
      label: key || "-",
      className: "bg-slate-100 text-slate-600",
      dot: "bg-slate-400",
    }
  );
}

/** Numbers for the KPI cards at the top of the page. */
export function workspaceKpis(rows, summary = {}) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) {
    return {
      totalAdvances: num(summary?.totalAdvances) ?? 0,
      activeAdvances: num(summary?.activeAdvances) ?? 0,
      totalBorrowed: num(summary?.totalBorrowed) ?? 0,
      remainingBalance: num(summary?.remainingBalance) ?? 0,
      completed: num(summary?.completed) ?? 0,
    };
  }

  let activeAdvances = 0;
  let completed = 0;
  let totalBorrowed = 0;
  let remainingBalance = 0;

  for (const row of list) {
    const status = displayAdvanceStatus(row);
    if (status === "Pending" || status === "Rejected" || status === "Cancelled") continue;
    totalBorrowed += num(row.amount) ?? 0;
    if (status === "Completed") {
      completed += 1;
      continue;
    }
    activeAdvances += 1;
    const remaining = num(row.remainingBalance);
    remainingBalance += remaining !== null ? remaining : Math.max(0, (num(row.amount) ?? 0) - (num(row.totalPaid) ?? 0));
  }

  return {
    totalAdvances: list.length,
    activeAdvances,
    totalBorrowed,
    remainingBalance,
    completed,
  };
}
