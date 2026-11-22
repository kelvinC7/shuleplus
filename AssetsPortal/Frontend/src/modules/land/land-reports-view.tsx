'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Download,
  FileBarChart,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
} from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { landApi } from '@/services/land-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatNumber, formatRwf } from '@/utils/format';
import type { LandMeta, LandReport, LandReportType } from '@/types';
import { exportRowsToExcel, formatReportValue, printLandReport } from './land-export';

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
  from: string;
  to: string;
};

const EMPTY_FILTERS: Filters = {
  province: '',
  district: '',
  sector: '',
  category: '',
  supplier: '',
  from: '',
  to: '',
};

export function LandReportsView() {
  const toast = useToast();
  const [meta, setMeta] = useState<LandMeta>(EMPTY_META);
  const [reportTypes, setReportTypes] = useState<LandReportType[]>([]);
  const [type, setType] = useState('register');
  const [year, setYear] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [report, setReport] = useState<LandReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [metaRes, typesRes] = await Promise.all([landApi.meta(), landApi.reportTypes()]);
        setMeta(metaRes.data.data);
        setReportTypes(typesRes.data.data);
        setYear(metaRes.data.data.activeYear ?? metaRes.data.data.years[0]?.year ?? null);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Could not load Land reports'));
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
      const response = await landApi.report(type, {
        year,
        province: filters.province || undefined,
        district: filters.district || undefined,
        sector: filters.sector || undefined,
        category: filters.category || undefined,
        supplier: filters.supplier || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      setReport(response.data.data);
    } catch (err) {
      const message = getApiErrorMessage(err, 'Could not generate the Land report');
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
      `land-${report.type}-${report.financialYear.year}.xlsx`,
      report.columns,
      report.rows
    );
    toast.success('Report exported to Excel.');
  }

  const optionList = (values: string[]) =>
    values.map((value) => (
      <option key={value} value={value}>
        {value}
      </option>
    ));

  return (
    <AssetsPageLayout
      title="Land Reports"
      subtitle="Professional Land reports with Excel and print-ready PDF export"
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
            onClick={() => report && printLandReport(report)}
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
              {reportTypes.map((item) => (
                <option key={item.type} value={item.type}>
                  {item.label}
                </option>
              ))}
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <Search size={13} /> Filters are applied on the backend before the report is generated.
          </p>
          <button
            type="button"
            className="text-xs font-medium text-ochre hover:underline"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Clear location & date filters
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
              <table className="w-full min-w-[820px] text-left text-sm">
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
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} /> Land reports only include dedicated Land records.
            </span>
            <Link href="/land/register" className="font-medium text-ochre hover:underline">
              Open Land Register
            </Link>
          </div>
        </div>
      ) : null}
    </AssetsPageLayout>
  );
}
