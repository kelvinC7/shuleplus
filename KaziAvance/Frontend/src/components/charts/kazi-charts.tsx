"use client";

import { useState, type ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  metric?: string;
  filter?: ReactNode;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, metric, filter, children }: ChartCardProps) {
  return (
    <div className="hr-card flex h-full flex-col p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-navy">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
          {metric ? <p className="mt-2 text-xl font-semibold text-navy">{metric}</p> : null}
        </div>
        {filter}
      </div>
      <div className="min-h-[220px] flex-1">{children}</div>
    </div>
  );
}

const NAVY = "#000435";
const PRIMARY = "#fcb038";
const TEAL = "#14b8a6";
const LAVENDER = "#a78bfa";

interface SeriesPoint {
  label: string;
  value: number;
}

export function BarChart({
  data,
  color = PRIMARY,
  height = 220,
  valueFormatter = (v: number) => String(v),
}: {
  data: SeriesPoint[];
  color?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
}) {
  const w = 480;
  const pad = { top: 20, right: 12, bottom: 36, left: 40 };
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const innerW = w - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const [tip, setTip] = useState<{ x: number; y: number; label: string; value: string } | null>(null);

  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${w} ${height}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.top + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={pad.left}
              x2={w - pad.right}
              y1={y}
              y2={y}
              stroke="#eef1f6"
              strokeWidth={1}
            />
          );
        })}
        {data.map((point, i) => {
          const barW = Math.max(8, innerW / data.length - 8);
          const barH = (point.value / max) * innerH;
          const x = pad.left + i * (innerW / data.length) + 4;
          const y = pad.top + innerH - barH;
          return (
            <g key={point.label}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, point.value > 0 ? 3 : 0)}
                rx={5}
                fill={color}
                opacity={0.9}
                className="cursor-pointer transition-opacity hover:opacity-100"
                onMouseEnter={() =>
                  setTip({
                    x: ((x + barW / 2) / w) * 100,
                    y: (y / height) * 100,
                    label: point.label,
                    value: valueFormatter(point.value),
                  })
                }
                onMouseLeave={() => setTip(null)}
              />
              <text x={x + barW / 2} y={height - 12} textAnchor="middle" fontSize="9" fill="#94a3b8">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
      {tip ? (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-navy px-2.5 py-1.5 text-[11px] text-white shadow-lg"
          style={{
            left: `${tip.x}%`,
            top: `${tip.y}%`,
            transform: "translate(-50%, calc(-100% - 8px))",
          }}
        >
          <p className="font-medium text-white/70">{tip.label}</p>
          <p className="font-semibold">{tip.value}</p>
        </div>
      ) : null}
    </div>
  );
}

export function StackedBarChart({
  approved,
  rejected,
  height = 220,
}: {
  approved: SeriesPoint[];
  rejected: SeriesPoint[];
  height?: number;
}) {
  const w = 480;
  const pad = { top: 28, right: 12, bottom: 36, left: 40 };
  const innerW = w - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...approved.map((p, i) => p.value + (rejected[i]?.value ?? 0)), 1);
  const barW = Math.max(8, innerW / approved.length - 8);
  const [tip, setTip] = useState<{ label: string; approved: number; rejected: number; x: number; y: number } | null>(
    null
  );

  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${w} ${height}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {approved.map((point, i) => {
          const rej = rejected[i]?.value ?? 0;
          const appH = (point.value / max) * innerH;
          const rejH = (rej / max) * innerH;
          const x = pad.left + i * (innerW / approved.length) + 4;
          const appY = pad.top + innerH - appH - rejH;
          const rejY = pad.top + innerH - rejH;
          return (
            <g
              key={point.label}
              className="cursor-pointer"
              onMouseEnter={() =>
                setTip({
                  label: point.label,
                  approved: point.value,
                  rejected: rej,
                  x: ((x + barW / 2) / w) * 100,
                  y: (Math.min(appY, rejY) / height) * 100,
                })
              }
              onMouseLeave={() => setTip(null)}
            >
              <rect x={x} y={appY} width={barW} height={appH} rx={2} fill={TEAL} />
              <rect x={x} y={rejY} width={barW} height={rejH} rx={2} fill="#ef4444" opacity={0.85} />
              <text x={x + barW / 2} y={height - 12} textAnchor="middle" fontSize="9" fill="#94a3b8">
                {point.label}
              </text>
            </g>
          );
        })}
        <g transform={`translate(${w - 110}, 8)`}>
          <rect x={0} y={0} width={8} height={8} fill={TEAL} rx={2} />
          <text x={12} y={8} fontSize="9" fill="#64748b">
            Approved
          </text>
          <rect x={0} y={14} width={8} height={8} fill="#ef4444" rx={2} />
          <text x={12} y={22} fontSize="9" fill="#64748b">
            Rejected
          </text>
        </g>
      </svg>
      {tip ? (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-navy px-2.5 py-1.5 text-[11px] text-white shadow-lg"
          style={{
            left: `${tip.x}%`,
            top: `${tip.y}%`,
            transform: "translate(-50%, calc(-100% - 8px))",
          }}
        >
          <p className="font-medium text-white/70">{tip.label}</p>
          <p>Approved: {tip.approved}</p>
          <p>Rejected: {tip.rejected}</p>
        </div>
      ) : null}
    </div>
  );
}

