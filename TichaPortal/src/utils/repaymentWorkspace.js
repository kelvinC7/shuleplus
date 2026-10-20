import { addPaymentInterval, formatFrw, formatPlanDate } from "./avanceRepayment";

export const FILTERS = [
  "All",
  "Active",
  "Pending",
  "Approved",
  "Rejected",
  "Completed",
  "Overdue",
  "Cancelled",
];

const STATUS_PILL = {
  Active: { label: "Active", className: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
  Pending: { label: "Pending", className: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  "Under Review": { label: "Under Review", className: "bg-sky-50 text-sky-800", dot: "bg-sky-500" },
  Approved: { label: "Approved", className: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
  Rejected: { label: "Rejected", className: "bg-red-50 text-red-700", dot: "bg-red-500" },
  Completed: { label: "Completed", className: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  Overdue: { label: "Overdue", className: "bg-red-50 text-red-700", dot: "bg-red-500" },
  Cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  Disbursed: { label: "Active", className: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
  Paid: { label: "Paid", className: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
  Upcoming: { label: "Upcoming", className: "bg-amber-50 text-amber-800", dot: "bg-amber-400" },
};

export function money(n) {
  return formatFrw(Number(n) || 0);
}

export function statusPill(status) {
  return STATUS_PILL[status] || { label: status || "-", className: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
}

export function displayAdvanceStatus(row) {
  if (row?.overdue && ["Approved", "Disbursed"].includes(row.status)) return "Overdue";
  if (row?.status === "Disbursed") return "Active";
  if (row?.status === "Submitted") return "Pending";
  return row?.status || "Pending";
}

export function matchesFilter(row, filter) {
  if (!filter || filter === "All") return true;
  const status = displayAdvanceStatus(row);
  if (filter === "Pending") return status === "Pending" || status === "Under Review";
  if (filter === "Active") return status === "Active" || row.status === "Disbursed";
  if (filter === "Overdue") return status === "Overdue" || Boolean(row.overdue);
  return status === filter;
}

export function parseFrequency(row) {
  if (row?.frequency) return row.frequency;
  const match = /Frequency:\s*(Daily|Weekly|Monthly)/i.exec(row?.description || "");
  if (!match) return "Monthly";
  const v = match[1].toLowerCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function frequencyKey(label) {
  const v = String(label || "Monthly").toLowerCase();
  if (v.startsWith("day")) return "daily";
  if (v.startsWith("week")) return "weekly";
  return "monthly";
}

export function buildSchedule(row) {
  const amount = Number(row?.amount) || 0;
  const months = Math.max(1, Number(row?.months) || 1);
  const existing = Array.isArray(row?.repayments) ? [...row.repayments] : [];
  existing.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));

  let items = existing;
  if (!items.length && amount > 0) {
    const freq = frequencyKey(parseFrequency(row));
    const per = Number(row?.monthlyDeduction) || Math.round(amount / months);
    const startSrc = row?.startDate || row?.disbursedAt || row?.approvedAt || row?.submittedAt;
    const start = startSrc ? new Date(startSrc) : new Date();
    items = Array.from({ length: months }, (_, i) => {
      const due = addPaymentInterval(start, freq, i + 1);
      return {
        id: `${row.id}-syn-${i + 1}`,
        installmentNumber: i + 1,
        amount: i === months - 1 ? amount - per * (months - 1) : per,
        paidAmount: 0,
        dueDate: due.toISOString(),
        paidAt: null,
        status: due.getTime() < Date.now() ? "Overdue" : "Upcoming",
        method: "Payroll",
        reference: `PAY-${String(i + 1).padStart(4, "0")}`,
      };
    });
  }

  let remaining = amount;
  return items.map((r, i) => {
    const due = r.dueDate || r.date;
    const isPaid = r.status === "Paid" || Boolean(r.paidAt) || Number(r.paidAmount) >= Number(r.amount);
    const paidAmt = isPaid ? Number(r.paidAmount || r.amount) || 0 : 0;
    remaining = Math.max(0, remaining - paidAmt);
    let status = r.status;
    if (isPaid) status = "Paid";
    else if (new Date(due).getTime() < Date.now()) status = "Overdue";
    else status = "Upcoming";
    return {
      id: r.id || `${row.id}-${i + 1}`,
      n: r.installmentNumber || i + 1,
      dueDate: due,
      amount: Number(r.amount) || 0,
      paid: paidAmt,
      balance: isPaid ? remaining : 0,
      remainingAfter: remaining,
      status,
      method: r.method || "Payroll",
      reference: r.reference || `PAY-${String(r.installmentNumber || i + 1).padStart(4, "0")}`,
      paidAt: r.paidAt || (isPaid ? due : null),
    };
  });
}

export function paymentHistory(schedule) {
  return schedule
    .filter((r) => r.status === "Paid")
    .map((r) => ({
      id: `PAY-${String(r.n).padStart(3, "0")}`,
      date: r.paidAt || r.dueDate,
      amount: r.paid || r.amount,
      method: r.method,
      reference: r.reference,
      installment: r,
    }));
}

export function nextPayment(schedule) {
  return schedule.find((r) => r.status !== "Paid") || null;
}

export function daysFromToday(date) {
  if (!date) return 0;
  const a = new Date(date);
  a.setHours(0, 0, 0, 0);
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function currentAdvance(rows) {
  return (
    rows.find((r) => displayAdvanceStatus(r) === "Active" || displayAdvanceStatus(r) === "Overdue") ||
    rows.find((r) => r.status === "Approved") ||
    null
  );
}

export function workspaceKpis(rows, summary = {}) {
  const completed = rows.filter((r) => displayAdvanceStatus(r) === "Completed").length;
  const active = rows.filter((r) => {
    const s = displayAdvanceStatus(r);
    return s === "Active" || s === "Overdue" || r.status === "Approved" || r.status === "Disbursed";
  }).length;
  const borrowed = rows
    .filter((r) => ["Approved", "Disbursed", "Completed"].includes(r.status))
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const remaining = rows
    .filter((r) => ["Approved", "Disbursed"].includes(r.status))
    .reduce((s, r) => s + (Number(r.remainingBalance) || 0), 0);
  return {
    totalAdvances: summary.totalAdvances ?? rows.length,
    activeAdvances: summary.activeAdvances ?? active,
    totalBorrowed: summary.totalReceived ?? borrowed,
    remainingBalance: summary.outstanding ?? remaining,
    completed: summary.completed ?? completed,
  };
}

export { formatPlanDate };
