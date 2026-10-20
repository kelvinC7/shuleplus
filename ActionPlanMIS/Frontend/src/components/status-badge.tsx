'use client';

const VARIANTS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-sky-100 text-sky-800',
  ON_HOLD: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  TODO: 'bg-slate-100 text-slate-700',
  REVIEW: 'bg-purple-100 text-purple-800',
  OPEN: 'bg-red-100 text-red-800',
  RESOLVED: 'bg-green-100 text-green-800',
  PENDING: 'bg-amber-100 text-amber-800',
  ACTIVE: 'bg-green-100 text-green-800',
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS_MEETING: 'bg-sky-100 text-sky-800',
  COMPLETED_MEETING: 'bg-emerald-100 text-emerald-800',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = VARIANTS[status] ?? 'bg-slate-100 text-slate-700';
  return (
    <span className={`badge ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
