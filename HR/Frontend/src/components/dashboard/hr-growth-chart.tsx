'use client';

import { useState } from 'react';

interface GrowthPoint {
  month: string;
  hires: number;
}

interface HrGrowthChartProps {
  data: GrowthPoint[];
}

const W = 640;
const H = 200;
const PAD_X = 12;
const PAD_TOP = 24;
const PAD_BOTTOM = 24;

export function HrGrowthChart({ data }: HrGrowthChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const totalHires = data.reduce((sum, g) => sum + g.hires, 0);

  if (data.length === 0) {
    return (
      <div className="flex h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-gradient-to-b from-muted/30 to-transparent text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 3v18h18" />
            <path d="M7 16l4-6 4 3 5-7" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">No hiring data yet</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Staff growth will appear here as employees are registered.
        </p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.hires), 1);
  const niceMax = Math.ceil(max / 10) * 10 || 10;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const step = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const pts = data.map((d, i) => {
    const x = PAD_X + i * step;
    const y = PAD_TOP + innerH - (d.hires / niceMax) * innerH;
    return { x, y, ...d };
  });

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${PAD_TOP + innerH} L${pts[0].x.toFixed(1)},${PAD_TOP + innerH} Z`;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      <div className="relative w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 200 }}>
          <defs>
            <linearGradient id="growthArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FCB038" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#FCB038" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridLines.map((g) => {
            const y = PAD_TOP + innerH * g;
            return (
              <line key={g} x1={PAD_X} y1={y} x2={W - PAD_X} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
            );
          })}

          <path d={area} fill="url(#growthArea)" />
          <path d={line} fill="none" stroke="#FCB038" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {pts.map((p, i) => (
            <g key={p.month}>
              <rect
                x={p.x - step / 2}
                y={0}
                width={step}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={hover === i ? 5 : 3}
                fill="#fff"
                stroke="#FCB038"
                strokeWidth="2.5"
                className="transition-all"
              />
              {hover === i && (
                <g>
                  <rect x={p.x - 16} y={p.y - 26} width="32" height="18" rx="5" fill="#000435" />
                  <text x={p.x} y={p.y - 13} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">
                    {p.hires}
                  </text>
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-1 flex justify-between px-1">
        {data.map((d) => (
          <span key={d.month} className="text-[10px] font-medium text-muted-foreground">
            {d.month}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{totalHires}</span> total hires over {data.length} months
      </p>
    </div>
  );
}
