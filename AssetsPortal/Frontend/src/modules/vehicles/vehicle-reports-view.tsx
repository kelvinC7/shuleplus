'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Download,
  FileBarChart,
  FileText,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { vehicleApi } from '@/services/vehicle-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatNumber, formatRwf } from '@/utils/format';
import type { VehicleMeta, VehicleReport, VehicleReportType } from '@/types';
import { exportRowsToExcel, formatReportValue, printVehicleReport } from './vehicle-export';

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
  from: string;
  to: string;
};

const EMPTY_FILTERS: Filters = {
  location: '',
  type: '',
  category: '',
  supplier: '',
  purchaseYear: '',
  from: '',
  to: '',
};

export function VehicleReportsView() {
  const toast = useToast();
  const [meta, setMeta] = useState<VehicleMeta>(EMPTY_META);
  const [reportTypes, setReportTypes] = useState<VehicleReportType[]>([]);
  const [type, setType] = useState('register');
  const [year, setYear] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [report, setReport] = useState<VehicleReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [metaRes, typesRes] = await Promise.all([vehicleApi.meta(), vehicleApi.reportTypes()]);
        setMeta(metaRes.data.data);
        setReportTypes(typesRes.data.data);
        setYear(metaRes.data.data.activeYear ?? metaRes.data.data.years[0]?.year ?? null);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Could not load Vehicle reports'));
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
    setError(null);
    try {
      const response = await vehicleApi.report(type, {
        year,
        location: filters.location || undefined,
        type: filters.type || undefined,
        category: filters.category || undefined,
        supplier: filters.supplier || undefined,
        purchase_year: filters.purchaseYear ? Number(filters.purchaseYear) : undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      setReport(response.data.data);
    } catch (err) {
      const message = getApiErrorMessage(err, 'Could not generate the Vehicle report');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [type, year, filters, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleExcel() {
    if (!report) return;
    exportRowsToExcel(
      `vehicle-${report.type}-${report.financialYear.year}.xlsx`,
      report.columns,
      report.rows
    );
    toast.success('Report exported to Excel.');
  }

  const optionList = (values: Array<string | number>) =>
    values.map((value) => (
      <option key={String(value)} value={value}>
        {value}
      </option>
    ));

  return (
    <AssetsPageLayout
      title="Vehicle Reports"
      subtitle="Professional vehicle reports with Excel and print-ready PDF export"
      actions={
        <>
          <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className="btn-secondary" onClick={handleExcel} disabled={!report}>
            <Download size={16} /> Excel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => report && printVehicleReport(report)}
            disabled={!report}
          >
            <FileText size={16} /> PDF
          </button>
        </>
      }
    >
      <div className="hr-card p-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
              Report
            </label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {reportTypes.length === 0 ? (
                <option value="register">Vehicle Register</option>
              ) : (
                reportTypes.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.label}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
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
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
              From Purchase Date
            </label>
            <input
              type="date"
              className="input"
              value={filters.from}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
              To Purchase Date
            </label>
            <input
              type="date"
              className="input"
              value={filters.to}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <Search size={13} /> Filters are applied on the backend before the report is generated.
          </p>
          <button
            type="button"
            className="text-xs font-medium text-ochre hover:underline"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Clear all filters
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading && !report ? (
        <div className="hr-card flex h-48 items-center justify-center gap-2 text-sm text-muted">
          <Loader2 size={18} className="animate-spin" /> Generating report…
        </div>
      ) : report ? (
        <div className="space-y-4">
          <div className="hr-card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-gradient-to-r from-navy to-navy-light px-5 py-5 text-white">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/90">
                  {report.organization.name}
                </p>
                <h2 className="mt-1 text-xl font-bold">{report.title}</h2>
                <p className="mt-1 text-xs text-white/70">{report.subtitle}</p>
              </div>
              <div className="text-right text-xs text-white/80">
                <p>
                  Financial Year <span className="font-semibold text-white">{report.financialYear.year}</span>
                </p>
                <p className="mt-1">{report.financialYear.status}</p>
                <p className="mt-1">
                  Generated {new Date(report.generatedAt).toLocaleString('en-GB')}
                </p>
              </div>
            </div>

            <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 xl:grid-cols-4">
              {report.summary.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{item.label}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-navy">
                    {item.type === 'money'
                      ? formatRwf(Number(item.value))
                      : item.type === 'number'
                        ? formatNumber(Number(item.value))
                        : String(item.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="hr-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                <FileBarChart size={16} className="text-ochre" /> Report Data
              </div>
              <p className="text-xs text-muted">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" /> Updating…
                  </span>
                ) : (
                  `${formatNumber(report.rows.length)} row${report.rows.length === 1 ? '' : 's'}`
                )}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/80 text-[10px] uppercase tracking-wide text-muted">
                    {report.columns.map((column) => (
                      <th
                        key={column.key}
                        className={`px-4 py-3 ${column.type === 'money' || column.type === 'number' ? 'text-right' : ''}`}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.length === 0 ? (
                    <tr>
                      <td colSpan={report.columns.length} className="px-4 py-12 text-center text-sm text-muted">
                        No records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    report.rows.map((row, index) => (
                      <tr key={index} className="border-b border-border/70 last:border-0 hover:bg-slate-50/60">
                        {report.columns.map((column) => (
                          <td
                            key={column.key}
                            className={`px-4 py-3 ${
                              column.type === 'money' || column.type === 'number'
                                ? 'text-right tabular-nums'
                                : ''
                            }`}
                          >
                            {formatReportValue(row[column.key], column.type)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted">
            <span>
              Vehicle reports only include dedicated Vehicle records. Other asset categories are not
              affected.
            </span>
            <Link href="/vehicles/register" className="font-medium text-ochre hover:underline">
              Open Vehicle Register
            </Link>
          </div>
        </div>
      ) : null}
    </AssetsPageLayout>
  );
}
