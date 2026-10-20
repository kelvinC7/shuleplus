'use client';

const NAVY = '#000435';
const GOLD = '#FCB038';

function buildPath(values: number[], w: number, h: number, pad = 4): string {
  if (values.length === 0) return '';
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (values.length - 1 || 1);
  return values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (h - pad * 2) * (1 - (v - min) / range);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function LineChart({ values, height = 120 }: { values: number[]; height?: number }) {
  const w = 320;
  const path = buildPath(values, w, height);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-full w-full" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => {
        const max = Math.max(...values);
        const min = Math.min(...values);
        const range = max - min || 1;
        const stepX = (w - 8) / (values.length - 1 || 1);
        const x = 4 + i * stepX;
        const y = 4 + (height - 8) * (1 - (v - min) / range);
        return <circle key={i} cx={x} cy={y} r="3" fill={NAVY} />;
      })}
    </svg>
  );
}

export function AreaChart({ values, height = 120 }: { values: number[]; height?: number }) {
  const w = 320;
  const path = buildPath(values, w, height);
  const area = `${path} L${w - 4},${height - 4} L4,${height - 4} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.35" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaFill)" stroke="none" />
      <path d={path} fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BarChart({ values, height = 120 }: { values: number[]; height?: number }) {
  const w = 320;
  const max = Math.max(...values) || 1;
  const gap = 10;
  const barW = (w - gap * (values.length + 1)) / values.length;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-full w-full" preserveAspectRatio="none">
      {values.map((v, i) => {
        const barH = (height - 8) * (v / max);
        const x = gap + i * (barW + gap);
        const y = height - 4 - barH;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={barH}
            rx="4"
            fill={i % 2 === 0 ? NAVY : GOLD}
          />
        );
      })}
    </svg>
  );
}

export function DonutChart({
  segments,
  size = 140,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segments.map((seg, i) => {
            const fraction = seg.value / total;
            const dash = fraction * circumference;
            const circle = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="14"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            );
            offset += dash;
            return circle;
          })}
        </g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="font-poppins-bold"
          fontSize="22"
          fill={NAVY}
        >
          {Math.round((segments[0].value / total) * 100)}%
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="font-poppins-medium text-navy">{seg.label}</span>
            <span className="text-muted">{seg.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
