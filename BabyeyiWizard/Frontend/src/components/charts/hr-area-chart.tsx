'use client';

const NAVY = '#000435';
const PRIMARY = '#fcb038';

function buildPath(
  values: number[],
  w: number,
  h: number,
  pad = { top: 8, right: 8, bottom: 8, left: 8 }
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

interface Series {
  label: string;
  values: number[];
  color: string;
  fillId: string;
}

interface HrAreaChartProps {
  labels: string[];
  series: Series[];
  height?: number;
}

export function HrAreaChart({ labels, series, height = 220 }: HrAreaChartProps) {
  const w = 520;
  const pad = { top: 12, right: 12, bottom: 28, left: 36 };
  const innerW = w - pad.left - pad.right;

  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(...allValues, 1);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" role="img" aria-hidden>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = pad.top + (height - pad.top - pad.bottom) * tick;
          const value = Math.round(max * (1 - tick));
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                y1={y}
                x2={w - pad.right}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">
                {value}
              </text>
            </g>
          );
        })}

        {series.map((s) => {
          const linePath = buildPath(s.values, w, height, pad);
          const lastX = pad.left + innerW;
          const bottomY = height - pad.bottom;
          const areaPath = `${linePath} L${lastX},${bottomY} L${pad.left},${bottomY} Z`;

          return (
            <g key={s.label}>
              <defs>
                <linearGradient id={s.fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#${s.fillId})`} />
              <path
                d={linePath}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {labels.map((label, i) => {
          const x = pad.left + (innerW / Math.max(labels.length - 1, 1)) * i;
          return (
            <text
              key={label}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fontSize="9"
              fill="#94a3b8"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export const HR_CHART_COLORS = {
  navy: NAVY,
  primary: PRIMARY,
  lavender: '#a78bfa',
  teal: '#14b8a6',
};
