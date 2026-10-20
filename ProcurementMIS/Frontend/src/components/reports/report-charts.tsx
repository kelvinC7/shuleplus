'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatFrw, formatFrwCompact } from '@/utils/currency';

const CHART_COLORS = ['#000435', '#fcb038', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b'];

export function TrendChart({
  data,
  dataKey = 'amount',
  labelKey = 'period',
}: {
  data: { period: string; requests?: number; amount?: number; approved?: number; purchased?: number }[];
  dataKey?: 'requests' | 'amount' | 'approved' | 'purchased';
  labelKey?: string;
}) {
  if (!data.length) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted">
        No trend data for selected filters
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} stroke="#64748b" />
        <YAxis
          tick={{ fontSize: 11 }}
          stroke="#64748b"
          tickFormatter={(v) => (dataKey === 'requests' ? String(v) : formatFrwCompact(v))}
        />
        <Tooltip
          formatter={(value) =>
            dataKey === 'requests' ? Number(value) : formatFrw(Number(value))
          }
        />
        <Bar dataKey={dataKey} fill="#fcb038" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({
  data,
}: {
  data: { category: string; total: number; percentage: number }[];
}) {
  if (!data.length) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted">
        No category data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatFrw(Number(value))} />
        <Legend formatter={(value) => (value.length > 18 ? `${value.slice(0, 16)}…` : value)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBarList({
  items,
  maxValue,
  valueFormatter = formatFrwCompact,
}: {
  items: { label: string; value: number }[];
  maxValue?: number;
  valueFormatter?: (n: number) => string;
}) {
  const max = maxValue ?? Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-medium text-navy">{item.label}</span>
            <span className="shrink-0 tabular-nums text-muted">{valueFormatter(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-navy to-[#fcb038]"
              style={{ width: `${Math.min(100, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PipelineStages({
  stages,
}: {
  stages: { label: string; count: number; href?: string }[];
}) {
  return (
    <div className="flex flex-wrap items-stretch gap-2 overflow-x-auto pb-2">
      {stages.map((stage, i) => (
        <div key={stage.label} className="flex min-w-[100px] flex-1 items-center gap-2">
          <div className="flex-1 rounded-xl border border-border/60 bg-white p-3 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-navy">{stage.count}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">
              {stage.label}
            </p>
          </div>
          {i < stages.length - 1 ? (
            <span className="hidden text-muted sm:inline" aria-hidden>
              →
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function AlertPanel({ alerts }: { alerts: { type: string; message: string }[] }) {
  if (!alerts.length) {
    return (
      <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        No procurement alerts for the current filters.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div
          key={i}
          className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <span aria-hidden>⚠️</span>
          <span>{a.message}</span>
        </div>
      ))}
    </div>
  );
}

export function InsightPanel({ insights }: { insights: string[] }) {
  if (!insights.length) return null;
  return (
    <div className="space-y-2">
      {insights.map((text, i) => (
        <div
          key={i}
          className="flex gap-2 rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-sky-900"
        >
          <span aria-hidden>💡</span>
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}

export function ReportSection({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-navy">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
