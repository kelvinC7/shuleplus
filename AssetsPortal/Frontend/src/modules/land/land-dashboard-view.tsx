'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CalendarRange,
  Landmark,
  Loader2,
  Ruler,
  Settings2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { StatCard } from '@/components/stat-card';
import { landApi } from '@/services/land-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatNumber, formatRwf } from '@/utils/format';
import type { LandChartPoint, LandDashboard, LandMeta } from '@/types';

const EMPTY_META: LandMeta = {
  years: [],
  activeYear: null,
  provinces: [],
  districts: [],
  sectors: [],
  categories: [],
  suppliers: [],
};

type Filters = {
  province: string;
  district: string;
  sector: string;
  category: string;
  supplier: string;
};

const EMPTY_FILTERS: Filters = {
  province: '',
  district: '',
  sector: '',
  category: '',
  supplier: '',
};

function BarList({
  title,
  description,
  points,
  formatter = formatRwf,
}: {
  title: string;
  description: string;
  points: LandChartPoint[];
  formatter?: (value: number) => string;
}) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <section className="hr-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-navy">{title}</h3>
          <p className="mt-0.5 text-[11px] text-muted">{description}</p>
        </div>
        <BarChart3 size={18} className="text-ochre" />
      </div>
      <div className="mt-4 space-y-3">
        {points.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
            No data for the selected filters.
          </p>
        ) : (
          points.slice(0, 8).map((point) => (
            <div key={point.label}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-navy">{point.label}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  {formatter(point.value)} · {formatNumber(point.count)} record{point.count === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-navy via-navy-light to-primary"
                  style={{ width: `${Math.max(4, (point.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function LandDashboardView() {
  const toast = useToast();
  const [meta, setMeta] = useState<LandMeta>(EMPTY_META);
  const [year, setYear] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [data, setData] = useState<LandDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await landApi.meta();
        setMeta(response.data.data);
        setYear(response.data.data.activeYear ?? response.data.data.years[0]?.year ?? null);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Could not load Land metadata'));
        setLoading(false);
      }
    })();
  }, [toast]);

  const load = useCallback(async () => {
    if (!year) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await landApi.dashboard({
        year,
        province: filters.province || undefined,
        district: filters.district || undefined,
        sector: filters.sector || undefined,
        category: filters.category || undefined,
        supplier: filters.supplier || undefined,
      });
      setData(response.data.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load the Land dashboard'));
    } finally {
      setLoading(false);
    }
  }, [year, filters, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const optionList = (values: string[]) =>
    values.map((value) => (
      <option key={value} value={value}>
        {value}
      </option>
    ));

  const trend = data?.charts.purchaseTrend ?? [];
  const trendMax = Math.max(...trend.map((point) => point.value), 1);

  const filterLabels = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  return (
    <AssetsPageLayout
      title="Land Dashboard"
      subtitle={`Land asset performance for ${data?.financialYear.year ?? year ?? '—'}`}
      actions={
        <>
          <Link href="/land/setup" className="btn-secondary">
            <Settings2 size={16} /> Land Setup
          </Link>
          <Link href="/land/register" className="btn-primary">
            <Landmark size={16} /> Land Register
          </Link>
        </>
      }
    >
      <div className="hr-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="w-full lg:w-44">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
              Financial Year
            </label>
            <select
              className="input"
              value={year ?? ''}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {meta.years.map((fy) => (
                <option key={fy.id} value={fy.year}>
                  {fy.year} {fy.year === meta.activeYear ? '• Active' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {(
              [
                ['province', 'Province', meta.provinces],
                ['district', 'District', meta.districts],
                ['sector', 'Sector', meta.sectors],
                ['category', 'Category', meta.categories],
                ['supplier', 'Supplier', meta.suppliers],
              ] as const
            ).map(([key, label, options]) => (
              <div key={key}>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {label}
                </label>
                <select
                  className="input"
                  value={filters[key]}
                  onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                >
                  <option value="">All</option>
                  {optionList(options)}
                </select>
              </div>
            ))}
          </div>
          {filterLabels ? (
            <button type="button" className="btn-secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear ({filterLabels})
            </button>
          ) : null}
        </div>
      </div>

      {!data?.financialYear.configured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Land Setup not configured.</strong> Add an opening amount for{' '}
          {data?.financialYear.year ?? year} to start tracking land balances.{' '}
          <Link href="/land/setup" className="font-semibold underline">
            Open Land Setup
          </Link>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Total Land Records"
          value={formatNumber(data?.stats.totalRecords ?? 0)}
          hint="Registered land parcels"
          icon={<Landmark size={18} />}
        />
        <StatCard
          label="Opening Amount"
          value={formatRwf(data?.stats.openingAmount ?? 0)}
          hint="From Land Setup"
          icon={<Wallet size={18} />}
        />
        <StatCard
          label="Total Purchase Value"
          value={formatRwf(data?.stats.totalPurchaseValue ?? 0)}
          hint="Sum of purchase unit prices"
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label="Total Land Balance"
          value={formatRwf(data?.stats.totalLandBalance ?? 0)}
          hint="Opening + purchases"
          icon={<BarChart3 size={18} />}
          valueClassName="text-[#000435]"
        />
        <StatCard
          label="Total Land Size"
          value={formatNumber(data?.stats.totalSize ?? 0)}
          hint="Numeric size values where available"
          icon={<Ruler size={18} />}
        />
        <StatCard
          label="Financial Year"
          value={data?.financialYear.year ?? year ?? '—'}
          hint={data?.financialYear.status ?? 'No year selected'}
          icon={<CalendarRange size={18} />}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-navy">Land Overview</h2>
          <p className="text-xs text-muted">Province distribution and purchase value trend</p>
        </div>
        {loading ? (
          <span className="inline-flex items-center gap-2 text-xs text-muted">
            <Loader2 size={14} className="animate-spin" /> Updating…
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BarList
          title="Land Distribution by Province"
          description="Purchase value by province"
          points={data?.charts.byProvince ?? []}
        />

        <section className="hr-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-navy">Purchase Value Trend by Year</h3>
              <p className="mt-0.5 text-[11px] text-muted">Purchase value and records by purchase year</p>
            </div>
            <TrendingUp size={18} className="text-ochre" />
          </div>
          {trend.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
              No purchase history for the selected filters.
            </p>
          ) : (
            <div className="mt-5 flex h-52 items-end gap-3 pb-2">
              {trend.map((point) => (
                <div
                  key={point.year}
                  className="group relative flex min-w-[48px] flex-1 flex-col items-center gap-2"
                >
                  <span className="text-[10px] font-medium tabular-nums text-muted">
                    {formatRwf(point.value)}
                  </span>
                  <div className="flex h-32 w-full items-end rounded-t-lg bg-slate-50">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-navy to-primary transition-opacity group-hover:opacity-90"
                      style={{ height: `${Math.max(6, (point.value / trendMax) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-navy">{point.year}</span>
                  <span className="text-[9px] text-muted">
                    {formatNumber(point.count)} {point.count === 1 ? 'record' : 'records'}
                  </span>
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden w-max -translate-x-1/2 rounded-lg bg-navy px-3 py-2 text-center text-[10px] text-white shadow-lg group-hover:block">
                    <p className="font-semibold">{point.year}</p>
                    <p className="mt-0.5 tabular-nums">{formatRwf(point.value)}</p>
                    <p className="text-white/75">
                      {formatNumber(point.count)} {point.count === 1 ? 'record' : 'records'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AssetsPageLayout>
  );
}
