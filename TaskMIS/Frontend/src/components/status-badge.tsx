'use client';

const VARIANTS: Record<string, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  REVIEW: 'bg-amber-100 text-amber-800',
  DONE: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  NOT_REQUIRED: 'bg-slate-100 text-slate-600',
  RETURNED: 'bg-purple-100 text-purple-800',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = VARIANTS[status] ?? 'bg-slate-100 text-slate-700';
  return (
    <span className={`badge ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
