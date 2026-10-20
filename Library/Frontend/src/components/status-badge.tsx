'use client';

import { ReactNode } from 'react';

type StatusMap = Record<string, { bg: string; text: string; dot: string }>;

const defaultStatusColors: StatusMap = {
  AVAILABLE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  BORROWED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  RETURNED: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
  OVERDUE: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  LOST: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  DAMAGED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  RESERVED: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  FULFILLED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
  EXPIRED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  IN_TRANSIT: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  NEW: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  GOOD: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  FAIR: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  WORN: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  MAINTENANCE: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  UNAVAILABLE: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  LIMITED: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
};

interface StatusBadgeProps {
  status: string;
  colors?: StatusMap;
}

export function StatusBadge({ status, colors = defaultStatusColors }: StatusBadgeProps) {
  const c = colors[status] ?? { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
