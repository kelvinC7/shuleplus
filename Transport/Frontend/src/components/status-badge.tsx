'use client';

const VARIANTS: Record<string, { bg: string; dot: string }> = {
  ACTIVE: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  PRESENT: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  ONLINE: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  APPROVED: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  SENT: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  COMPLETED: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  ENTRY: { bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  EXIT: { bg: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  EXITED: { bg: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  LATE: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  PENDING: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  QUEUED: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  TEMPORARY: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  ABSENT: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  BLOCKED: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  LOST: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  REJECTED: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  FAILED: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  CRITICAL: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  HIGH: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  OFFLINE: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  INACTIVE: { bg: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  DISABLED: { bg: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  MEDIUM: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  LOW: { bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  INFO: { bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  ON_BUS: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  AT_SCHOOL: { bg: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  EXPECTED: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  MISSING: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  RETURNED_HOME: { bg: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
  WRONG_BUS: { bg: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  SUSPENDED: { bg: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  LIVE: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  BOARDING: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  SCHEDULED: { bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  MAINTENANCE: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  BOARDED: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  MANUAL: { bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  CHANGED_BUS: { bg: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
  OPEN: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  PAID: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  PARTIAL: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  OVERDUE: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  DAMAGED: { bg: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  TO_SCHOOL: { bg: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  TO_HOME: { bg: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
};

export function StatusBadge({ status }: { status: string }) {
  const key = status?.toUpperCase?.() ?? status;
  const variant = VARIANTS[key] ?? VARIANTS[status] ?? { bg: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${variant.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${variant.dot}`} />
      {String(status).replace(/_/g, ' ')}
    </span>
  );
}
