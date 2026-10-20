'use client';

import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CardPeriodFilterTrigger } from '@/components/card-period-filter-trigger';

export interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  hint?: string;
  icon?: ReactNode;
  valueClassName?: string;
  showTrend?: boolean;
  /** Show three-dot menu to open academic year/term filter modal. */
  filterable?: boolean;
}

const NAVY = '#000435';
const GOLD = '#FCB038';

function parseTrend(delta?: string): 'up' | 'down' | 'flat' | null {
  if (!delta) return null;
  const trimmed = delta.trim();
  if (trimmed.startsWith('-')) return 'down';
  if (/^\+?0(\.0+)?%?$/.test(trimmed)) return 'flat';
  if (trimmed.startsWith('+')) return 'up';
  return null;
}

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon,
  valueClassName = 'text-[#000435]',
  showTrend = false,
  filterable = true,
}: StatCardProps) {
  const subtitle = delta ?? hint;
  const trend = parseTrend(delta);

  const trendStyles =
    trend === 'up'
      ? 'bg-emerald-50 text-emerald-600'
      : trend === 'down'
        ? 'bg-rose-50 text-rose-600'
        : 'bg-slate-100 text-slate-500';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="relative flex min-h-[116px] animate-scale-in flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(0,4,53,0.04)] sm:min-h-[124px] sm:p-5">
      {filterable ? (
        <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
          <CardPeriodFilterTrigger />
        </div>
      ) : null}
      <div className="flex items-start gap-3.5">
        <span
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-[3px] ring-primary/15 [&_svg]:h-[19px] [&_svg]:w-[19px]"
          style={{ backgroundColor: NAVY, color: GOLD }}
        >
          {icon ?? <TrendingUp size={19} strokeWidth={1.75} aria-hidden />}
          {/* seal dot */}
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white"
            style={{ backgroundColor: GOLD }}
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#000435]/70">
            {label}
          </p>
          <p
            className={`mt-1 text-2xl font-extrabold tabular-nums tracking-tight sm:text-[1.75rem] sm:leading-none ${valueClassName}`}
          >
            {value}
          </p>
        </div>
      </div>

      {subtitle ? (
        <div className="mt-3 flex items-center gap-1.5">
          {showTrend && trend ? (
            <span className={`inline-flex items-center rounded-full p-1 ${trendStyles}`}>
              <TrendIcon size={11} strokeWidth={2.5} aria-hidden />
            </span>
          ) : null}
          <p className="text-xs font-medium text-[#000435]/50">{subtitle}</p>
        </div>
      ) : null}
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
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : columns === 5
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
          : columns === 6
            ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'
            : 'grid-cols-2 sm:grid-cols-4';

  return <div className={`grid gap-3 sm:gap-4 ${colClass} ${className}`}>{children}</div>;
}