'use client';

import { formatRwf } from '@/utils/format';

interface BudgetProgressBarProps {
  used: number;
  planned: number;
  showLabels?: boolean;
  size?: 'sm' | 'md';
}

export function BudgetProgressBar({ used, planned, showLabels = true, size = 'md' }: BudgetProgressBarProps) {
  const pct = planned > 0 ? Math.min(100, Math.round((used / planned) * 100)) : 0;
  const remaining = Math.max(0, planned - used);
  const barColor = pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-amber-500' : pct >= 70 ? 'bg-primary' : 'bg-emerald-500';

  return (
    <div className="min-w-[120px]">
      {showLabels ? (
        <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
          <span className="font-semibold text-navy">{pct}% used</span>
          <span className="text-muted">{formatRwf(remaining)} left</span>
        </div>
      ) : null}
      <div className={`overflow-hidden rounded-full bg-slate-100 ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
