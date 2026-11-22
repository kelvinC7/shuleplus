'use client';

const tone: Record<string, string> = {
  PRESENT: 'text-emerald-700',
  LATE: 'text-amber-700',
  ABSENT: 'text-red-700',
  PENDING: 'text-sky-700',
  EXCUSED: 'text-violet-700',
  ON_TIME: 'text-emerald-700',
  COMPLETE: 'text-slate-600',
  CHECKED_OUT: 'text-slate-600',
  EARLY_DEPARTURE: 'text-violet-700',
  'PENDING CHECKOUT': 'text-sky-700',
  'EARLY OUT': 'text-violet-700',
};

function StatusText({ label }: { label: string }) {
  const key = label.toUpperCase();
  const cls = tone[key] ?? 'text-slate-600';
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {label.replace(/_/g, ' ')}
    </span>
  );
}

export function AttendanceStatusIndicators({
  attendanceStatus,
  punctuality,
  checkoutStatus,
}: {
  attendanceStatus?: string | null;
  punctuality?: string | null;
  checkoutStatus?: string | null;
}) {
  const checkoutLabel =
    checkoutStatus === 'COMPLETE'
      ? 'Checked out'
      : checkoutStatus === 'PENDING'
        ? 'Pending checkout'
        : checkoutStatus === 'EARLY_DEPARTURE'
          ? 'Early out'
          : null;

  return (
    <div className="flex flex-col gap-0.5">
      {attendanceStatus ? <StatusText label={attendanceStatus} /> : null}
      {punctuality && punctuality !== 'UNKNOWN' ? <StatusText label={punctuality} /> : null}
      {checkoutLabel ? <StatusText label={checkoutLabel} /> : null}
    </div>
  );
}
