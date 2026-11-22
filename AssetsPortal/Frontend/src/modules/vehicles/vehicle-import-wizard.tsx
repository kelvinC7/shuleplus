'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Car,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Settings2,
  Upload,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { vehicleApi } from '@/services/vehicle-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatNumber, formatRwf } from '@/utils/format';
import type { VehicleImportPreview, VehicleMeta, VehicleSetupSummary } from '@/types';

const TEMPLATE_COLUMNS = [
  'location',
  'name',
  'label',
  'type',
  'category',
  'supplier',
  'tax',
  'upi',
  'sku',
  'size',
  'material',
  'purchase_year',
  'purchase_month',
  'purchase_day',
  'purchase_unit_price',
  'SALE BALANCE',
];

const STEPS = [
  { id: 1, label: 'Financial Year & Setup' },
  { id: 2, label: 'Upload & Preview' },
  { id: 3, label: 'Confirm Import' },
];

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

type RawRow = Record<string, unknown>;

function downloadTemplate() {
  const sheet = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]);
  sheet['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 18 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Vehicle Import');
  XLSX.writeFile(workbook, 'vehicle-import-template.xlsx');
}

function normaliseHeader(value: unknown) {
  return String(value ?? '').trim();
}

/**
 * The Vehicle upload template must have exactly the 16 columns below, in order.
 * Calculated fields are never accepted in the upload file.
 */
function validateTemplateHeader(header: string[]): string | null {
  const trimmed = [...header];
  while (trimmed.length > 0 && normaliseHeader(trimmed[trimmed.length - 1]) === '') {
    trimmed.pop();
  }
  const actual = trimmed.map((column) => normaliseHeader(column).toLowerCase());
  const expected = TEMPLATE_COLUMNS.map((column) => column.toLowerCase());
  if (actual.length !== expected.length) {
    return `The template must have exactly ${expected.length} columns in order: ${TEMPLATE_COLUMNS.join(
      ', '
    )}. Found ${actual.length} column(s).`;
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      return `Column ${index + 1} must be "${TEMPLATE_COLUMNS[index]}" but found "${
        trimmed[index] || '(empty)'
      }". Use the exact template column order.`;
    }
  }
  return null;
}

function previewDate(data: Record<string, unknown>): string {
  const year = data.purchaseYear;
  if (!year) return '—';
  const month = data.purchaseMonth ? String(data.purchaseMonth).padStart(2, '0') : '';
  const day = data.purchaseDay ? String(data.purchaseDay).padStart(2, '0') : '';
  return [year, month, day].filter(Boolean).join('-');
}

