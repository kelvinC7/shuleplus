import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/15 text-primary',
        success: 'border-transparent bg-emerald-100 text-emerald-700',
        danger: 'border-transparent bg-red-100 text-red-700',
        warning: 'border-transparent bg-amber-100 text-amber-700',
        info: 'border-transparent bg-sky-100 text-sky-700',
        muted: 'border-border bg-muted/10 text-muted',
        outline: 'border-border text-muted',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function statusVariant(status: string) {
  const s = status.toUpperCase();
  if (['ACTIVE', 'APPROVED', 'COMPLETED', 'DELIVERED', 'SUCCESS', 'LIVE'].includes(s)) return 'success';
  if (['PENDING', 'PROCESSING', 'ASSIGNED', 'IN_TRANSIT'].includes(s)) return 'warning';
  if (['SUSPENDED', 'REJECTED', 'CANCELLED', 'BLOCKED', 'FAILED'].includes(s)) return 'danger';
  if (['CONFIRMED', 'DISPATCHED'].includes(s)) return 'info';
  return 'muted';
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={statusVariant(status)}>{status.toLowerCase()}</Badge>;
}
