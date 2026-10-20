'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const NAVY = '#000435';
const PRIMARY = '#FCB038';

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  payload?: { label?: string; value?: number };
}

function ChartTooltip({
  active,
  payload,
  label,
  valueLabel = 'Value',
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  valueLabel?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-navy/10 bg-white px-4 py-3 shadow-[0_12px_40px_rgba(0,4,53,0.12)]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-navy">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color ?? PRIMARY }}
          />
          <span className="text-muted">{entry.name ?? valueLabel}:</span>
          <span>{Number(entry.value ?? 0).toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const name = item.name ?? item.payload?.label ?? 'Segment';
  const value = Number(item.value ?? 0);

  return (
    <div className="rounded-xl border border-navy/10 bg-white px-4 py-3 shadow-[0_12px_40px_rgba(0,4,53,0.12)]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{name}</p>
      <p className="mt-1 text-lg font-bold text-navy">{value}%</p>
    </div>
  );
}

function toChartData(labels: string[], values: number[]) {
  return labels.map((label, i) => ({ label, value: values[i] ?? 0 }));
}

export function PlatformLineChart({
  labels,
  values,
  height = 160,
  color = PRIMARY,
  name = 'Count',
}: {
  labels: string[];
  values: number[];
  height?: number;
  color?: string;
  name?: string;
}) {
  const data = toChartData(labels, values);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="#e8ecf4" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<ChartTooltip valueLabel={name} />} cursor={{ stroke: color, strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="value"
          name={name}
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PlatformAreaChart({
  labels,
  values,
  height = 160,
  color = PRIMARY,
  name = 'Count',
}: {
  labels: string[];
  values: number[];
  height?: number;
  color?: string;
  name?: string;
}) {
  const data = toChartData(labels, values);
  const gradientId = `area-${name.replace(/\s/g, '-')}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#e8ecf4" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<ChartTooltip valueLabel={name} />} />
        <Area
          type="monotone"
          dataKey="value"
          name={name}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PlatformBarChart({
  labels,
  values,
  height = 160,
  color = NAVY,
  name = 'Events',
}: {
  labels: string[];
  values: number[];
  height?: number;
  color?: string;
  name?: string;
}) {
  const data = toChartData(labels, values);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="4 4" stroke="#e8ecf4" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<ChartTooltip valueLabel={name} />} cursor={{ fill: 'rgba(252,176,56,0.08)' }} />
        <Bar dataKey="value" name={name} fill={color} radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PlatformDonutChart({
  segments,
  size = 160,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const data = segments.map((s) => ({ name: s.label, value: s.value, color: s.color }));

  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={size * 0.32}
            outerRadius={size * 0.46}
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
