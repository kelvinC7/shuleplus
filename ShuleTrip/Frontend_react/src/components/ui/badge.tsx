import { cn } from '@/shared/cn';
import { TRIP_STATUS_LABELS, TRIP_STATUS_SUBLABELS } from '@/shared/trip-status';

function statusStyles(status: string): string {
  if (status === 'APPROVED' || status === 'COMPLETED') {
    return 'border-emerald-200/80 bg-emerald-50 text-emerald-900';
  }
  if (status === 'REJECTED' || status === 'CANCELLED') {
    return 'border-red-200/80 bg-red-50 text-red-900';
  }
  if (status === 'DRAFT') {
    return 'border-slate-200 bg-slate-100 text-slate-800';
  }
  if (status === 'CORRECTION_REQUESTED') {
    return 'border-amber-300/80 bg-amber-50 text-amber-950';
  }
  if (status === 'RESUBMITTED') {
    return 'border-violet-300/80 bg-violet-50 text-violet-950';
  }
  if (status === 'AWAITING_ADDITIONAL_APPROVAL') {
    return 'border-indigo-200/80 bg-indigo-50 text-indigo-950';
  }
  if (status === 'TRIP_IN_PROGRESS') {
    return 'border-sky-200/80 bg-sky-50 text-sky-950';
  }
  return 'border-blue-200/80 bg-blue-50 text-blue-950';
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const title = TRIP_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
  const sub = TRIP_STATUS_SUBLABELS[status];

  return (
    <span
      className={cn(
        'inline-flex min-w-[5.5rem] max-w-[10.5rem] flex-col items-center justify-center rounded-lg border px-2.5 py-1.5 text-center shadow-sm',
        statusStyles(status),
        className
      )}
      title={sub ? `${title} — ${sub}` : title}
    >
      <span className="text-[11px] font-bold leading-tight tracking-tight">{title}</span>
      {sub ? <span className="mt-0.5 text-[10px] font-medium leading-tight opacity-90">{sub}</span> : null}
    </span>
  );
}
