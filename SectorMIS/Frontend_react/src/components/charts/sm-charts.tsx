import { useCallback, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

export const NAVY = '#000435';
export const PRIMARY = '#fcb038';
export const LAVENDER = '#a78bfa';
export const TEAL = '#14b8a6';

const PAD = { top: 16, right: 12, bottom: 32, left: 40 };

interface TooltipState {
  x: number;
  y: number;
  title: string;
  rows: { label: string; value: string | number; color?: string }[];
}

function ChartTooltip({ x, y, title, rows }: TooltipState) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -110%)',
        borderRadius: 2,
        border: '1px solid rgba(15,23,42,0.15)',
        bgcolor: 'rgba(15,23,42,0.92)',
        color: '#fff',
        px: 1.5,
        py: 1,
        fontSize: '0.75rem',
        fontWeight: 600,
        pointerEvents: 'none',
        zIndex: 10,
        minWidth: 120,
      }}
    >
      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, mb: 0.5, color: 'rgba(255,255,255,0.7)' }}>
        {title}
      </Typography>
      {rows.map((r) => (
        <Box key={r.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {r.color ? (
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: r.color }} />
            ) : null}
            <span>{r.label}</span>
          </Box>
          <span>{r.value}</span>
        </Box>
      ))}
    </Box>
  );
}

function useChartHover() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const showTooltip = useCallback((clientX: number, clientY: number, data: Omit<TooltipState, 'x' | 'y'>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: clientX - rect.left, y: clientY - rect.top, ...data });
  }, []);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  return { containerRef, tooltip, showTooltip, hideTooltip };
}

function buildPath(values: number[], w: number, h: number, pad = PAD): string {
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

function getPointCoords(values: number[], index: number, w: number, h: number, pad = PAD) {
  const max = Math.max(...values, 1);
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const stepX = innerW / Math.max(values.length - 1, 1);
  return {
    x: pad.left + index * stepX,
    y: pad.top + innerH * (1 - values[index] / max),
  };
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

interface SeriesPoint {
  label: string;
  value: number;
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      {items.map((item) => (
        <Box
          key={item.label}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'text.secondary',
            bgcolor: '#f8fafc',
            px: 1.25,
            py: 0.5,
            borderRadius: 2,
            border: '1px solid #f1f5f9',
          }}
        >
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
          {item.label}
        </Box>
      ))}
    </Box>
  );
}

export function SingleAreaChart({
  data,
  color = LAVENDER,
  label = 'Total',
  height = 220,
}: {
  data: SeriesPoint[];
  color?: string;
  label?: string;
  height?: number;
}) {
  const w = 520;
  const values = data.map((p) => p.value);
  const max = Math.max(...values, 1);
  const path = buildPath(values, w, height);
  const area = path ? `${path} L${w - PAD.right},${height - PAD.bottom} L${PAD.left},${height - PAD.bottom} Z` : '';
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartHover();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const stepX = (w - PAD.left - PAD.right) / Math.max(data.length - 1, 1);

  return (
    <Box ref={containerRef} sx={{ position: 'relative' }} onMouseLeave={() => { hideTooltip(); setActiveIndex(null); }}>
      <Box component="svg" viewBox={`0 0 ${w} ${height}`} sx={{ height: 220, width: '100%', overflow: 'visible', userSelect: 'none' }}>
        <defs>
          <linearGradient id="smSingleArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <GridLines w={w} h={height} max={max} />
        {area ? <path d={area} fill="url(#smSingleArea)" /> : null}
        {path ? <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" /> : null}
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
                style={{ cursor: 'crosshair' }}
                onMouseEnter={(e: MouseEvent) => {
                  setActiveIndex(i);
                  showTooltip(e.clientX, e.clientY, { title: p.label, rows: [{ label, value: p.value, color }] });
                }}
                onMouseMove={(e: MouseEvent) => {
                  setActiveIndex(i);
                  showTooltip(e.clientX, e.clientY, { title: p.label, rows: [{ label, value: p.value, color }] });
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
            fill={activeIndex === i ? NAVY : '#94a3b8'}
            fontWeight={activeIndex === i ? 700 : 500}
          >
            {p.label}
          </text>
        ))}
      </Box>
      {tooltip ? <ChartTooltip {...tooltip} /> : null}
    </Box>
  );
}

