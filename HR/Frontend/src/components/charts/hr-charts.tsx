'use client';

import { useCallback, useRef, useState, type MouseEvent } from 'react';
import { ChartTooltip } from './chart-tooltip';

const NAVY = '#000435';
const PRIMARY = '#fcb038';
const LAVENDER = '#a78bfa';
const TEAL = '#14b8a6';

const PAD = { top: 16, right: 12, bottom: 32, left: 40 };

interface TooltipState {
  x: number;
  y: number;
  title: string;
  rows: { label: string; value: string | number; color?: string }[];
}

function useChartHover() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const showTooltip = useCallback((clientX: number, clientY: number, data: Omit<TooltipState, 'x' | 'y'>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: clientX - rect.left,
      y: clientY - rect.top,
      ...data,
    });
  }, []);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  return { containerRef, tooltip, showTooltip, hideTooltip };
}

function buildPath(
  values: number[],
  w: number,
  h: number,
  pad = PAD
): string {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const stepX = innerW / Math.max(values.length - 1, 1);

  return values
    .map((v, i) => {
      const x = pad.left + i * stepX;
      const y = pad.top + innerH * (1 - v / max);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function getPointCoords(
  values: number[],
  index: number,
  w: number,
  h: number,
  pad = PAD
) {
  const max = Math.max(...values, 1);
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const stepX = innerW / Math.max(values.length - 1, 1);
  const x = pad.left + index * stepX;
  const y = pad.top + innerH * (1 - values[index] / max);
  return { x, y };
}

interface SeriesPoint {
  label: string;
  value: number;
}

function GridLines({ w, h, max, pad = PAD }: { w: number; h: number; max: number; pad?: typeof PAD }) {
  return (
    <>
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = pad.top + (h - pad.top - pad.bottom) * pct;
        const value = Math.round(max * (1 - pct));
        return (
          <g key={pct}>
            <line
              x1={pad.left}
              y1={y}
              x2={w - pad.right}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.6"
            />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="500">
              {value}
            </text>
          </g>
        );
      })}
    </>
  );
}

interface DualAreaChartProps {
  seriesA: SeriesPoint[];
  seriesB: SeriesPoint[];
  colorA?: string;
  colorB?: string;
  labelA?: string;
  labelB?: string;
  height?: number;
}

