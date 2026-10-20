import * as React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

import { cn } from '@/lib/utils';

/** StatCard — light dashboard metric tile for Parent Portal. */

interface StatCardProps {
  label?: string;
  title?: string;
  value: React.ReactNode;
  description?: string;
  hint?: string;
  icon?: React.ReactNode;
  trend?: { value: string; direction: 'up' | 'down' };
  className?: string;
}

export function StatCard({
  label,
  title,
  value,
  description,
  hint,
  icon,
  trend,
  className,
}: StatCardProps) {
  const heading = label ?? title;
  const subtitle = description ?? hint;
  const TrendIcon = trend?.direction === 'down' ? TrendingDown : TrendingUp;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border border-border/60 bg-white p-4 transition-colors hover:border-primary/20 sm:p-4',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{heading}</p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-navy sm:text-xl">{value}</p>
          {subtitle ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              {trend ? <TrendIcon size={12} aria-hidden className="shrink-0 text-primary" /> : null}
              {subtitle}
            </p>
          ) : null}
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-navy [&_svg]:size-[18px]">
          {icon ?? <TrendingUp size={18} strokeWidth={1.75} aria-hidden />}
        </span>
      </div>
    </div>
  );
}

/**
 * KpiCard — HR module's KPI tile: soft-tinted icon chip.
 */

const ACCENTS = {
  amber: { icon: 'bg-amber-500/10 text-amber-600' },
  emerald: { icon: 'bg-emerald-500/10 text-emerald-600' },
  blue: { icon: 'bg-blue-500/10 text-blue-600' },
  violet: { icon: 'bg-violet-500/10 text-violet-600' },
  red: { icon: 'bg-red-500/10 text-red-600' },
  slate: { icon: 'bg-slate-500/10 text-slate-600' },
} as const;

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  accent?: keyof typeof ACCENTS;
  className?: string;
}

export function KpiCard({ label, value, hint, icon, accent = 'amber', className }: KpiCardProps) {
  const tone = ACCENTS[accent];
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-navy">{value}</p>
          {hint ? <p className="mt-1.5 text-xs font-medium text-muted-foreground">{hint}</p> : null}
        </div>
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5', tone.icon)}>
          {icon}
        </span>
      </div>
    </div>
  );
}

export function StatsGrid({
  children,
  className = '',
  columns = 4,
}: {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}) {
  const colClass =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : columns === 5
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          : columns === 6
            ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'
            : 'grid-cols-2 sm:grid-cols-4';

  return <div className={cn('grid gap-3 sm:gap-4', colClass, className)}>{children}</div>;
}
