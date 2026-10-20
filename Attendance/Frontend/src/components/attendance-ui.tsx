'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { resolvePersonPhotoUrl } from '@/utils/resolve-person-photo';

export function PageShell({
  title,
  subtitle,
  badge,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-navy sm:text-2xl">{title}</h1>
            {badge}
          </div>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function KpiGrid({
  items,
  columns = 4,
}: {
  items: Array<{
    label: string;
    value: string | number;
    hint?: string;
    delta?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon?: ReactNode;
  }>;
  columns?: 2 | 3 | 4 | 5 | 6;
}) {
  return (
    <StatsGrid columns={columns}>
      {items.map((k) => (
        <StatCard
          key={k.label}
          label={k.label}
          value={k.value}
          hint={k.hint}
          delta={
            k.delta
              ? `${k.trend === 'up' ? '↑' : k.trend === 'down' ? '↓' : ''} ${k.delta}`
              : undefined
          }
          icon={k.icon}
          showTrend={k.trend === 'up'}
        />
      ))}
    </StatsGrid>
  );
}

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-0.5 overflow-x-auto rounded-xl bg-slate-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
            active === tab.id ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Panel({
  title,
  children,
  action,
  flush,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  flush?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      {title ? (
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5 sm:px-5">
          <h2 className="text-sm font-semibold text-navy">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={flush ? '' : 'p-4 sm:p-5'}>{children}</div>
    </div>
  );
}

export function DetailStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50/90 px-3 py-2.5">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}

export function RankMedal({ rank }: { rank: number }) {
  const tone =
    rank === 1
      ? 'bg-amber-100 text-amber-900'
      : rank === 2
        ? 'bg-slate-200 text-navy'
        : rank === 3
          ? 'bg-orange-100 text-orange-900'
          : 'bg-slate-100 text-muted';
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone}`}>
      {rank}
    </span>
  );
}

export function MiniBarChart({
  rows,
}: {
  rows: Array<{ label: string; value: number; color?: string }>;
}) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (!rows.length || total === 0) {
    return <p className="py-6 text-center text-sm text-muted">No data for this period.</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-navy">{row.label}</span>
            <span className="text-muted">{row.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(row.value / total) * 100}%`,
                backgroundColor: row.color ?? '#FCB038',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GateStatusCard({
  name,
  status,
  deviceCode,
  lastSeenAt,
}: {
  name: string;
  status: string;
  deviceCode?: string;
  lastSeenAt?: string | null;
}) {
  const online = status === 'ONLINE';
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
      <div>
        <p className="font-semibold text-navy">{name}</p>
        {deviceCode ? <p className="font-mono text-[10px] text-muted">{deviceCode}</p> : null}
        {lastSeenAt ? (
          <p className="mt-0.5 text-[10px] text-muted">
            Last seen {new Date(lastSeenAt).toLocaleTimeString()}
          </p>
        ) : null}
      </div>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
          online ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${online ? 'animate-pulse bg-emerald-500' : 'bg-red-500'}`} />
        {online ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}

export function QuickActionGrid({ actions }: { actions: Array<{ href: string; label: string; icon: ReactNode }> }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-3 text-sm font-semibold text-navy shadow-sm transition hover:border-primary/30 hover:shadow-md"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy text-primary">
            {a.icon}
          </span>
          <span className="truncate">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

export function TrendBadge({ value, label }: { value: number; label?: string }) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}% {label ?? 'vs yesterday'}
    </span>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
      {children}
    </div>
  );
}

export const filterSelectClass = 'input !w-auto min-w-[120px] !py-2 text-xs sm:text-sm';

export function PersonAvatar({
  name,
  photoUrl,
  personKind = 'STUDENT',
  size = 44,
  badge,
}: {
  name: string;
  photoUrl?: string | null;
  personKind?: 'STUDENT' | 'STAFF';
  size?: number;
  badge?: ReactNode;
}) {
  const src = resolvePersonPhotoUrl(photoUrl, personKind);

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-xl border border-border object-cover shadow-sm"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-xl border border-border bg-gradient-to-br from-navy/10 to-primary/10 text-xs font-bold text-navy"
        >
          {initials || '?'}
        </div>
      )}
      {badge ? (
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-white shadow">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export function IntegrationPills({
  integrations,
}: {
  integrations?: {
    studentManagement?: { reachable?: boolean };
    hr?: { reachable?: boolean } | null;
    iam?: { reachable?: boolean } | null;
    timetable?: { reachable?: boolean } | null;
  };
}) {
  if (!integrations) return null;
  const items = [
    { label: 'Students', ok: integrations.studentManagement?.reachable },
    { label: 'HR', ok: integrations.hr?.reachable },
    { label: 'Users', ok: integrations.iam?.reachable },
    { label: 'Timetable', ok: integrations.timetable?.reachable },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item.label}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            item.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-muted'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${item.ok ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
