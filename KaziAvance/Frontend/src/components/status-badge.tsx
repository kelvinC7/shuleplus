"use client";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  Pending: "bg-amber-100 text-amber-800",
  "Under Review": "bg-sky-100 text-sky-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  Approved: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
  Rejected: "bg-red-100 text-red-700",
  DISBURSED: "bg-blue-100 text-blue-800",
  Disbursed: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-slate-100 text-slate-700",
  Completed: "bg-slate-100 text-slate-700",
  Submitted: "bg-amber-100 text-amber-800",
  Paid: "bg-emerald-100 text-emerald-800",
  Cancelled: "bg-slate-100 text-slate-600",
  ELIGIBLE: "bg-emerald-100 text-emerald-800",
  Eligible: "bg-emerald-100 text-emerald-800",
  BLOCKED: "bg-red-100 text-red-700",
  Blocked: "bg-red-100 text-red-700",
  "Payroll Sync Required": "bg-sky-100 text-sky-800",
  "Salary Missing": "bg-amber-100 text-amber-800",
  "Net Salary Missing": "bg-orange-100 text-orange-800",
  "Advance Outstanding": "bg-violet-100 text-violet-800",
  "Not Eligible": "bg-red-100 text-red-700",
  Disabled: "bg-slate-100 text-slate-600",
  DISABLED: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  Active: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-slate-100 text-slate-600",
  Inactive: "bg-slate-100 text-slate-600",
  NO_ACCOUNT: "bg-amber-100 text-amber-800",
  "No account": "bg-amber-100 text-amber-800",
  Upcoming: "bg-sky-100 text-sky-800",
  Overdue: "bg-red-100 text-red-700",
  Failed: "bg-red-100 text-red-700",
  "Partial Payment": "bg-amber-100 text-amber-800",
  "Payroll Deducted": "bg-emerald-100 text-emerald-800",
  "Manual Payment": "bg-violet-100 text-violet-800",
  "On Track": "bg-emerald-100 text-emerald-800",
};

const DOT_FROM_STYLE = (style: string) => {
  if (style.includes("emerald")) return "bg-emerald-500";
  if (style.includes("amber") || style.includes("orange")) return "bg-amber-500";
  if (style.includes("sky") || style.includes("blue")) return "bg-sky-500";
  if (style.includes("red")) return "bg-red-500";
  if (style.includes("violet")) return "bg-violet-500";
  return "bg-slate-400";
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`badge inline-flex items-center gap-1.5 ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_FROM_STYLE(style)}`} />
      {status}
    </span>
  );
}