export function LineChart({
  data,
  color = NAVY,
  height = 220,
  valueFormatter = (v: number) => String(v),
}: {
  data: SeriesPoint[];
  color?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
}) {
  const w = 480;
  const pad = { top: 20, right: 12, bottom: 36, left: 40 };
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const innerW = w - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const stepX = innerW / Math.max(values.length - 1, 1);
  const [tip, setTip] = useState<{ x: number; y: number; label: string; value: string } | null>(null);

  const path = values
    .map((v, i) => {
      const x = pad.left + i * stepX;
      const y = pad.top + innerH * (1 - v / max);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${w} ${height}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {values.map((v, i) => {
          const x = pad.left + i * stepX;
          const y = pad.top + innerH * (1 - v / max);
          return (
            <g key={data[i].label}>
              <circle
                cx={x}
                cy={y}
                r={5}
                fill={color}
                className="cursor-pointer"
                onMouseEnter={() =>
                  setTip({
                    x: (x / w) * 100,
                    y: (y / height) * 100,
                    label: data[i].label,
                    value: valueFormatter(v),
                  })
                }
                onMouseLeave={() => setTip(null)}
              />
              <circle
                cx={x}
                cy={y}
                r={12}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() =>
                  setTip({
                    x: (x / w) * 100,
                    y: (y / height) * 100,
                    label: data[i].label,
                    value: valueFormatter(v),
                  })
                }
                onMouseLeave={() => setTip(null)}
              />
              <text x={x} y={height - 12} textAnchor="middle" fontSize="9" fill="#94a3b8">
                {data[i].label}
              </text>
            </g>
          );
        })}
      </svg>
      {tip ? (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-navy px-2.5 py-1.5 text-[11px] text-white shadow-lg"
          style={{
            left: `${tip.x}%`,
            top: `${tip.y}%`,
            transform: "translate(-50%, calc(-100% - 8px))",
          }}
        >
          <p className="font-medium text-white/70">{tip.label}</p>
          <p className="font-semibold">{tip.value}</p>
        </div>
      ) : null}
    </div>
  );
}

export function DonutChart({
  segments,
  height = 200,
}: {
  segments: { label: string; value: number; color: string }[];
  height?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const cx = 100;
  const cy = 100;
  const r = 70;
  const ir = 45;
  let angle = -90;
  const [active, setActive] = useState<string | null>(null);

  const arcs = segments.map((seg) => {
    const sweep = (seg.value / total) * 360;
    const start = angle;
    angle += sweep;
    const startRad = (start * Math.PI) / 180;
    const endRad = ((start + sweep) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const ix1 = cx + ir * Math.cos(endRad);
    const iy1 = cy + ir * Math.sin(endRad);
    const ix2 = cx + ir * Math.cos(startRad);
    const iy2 = cy + ir * Math.sin(startRad);
    const large = sweep > 180 ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${large} 0 ${ix2} ${iy2} Z`;
    return { ...seg, d };
  });

  const activeSeg = segments.find((s) => s.label === active);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
      <div className="relative">
        <svg viewBox="0 0 200 200" width={height} height={height}>
          {arcs.map((arc) => (
            <path
              key={arc.label}
              d={arc.d}
              fill={arc.color}
              opacity={active && active !== arc.label ? 0.45 : 1}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => setActive(arc.label)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="600" fill={NAVY}>
            {activeSeg ? activeSeg.value : total}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#64748b">
            {activeSeg ? activeSeg.label : "Total"}
          </text>
        </svg>
      </div>
      <ul className="space-y-2 text-xs">
        {segments.map((seg) => (
          <li
            key={seg.label}
            className={`flex items-center gap-2 rounded-lg px-2 py-1 transition ${
              active === seg.label ? "bg-slate-100" : ""
            }`}
            onMouseEnter={() => setActive(seg.label)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-muted">{seg.label}</span>
            <span className="font-semibold text-navy">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { NAVY, PRIMARY, TEAL, LAVENDER };
