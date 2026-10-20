import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * StatusBadge — consistent status coloring across every module.
 *
 *   Active → green   Approved → emerald   Completed → blue
 *   Pending → orange Rejected → red       Inactive → gray
 */

export type StatusTone =
  | 'active'
  | 'approved'
  | 'completed'
  | 'pending'
  | 'rejected'
  | 'inactive';

const TONE_CLASSES: Record<StatusTone, string> = {
  active: 'bg-success/12 text-success ring-success/20',
  approved: 'bg-emerald-500/12 text-emerald-600 ring-emerald-500/20',
  completed: 'bg-info/12 text-info ring-info/20',
  pending: 'bg-warning/15 text-warning-foreground/80 ring-warning/30',
  rejected: 'bg-destructive/12 text-destructive ring-destructive/20',
  inactive: 'bg-muted text-muted-foreground ring-border',
};

/** Loose string → tone. Lets tables pass raw API values. */
export function toneFromStatus(value: string): StatusTone {
  const v = value.toLowerCase();
  if (['active', 'enabled', 'live', 'open'].includes(v)) return 'active';
  if (['approved', 'verified'].includes(v)) return 'approved';
  if (['completed', 'done', 'closed', 'paid'].includes(v)) return 'completed';
  if (['pending', 'draft', 'review', 'in review', 'processing'].includes(v)) return 'pending';
  if (['rejected', 'failed', 'error', 'suspended', 'overdue'].includes(v)) return 'rejected';
  return 'inactive';
}

interface StatusBadgeProps {
  status: string;
  tone?: StatusTone;
  className?: string;
}

export function StatusBadge({ status, tone, className }: StatusBadgeProps) {
  const resolved = tone ?? toneFromStatus(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        TONE_CLASSES[resolved],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
