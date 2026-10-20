import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * StatusBadge — pill with a colored status dot, matching the HR module's
 * StatusBadge. `toneFromStatus` maps loose API values onto the tones.
 */

export type StatusTone =
  | 'active'
  | 'approved'
  | 'completed'
  | 'pending'
  | 'rejected'
  | 'inactive';

const TONE_CLASSES: Record<StatusTone, { pill: string; dot: string }> = {
  active: { pill: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  approved: { pill: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  completed: { pill: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  pending: { pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  rejected: { pill: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  inactive: { pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
};

/** Loose string → tone. Lets tables pass raw API values. */
export function toneFromStatus(value: string): StatusTone {
  const v = value.toLowerCase();
  if (['active', 'enabled', 'live', 'open', 'present'].includes(v)) return 'active';
  if (['approved', 'verified'].includes(v)) return 'approved';
  if (['completed', 'done', 'closed', 'paid'].includes(v)) return 'completed';
  if (['pending', 'draft', 'review', 'in review', 'processing', 'late', 'partial'].includes(v))
    return 'pending';
  if (['rejected', 'failed', 'error', 'suspended', 'overdue', 'absent', 'unpaid', 'cancelled'].includes(v))
    return 'rejected';
  return 'inactive';
}

interface StatusBadgeProps {
  status: string;
  tone?: StatusTone;
  className?: string;
}

export function StatusBadge({ status, tone, className }: StatusBadgeProps) {
  const resolved = tone ?? toneFromStatus(status);
  const { pill, dot } = TONE_CLASSES[resolved];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', pill, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
