'use client';

const PALETTE = ['#2563EB', '#FCB038', '#10B981', '#EF4444', '#8B5CF6', '#000435', '#F97316', '#14B8A6'];

interface RouteAppearancePanelProps {
  color: string;
  lineWidth: number;
  lineOpacity: number;
  onChange: (patch: { color?: string; lineWidth?: number; lineOpacity?: number }) => void;
}

export function RouteAppearancePanel({ color, lineWidth, lineOpacity, onChange }: RouteAppearancePanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-white p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-navy">Route appearance</h3>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex shrink-0 cursor-pointer items-center gap-3">
          <span
            className="h-14 w-14 rounded-2xl border-2 border-white shadow-md ring-2 ring-border"
            style={{ backgroundColor: color }}
          />
          <input
            type="color"
            className="sr-only"
            value={color}
            onChange={(e) => onChange({ color: e.target.value })}
            aria-label="Pick route color"
          />
          <span className="text-xs font-semibold text-primary">Tap swatch to pick</span>
        </label>
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-[10px] font-bold uppercase text-muted">Hex color</label>
          <input
            className="input w-full font-mono uppercase"
            value={color}
            onChange={(e) => onChange({ color: e.target.value })}
          />
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onChange({ color: c })}
            className={`h-9 w-9 rounded-xl border-2 transition ${color === c ? 'border-navy scale-110' : 'border-white shadow'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase text-muted">
            Line width · {lineWidth}px
          </span>
          <input
            type="range"
            min={4}
            max={12}
            step={1}
            value={lineWidth}
            onChange={(e) => onChange({ lineWidth: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase text-muted">
            Opacity · {Math.round(lineOpacity * 100)}%
          </span>
          <input
            type="range"
            min={0.4}
            max={1}
            step={0.05}
            value={lineOpacity}
            onChange={(e) => onChange({ lineOpacity: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </label>
      </div>
      <div className="mt-4 rounded-xl bg-slate-100 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase text-muted">Live preview</p>
        <div className="relative h-3 overflow-hidden rounded-full bg-slate-300">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: '85%',
              backgroundColor: color,
              opacity: lineOpacity,
              height: lineWidth,
              top: '50%',
              transform: 'translateY(-50%)',
              boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
            }}
          />
        </div>
      </div>
    </section>
  );
}
