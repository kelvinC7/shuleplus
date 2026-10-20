'use client';

import type { ReactNode } from 'react';
import { TrendingUp } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  hint?: string;
  icon?: ReactNode;
  valueClassName?: string;
  showTrend?: boolean;
  menu?: ReactNode;
}

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon,
  valueClassName = 'text-navy',
  showTrend = false,
  menu,
}: StatCardProps) {
  const subtitle = delta ?? hint;

  return (
    <div className="relative rounded-xl border border-border bg-white px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
          </div>
          <p className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${valueClassName}`}>{value}</p>
          {subtitle ? (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-muted">
              {showTrend ? <TrendingUp size={12} aria-hidden className="shrink-0 text-primary" /> : null}
              {subtitle}
            </p>
          ) : null}
        </div>
        {menu ? <div className="shrink-0 self-start">{menu}</div> : null}
      </div>
    </div>
  );
}

export { AttendanceRateStatCard } from './attendance-stat-card';
export type { AttendancePeriod } from './attendance-stat-card';

export function StatsGrid({
  children,
  className = '',
  columns = 4,
}: {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 5 | 6;
}) {
  const colClass =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 3
        ? 'grid-cols-2 sm:grid-cols-3'
        : columns === 5
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          : columns === 6
            ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'
            : 'grid-cols-2 sm:grid-cols-4';

  return <div className={`grid gap-2 sm:gap-3 ${colClass} ${className}`}>{children}</div>;
}
