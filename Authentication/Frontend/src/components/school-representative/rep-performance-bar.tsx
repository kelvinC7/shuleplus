'use client';

type RepPerformanceBarProps = {
  label: string;
  value: number;
  tone?: 'attendance' | 'academic' | 'fees';
};

const toneFill: Record<NonNullable<RepPerformanceBarProps['tone']>, string> = {
  attendance: 'bg-emerald-500',
  academic: 'bg-primary',
  fees: 'bg-sky-600',
};

function barColor(value: number, tone: RepPerformanceBarProps['tone']) {
  if (tone) return toneFill[tone];
  if (value >= 85) return 'bg-emerald-500';
  if (value >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function RepPerformanceBar({ label, value, tone }: RepPerformanceBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-muted">{label}</span>
        <span className="font-semibold tabular-nums text-navy">{pct % 1 === 0 ? pct : pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} ${pct}%`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(pct, tone)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
