'use client';

const NAVY = '#000435';
const GOLD = '#FCB038';

function barWidthPct(current: number, total: number) {
  if (total <= 0) return current > 0 ? 100 : 0;
  return Math.min(100, Math.max(current > 0 ? 2 : 0, (current / total) * 100));
}

function shareLabel(current: number, total: number) {
  if (total <= 0) return '—';
  const pct = (current / total) * 100;
  if (pct > 0 && pct < 1) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

export function AttendanceMetricBar({
  label,
  current,
  total,
  color,
}: {
  label: string;
  current: number;
  total: number;
  color: string;
}) {
  const width = barWidthPct(current, total);
  return (
    <div className="pt-1">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
        <span className="font-semibold text-navy">{label}</span>
        <span className="whitespace-nowrap tabular-nums text-muted">
          <span className="font-bold text-navy">{current.toLocaleString()}</span>
          <span className="mx-1 text-slate-300">/</span>
          {total.toLocaleString()}
          <span className="ml-1.5 text-[10px] font-semibold">{shareLabel(current, total)}</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function TodayMixPanel({
  loading,
  studentRateLabel,
  donutSegments,
  rosterStudents,
  studentMetrics,
  staffMetrics,
}: {
  loading: boolean;
  studentRateLabel: string;
  donutSegments: Array<{ label: string; value: number; color: string }>;
  rosterStudents: number;
  studentMetrics: {
    gateReads: number;
    entries: number;
    exits: number;
    late: number;
    absent: number;
    onCampus: number;
    roster: number;
  };
  staffMetrics: {
    gateReads: number;
    onSite: number;
    roster: number;
    rateLabel: string;
  };
}) {
  const roster = studentMetrics.roster;
  const campusSummary = loading
    ? '…'
    : `${studentMetrics.onCampus.toLocaleString()} on campus · ${studentMetrics.gateReads.toLocaleString()} gate reads · roster ${roster.toLocaleString()}`;

  return (
    <div className="space-y-5">
      <DonutChart
        size={168}
        layout="stacked"
        segments={donutSegments}
        rosterTotal={rosterStudents}
        centerLabel="Students"
        centerValue={loading ? '…' : studentRateLabel}
      />

      <div className="rounded-xl border border-border/80 bg-slate-50/50 p-4">
        <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Students today</p>
          <p className="text-[11px] font-medium tabular-nums text-slate-600">{campusSummary}</p>
        </div>
        <div className="space-y-3.5">
          <AttendanceMetricBar label="Entry" current={studentMetrics.entries} total={roster} color={GOLD} />
          <AttendanceMetricBar label="Exit" current={studentMetrics.exits} total={roster} color="#475569" />
          <AttendanceMetricBar label="Late" current={studentMetrics.late} total={roster} color="#f59e0b" />
          <AttendanceMetricBar label="Absent" current={studentMetrics.absent} total={roster} color="#94a3b8" />
        </div>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-900/60">Staff today</p>
          {!loading ? (
            <p className="text-[11px] font-semibold tabular-nums text-indigo-900/80">{staffMetrics.rateLabel}</p>
          ) : null}
        </div>
        <div className="space-y-3.5">
          <AttendanceMetricBar
            label="Gate reads"
            current={staffMetrics.gateReads}
            total={staffMetrics.roster}
            color="#6366f1"
          />
          <AttendanceMetricBar
            label="On site"
            current={staffMetrics.onSite}
            total={Math.max(staffMetrics.roster, 1)}
            color="#8b5cf6"
          />
        </div>
      </div>
    </div>
  );
}

export function DonutChart({
  segments,
  size = 168,
  centerLabel,
  centerValue,
  centerSubline,
  rosterTotal,
  layout = 'side',
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  size?: number;
  centerLabel?: string;
  centerValue?: string | number;
  centerSubline?: string;
  /** When set, legend shows % of roster (e.g. Student Management total). */
  rosterTotal?: number;
  layout?: 'side' | 'stacked';
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const pctBase = rosterTotal && rosterTotal > 0 ? rosterTotal : total;
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-sm text-muted">
        <svg width={size} height={size} aria-hidden>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={14} />
        </svg>
        <p className="mt-2">No attendance data yet</p>
      </div>
    );
  }

  const arcBase = pctBase > 0 ? pctBase : total;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const frac = seg.value / arcBase;
      const dash = frac * circumference;
      const strokeDasharray = `${dash} ${circumference - dash}`;
      const strokeDashoffset = -offset;
      offset += dash;
      return { ...seg, strokeDasharray, strokeDashoffset };
    });

  const rootClass =
    layout === 'stacked'
      ? 'flex w-full flex-col items-center gap-4'
      : 'flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between';

  const legendClass =
    layout === 'stacked' ? 'grid w-full max-w-md grid-cols-1 gap-2 sm:max-w-none' : 'w-full min-w-[160px] space-y-2.5 sm:flex-1';

  return (
    <div className={rootClass}>
      <div className="relative shrink-0">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={14} />
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={a.strokeDasharray}
              strokeDashoffset={a.strokeDashoffset}
              className="transition-all duration-700"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
          {centerValue !== undefined ? (
            <span className="text-3xl font-extrabold tabular-nums tracking-tight text-navy">{centerValue}</span>
          ) : null}
          {centerLabel ? (
            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">{centerLabel}</span>
          ) : null}
          {centerSubline ? (
            <span className="mt-1 text-[11px] font-medium text-slate-500">{centerSubline}</span>
          ) : null}
        </div>
      </div>
      <ul className={legendClass}>
        {segments.map((s) => {
          const share =
            pctBase > 0 ? (s.value / pctBase) * 100 : 0;
          const sharePct =
            share > 0 && share < 1 ? share.toFixed(1) : String(Math.round(share));
          return (
          <li
            key={s.label}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-0.5 text-xs sm:grid-cols-[minmax(6rem,auto)_1fr_auto]"
          >
            <span className="flex items-center gap-2 font-medium text-navy">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
            <span className="hidden h-1.5 overflow-hidden rounded-full bg-slate-100 sm:block">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${pctBase > 0 ? Math.min(100, (s.value / pctBase) * 100) : 0}%`,
                  backgroundColor: s.color,
                }}
              />
            </span>
            <span className="whitespace-nowrap text-right font-bold tabular-nums text-navy">
              {s.value.toLocaleString()}
              <span className="ml-1.5 text-[10px] font-semibold text-muted">{sharePct}%</span>
            </span>
          </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TrendAreaChart({
  points,
  height = 120,
}: {
  points: Array<{ label: string; value: number }>;
  height?: number;
}) {
  const max = Math.max(...points.map((p) => p.value), 1);
  const w = 320;
  const h = height;
  const pad = 8;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  if (!points.length) {
    return <p className="py-8 text-center text-sm text-muted">No trend data yet.</p>;
  }

  const coords = points.map((p, i) => {
    const x =
      points.length === 1
        ? pad + innerW / 2
        : pad + (i / Math.max(points.length - 1, 1)) * innerW;
    const y = pad + innerH - (p.value / max) * innerH;
    return { x, y, ...p };
  });

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const area = `${line} L ${coords[coords.length - 1].x} ${h - pad} L ${coords[0].x} ${h - pad} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h + 24}`} className="w-full min-w-[280px]" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
            <stop offset="100%" stopColor={NAVY} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trendFill)" />
        <path d={line} fill="none" stroke={NAVY} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c) => (
          <g key={c.label}>
            <circle cx={c.x} cy={c.y} r={4} fill="white" stroke={GOLD} strokeWidth={2} />
            <text x={c.x} y={h + 16} textAnchor="middle" className="fill-slate-500 text-[9px] font-medium">
              {c.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ClassHeatBars({
  rows,
}: {
  rows: Array<{ label: string; value: number; sub?: string }>;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-muted">No class breakdown yet.</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between gap-2 text-xs">
            <span className="truncate font-semibold text-navy">{row.label}</span>
            <span className="shrink-0 font-bold tabular-nums text-navy">{row.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#000435] transition-all duration-500"
              style={{ width: `${Math.max(8, (row.value / max) * 100)}%`, opacity: row.value > 0 ? 1 : 0.25 }}
            />
          </div>
          {row.sub ? <p className="mt-0.5 text-[10px] text-muted">{row.sub}</p> : null}
        </div>
      ))}
    </div>
  );
}
