'use client';

interface TrendPoint {
  day: string;
  boarded: number;
}

interface FleetBreakdown {
  active: number;
  maintenance: number;
  inactive: number;
  other: number;
}

export function BoardingTrendChart({ data }: { data: TrendPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.boarded));

  return (
    <div className="flex h-44 items-end justify-between gap-2 pt-4">
      {data.map((d) => {
        const h = Math.round((d.boarded / max) * 100);
        return (
          <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-[10px] font-bold text-navy">{d.boarded}</span>
            <div className="flex w-full max-w-[40px] flex-1 items-end">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-navy to-primary/90 transition-all"
                style={{ height: `${Math.max(h, d.boarded > 0 ? 8 : 2)}%` }}
                title={`${d.boarded} scans`}
              />
            </div>
            <span className="text-[10px] font-semibold uppercase text-muted">{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

export function FleetDonutChart({ data }: { data: FleetBreakdown }) {
  const total = data.active + data.maintenance + data.inactive + data.other || 1;
  const segments = [
    { label: 'Active', value: data.active, color: '#10b981' },
    { label: 'Maintenance', value: data.maintenance, color: '#FCB038' },
    { label: 'Inactive', value: data.inactive, color: '#94a3b8' },
    { label: 'Other', value: data.other, color: '#64748b' },
  ].filter((s) => s.value > 0);

  let offset = 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
      <div className="relative h-[120px] w-[120px] shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
          {segments.map((seg) => {
            const len = (seg.value / total) * circumference;
            const dash = `${len} ${circumference - len}`;
            const el = (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="12"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-navy">{total}</span>
          <span className="text-[9px] font-bold uppercase text-muted">Buses</span>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-1">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-muted">{s.label}</span>
            <span className="ml-auto font-bold text-navy">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
