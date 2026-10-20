'use client';

const VARIANTS: Record<string, { bg: string; dot: string }> = {
  draft: { bg: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  Draft: { bg: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  pending_approval: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  PENDING: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  Pending: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  approved: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  APPROVED: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Approved: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  REJECTED: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  Rejected: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  closed: { bg: 'bg-slate-200 text-slate-700', dot: 'bg-slate-500' },
  Closed: { bg: 'bg-slate-200 text-slate-700', dot: 'bg-slate-500' },
  Active: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Warning: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  Critical: { bg: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  Exhausted: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
};

export function StatusBadge({ status }: { status: string }) {
  const variant = VARIANTS[status] ?? { bg: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${variant.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${variant.dot}`} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
