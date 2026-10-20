'use client';

const VARIANTS: Record<string, { bg: string; dot: string }> = {
  ACTIVE: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  PROBATION: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  SUSPENDED: { bg: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  ON_LEAVE: { bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  TERMINATED: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  PENDING: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  APPROVED: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  REJECTED: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  Expiring: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  Expired: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  Active: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Inactive: { bg: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  Archived: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
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
