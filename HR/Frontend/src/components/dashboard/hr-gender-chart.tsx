'use client';

interface HrGenderChartProps {
  male: number;
  female: number;
  other?: number;
  total: number;
}

export function HrGenderChart({ male, female, other = 0, total }: HrGenderChartProps) {
  const safeTotal = Math.max(total, 1);
  const malePct = (male / safeTotal) * 100;
  const femalePct = (female / safeTotal) * 100;
  const otherPct = (other / safeTotal) * 100;

  const circumference = 2 * Math.PI * 42;
  const maleLen = (malePct / 100) * circumference;
  const femaleLen = (femalePct / 100) * circumference;
  const otherLen = (otherPct / 100) * circumference;

  const isBalanced = total > 0 && Math.abs(malePct - femalePct) <= 15;

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#eef1f6" strokeWidth="11" />
            {male > 0 && (
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="#FCB038" strokeWidth="11"
                strokeDasharray={`${maleLen} ${circumference}`}
                strokeDashoffset={0}
                strokeLinecap="round"
              />
            )}
            {female > 0 && (
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="#000435" strokeWidth="11"
                strokeDasharray={`${femaleLen} ${circumference}`}
                strokeDashoffset={-maleLen}
                strokeLinecap="round"
              />
            )}
            {other > 0 && (
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="#94a3b8" strokeWidth="11"
                strokeDasharray={`${otherLen} ${circumference}`}
                strokeDashoffset={-(maleLen + femaleLen)}
                strokeLinecap="round"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-navy">{total}</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total</span>
          </div>
        </div>

        <div className="w-full space-y-3">
          {[
            { label: 'Male', value: male, pct: malePct, color: 'bg-[#FCB038]' },
            { label: 'Female', value: female, pct: femalePct, color: 'bg-navy' },
            ...(other > 0 ? [{ label: 'Other', value: other, pct: otherPct, color: 'bg-slate-400' }] : []),
          ].map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <span className={`h-2.5 w-2.5 rounded-full ${row.color}`} />
                  {row.label}
                </span>
                <span className="text-muted-foreground">
                  {row.value} <span className="text-xs">({row.pct.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {total > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {isBalanced ? 'Balanced workforce' : 'Gender ratio needs attention'}
        </div>
      )}
    </div>
  );
}
