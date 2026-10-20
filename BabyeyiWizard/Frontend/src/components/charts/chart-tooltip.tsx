'use client';

interface ChartTooltipProps {
  x: number;
  y: number;
  title: string;
  rows: { label: string; value: string | number; color?: string }[];
  visible: boolean;
}

export function ChartTooltip({ x, y, title, rows, visible }: ChartTooltipProps) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute z-20 min-w-[140px] rounded-2xl border border-slate-700/30 bg-slate-950/90 px-4 py-3 text-white backdrop-blur-md shadow-xl transition-all duration-150 ease-out animate-scale-in"
      style={{ left: x, top: y, transform: 'translate(-50%, calc(-100% - 12px))' }}
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-6 text-[11px]">
            <span className="flex items-center gap-2 text-slate-300">
              {row.color ? (
                <span className="h-2 w-2 rounded-full ring-2 ring-white/10" style={{ background: row.color }} />
              ) : null}
              {row.label}
            </span>
            <span className="font-bold text-white">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

