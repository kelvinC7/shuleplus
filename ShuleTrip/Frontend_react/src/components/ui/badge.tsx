import { cn } from '@/shared/cn';
import { TRIP_STATUS_LABELS, TRIP_STATUS_SUBLABELS } from '@/shared/trip-status';

function statusStyles(status: string): string {
  if (status === 'APPROVED' || status === 'COMPLETED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  if (status === 'REJECTED' || status === 'CANCELLED') {
    return 'border-red-200 bg-red-50 text-red-800';
  }
  if (status === 'DRAFT') {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }
  if (status === 'CORRECTION_REQUESTED') {
    return 'border-amber-300 bg-amber-50 text-amber-900';
  }
  if (status === 'RESUBMITTED') {
    return 'border-violet-200 bg-violet-50 text-violet-800';
  }
  if (status === 'AWAITING_ADDITIONAL_APPROVAL') {
    return 'border-indigo-200 bg-indigo-50 text-indigo-800';
  }
  if (status === 'TRIP_IN_PROGRESS') {
    return 'border-sky-200 bg-sky-50 text-sky-800';
  }
  return 'border-blue-200 bg-blue-50 text-blue-800';
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const title = TRIP_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
  const sub = TRIP_STATUS_SUBLABELS[status];

  return (
    <span
      className={cn(
        'inline-flex max-w-[13rem] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none shadow-sm',
        statusStyles(status),
        className
      )}
      title={sub ? `${title} — ${sub}` : title}
    >
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
      <span className="truncate">{title}</span>
      {sub ? <span className="truncate font-semibold opacity-70">· {sub}</span> : null}
    </span>
  );
}
