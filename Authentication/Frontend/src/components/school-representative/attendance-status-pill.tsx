export function AttendanceStatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone =
    normalized === 'present'
      ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
      : normalized === 'late'
        ? 'bg-amber-100 text-amber-900 ring-amber-200'
        : 'bg-rose-100 text-rose-800 ring-rose-200';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${tone}`}>
      {status}
    </span>
  );
}