export function VehicleImportView() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [meta, setMeta] = useState<VehicleMeta>(EMPTY_META);
  const [year, setYear] = useState<number | null>(null);
  const [setup, setSetup] = useState<VehicleSetupSummary | null>(null);
  const [step, setStep] = useState(1);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<RawRow[]>([]);
  const [preview, setPreview] = useState<VehicleImportPreview | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<{ imported: number; closingBalance: number } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await vehicleApi.meta();
        setMeta(response.data.data);
        setYear(response.data.data.activeYear ?? response.data.data.years[0]?.year ?? null);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Could not load financial years'));
        setLoadingSetup(false);
      }
    })();
  }, [toast]);

  const loadSetup = useCallback(async () => {
    if (!year) {
      setLoadingSetup(false);
      return;
    }
    setLoadingSetup(true);
    try {
      const response = await vehicleApi.setup(year);
      setSetup(response.data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not load Vehicle Setup'));
    } finally {
      setLoadingSetup(false);
    }
  }, [year, toast]);

  useEffect(() => {
    void loadSetup();
  }, [loadSetup]);

  function resetUpload() {
    setFileName('');
    setRows([]);
    setPreview(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    setPreview(null);
    setRows([]);
    setImported(null);

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError('Please upload an .xlsx or .xls file.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('The file is too large. Maximum size is 15 MB.');
      return;
    }

    setParsing(true);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error('The workbook has no worksheets.');
      const sheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });
      if (matrix.length < 2) throw new Error('The sheet is empty. Add at least one vehicle row.');

      const header = (matrix[0] as unknown[]).map(normaliseHeader);
      const headerError = validateTemplateHeader(header);
      if (headerError) throw new Error(headerError);

      const parsedRows: RawRow[] = [];
      for (const rawCells of matrix.slice(1)) {
        const cells = rawCells as unknown[];
        const row: RawRow = {};
        header.forEach((column, index) => {
          if (!column) return;
          row[column] = cells[index] ?? '';
        });
        const hasValue = Object.values(row).some((value) => String(value ?? '').trim() !== '');
        if (hasValue) parsedRows.push(row);
      }
      if (parsedRows.length === 0) throw new Error('No data rows were found in the file.');

      setRows(parsedRows);
      if (!year) throw new Error('Select a financial year first.');

      const previewResponse = await vehicleApi.importPreview(year, parsedRows);
      setPreview(previewResponse.data.data);
      setStep(2);
    } catch (err) {
      resetUpload();
      const message =
        err instanceof Error && !('response' in err)
          ? err.message
          : getApiErrorMessage(err, 'Could not read the Excel file');
      setError(message);
      toast.error(message);
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!year || !preview?.summary.canImport) return;
    setImporting(true);
    setError(null);
    try {
      const response = await vehicleApi.importCommit(year, rows, fileName);
      setImported({
        imported: response.data.data.imported,
        closingBalance: response.data.data.closingBalance,
      });
      toast.success(`${response.data.data.imported} vehicle record(s) imported successfully.`);
      await loadSetup();
    } catch (err) {
      const message = getApiErrorMessage(err, 'Could not import the vehicle records');
      setError(message);
      toast.error(message);
    } finally {
      setImporting(false);
    }
  }

  function goToStep(next: number) {
    setError(null);
    if (next === 1) {
      resetUpload();
    }
    setStep(next);
  }

  const validRows = preview?.rows.filter((row) => row.status === 'valid') ?? [];
  const validCount = preview?.summary.valid ?? 0;
  const invalidRows = preview?.rows.filter((row) => row.status !== 'valid') ?? [];

  return (
    <AssetsPageLayout
      title="Import Vehicles"
      subtitle="Bulk import vehicle records from Excel with automatic sequential balances and depreciation"
      actions={
        <>
          <Link href="/vehicles/register" className="btn-secondary">
            <Car size={16} /> Vehicle Register
          </Link>
          <Link href="/vehicles/setup" className="btn-secondary">
            <Settings2 size={16} /> Vehicle Setup
          </Link>
        </>
      }
    >
      <ol className="hr-card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        {STEPS.map((item, index) => {
          const active = step === item.id;
          const complete = step > item.id;
          return (
            <li key={item.id} className="flex flex-1 items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  active
                    ? 'bg-primary text-navy shadow-sm'
                    : complete
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-muted'
                }`}
              >
                {complete ? <CheckCircle2 size={18} /> : item.id}
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${active ? 'text-navy' : 'text-muted'}`}>
                  Step {item.id}
                </p>
                <p className={`truncate text-sm ${active ? 'font-semibold text-navy' : 'text-muted'}`}>
                  {item.label}
                </p>
              </div>
              {index < STEPS.length - 1 ? (
                <ChevronRight size={16} className="ml-auto hidden text-border sm:block" />
              ) : null}
            </li>
          );
        })}
      </ol>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <section className="hr-card p-5">
            <h2 className="text-sm font-semibold text-navy">Select financial year</h2>
            <p className="mt-0.5 text-xs text-muted">
              Vehicle imports always belong to one financial year and use its Vehicle Setup opening
              amount and depreciation configuration.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                Financial Year
              </label>
              <select
                className="input"
                value={year ?? ''}
                onChange={(e) => setYear(Number(e.target.value))}
                disabled={loadingSetup}
              >
                {meta.years.map((fy) => (
                  <option key={fy.id} value={fy.year}>
                    {fy.year} {fy.year === meta.activeYear ? '• Active' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              {loadingSetup ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 size={16} className="animate-spin" /> Loading Vehicle Setup…
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Vehicle Setup Opening Amount
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-navy">
                    {setup?.configured ? formatRwf(setup.openingAmount) : 'Not configured'}
                  </p>
                  {setup?.configured ? (
                    <div className="mt-2 grid gap-1 text-xs text-muted">
                      <span>
                        {setup.recordCount} existing record(s) • closing balance{' '}
                        {formatRwf(setup.closingBalance)}
                      </span>
                      <span>
                        {setup.depreciationMode} · {formatNumber(setup.depreciationRate)}% ·{' '}
                        {formatNumber(setup.usefulYears)} useful years
                      </span>
                      <span>
                        Accumulated depreciation {formatRwf(setup.accumulatedDepreciation)} · total sale
                        balance {formatRwf(setup.totalSaleBalance)}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-amber-700">
                      A Vehicle Setup opening amount is required before importing.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={!setup?.configured || loadingSetup}
                onClick={() => setStep(2)}
              >
                Continue <ArrowRight size={16} />
              </button>
              {!setup?.configured ? (
                <Link href="/vehicles/setup" className="btn-secondary">
                  <Settings2 size={16} /> Configure Vehicle Setup
                </Link>
              ) : null}
            </div>
          </section>

          <section className="hr-card p-5">
            <h2 className="text-sm font-semibold text-navy">Before you import</h2>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              <li className="flex gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                Use the exact 16 template columns in order: <strong className="text-navy">location</strong>,{' '}
                name, label, type, category, supplier, tax, upi, sku, size, material, purchase_year,
                purchase_month, purchase_day, purchase_unit_price, <strong className="text-navy">SALE BALANCE</strong>.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                Only <strong className="text-navy">purchase_unit_price</strong> is required. Every other
                column, including SALE BALANCE, can be empty.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                Opening amounts, total balances and depreciation are computed automatically in record
                order using Vehicle Setup.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                Calculated fields such as opening amount, total balance, depreciation, net book value
                and quantity are never part of the template.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                Invalid rows and duplicate UPIs/SKUs block the import until corrected. The same file
                cannot be imported twice into the same financial year.
              </li>
            </ul>
            <button type="button" className="btn-secondary mt-4" onClick={downloadTemplate}>
              <Download size={16} /> Download Excel Template
            </button>
          </section>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <section className="hr-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-navy">Upload Excel file</h2>
                <p className="mt-0.5 text-xs text-muted">
                  Accepted formats: .xlsx and .xls · Financial year {year} · Starting opening{' '}
                  {formatRwf(preview?.summary.startingOpeningAmount ?? setup?.closingBalance ?? 0)}
                </p>
              </div>
              <button type="button" className="btn-secondary" onClick={downloadTemplate}>
                <Download size={16} /> Template
              </button>
            </div>

            <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-5 py-8 text-center">
              <CloudUpload size={34} className="mx-auto text-ochre" />
              <p className="mt-2 text-sm font-semibold text-navy">
                {fileName || 'Choose an Excel file or drop it here'}
              </p>
              <p className="mt-1 text-xs text-muted">
                The file must contain the 16 template columns in order. The first sheet is imported.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" className="btn-primary" onClick={() => fileRef.current?.click()} disabled={parsing}>
                  {parsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {parsing ? 'Reading file…' : 'Select Excel File'}
                </button>
                {fileName ? (
                  <button type="button" className="btn-secondary" onClick={resetUpload} disabled={parsing}>
                    <RefreshCw size={16} /> Replace File
                  </button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </section>

          {preview ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <div className="hr-card p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Total Rows</p>
                  <p className="mt-1 text-xl font-bold text-navy">{preview.summary.total}</p>
                </div>
                <div className="hr-card border-emerald-200 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Valid</p>
                  <p className="mt-1 text-xl font-bold text-emerald-700">{preview.summary.valid}</p>
                </div>
                <div className="hr-card border-red-200 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-red-600">Invalid</p>
                  <p className="mt-1 text-xl font-bold text-red-600">{preview.summary.invalid}</p>
                </div>
                <div className="hr-card border-amber-200 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Duplicates</p>
                  <p className="mt-1 text-xl font-bold text-amber-700">{preview.summary.duplicates}</p>
                </div>
                <div className="hr-card p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Total Purchase</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-navy">
                    {formatRwf(preview.summary.totalPurchaseValue)}
                  </p>
                </div>
                <div className="hr-card p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Total Sale Balance</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-amber-700">
                    {formatRwf(preview.summary.totalSaleBalance)}
                  </p>
                </div>
              </div>

              {invalidRows.length > 0 ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
                    <AlertTriangle size={16} /> Fix the highlighted rows before importing
                  </p>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-red-700">
                    {invalidRows.slice(0, 20).map((row) => (
                      <li key={row.row}>
                        <strong>Row {row.row}:</strong> {row.errors.join('; ')}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <section className="hr-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                    <FileSpreadsheet size={16} className="text-emerald-600" /> Preview
                  </div>
                  <p className="text-xs text-muted">{fileName}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/80 text-[10px] uppercase tracking-wide text-muted">
                        <th className="px-3 py-2.5">Row</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Vehicle Name</th>
                        <th className="px-3 py-2.5">Location</th>
                        <th className="px-3 py-2.5">UPI</th>
                        <th className="px-3 py-2.5">Type</th>
                        <th className="px-3 py-2.5">Purchase Date</th>
                        <th className="px-3 py-2.5 text-right">Opening</th>
                        <th className="px-3 py-2.5 text-right">Purchase Price</th>
                        <th className="px-3 py-2.5 text-right">Sale Balance</th>
                        <th className="px-3 py-2.5 text-right">Total Balance</th>
                        <th className="px-3 py-2.5 text-right">Annual Dep.</th>
                        <th className="px-3 py-2.5 text-right">Net Book Value</th>
                        <th className="px-3 py-2.5">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => {
                        const data = (row.data ?? {}) as Record<string, unknown>;
                        const ok = row.status === 'valid';
                        return (
                          <tr
                            key={row.row}
                            className={
                              ok
                                ? 'border-b border-border/60'
                                : row.status === 'duplicate'
                                  ? 'border-b border-border/60 bg-amber-50/70'
                                  : 'border-b border-border/60 bg-red-50/70'
                            }
                          >
                            <td className="px-3 py-2 font-medium tabular-nums text-navy">{row.row}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  ok
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : row.status === 'duplicate'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {ok ? 'Valid' : row.status === 'duplicate' ? 'Duplicate' : 'Invalid'}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-medium text-navy">
                              {String(data.name ?? '—')}
                            </td>
                            <td className="px-3 py-2">{String(data.location ?? '—')}</td>
                            <td className="px-3 py-2 font-mono">{String(data.upi ?? '—')}</td>
                            <td className="px-3 py-2">{String(data.vehicleType ?? '—')}</td>
                            <td className="px-3 py-2">{previewDate(data)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.openingAmount === null ? '—' : formatRwf(row.openingAmount)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.purchaseUnitPrice === null ? '—' : formatRwf(row.purchaseUnitPrice)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                              {row.saleBalance === null || Number(row.saleBalance) === 0
                                ? '—'
                                : formatRwf(row.saleBalance)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums">
                              {row.totalBalance === null ? '—' : formatRwf(row.totalBalance)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.annualDep === null ? '—' : formatRwf(row.annualDep)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                              {row.netBookValue === null ? '—' : formatRwf(row.netBookValue)}
                            </td>
                            <td className="px-3 py-2 text-[11px] text-red-700">{row.errors.join('; ') || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" className="btn-secondary" onClick={() => goToStep(1)}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!preview.summary.canImport}
                  onClick={() => goToStep(3)}
                >
                  Continue to Confirm <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <section className="hr-card p-5">
            {imported ? (
              <div className="py-6 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={30} />
                </span>
                <h2 className="mt-4 text-lg font-bold text-navy">Import completed</h2>
                <p className="mt-1 text-sm text-muted">
                  {imported.imported} vehicle record(s) were imported in one transaction. The new
                  closing balance is <strong className="text-navy">{formatRwf(imported.closingBalance)}</strong>.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Link href="/vehicles/register" className="btn-primary">
                    <Car size={16} /> View Vehicle Register
                  </Link>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setImported(null);
                      goToStep(1);
                    }}
                  >
                    <Upload size={16} /> Import Another File
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-navy">Confirm import</h2>
                <p className="mt-0.5 text-xs text-muted">
                  Review the summary before writing the records to the Vehicle register. All rows are
                  written inside a single database transaction.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Financial Year</p>
                    <p className="mt-1 text-base font-bold text-navy">{year}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Vehicle Records</p>
                    <p className="mt-1 text-base font-bold tabular-nums text-navy">{validCount}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Vehicle Setup Opening Amount
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums text-navy">
                      {formatRwf(preview?.summary.openingAmount ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Starting Opening (after existing records)
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums text-navy">
                      {formatRwf(preview?.summary.startingOpeningAmount ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Total Purchase Unit Prices
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums text-navy">
                      {formatRwf(preview?.summary.totalPurchaseValue ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Total Sale Balance
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums text-amber-700">
                      {formatRwf(preview?.summary.totalSaleBalance ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-primary/30 bg-amber-50/80 px-4 py-3 sm:col-span-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ochre">
                      Expected Total Balance
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-navy">
                      {formatRwf(preview?.summary.expectedTotalBalance ?? 0)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      Starting opening + all imported purchase unit prices − all imported sale balances
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Expected Annual Depreciation
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums text-navy">
                      {formatRwf(preview?.summary.expectedAnnualDepreciation ?? 0)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {preview?.summary.depreciationMode} ·{' '}
                      {formatNumber(preview?.summary.depreciationRate ?? 0)}% ·{' '}
                      {formatNumber(preview?.summary.usefulYears ?? 0)} years
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Expected Total Depreciation
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums text-navy">
                      {formatRwf(preview?.summary.expectedTotalDepreciation ?? 0)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      Including accumulated {formatRwf(preview?.summary.expectedAccumulatedDepreciation ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 sm:col-span-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Expected Net Book Value
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums text-navy">
                      {formatRwf(preview?.summary.expectedNetBookValue ?? 0)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary" onClick={() => goToStep(2)} disabled={importing}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button type="button" className="btn-primary" onClick={() => void handleImport()} disabled={importing}>
                    {importing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {importing ? 'Importing…' : `Import ${validCount} Record${validCount === 1 ? '' : 's'}`}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => goToStep(1)} disabled={importing}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="hr-card p-5">
            <h3 className="text-sm font-semibold text-navy">Sequential balance preview</h3>
            <p className="mt-0.5 text-xs text-muted">
              Opening + purchase − sale balance carries into the next imported record.
            </p>
            <div className="mt-4 space-y-2">
              {validRows.slice(0, 8).map((row) => (
                <div
                  key={row.row}
                  className="rounded-xl border border-border px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-navy">Row {row.row}</span>
                    <span className="font-semibold tabular-nums text-navy">
                      {formatRwf(row.totalBalance ?? 0)}
                    </span>
                  </div>
                  <p className="mt-0.5 tabular-nums text-muted">
                    {formatRwf(row.openingAmount ?? 0)} + {formatRwf(row.purchaseUnitPrice ?? 0)} −{' '}
                    {formatRwf(row.saleBalance ?? 0)}
                  </p>
                </div>
              ))}
              {validRows.length > 8 ? (
                <p className="text-center text-[11px] text-muted">
                  + {validRows.length - 8} more records…
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </AssetsPageLayout>
  );
}