export function DualAreaChart({
  seriesA,
  seriesB,
  colorA = PRIMARY,
  colorB = NAVY,
  labelA = 'Active',
  labelB = 'New Hires',
  height = 220,
}: DualAreaChartProps) {
  const w = 520;
  const valuesA = seriesA.map((p) => p.value);
  const valuesB = seriesB.map((p) => p.value);
  const max = Math.max(...valuesA, ...valuesB, 1);
  const pathA = buildPath(valuesA, w, height);
  const pathB = buildPath(valuesB, w, height);
  const areaA = pathA ? `${pathA} L${w - PAD.right},${height - PAD.bottom} L${PAD.left},${height - PAD.bottom} Z` : '';
  const areaB = pathB ? `${pathB} L${w - PAD.right},${height - PAD.bottom} L${PAD.left},${height - PAD.bottom} Z` : '';
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartHover();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleHover = (index: number, e: MouseEvent) => {
    setActiveIndex(index);
    showTooltip(e.clientX, e.clientY, {
      title: seriesA[index]?.label ?? '',
      rows: [
        { label: labelA, value: seriesA[index]?.value ?? 0, color: colorA },
        { label: labelB, value: seriesB[index]?.value ?? 0, color: colorB },
      ],
    });
  };

  const innerW = w - PAD.left - PAD.right;
  const stepX = innerW / Math.max(seriesA.length - 1, 1);

  return (
    <div ref={containerRef} className="relative animate-scale-in" onMouseLeave={() => { hideTooltip(); setActiveIndex(null); }}>
      <div className="mb-4 flex flex-wrap gap-4 text-xs font-bold">
        <span className="flex items-center gap-2 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
          <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ background: colorA }} />
          {labelA}
        </span>
        <span className="flex items-center gap-2 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
          <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ background: colorB }} />
          {labelB}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${height}`} className="h-[220px] w-full select-none overflow-visible">
        <defs>
          <linearGradient id="hrAreaA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorA} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colorA} stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="hrAreaB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorB} stopOpacity="0.15" />
            <stop offset="100%" stopColor={colorB} stopOpacity="0.01" />
          </linearGradient>
          <filter id="glowA" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor={colorA} floodOpacity="0.15" />
          </filter>
          <filter id="glowB" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor={colorB} floodOpacity="0.15" />
          </filter>
        </defs>
        <GridLines w={w} h={height} max={max} />
        {areaB ? <path d={areaB} fill="url(#hrAreaB)" /> : null}
        {areaA ? <path d={areaA} fill="url(#hrAreaA)" /> : null}
        {pathB ? <path d={pathB} fill="none" stroke={colorB} strokeWidth="3" strokeLinecap="round" filter="url(#glowB)" /> : null}
        {pathA ? <path d={pathA} fill="none" stroke={colorA} strokeWidth="3" strokeLinecap="round" filter="url(#glowA)" /> : null}

        {activeIndex !== null && (
          <line
            x1={PAD.left + activeIndex * stepX}
            y1={PAD.top}
            x2={PAD.left + activeIndex * stepX}
            y2={height - PAD.bottom}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        )}

        {seriesA.map((_, i) => {
          const ptA = getPointCoords(valuesA, i, w, height);
          const ptB = getPointCoords(valuesB, i, w, height);
          const active = activeIndex === i;
          return (
            <g key={i}>
              {active && (
                <>
                  <circle cx={ptA.x} cy={ptA.y} r="7" fill={colorA} fillOpacity="0.3" />
                  <circle cx={ptA.x} cy={ptA.y} r="4" fill={colorA} stroke="white" strokeWidth="2.5" />
                  <circle cx={ptB.x} cy={ptB.y} r="7" fill={colorB} fillOpacity="0.3" />
                  <circle cx={ptB.x} cy={ptB.y} r="4" fill={colorB} stroke="white" strokeWidth="2.5" />
                </>
              )}
              <rect
                x={PAD.left + i * stepX - stepX / 2}
                y={PAD.top}
                width={stepX}
                height={height - PAD.top - PAD.bottom}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={(e) => handleHover(i, e)}
                onMouseMove={(e) => handleHover(i, e)}
              />
            </g>
          );
        })}

        {seriesA.map((p, i) => (
          <text
            key={p.label}
            x={PAD.left + i * stepX}
            y={height - 10}
            textAnchor="middle"
            fontSize="9"
            fill={activeIndex === i ? '#000435' : '#94a3b8'}
            fontWeight={activeIndex === i ? '700' : '500'}
          >
            {p.label}
          </text>
        ))}
      </svg>
      {tooltip ? (
        <ChartTooltip x={tooltip.x} y={tooltip.y} title={tooltip.title} rows={tooltip.rows} visible />
      ) : null}
    </div>
  );
}

interface SingleAreaChartProps {
  data: SeriesPoint[];
  color?: string;
  label?: string;
  height?: number;
}

export function SingleAreaChart({
  data,
  color = LAVENDER,
  label = 'Total',
  height = 220,
}: SingleAreaChartProps) {
  const w = 520;
  const values = data.map((p) => p.value);
  const max = Math.max(...values, 1);
  const path = buildPath(values, w, height);
  const area = path ? `${path} L${w - PAD.right},${height - PAD.bottom} L${PAD.left},${height - PAD.bottom} Z` : '';
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartHover();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const innerW = w - PAD.left - PAD.right;
  const stepX = innerW / Math.max(data.length - 1, 1);

  return (
    <div ref={containerRef} className="relative animate-scale-in" onMouseLeave={() => { hideTooltip(); setActiveIndex(null); }}>
      <svg viewBox={`0 0 ${w} ${height}`} className="h-[220px] w-full select-none overflow-visible">
        <defs>
          <linearGradient id="hrSingleArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
          <filter id="glowSingle" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor={color} floodOpacity="0.15" />
          </filter>
        </defs>
        <GridLines w={w} h={height} max={max} />
        {area ? <path d={area} fill="url(#hrSingleArea)" /> : null}
        {path ? <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" filter="url(#glowSingle)" /> : null}

        {activeIndex !== null && (
          <line
            x1={PAD.left + activeIndex * stepX}
            y1={PAD.top}
            x2={PAD.left + activeIndex * stepX}
            y2={height - PAD.bottom}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        )}

        {data.map((p, i) => {
          const pt = getPointCoords(values, i, w, height);
          const active = activeIndex === i;
          return (
            <g key={p.label}>
              {active && (
                <>
                  <circle cx={pt.x} cy={pt.y} r="7" fill={color} fillOpacity="0.3" />
                  <circle cx={pt.x} cy={pt.y} r="4" fill={color} stroke="white" strokeWidth="2.5" />
                </>
              )}
              <rect
                x={PAD.left + i * stepX - stepX / 2}
                y={PAD.top}
                width={stepX}
                height={height - PAD.top - PAD.bottom}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={(e) => {
                  setActiveIndex(i);
                  showTooltip(e.clientX, e.clientY, {
                    title: p.label,
                    rows: [{ label, value: p.value, color }],
                  });
                }}
                onMouseMove={(e) => {
                  setActiveIndex(i);
                  showTooltip(e.clientX, e.clientY, {
                    title: p.label,
                    rows: [{ label, value: p.value, color }],
                  });
                }}
              />
            </g>
          );
        })}

        {data.map((p, i) => (
          <text
            key={p.label}
            x={PAD.left + i * stepX}
            y={height - 10}
            textAnchor="middle"
            fontSize="9"
            fill={activeIndex === i ? '#000435' : '#94a3b8'}
            fontWeight={activeIndex === i ? '700' : '500'}
          >
            {p.label}
          </text>
        ))}
      </svg>
      {tooltip ? (
        <ChartTooltip x={tooltip.x} y={tooltip.y} title={tooltip.title} rows={tooltip.rows} visible />
      ) : null}
    </div>
  );
}

interface GroupedBarChartProps {
  groups: { label: string; budget: number; actual: number }[];
  colorA?: string;
  colorB?: string;
  labelA?: string;
  labelB?: string;
  height?: number;
}

export function GroupedBarChart({
  groups,
  colorA = LAVENDER,
  colorB = NAVY,
  labelA = 'Budget',
  labelB = 'Actual',
  height = 220,
}: GroupedBarChartProps) {
  const w = 520;
  const max = Math.max(...groups.flatMap((g) => [g.budget, g.actual]), 1);
  const gap = 20;
  const groupW = (w - gap * (groups.length + 1)) / groups.length;
  const barW = (groupW - 8) / 2;
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartHover();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div ref={containerRef} className="relative animate-scale-in" onMouseLeave={() => { hideTooltip(); setActiveIndex(null); }}>
      <div className="mb-4 flex flex-wrap gap-4 text-xs font-bold">
        <span className="flex items-center gap-2 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
          <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ background: colorA }} />
          {labelA}
        </span>
        <span className="flex items-center gap-2 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
          <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ background: colorB }} />
          {labelB}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${height}`} className="h-[220px] w-full select-none overflow-visible">
        <GridLines w={w} h={height} max={max} />
        {groups.map((g, i) => {
          const x0 = gap + i * (groupW + gap);
          const barH1 = ((height - PAD.top - PAD.bottom) * g.budget) / max;
          const barH2 = ((height - PAD.top - PAD.bottom) * g.actual) / max;
          const active = activeIndex === i;
          return (
            <g key={g.label}>
              <rect
                x={x0}
                y={height - PAD.bottom - barH1}
                width={barW}
                height={barH1}
                rx="4"
                fill={colorA}
                opacity={active || activeIndex === null ? 1 : 0.35}
                style={{ transition: 'opacity 0.2s, y 0.3s, height 0.3s' }}
              />
              <rect
                x={x0 + barW + 4}
                y={height - PAD.bottom - barH2}
                width={barW}
                height={barH2}
                rx="4"
                fill={colorB}
                opacity={active || activeIndex === null ? 1 : 0.35}
                style={{ transition: 'opacity 0.2s, y 0.3s, height 0.3s' }}
              />
              <rect
                x={x0 - 4}
                y={PAD.top}
                width={groupW + 8}
                height={height - PAD.top - PAD.bottom}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  setActiveIndex(i);
                  showTooltip(e.clientX, e.clientY, {
                    title: g.label,
                    rows: [
                      { label: labelA, value: g.budget, color: colorA },
                      { label: labelB, value: g.actual, color: colorB },
                    ],
                  });
                }}
                onMouseMove={(e) => {
                  setActiveIndex(i);
                  showTooltip(e.clientX, e.clientY, {
                    title: g.label,
                    rows: [
                      { label: labelA, value: g.budget, color: colorA },
                      { label: labelB, value: g.actual, color: colorB },
                    ],
                  });
                }}
              />
            </g>
          );
        })}
        {groups.map((g, i) => {
          const x0 = gap + i * (groupW + gap) + groupW / 2;
          return (
            <text
              key={g.label}
              x={x0}
              y={height - 10}
              textAnchor="middle"
              fontSize="9"
              fill={activeIndex === i ? '#000435' : '#94a3b8'}
              fontWeight={activeIndex === i ? '700' : '500'}
            >
              {g.label}
            </text>
          );
        })}
      </svg>
      {tooltip ? (
        <ChartTooltip x={tooltip.x} y={tooltip.y} title={tooltip.title} rows={tooltip.rows} visible />
      ) : null}
    </div>
  );
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  segments,
  centerLabel,
  size = 180,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = size / 2 - 18;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center animate-scale-in">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="16" />
            {segments.map((seg) => {
              const fraction = seg.value / total;
              const dash = fraction * circumference;
              const isHovered = hovered === seg.label;
              const circle = (
                <circle
                  key={seg.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={isHovered ? 22 : 16}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  style={{ transition: 'stroke-width 0.2s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.2s', cursor: 'pointer' }}
                  onMouseEnter={() => setHovered(seg.label)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
              offset += dash;
              return circle;
            })}
          </g>
          <text x="50%" y="44%" textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="600" fill="#94a3b8" className="uppercase tracking-wider">
            Total
          </text>
          <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="800" fill={NAVY}>
            {centerLabel}
          </text>
        </svg>
        {hovered && (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full rounded-2xl border border-slate-700/30 bg-slate-950/90 px-3 py-2 text-xs font-bold text-white backdrop-blur-md shadow-xl animate-scale-in">
            {(() => {
              const seg = segments.find((s) => s.label === hovered);
              if (!seg) return null;
              const pct = ((seg.value / total) * 100).toFixed(1);
              return (
                <p className="tracking-wide">
                  {seg.label}: {seg.value} ({pct}%)
                </p>
              );
            })()}
          </div>
        )}
      </div>
      <div className="w-full flex-1 space-y-2">
        {segments.map((seg) => {
          const pct = ((seg.value / total) * 100).toFixed(1);
          const isHovered = hovered === seg.label;
          return (
            <div
              key={seg.label}
              className={`flex items-center justify-between gap-4 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer border ${
                isHovered 
                  ? 'bg-slate-50 border-slate-200 shadow-sm scale-[1.02]' 
                  : 'bg-transparent border-transparent hover:bg-slate-50/50'
              }`}
              onMouseEnter={() => setHovered(seg.label)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: seg.color }} />
                <span className="truncate text-navy font-bold">{seg.label}</span>
              </span>
              <span className="shrink-0 text-slate-400 font-bold">
                {pct}% · {seg.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  
  );
}

export { NAVY, PRIMARY, LAVENDER, TEAL };
