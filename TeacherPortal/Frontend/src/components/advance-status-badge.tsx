import type { AdvanceRequestStatus } from '@/types';

const STATUS_MAP: Record<
  AdvanceRequestStatus,
  { label: string; className: string }
> = {
  pending_accountant: {
    label: 'Pending Accountant',
    className: 'bg-amber-100 text-amber-800',
  },
  sent_to_manager: {
    label: 'Sent to Manager',
    className: 'bg-sky-100 text-sky-800',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-800',
  },
  rejected_by_accountant: {
    label: 'Rejected (Finance)',
    className: 'bg-red-100 text-red-800',
  },
  rejected_by_manager: {
    label: 'Rejected (Manager)',
    className: 'bg-red-100 text-red-800',
  },
};

export function AdvanceStatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status as AdvanceRequestStatus] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-700',
  };

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

export function formatRwf(amount: number) {
  return `${amount.toLocaleString('en-RW')} RWF`;
}
