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

const NAVY = '#000435';
const GOLD = '#FCB038';

function valueSizeClass(value: string | number): string {
  const text = String(value);
  if (text.length > 16) return 'text-base sm:text-lg';
  if (text.length > 12) return 'text-lg sm:text-xl';
  return 'text-xl sm:text-2xl';
}

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon,
  valueClassName = 'text-[#000435]',
  showTrend = false,
  menu,
}: StatCardProps) {
  const subtitle = delta ?? hint;
  const valueText = String(value);

  return (
    <div className="stat-card relative flex min-h-[112px] animate-scale-in flex-col rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(0,4,53,0.04),0_8px_20px_-12px_rgba(0,4,53,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_8px_24px_-10px_rgba(0,4,53,0.12)] sm:min-h-[120px] sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:text-[#FCB038]"
          style={{ backgroundColor: NAVY, color: GOLD }}
        >
          {icon ?? <TrendingUp size={18} strokeWidth={1.6} aria-hidden />}
        </span>
        {menu ? <div className="shrink-0">{menu}</div> : null}
      </div>

      <div className="mt-3 min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted">{label}</p>
        <p
          className={`mt-1 font-semibold leading-tight tracking-tight tabular-nums ${valueSizeClass(value)} ${valueClassName}`}
          title={valueText}
        >
          {value}
        </p>
        {subtitle ? (
          <p
            className="mt-1.5 line-clamp-2 text-xs font-normal text-muted"
            title={subtitle}
          >
            {showTrend ? (
              <TrendingUp size={12} aria-hidden className="mr-1 inline shrink-0 text-[#FCB038]" />
            ) : null}
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

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
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : columns === 5
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          : columns === 6
            ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'
            : 'grid-cols-2 lg:grid-cols-4';

  return <div className={`grid gap-3 sm:gap-4 ${colClass} ${className}`}>{children}</div>;
}
