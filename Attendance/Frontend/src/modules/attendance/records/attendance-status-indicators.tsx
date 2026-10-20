'use client';

const tone: Record<string, string> = {
  PRESENT: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  LATE: 'bg-amber-50 text-amber-800 ring-amber-200',
  ABSENT: 'bg-red-50 text-red-800 ring-red-200',
  PENDING: 'bg-sky-50 text-sky-800 ring-sky-200',
  EXCUSED: 'bg-violet-50 text-violet-800 ring-violet-200',
  ON_TIME: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  COMPLETE: 'bg-slate-100 text-slate-700 ring-slate-200',
  CHECKED_OUT: 'bg-slate-100 text-slate-700 ring-slate-200',
  EARLY_DEPARTURE: 'bg-violet-50 text-violet-800 ring-violet-200',
};

function Pill({ label }: { label: string }) {
  const key = label.toUpperCase().replace(/\s/g, '_');
  const cls = tone[key] ?? 'bg-slate-100 text-slate-700 ring-slate-200';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${cls}`}>
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
      ? 'CHECKED OUT'
      : checkoutStatus === 'PENDING'
        ? 'PENDING CHECKOUT'
        : checkoutStatus === 'EARLY_DEPARTURE'
          ? 'EARLY OUT'
          : null;

  return (
    <div className="flex flex-wrap gap-1">
      {attendanceStatus ? <Pill label={attendanceStatus} /> : null}
      {punctuality && punctuality !== 'UNKNOWN' ? <Pill label={punctuality} /> : null}
      {checkoutLabel ? <Pill label={checkoutLabel} /> : null}
    </div>
  );
}
