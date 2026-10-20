'use client';

const TONES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  PARTIALLY_PAID: 'bg-sky-50 text-sky-700',
  OVERDUE: 'bg-rose-50 text-rose-700',
  FAILED: 'bg-rose-50 text-rose-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
  DRAFT: 'bg-slate-100 text-slate-600',
  ARCHIVED: 'bg-slate-100 text-slate-600',
  REFUNDED: 'bg-violet-50 text-violet-700',
  REVERSED: 'bg-violet-50 text-violet-700',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = TONES[status] ?? 'bg-slate-100 text-slate-600';
  const label = status.replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
