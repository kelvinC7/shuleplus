'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CalendarRange,
  Car,
  CircleDollarSign,
  Gauge,
  Loader2,
  MapPin,
  Package,
  Settings2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { StatCard } from '@/components/stat-card';
import { vehicleApi } from '@/services/vehicle-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatNumber, formatRwf } from '@/utils/format';
import type { VehicleChartPoint, VehicleDashboard, VehicleMeta } from '@/types';

const EMPTY_META: VehicleMeta = {
  organizationName: '',
  years: [],
  activeYear: null,
  locations: [],
  names: [],
  labels: [],
  types: [],
  categories: [],
  suppliers: [],
  purchaseYears: [],
};

type Filters = {
  location: string;
  type: string;
  category: string;
  supplier: string;
  purchaseYear: string;
};

const EMPTY_FILTERS: Filters = {
  location: '',
  type: '',
  category: '',
  supplier: '',
  purchaseYear: '',
};

function BarList({
  title,
  description,
  points,
  formatter = formatRwf,
}: {
  title: string;
  description: string;
  points: VehicleChartPoint[];
  formatter?: (value: number) => string;
}) {
  const max = Math.max(...points.map((p) => p.purchaseValue), 1);
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
                  {formatter(point.purchaseValue)} · {formatNumber(point.count)} record
                  {point.count === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-navy via-navy-light to-primary"
                  style={{ width: `${Math.max(4, (point.purchaseValue / max) * 100)}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
                <span>Sale {formatRwf(point.saleBalance)}</span>
                <span>Total {formatRwf(point.totalBalance)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function TrendChart({
  title,
  description,
  points,
  series,
}: {
  title: string;
  description: string;
  points: Array<Record<string, number>>;
  series: Array<{ key: string; label: string; color: string }>;
}) {
  const allValues = points.flatMap((point) => series.map((s) => Number(point[s.key]) || 0));
  const max = Math.max(...allValues, 1);
  return (
    <section className="hr-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-navy">{title}</h3>
          <p className="mt-0.5 text-[11px] text-muted">{description}</p>
        </div>
        <TrendingUp size={18} className="text-ochre" />
      </div>
      {points.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
          No trend data for the selected filters.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-muted">
            {series.map((item) => (
              <span key={item.key} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${item.color}`} /> {item.label}
              </span>
            ))}
          </div>
          <div className="mt-4 flex h-52 items-end gap-3 overflow-x-auto pb-2">
            {points.map((point, index) => (
              <div key={`${point.year}-${index}`} className="flex min-w-[56px] flex-1 flex-col items-center gap-2">
                <div className="flex h-32 w-full items-end justify-center gap-1 rounded-t-lg bg-slate-50 px-1">
                  {series.map((item) => {
                    const value = Number(point[item.key]) || 0;
                    return (
                      <div
                        key={item.key}
                        className={`w-full max-w-[14px] rounded-t ${item.color}`}
                        style={{ height: `${Math.max(3, (value / max) * 100)}%` }}
                        title={`${item.label}: ${formatRwf(value)}`}
                      />
                    );
                  })}
                </div>
                <span className="text-[11px] font-semibold text-navy">{point.year}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function VehicleDashboardView() {
  const toast = useToast();
  const [meta, setMeta] = useState<VehicleMeta>(EMPTY_META);
  const [year, setYear] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [data, setData] = useState<VehicleDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await vehicleApi.meta();
        setMeta(response.data.data);
        setYear(response.data.data.activeYear ?? response.data.data.years[0]?.year ?? null);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Could not load Vehicle metadata'));
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
      const response = await vehicleApi.dashboard({
        year,
        location: filters.location || undefined,
        type: filters.type || undefined,
        category: filters.category || undefined,
        supplier: filters.supplier || undefined,
        purchase_year: filters.purchaseYear ? Number(filters.purchaseYear) : undefined,
      });
      setData(response.data.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load the Vehicle dashboard'));
    } finally {
      setLoading(false);
    }
  }, [year, filters, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const optionList = (values: Array<string | number>) =>
    values.map((value) => (
      <option key={String(value)} value={value}>
        {value}
      </option>
    ));

  const filterLabels = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  return (
    <AssetsPageLayout
      title="Vehicle Dashboard"
      subtitle={`Vehicle asset performance for ${data?.financialYear.year ?? year ?? '—'}`}
      actions={
        <>
          <Link href="/vehicles/setup" className="btn-secondary">
            <Settings2 size={16} /> Vehicle Setup
          </Link>
          <Link href="/vehicles/register" className="btn-primary">
            <Car size={16} /> Vehicle Register
          </Link>
        </>
      }
    >
      <div className="hr-card p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="w-full lg:w-40">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
              Financial Year
            </label>
            <select className="input" value={year ?? ''} onChange={(e) => setYear(Number(e.target.value))}>
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
                ['location', 'Location', meta.locations],
                ['type', 'Type', meta.types],
                ['category', 'Category', meta.categories],
                ['supplier', 'Supplier', meta.suppliers],
                ['purchaseYear', 'Purchase Year', meta.purchaseYears],
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
          <strong>Vehicle Setup not configured.</strong> Add an opening amount and depreciation
          configuration for {data?.financialYear.year ?? year} to start tracking vehicles.{' '}
          <Link href="/vehicles/setup" className="font-semibold underline">
            Open Vehicle Setup
          </Link>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
        <StatCard
          label="Total Vehicles"
          value={formatNumber(data?.stats.totalVehicles ?? 0)}
          hint="Registered vehicle records"
          icon={<Car size={18} />}
        />
        <StatCard
          label="Opening Amount"
          value={formatRwf(data?.stats.openingAmount ?? 0)}
          hint="From Vehicle Setup"
          icon={<Wallet size={18} />}
        />
        <StatCard
          label="Total Purchase Value"
          value={formatRwf(data?.stats.totalPurchaseValue ?? 0)}
          hint="Sum of purchase unit prices"
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label="Total Sale Balance"
          value={formatRwf(data?.stats.totalSaleBalance ?? 0)}
          hint="Sum of sale balances"
          icon={<TrendingDown size={18} />}
        />
        <StatCard
          label="Total Balance"
          value={formatRwf(data?.stats.totalBalance ?? 0)}
          hint="Opening + purchases − sale balance"
          icon={<BarChart3 size={18} />}
          valueClassName="text-[#000435]"
        />
        <StatCard
          label="Accumulated Depreciation"
          value={formatRwf(data?.stats.accumulatedDepreciation ?? 0)}
          hint="Setup accumulated + annual depreciation"
          icon={<TrendingDown size={18} />}
        />
        <StatCard
          label="Net Book Value"
          value={formatRwf(data?.stats.netBookValue ?? 0)}
          hint="Total balance − total depreciation"
          icon={<CircleDollarSign size={18} />}
        />
        <StatCard
          label="Total Vehicle Quantity"
          value={formatNumber(data?.stats.totalQuantity ?? 0)}
          hint="Sum of record quantities"
          icon={<Package size={18} />}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-navy">Vehicle Analytics</h2>
          <p className="text-xs text-muted">Distribution, purchase, sale and depreciation trends</p>
        </div>
        {loading ? (
          <span className="inline-flex items-center gap-2 text-xs text-muted">
            <Loader2 size={14} className="animate-spin" /> Updating…
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BarList
          title="Vehicles by Location"
          description="Purchase value grouped by location"
          points={data?.charts.byLocation ?? []}
        />
        <BarList
          title="Vehicles by Type"
          description="Purchase value grouped by vehicle type"
          points={data?.charts.byType ?? []}
        />
        <BarList
          title="Vehicles by Category"
          description="Purchase value grouped by category"
          points={data?.charts.byCategory ?? []}
        />
        <TrendChart
          title="Purchase Value by Year"
          description="Purchase value grouped by purchase year"
          points={data?.charts.purchaseValueByYear ?? []}
          series={[{ key: 'value', label: 'Purchase value', color: 'bg-navy' }]}
        />
        <TrendChart
          title="Sale Balance by Year"
          description="Sale balance grouped by purchase year"
          points={data?.charts.saleBalanceByYear ?? []}
          series={[{ key: 'value', label: 'Sale balance', color: 'bg-amber-500' }]}
        />
        <TrendChart
          title="Total Balance by Financial Year"
          description="Closing vehicle balance per financial year"
          points={data?.charts.totalBalanceByFY ?? []}
          series={[{ key: 'value', label: 'Total balance', color: 'bg-primary' }]}
        />
        <TrendChart
          title="Depreciation Trends"
          description="Annual, accumulated and total depreciation per financial year"
          points={data?.charts.depreciationTrends ?? []}
          series={[
            { key: 'annualDepreciation', label: 'Annual', color: 'bg-sky-600' },
            { key: 'totalDepreciation', label: 'Total', color: 'bg-violet-600' },
            { key: 'accumulatedDepreciation', label: 'Accumulated', color: 'bg-slate-500' },
          ]}
        />
        <TrendChart
          title="Net Book Value Trends"
          description="Net book value compared with total balance per financial year"
          points={data?.charts.netBookValueTrends ?? []}
          series={[
            { key: 'netBookValue', label: 'Net book value', color: 'bg-emerald-600' },
            { key: 'totalBalance', label: 'Total balance', color: 'bg-navy' },
          ]}
        />
      </div>

      <div className="hr-card p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-primary">
            <MapPin size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy">Vehicles are fully independent</p>
            <p className="mt-1 text-xs text-muted">
              These statistics only include records from the dedicated Vehicle register. Other asset
              categories, their depreciation, and their historical balances are not affected.
            </p>
          </div>
          <div className="ml-auto hidden shrink-0 items-center gap-2 text-[11px] text-muted sm:flex">
            <Gauge size={14} />
            <span>{data?.financialYear.status ?? 'No year selected'}</span>
            <CalendarRange size={14} />
            <span>{data?.financialYear.year ?? year ?? '—'}</span>
          </div>
        </div>
      </div>
    </AssetsPageLayout>
  );
}
