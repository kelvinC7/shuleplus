'use client';

interface Tile {
  label: string;
  value: string;
  hint: string;
  hintTone?: 'green' | 'muted' | 'amber';
}

export function YoMetricTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 min-[700px]:grid-cols-3">
      {tiles.map((t) => (
        <div key={t.label} className="hr-card rounded-[20px] p-4">
          <p className="text-xs font-semibold text-[var(--yo-muted)]">{t.label}</p>
          <p className="mt-1.5 text-[22px] font-extrabold tracking-[-0.02em] text-[var(--yo-navy)]">{t.value}</p>
          <p
            className={`mt-0.5 text-[11px] font-bold not-italic ${
              t.hintTone === 'green'
                ? 'text-[var(--yo-green)]'
                : t.hintTone === 'amber'
                  ? 'text-[#b26b00]'
                  : 'text-[var(--yo-muted)]'
            }`}
          >
            {t.hint}
          </p>
        </div>
      ))}
    </div>
  );
}