export function GroupedBarChart({
  groups,
  colorA = LAVENDER,
  colorB = NAVY,
  labelA = 'Classes',
  labelB = 'Students',
  height = 220,
}: {
  groups: { label: string; budget: number; actual: number }[];
  colorA?: string;
  colorB?: string;
  labelA?: string;
  labelB?: string;
  height?: number;
}) {
  const w = 520;
  const max = Math.max(...groups.flatMap((g) => [g.budget, g.actual]), 1);
  const gap = 20;
  const groupW = (w - gap * (groups.length + 1)) / Math.max(groups.length, 1);
  const barW = (groupW - 8) / 2;
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartHover();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <Box ref={containerRef} sx={{ position: 'relative' }} onMouseLeave={() => { hideTooltip(); setActiveIndex(null); }}>
      <Legend items={[{ color: colorA, label: labelA }, { color: colorB, label: labelB }]} />
      <Box component="svg" viewBox={`0 0 ${w} ${height}`} sx={{ height: 220, width: '100%', overflow: 'visible', userSelect: 'none' }}>
        <GridLines w={w} h={height} max={max} />
        {groups.map((g, i) => {
          const x0 = gap + i * (groupW + gap);
          const barH1 = ((height - PAD.top - PAD.bottom) * g.budget) / max;
          const barH2 = ((height - PAD.top - PAD.bottom) * g.actual) / max;
          const active = activeIndex === i;
          return (
            <g key={g.label}>
              <rect x={x0} y={height - PAD.bottom - barH1} width={barW} height={barH1} rx="4" fill={colorA} opacity={active || activeIndex === null ? 1 : 0.35} />
              <rect x={x0 + barW + 4} y={height - PAD.bottom - barH2} width={barW} height={barH2} rx="4" fill={colorB} opacity={active || activeIndex === null ? 1 : 0.35} />
              <rect
                x={x0 - 4}
                y={PAD.top}
                width={groupW + 8}
                height={height - PAD.top - PAD.bottom}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e: MouseEvent) => {
                  setActiveIndex(i);
                  showTooltip(e.clientX, e.clientY, {
                    title: g.label,
                    rows: [
                      { label: labelA, value: g.budget, color: colorA },
                      { label: labelB, value: g.actual, color: colorB },
                    ],
                  });
                }}
                onMouseMove={(e: MouseEvent) => {
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
              fill={activeIndex === i ? NAVY : '#94a3b8'}
              fontWeight={activeIndex === i ? 700 : 500}
            >
              {g.label.length > 6 ? `${g.label.slice(0, 5)}…` : g.label}
            </text>
          );
        })}
      </Box>
      {tooltip ? <ChartTooltip {...tooltip} /> : null}
    </Box>
  );
}

