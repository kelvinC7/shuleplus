'use client';

interface MiniSparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
  className?: string;
}

/** Tiny inline trend chart used inside compact stat cards. */
export function MiniSparkline({ values, color, width = 84, height = 36, className = '' }: MiniSparklineProps) {
  const safeValues = values.length > 0 ? values : [0, 0];
  const max = Math.max(...safeValues, 1);
  const min = Math.min(...safeValues, 0);
  const range = Math.max(max - min, 1);
  const pad = 3;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const stepX = innerW / Math.max(safeValues.length - 1, 1);

  const points = safeValues.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + innerH * (1 - (v - min) / range);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${height - pad} L${points[0].x.toFixed(1)},${height - pad} Z`;
  const gradientId = `spark-${color.replace('#', '')}-${width}-${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
