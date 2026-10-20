'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Wallet,
  UserCheck,
  Boxes,
  Wrench,
  AlertTriangle,
  Search,
  RefreshCw,
  Loader2,
  Plus,
  QrCode,
} from 'lucide-react';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { assetsApi } from '@/services/assets-api';
import { formatRwf, formatNumber } from '@/utils/format';
import type { DashboardSummary } from '@/types';

const COLORS = ['#000435', '#fcb038', '#14b8a6', '#a78bfa', '#f97316', '#64748b', '#ec4899'];

const STATUS_META = [
  { key: 'available', label: 'Available', color: '#22c55e' },
  { key: 'assigned', label: 'Assigned', color: '#3b82f6' },
  { key: 'maintenance', label: 'Maintenance', color: '#f97316' },
  { key: 'damaged', label: 'Damaged', color: '#ef4444' },
  { key: 'missing', label: 'Missing', color: '#64748b' },
  { key: 'retired', label: 'Retired', color: '#a855f7' },
] as const;

export function DashboardView() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await assetsApi.dashboard({
        year: yearFilter !== 'all' ? Number(yearFilter) : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        location: locationFilter !== 'all' ? locationFilter : undefined,
      });
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [yearFilter, categoryFilter, locationFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = data?.kpis;
  const valueByCategory = data?.valueByCategory ?? [];
  const maxCatValue = Math.max(...valueByCategory.map((c) => c.value), 1);
  const statusBreakdown = data?.statusBreakdown;
  const statusTotal = useMemo(
    () => STATUS_META.reduce((s, m) => s + (statusBreakdown?.[m.key] ?? 0), 0),
    [statusBreakdown]
  );

  let cursor = 0;
  const donutSegments = STATUS_META.map((m) => {
    const count = statusBreakdown?.[m.key] ?? 0;
    const pct = statusTotal ? count / statusTotal : 0;
    const start = cursor;
    cursor += pct * 360;
    return { ...m, count, pct, start, end: cursor };
  });

  const yearLabel =
    yearFilter !== 'all'
      ? yearFilter
      : data?.activeYear
        ? `${data.activeYear}–${Number(data.activeYear) + 1}`
        : 'All years';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy">Assets Dashboard</h1>
            <p className="mt-1 text-sm text-muted">
              Monitor {data?.organizationName ?? 'your organization'}&apos;s assets, values and
              movements.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/register" className="btn-primary">
              <Plus size={16} /> Add asset
            </Link>
            <Link href="/scan" className="btn-secondary">
              <QrCode size={16} /> Scan
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="Academic Year"
            value={yearFilter}
            onChange={setYearFilter}
            options={[
              { value: 'all', label: 'All years' },
              ...(data?.filters?.years ?? []).map((y) => ({
                value: String(y),
                label: `${y}–${y + 1}`,
              })),
            ]}
          />
          <FilterSelect
            label="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: 'all', label: 'All categories' },
              ...(data?.filters?.categories ?? []).map((c) => ({ value: c, label: c })),
            ]}
          />
          <FilterSelect
            label="Location"
            value={locationFilter}
            onChange={setLocationFilter}
            options={[
              { value: 'all', label: 'All locations' },
              ...(data?.filters?.locations ?? []).map((l) => ({ value: l, label: l })),
            ]}
          />
          <div className="flex items-end">
            <button
              type="button"
              className="btn-secondary w-full justify-center"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex min-h-[30vh] items-center justify-center gap-2 text-sm text-muted">
          <Loader2 className="animate-spin" size={18} /> Loading dashboard…
        </div>
      ) : (
        <>
          <StatsGrid columns={4}>
            <StatCard
              label="Total Assets"
              value={formatNumber(kpis?.totalAssets ?? 0)}
              delta={`${yearLabel}`}
              icon={<Package size={20} className="stroke-[1.75]" />}
            />
            <StatCard
              label="Asset Value"
              value={formatRwf(kpis?.totalValue ?? kpis?.totalNetBook ?? 0)}
              delta="Net book value"
              icon={<Wallet size={20} className="stroke-[1.75]" />}
            />
            <StatCard
              label="Assigned"
              value={formatNumber(kpis?.assigned ?? kpis?.activeAssignments ?? 0)}
              delta={`${kpis?.assignedPercent ?? 0}% of fleet`}
              icon={<UserCheck size={20} className="stroke-[1.75]" />}
            />
            <StatCard
              label="Available"
              value={formatNumber(kpis?.available ?? 0)}
              delta={`${kpis?.availablePercent ?? 0}% ready`}
              icon={<Boxes size={20} className="stroke-[1.75]" />}
            />
          </StatsGrid>

          <StatsGrid columns={4}>
            <StatCard
              label="Maintenance"
              value={formatNumber(kpis?.maintenance ?? data?.maintenanceStats?.open ?? 0)}
              delta={`${data?.maintenanceStats?.inProgress ?? 0} in progress`}
              icon={<Wrench size={20} className="stroke-[1.75]" />}
            />
            <StatCard
              label="Damaged"
              value={formatNumber(kpis?.damaged ?? 0)}
              icon={<AlertTriangle size={20} className="stroke-[1.75]" />}
            />
            <StatCard
              label="Missing"
              value={formatNumber(kpis?.missing ?? 0)}
              icon={<Search size={20} className="stroke-[1.75]" />}
            />
            <StatCard
              label="Retired"
              value={formatNumber(kpis?.retired ?? 0)}
              delta={`Purchase ${formatRwf(kpis?.totalPurchase ?? 0)}`}
              icon={<Package size={20} className="stroke-[1.75]" />}
            />
          </StatsGrid>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="hr-card p-5 sm:p-6 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-navy">Asset Value by Category</h2>
                  <p className="text-xs text-muted">Net book value distribution</p>
                </div>
              </div>
              {valueByCategory.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No category data yet.</p>
              ) : (
                <ul className="space-y-3">
                  {valueByCategory.map((row, i) => (
                    <li key={row.label}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-navy">{row.label}</span>
                        <span className="tabular-nums text-muted">{formatRwf(row.value)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(4, (row.value / maxCatValue) * 100)}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="hr-card p-5 sm:p-6">
              <h2 className="text-base font-semibold text-navy">Asset Status</h2>
              <p className="text-xs text-muted">Current fleet breakdown</p>
              <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div
                  className="relative h-36 w-36 shrink-0 rounded-full"
                  style={{
                    background: statusTotal
                      ? `conic-gradient(${donutSegments
                          .filter((s) => s.pct > 0)
                          .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
                          .join(', ')})`
                      : '#e2e8f0',
                  }}
                >
                  <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white text-center">
                    <p className="text-xl font-bold text-navy">{formatNumber(statusTotal)}</p>
                    <p className="text-[10px] uppercase text-muted">Assets</p>
                  </div>
                </div>
                <ul className="w-full space-y-2 text-sm">
                  {donutSegments.map((s) => (
                    <li key={s.key} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.label}
                      </span>
                      <span className="font-semibold tabular-nums text-navy">{s.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="hr-card p-5 sm:p-6">
              <h2 className="text-base font-semibold text-navy">Recent Asset Activities</h2>
              <p className="text-xs text-muted">Latest movements across the register</p>
              <ul className="mt-4 space-y-3">
                {(data?.recentActivities ?? []).length === 0 ? (
                  <li className="py-6 text-center text-sm text-muted">No recent activity.</li>
                ) : (
                  data!.recentActivities!.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-xl border border-border/70 bg-slate-50/50 px-3 py-2.5"
                    >
                      <p className="text-sm font-medium text-navy">{a.title}</p>
                      {a.detail ? <p className="text-xs text-muted">{a.detail}</p> : null}
                      <p className="mt-0.5 text-[11px] text-muted">{a.relative}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="hr-card p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-navy">Financial Years</h2>
                  <p className="text-xs text-muted">Opening · Purchases · Closing</p>
                </div>
                <Link href="/year-setup" className="text-xs font-semibold text-primary hover:underline">
                  Manage
                </Link>
              </div>
              {(data?.years ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">
                  No years configured.{' '}
                  <Link href="/year-setup" className="font-medium text-ochre underline">
                    Set up a year
                  </Link>
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase text-muted">
                        <th className="py-2 pr-3">Year</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Closing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data!.years.slice(0, 5).map((y) => (
                        <tr key={y.year} className="border-b border-border/60 last:border-0">
                          <td className="py-2.5 pr-3 font-medium text-navy">{y.year}</td>
                          <td className="py-2.5 pr-3 text-muted">{y.status}</td>
                          <td className="py-2.5">{formatRwf(y.totalClosing)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <QuickLink href="/assignments" label="Assignments" />
                <QuickLink href="/maintenance" label="Maintenance" />
                <QuickLink href="/reports" label="Reports" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <select className="input !py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-white px-3 py-2 text-center text-xs font-semibold text-navy transition hover:border-primary/40 hover:bg-amber-50/50"
    >
      {label}
    </Link>
  );
}