export function DonutChart({
  segments,
  centerLabel,
  size = 180,
  compact = false,
}: {
  segments: { label: string; value: number; color: string }[];
  centerLabel: string;
  size?: number;
  compact?: boolean;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = size / 2 - 18;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: compact ? { xs: 'column', sm: 'row' } : { xs: 'column', sm: 'row' },
        alignItems: 'center',
        gap: compact ? { xs: 2, sm: 3 } : { xs: 4, sm: 4 },
        justifyContent: compact ? 'space-between' : 'flex-start',
        minHeight: compact ? 180 : undefined,
      }}
    >
      <Box sx={{ position: 'relative', flexShrink: 0, mx: compact ? 'auto' : undefined }}>
        <Box component="svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} sx={{ overflow: 'visible' }}>
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
                  style={{ transition: 'stroke-width 0.2s', cursor: 'pointer' }}
                  onMouseEnter={() => setHovered(seg.label)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
              offset += dash;
              return circle;
            })}
          </g>
          <text x="50%" y="44%" textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="600" fill="#94a3b8">
            TOTAL
          </text>
          <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="800" fill={NAVY}>
            {centerLabel}
          </text>
        </Box>
      </Box>
      <Box sx={{ width: '100%', flex: 1, minWidth: 0 }}>
        {segments.map((seg) => {
          const pct = ((seg.value / total) * 100).toFixed(1);
          const isHovered = hovered === seg.label;
          return (
            <Box
              key={seg.label}
              onMouseEnter={() => setHovered(seg.label)}
              onMouseLeave={() => setHovered(null)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                borderRadius: 2,
                px: compact ? 1.25 : 1.5,
                py: compact ? 0.75 : 1,
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: isHovered ? '#e2e8f0' : 'transparent',
                bgcolor: isHovered ? '#f8fafc' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              <Box sx={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 1.25 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: seg.color, flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {seg.label}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', flexShrink: 0 }}>
                {pct}% · {seg.value}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export function HorizontalBarChart({
  items,
  color = NAVY,
  height,
  showShare = false,
}: {
  items: { label: string; value: number }[];
  color?: string;
  height?: number;
  showShare?: boolean;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const barH = 22;
  const chartHeight = height ?? Math.max(120, items.length * (barH + 14) + 16);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, py: 1, minHeight: chartHeight }}>
      {items.map((item) => {
        const pct = (item.value / max) * 100;
        const share = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
        return (
          <Box key={item.label}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, gap: 2 }}>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: NAVY }}>{item.label}</Typography>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: 'text.secondary', flexShrink: 0 }}>
                {item.value} student{item.value !== 1 ? 's' : ''}
                {showShare && total > 0 ? ` · ${share}%` : ''}
              </Typography>
            </Box>
            <Box sx={{ height: barH, borderRadius: 1.5, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${item.value > 0 ? Math.max(pct, 4) : 0}%`,
                  borderRadius: 1.5,
                  bgcolor: color,
                  transition: 'width 0.4s ease',
                }}
              />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export function ModernVerticalBarChart({
  data,
  color = NAVY,
  accentColor = PRIMARY,
  height = 260,
}: {
  data: { label: string; value: number; male?: number; female?: number }[];
  color?: string;
  accentColor?: string;
  height?: number;
}) {
  const w = 520;
  const values = data.map((p) => p.value);
  const max = Math.max(...values, 1);
  const count = Math.max(data.length, 1);
  const gap = 12;
  const barW = Math.min(44, Math.max(24, 36));
  const chartW = Math.max(w, PAD.left + PAD.right + count * barW + Math.max(count - 1, 0) * gap + 16);
  const totalBarsW = count * barW + Math.max(count - 1, 0) * gap;
  const startX = PAD.left + (chartW - PAD.left - PAD.right - totalBarsW) / 2;
  const { containerRef, tooltip, showTooltip, hideTooltip } = useChartHover();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <Box ref={containerRef} sx={{ position: 'relative', overflowX: 'auto' }} onMouseLeave={() => { hideTooltip(); setActiveIndex(null); }}>
      <Box component="svg" viewBox={`0 0 ${chartW} ${height}`} sx={{ height, minWidth: chartW, width: chartW, display: 'block', overflow: 'visible', userSelect: 'none' }}>
        <defs>
          <linearGradient id="smBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <GridLines w={chartW} h={height} max={max} />
        {data.map((point, i) => {
          const x = startX + i * (barW + gap);
          const barH = ((height - PAD.top - PAD.bottom) * point.value) / max;
          const y = height - PAD.bottom - barH;
          const active = activeIndex === i;
          return (
            <g key={`${point.label}-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, point.value > 0 ? 4 : 0)}
                rx="6"
                fill={active ? 'url(#smBarGrad)' : color}
                opacity={active || activeIndex === null ? 1 : 0.45}
                style={{ transition: 'opacity 0.2s' }}
              />
              {point.value > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={active ? color : '#64748b'}
                >
                  {point.value}
                </text>
              )}
              <rect
                x={x - 4}
                y={PAD.top}
                width={barW + 8}
                height={height - PAD.top - PAD.bottom}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e: MouseEvent) => {
                  setActiveIndex(i);
                  showTooltip(e.clientX, e.clientY, {
                    title: point.label,
                    rows: [
                      { label: 'Male', value: point.male ?? 0, color: NAVY },
                      { label: 'Female', value: point.female ?? 0, color: accentColor },
                      { label: 'Total', value: point.value },
                    ],
                  });
                }}
                onMouseMove={(e: MouseEvent) => {
                  setActiveIndex(i);
                  showTooltip(e.clientX, e.clientY, {
                    title: point.label,
                    rows: [
                      { label: 'Male', value: point.male ?? 0, color: NAVY },
                      { label: 'Female', value: point.female ?? 0, color: accentColor },
                      { label: 'Total', value: point.value },
                    ],
                  });
                }}
              />
              <text
                x={x + barW / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="9"
                fill={active ? NAVY : '#94a3b8'}
                fontWeight={active ? 700 : 500}
              >
                {point.label.length > 8 ? `${point.label.slice(0, 7)}…` : point.label}
              </text>
            </g>
          );
        })}
      </Box>
      {tooltip ? <ChartTooltip {...tooltip} /> : null}
    </Box>
  );
}

export function MetricBadge({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1 }}>
      {children}
    </Box>
  );
}
