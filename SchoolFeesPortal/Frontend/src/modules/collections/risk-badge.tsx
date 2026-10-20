'use client';

const STYLES: Record<string, string> = {
  NORMAL: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  ATTENTION: 'bg-amber-50 text-amber-800 border-amber-200',
  AT_RISK: 'bg-orange-50 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-800 border-red-200',
};

const DOT: Record<string, string> = {
  NORMAL: 'bg-emerald-500',
  ATTENTION: 'bg-amber-500',
  AT_RISK: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
};

const LABEL: Record<string, string> = {
  NORMAL: 'Normal',
  ATTENTION: 'Attention',
  AT_RISK: 'At Risk',
  CRITICAL: 'Critical',
};

export function RiskBadge({ risk }: { risk: string }) {
  const key = risk in STYLES ? risk : 'NORMAL';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STYLES[key]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[key]}`} />
      {LABEL[key]}
    </span>
  );
}

export function PlanStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Completed: 'bg-emerald-50 text-emerald-800',
    Overdue: 'bg-red-50 text-red-800',
    'Due Soon': 'bg-amber-50 text-amber-800',
    'On Track': 'bg-blue-50 text-blue-800',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${map[status] ?? 'bg-slate-100 text-navy'}`}>
      {status}
    </span>
  );
}

const COLLECTION_STATUS: Record<string, { label: string; style: string; dot: string }> = {
  PAID: { label: 'Paid', style: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  PARTIAL: { label: 'Partial', style: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  NOT_PAID: { label: 'Not Paid', style: 'bg-red-50 text-red-800 border-red-200', dot: 'bg-red-500' },
  OVERDUE: { label: 'Overdue', style: 'bg-orange-50 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
};

export function CollectionStatusBadge({ status }: { status: string }) {
  const key = status in COLLECTION_STATUS ? status : 'NOT_PAID';
  const s = COLLECTION_STATUS[key];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${s.style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
