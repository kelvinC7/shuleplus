import { STATUS_STYLES, type OrgStatus } from '@/lib/organizations';

export function StatusBadge({ status }: { status: OrgStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  const label = status === 'DISABLED' ? 'BLOCKED' : status;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-poppins-semibold uppercase tracking-wide ${style.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}
