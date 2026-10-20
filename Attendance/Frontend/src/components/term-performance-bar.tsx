'use client';

import { Star } from 'lucide-react';

export interface PerformanceStats {
  presentDays: number;
  expectedDays: number;
  rate: number;
  termElapsed: number;
  termTotalDays?: number;
  elapsedWeekdays?: number;
  weekendPresentDays?: number;
}

function rateColor(rate: number) {
  if (rate >= 85) return '#10b981';
  if (rate >= 70) return '#FCB038';
  return '#ef4444';
}

export function WeekendWorkerBadge({ days, iconOnly }: { days?: number; iconOnly?: boolean }) {
  if (!days || days <= 0) return null;
  if (iconOnly) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100" title="Weekend attendance">
        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100" title="Weekend attendance">
      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
    </span>
  );
}

export function TermPerformanceBar({
  performance,
  compact = false,
}: {
  performance?: PerformanceStats | null;
  compact?: boolean;
}) {
  if (!performance) return null;

  const { rate, presentDays, expectedDays, termElapsed, elapsedWeekdays, weekendPresentDays } =
    performance;
  const color = rateColor(rate);

  if (compact) {
    return (
      <div className="mt-1.5 flex items-center gap-2">
        <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-slate-200/70"
            style={{ width: `${Math.min(100, termElapsed)}%` }}
          />
          <div
            className="relative h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, rate)}%`, backgroundColor: color }}
          />
        </div>
        <span className="shrink-0 text-[11px] font-bold tabular-nums" style={{ color }}>
          {rate}%
        </span>
        <WeekendWorkerBadge days={weekendPresentDays} iconOnly />
      </div>
    );
  }

  return (
    <div className="mt-3 max-w-md">
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <span className="text-2xl font-bold tabular-nums leading-none" style={{ color }}>
          {rate}%
        </span>
        <WeekendWorkerBadge days={weekendPresentDays} />
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-slate-200/70"
          style={{ width: `${Math.min(100, termElapsed)}%` }}
        />
        <div
          className="relative h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, rate)}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted tabular-nums">
        {presentDays}/{expectedDays} term weekdays
        {elapsedWeekdays != null && elapsedWeekdays !== expectedDays ? (
          <span> · {elapsedWeekdays} elapsed</span>
        ) : null}
      </p>
    </div>
  );
}
