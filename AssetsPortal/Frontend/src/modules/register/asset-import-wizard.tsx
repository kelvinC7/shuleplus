'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Copy,
  Download,
  FileSpreadsheet,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { assetsApi, type AssetImportPreviewRow } from '@/services/assets-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatRwf } from '@/utils/format';
import {
  buildCategoryTemplateWorkbook,
  buildImportTemplateWorkbook,
  categoryTemplateFileName,
  IMPORT_TEMPLATE_SHEETS,
  parseImportCsvOrSingleSheet,
  type ParsedImportSheet,
} from '@/utils/import-register-parse';
import { downloadImportPreviewRows } from '@/utils/import-preview-export';
import type { FinancialYear } from '@/types';

const STEPS = ['Year & mode', 'Upload file', 'Preview', 'Import'] as const;

type Props = {
  open: boolean;
  years: FinancialYear[];
  defaultYear?: number;
  onClose: () => void;
  onImported: () => void;
  /** Land register import — purchase-only rows; opening from Year Setup chain. */
  variant?: 'default' | 'land';
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function extractYearsFromImportRows(rows: Record<string, unknown>[]): number[] {
  const years = new Set<number>();
  for (const row of rows) {
    for (const [key, val] of Object.entries(row)) {
      if (!/year/i.test(key) || val == null || String(val).trim() === '') continue;
      const y = Number(String(val).replace(/,/g, '').trim());
      if (y >= 1900 && y <= 2100) years.add(y);
    }
  }
  return [...years];
}

function statusTone(status: AssetImportPreviewRow['status']) {
  if (status === 'ready') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (status === 'duplicate') return 'bg-amber-50 text-amber-900 border-amber-200';
  return 'bg-rose-50 text-rose-800 border-rose-200';
}

export function AssetImportWizard({
  open,
  years,
  defaultYear,
  onClose,
  onImported,
  variant = 'default',
}: Props) {
  const isLandImport = variant === 'land';
  const fileRef = useRef<HTMLInputElement>(null);
  const activeYear =
    years.find((y) => y.status === 'Active')?.year ?? defaultYear ?? new Date().getFullYear();

  const [step, setStep] = useState(0);
  const [firstTime, setFirstTime] = useState(true);
  const [registerYear, setRegisterYear] = useState(activeYear);
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [parsedSheets, setParsedSheets] = useState<ParsedImportSheet[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [previewRows, setPreviewRows] = useState<AssetImportPreviewRow[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    ready: number;
    duplicates: number;
    invalid: number;
  } | null>(null);
  const [categorySummary, setCategorySummary] = useState<
    Array<{
      category: string;
      year: number;
      opening: number;
      accumulated: number;
      source: string;
      readyCount: number;
    }>
  >([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [autoGenerateSku, setAutoGenerateSku] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ready' | 'duplicates' | 'invalid'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<{
    imported: number;
    skipped?: number;
    failed?: number;
    total?: number;
    errors?: Array<{ row: number; message: string }>;
    recalcErrors?: string[];
  } | null>(null);
  const [error, setError] = useState('');

  const previewYears = useMemo(
    () => [...new Set(previewRows.filter((r) => r.status === 'ready').map((r) => r.registerYear))].sort(),
    [previewRows]
  );
  const multiYearImport = previewYears.length > 1;

  const yearOptions = useMemo(() => {
    if (firstTime) {
      const active = years.filter((y) => y.status === 'Active');
      return active.length ? active : years;
    }
    const fromDb = years.map((y) => y.year);
    const extras: number[] = [];
    for (let y = new Date().getFullYear(); y >= 1900; y -= 1) {
      if (!fromDb.includes(y) && extras.length < 30) extras.push(y);
    }
    return [...new Set([...fromDb, ...extras])]
      .sort((a, b) => b - a)
      .map((year) => {
        const row = years.find((y) => y.year === year);
        return row ?? ({ id: `y-${year}`, year, status: 'Historical' } as FinancialYear);
      });
  }, [firstTime, years]);

  const filtered = useMemo(() => {
    let list = previewRows;
    if (filter === 'ready') list = list.filter((r) => r.status === 'ready');
    if (filter === 'duplicates') list = list.filter((r) => r.status === 'duplicate');
    if (filter === 'invalid') list = list.filter((r) => r.status === 'invalid');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.assetName.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.typeRaw.toLowerCase().includes(q)
      );
    }
    return list;
  }, [previewRows, filter, search]);

  const pageSize = 10;
  const paged = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  function reset() {
    setStep(0);
    setFirstTime(true);
    setRegisterYear(activeYear);
    setFile(null);
    setRawRows([]);
    setParsedSheets([]);
    setUploadProgress(0);
    setPreviewRows([]);
    setSummary(null);
    setCategorySummary([]);
    setSkipDuplicates(true);
    setAutoGenerateSku(true);
    setFilter('all');
    setSearch('');
    setPage(0);
    setLoadingPreview(false);
    setImporting(false);
    setImportProgress(0);
    setResult(null);
    setError('');
  }

  function handleClose() {
    if (importing) return;
    reset();
    onClose();
  }

  async function parseFile(f: File) {
    setError('');
    setFile(f);
    setUploadProgress(25);
    const buf = await f.arrayBuffer();
    setUploadProgress(70);
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const { rows, sheets } = parseImportCsvOrSingleSheet(wb, f.name);
    setUploadProgress(100);
    if (!rows.length) {
      setError(
        'Spreadsheet has no data rows. Download a category template below, or use a file named like assets-import-furniture.xlsx.'
      );
      setRawRows([]);
      setParsedSheets([]);
      return;
    }
    setRawRows(rows);
    setParsedSheets(sheets);
    const fileYears = extractYearsFromImportRows(rows);
    if (
      fileYears.length > 1 ||
      (fileYears.length === 1 && fileYears[0] !== activeYear)
    ) {
      setFirstTime(false);
    }
  }

  async function onFilePicked(f?: File | null) {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      setError('Supported formats: .xlsx, .xls, .csv');
      return;
    }
    await parseFile(f);
  }

  function downloadAllTemplates() {
    const wb = buildImportTemplateWorkbook();
    XLSX.writeFile(wb, 'assets-import-all-categories.xlsx');
  }

  function downloadCategoryTemplate(categoryId: string) {
    const wb = buildCategoryTemplateWorkbook(categoryId);
    if (!wb) return;
    XLSX.writeFile(wb, categoryTemplateFileName(categoryId));
  }

  function handleDownloadIssues(kind: 'duplicates' | 'missing') {
    const ok = downloadImportPreviewRows(previewRows, kind, registerYear);
    if (!ok) {
      setError(
        kind === 'duplicates'
          ? 'No duplicate rows to download.'
          : 'No missing or invalid rows to download.'
      );
    }
  }

  async function runPreview() {
    setLoadingPreview(true);
    setError('');
    try {
      const { data } = await assetsApi.importPreview({
        rows: rawRows,
        register_year: registerYear,
        entry_mode: firstTime ? 'year_setup' : 'legacy',
        first_time: firstTime,
      });
      setPreviewRows(data.data.rows);
      setSummary(data.data.summary);
      setCategorySummary(data.data.categorySummary ?? []);
      setStep(2);
      setPage(0);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not validate import rows'));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function startImport() {
    if (!summary || summary.ready <= 0) {
      setError('No ready rows to import');
      return;
    }
    setImporting(true);
    setImportProgress(8);
    setError('');
    setStep(3);
    const timer = window.setInterval(() => {
      setImportProgress((p) => (p >= 90 ? p : p + 6));
    }, 220);
    try {
      const source = skipDuplicates
        ? previewRows.filter((r) => r.status === 'ready')
        : previewRows.filter((r) => r.status === 'ready' || r.status === 'duplicate');
      const rowsToSend = source.map((r) => ({
        status: r.status,
        assetName: r.assetName,
        category: r.category,
        registerYear: r.registerYear,
        purchasePrice: r.purchasePrice,
        location: r.location,
        locationLabel: r.locationLabel,
        buildingStatus: r.buildingStatus,
        sku: r.sku,
        supplier: r.supplier,
        depRate: r.depRate,
      }));
      const { data } = await assetsApi.importAssets(rowsToSend as unknown as Record<string, unknown>[], {
        register_year: registerYear,
        entry_mode: firstTime ? 'year_setup' : 'legacy',
        first_time: firstTime,
        skip_duplicates: skipDuplicates,
        auto_generate_sku: autoGenerateSku,
      });
      setImportProgress(100);
      setResult({
        imported: data.data.imported,
        skipped: data.data.skipped,
        failed: data.data.failed,
        total: data.data.total,
        errors: data.data.errors,
        recalcErrors: data.data.recalcErrors,
      });
      onImported();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'ECONNABORTED') {
        setError(
          'Import timed out — the file is very large. Restart the backend, then import one category or one year at a time.'
        );
      } else {
        setError(getApiErrorMessage(err, 'Import failed'));
      }
      setStep(2);
    } finally {
      window.clearInterval(timer);
      setImporting(false);
    }
  }

  function canNext() {
    if (step === 0) return registerYear > 0 && (!firstTime || years.some((y) => y.status === 'Active') || years.length === 0);
    if (step === 1) return !!file && rawRows.length > 0 && uploadProgress === 100;
    if (step === 2) return (summary?.ready ?? 0) > 0 || (!skipDuplicates && (summary?.duplicates ?? 0) > 0);
    return false;
  }

  async function goNext() {
    if (step === 1) {
      await runPreview();
      return;
    }
    if (step === 2) {
      await startImport();
      return;
    }
    if (step === 0 && firstTime) {
      const active = years.find((y) => y.status === 'Active');
      if (active) setRegisterYear(active.year);
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-6">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-navy">
              {isLandImport ? 'Import land from Excel' : 'Import assets from Excel'}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {isLandImport
                ? 'Purchase + location only — opening and total balance are calculated automatically'
                : '4-step wizard · validate before save · chain opening preview'}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-muted hover:bg-slate-100"
            onClick={handleClose}
            disabled={importing}
          >
            <X size={18} />
          </button>
        </div>

        {/* Stepper */}
        <div className="border-b border-border bg-slate-50/80 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {STEPS.map((label, i) => {
              const active = i === step;
              const done = i < step || (step === 3 && result);
              return (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                      done
                        ? 'bg-navy text-white'
                        : active
                          ? 'bg-primary text-navy'
                          : 'bg-white text-muted ring-1 ring-border'
                    }`}
                  >
                    {done && i < step ? <CheckCircle2 size={16} /> : i + 1}
                  </div>
                  <span
                    className={`hidden text-xs font-medium sm:inline ${
                      active ? 'text-navy' : 'text-muted'
                    }`}
                  >
                    {label}
                  </span>
                  {i < STEPS.length - 1 ? (
                    <div className="mx-1 hidden h-px w-6 bg-border sm:block md:w-10" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          {step === 0 ? (
            <div className="mx-auto max-w-xl space-y-5">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  Register mode
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFirstTime(true);
                      setRegisterYear(activeYear);
                    }}
                    className={`rounded-xl border px-4 py-4 text-left transition ${
                      firstTime
                        ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                        : 'border-border hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-medium text-navy">First time</p>
                    <p className="mt-1 text-xs text-muted">Active financial year only</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFirstTime(false)}
                    className={`rounded-xl border px-4 py-4 text-left transition ${
                      !firstTime
                        ? 'border-sky-400 bg-sky-50 shadow-sm'
                        : 'border-border hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-medium text-navy">Not first time</p>
                    <p className="mt-1 text-xs text-muted">Historical / closed years</p>
                  </button>
                </div>
              </div>

              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-navy">Register year *</span>
                <select
                  className="input"
                  value={registerYear}
                  onChange={(e) => setRegisterYear(Number(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y.id} value={y.year}>
                      {y.year}
                      {y.status === 'Active' ? ' — Active' : ` (${y.status})`}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-xs text-muted">
                {isLandImport ? (
                  <>
                    <p className="font-semibold text-navy">Land import rules</p>
                    <ul className="mt-1 list-inside list-disc space-y-1">
                      <li>
                        Set the land opening in <strong>Year Setup</strong> for the first year (or
                        rely on prior year register carry-forward).
                      </li>
                      <li>
                        Excel rows need <strong>purchase price</strong> and location (province,
                        district, UPI). Do not import zero-purchase carry rows.
                      </li>
                      <li>
                        Opening amount and total balance columns in Excel are ignored — the system
                        chains automatically within and across years.
                      </li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-navy">Import one category at a time</p>
                    <p className="mt-1">
                      Upload a single Excel file per category (e.g.{' '}
                      <code className="font-mono">assets-import-furniture.xlsx</code>). Category is
                      detected from the file name, sheet name, or{' '}
                      <code className="font-mono">type</code> column.
                    </p>
                    <p className="mt-1">
                      You can also upload one combined workbook with multiple sheets. Opening balance
                      rows are skipped — use Year Setup instead.
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="mx-auto max-w-2xl space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-navy">
                    {isLandImport ? 'Upload land Excel' : 'Upload one category file'}
                  </p>
                  <p className="text-xs text-muted">
                    Year {registerYear} · {firstTime ? 'First time' : 'Not first time'} ·{' '}
                    {isLandImport
                      ? 'land.xlsx format (province, district, UPI, purchase)'
                      : 'import Furniture, Equipment, Computer, etc. separately'}
                  </p>
                </div>
                {!isLandImport ? (
                  <button type="button" className="btn-secondary shrink-0" onClick={downloadAllTemplates}>
                    <Download size={16} /> All categories
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary shrink-0"
                    onClick={() => downloadCategoryTemplate('land')}
                  >
                    <Download size={16} /> Land template
                  </button>
                )}
              </div>

              {!isLandImport ? (
                <div className="rounded-xl border border-border p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    Download template — one file per category
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {IMPORT_TEMPLATE_SHEETS.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-2 py-2.5 text-left text-xs font-medium text-navy transition hover:border-primary/40 hover:bg-amber-50/50"
                        onClick={() => downloadCategoryTemplate(cat.id)}
                      >
                        <Download size={13} className="shrink-0 text-muted" />
                        <span className="truncate">{cat.sheetName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div
                className={`rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                  dragOver
                    ? 'border-primary bg-amber-50'
                    : 'border-border bg-slate-50/60 hover:border-primary/50'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  void onFilePicked(e.dataTransfer.files?.[0]);
                }}
              >
                <CloudUpload className="mx-auto mb-3 text-navy" size={36} />
                <p className="font-medium text-navy">Drag & drop one category Excel here</p>
                <p className="mt-1 text-xs text-muted">
                  .xlsx, .xls, .csv · e.g. assets-import-furniture.xlsx or KPS-Furniture.xlsx
                </p>
                <button
                  type="button"
                  className="btn-primary mt-4"
                  onClick={() => fileRef.current?.click()}
                >
                  Choose file
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => void onFilePicked(e.target.files?.[0])}
                />
              </div>

              {file ? (
                <div className="rounded-xl border border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="text-emerald-600" size={22} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy">{file.name}</p>
                      <p className="text-xs text-muted">
                        {formatBytes(file.size)} · {rawRows.length} rows from{' '}
                        {parsedSheets.filter((s) => !s.skipped && s.rowCount > 0).length} sheet(s)
                      </p>
                    </div>
                  </div>
                  {parsedSheets.filter((s) => !s.skipped && s.rowCount > 0).length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {parsedSheets
                        .filter((s) => !s.skipped && s.rowCount > 0)
                        .map((s) => (
                          <span
                            key={s.name}
                            className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-navy"
                          >
                            {s.name} · {s.rowCount}
                          </span>
                        ))}
                    </div>
                  ) : null}
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-border px-4 py-3 text-xs text-muted">
                <p className="mb-1 font-semibold text-navy">
                  {isLandImport ? 'Land columns' : 'Required columns (each sheet)'}
                </p>
                {isLandImport ? (
                  <>
                    <p>
                      <code className="font-mono">purchase_unit_price</code>, province/district/sector,
                      UPI, purchase_year. Optional: name, supplier, sku.
                    </p>
                    <p className="mt-1">
                      Do not include opening amount or total balance — those are calculated from Year
                      Setup and the register chain.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      <code className="font-mono">name</code>, <code className="font-mono">type</code>{' '}
                      (optional if sheet is named by category),{' '}
                      <code className="font-mono">purchase_unit_price</code>
                    </p>
                    <p className="mt-1">
                      Recommended: <code className="font-mono">location</code>,{' '}
                      <code className="font-mono">label</code>. Optional: sku, supplier, purchase_year,
                      building_status. Land sheets may use province/district/upi instead of name.
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              {summary ? (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <SummaryCard label="Total" value={summary.total} />
                    <SummaryCard label="Ready" value={summary.ready} tone="emerald" />
                    <SummaryCard label="Duplicates" value={summary.duplicates} tone="amber" />
                    <SummaryCard label="Missing" value={summary.invalid} tone="rose" />
                  </div>

                  {(summary.duplicates > 0 || summary.invalid > 0) && (
                    <div className="rounded-2xl border border-border bg-gradient-to-br from-slate-50 via-white to-amber-50/40 p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-navy">Download issue reports</p>
                          <p className="mt-0.5 text-xs text-muted">
                            Fix these rows in Excel, then re-upload. Each file includes row number,
                            reason, and all mapped columns.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <ImportIssueDownloadButton
                            label="Download duplicates"
                            description={`${summary.duplicates} row${summary.duplicates === 1 ? '' : 's'} already in register`}
                            count={summary.duplicates}
                            tone="amber"
                            icon={Copy}
                            disabled={summary.duplicates <= 0}
                            onClick={() => handleDownloadIssues('duplicates')}
                          />
                          <ImportIssueDownloadButton
                            label="Download missing"
                            description={`${summary.invalid} row${summary.invalid === 1 ? '' : 's'} with missing or invalid data`}
                            count={summary.invalid}
                            tone="rose"
                            icon={AlertTriangle}
                            disabled={summary.invalid <= 0}
                            onClick={() => handleDownloadIssues('missing')}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {multiYearImport ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  <p className="font-medium">Multi-year import detected ({previewYears.join(', ')})</p>
                  <p className="mt-1 text-xs text-sky-800">
                    Historical years import in <strong>Not first time</strong> mode automatically.
                    Use First time only when all rows belong to the active financial year.
                  </p>
                </div>
              ) : null}

              {categorySummary.length > 0 ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="border-b border-border bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted">
                    Category opening summary
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted">
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2">Year</th>
                          <th className="px-3 py-2">Opening</th>
                          <th className="px-3 py-2">Acc. dep.</th>
                          <th className="px-3 py-2">Source</th>
                          <th className="px-3 py-2">Ready</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categorySummary.map((c) => (
                          <tr key={`${c.category}-${c.year}`} className="border-b border-border/60">
                            <td className="px-3 py-2 font-medium text-navy">{c.category}</td>
                            <td className="px-3 py-2">{c.year}</td>
                            <td className="px-3 py-2">{formatRwf(c.opening)}</td>
                            <td className="px-3 py-2">{formatRwf(c.accumulated)}</td>
                            <td className="px-3 py-2 text-muted">{c.source}</td>
                            <td className="px-3 py-2">{c.readyCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                    size={14}
                  />
                  <input
                    className="input pl-9"
                    placeholder="Search name, category, SKU…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ['all', 'All'],
                      ['ready', 'Ready'],
                      ['duplicates', 'Duplicates'],
                      ['invalid', 'Missing'],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setFilter(k);
                        setPage(0);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                        filter === k
                          ? 'bg-navy text-white'
                          : 'bg-slate-100 text-muted hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 rounded-xl border border-border px-4 py-3 text-sm">
                <label className="flex items-center gap-2 text-navy">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                  />
                  Skip duplicates
                </label>
                <label className="flex items-center gap-2 text-navy">
                  <input
                    type="checkbox"
                    checked={autoGenerateSku}
                    onChange={(e) => setAutoGenerateSku(e.target.checked)}
                  />
                  Auto-generate SKU when empty
                </label>
              </div>

              <div className="overflow-hidden rounded-xl border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-slate-50 text-muted">
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Type → Category</th>
                        <th className="px-3 py-2">Year</th>
                        <th className="px-3 py-2">Building</th>
                        <th className="px-3 py-2">Purchase</th>
                        <th className="px-3 py-2">Opening</th>
                        <th className="px-3 py-2">Total balance</th>
                        <th className="px-3 py-2">Acc. dep.</th>
                        <th className="px-3 py-2">Rate</th>
                        <th className="px-3 py-2">Annual dep.</th>
                        <th className="px-3 py-2">NBV</th>
                        <th className="px-3 py-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((r) => (
                        <tr key={r.row} className="border-b border-border/60">
                          <td className="px-3 py-2 text-muted">{r.row}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${statusTone(r.status)}`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-medium text-navy">{r.assetName || '—'}</td>
                          <td className="px-3 py-2">
                            <span className="text-muted">{r.typeRaw || '—'}</span>
                            {r.category ? (
                              <span className="text-navy"> → {r.category}</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">{r.registerYear || '—'}</td>
                          <td className="px-3 py-2 text-muted">
                            {r.buildingStatus || (r.category === 'Buildings' ? 'Finished' : '—')}
                          </td>
                          <td className="px-3 py-2">{formatRwf(r.purchasePrice)}</td>
                          <td className="px-3 py-2">{formatRwf(r.opening)}</td>
                          <td className="px-3 py-2">{formatRwf(r.totalBalance)}</td>
                          <td className="px-3 py-2">{formatRwf(r.accumulatedStart)}</td>
                          <td className="px-3 py-2">{r.depRate ? `${r.depRate}%` : '—'}</td>
                          <td className="px-3 py-2">{formatRwf(r.annualDep)}</td>
                          <td className="px-3 py-2 font-medium text-emerald-700">
                            {formatRwf(r.netBookValue)}
                          </td>
                          <td className="max-w-[180px] truncate px-3 py-2 text-muted" title={r.reason}>
                            {r.reason}
                          </td>
                        </tr>
                      ))}
                      {paged.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-3 py-8 text-center text-muted">
                            No rows match this filter
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted">
                  <span>
                    Showing {filtered.length === 0 ? 0 : page * pageSize + 1}–
                    {Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn-secondary !px-2 !py-1"
                      disabled={page <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      Prev
                    </button>
                    <span className="px-2 py-1">
                      {page + 1}/{totalPages}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary !px-2 !py-1"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mx-auto max-w-md space-y-5 py-6 text-center">
              {importing || !result ? (
                <>
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                  <p className="font-medium text-navy">Importing assets…</p>
                  <p className="text-xs text-muted">Writing register rows and recalculating chains</p>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="mx-auto text-emerald-600" size={48} />
                  <p className="text-lg font-semibold text-navy">Import complete</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <SummaryCard label="Imported" value={result.imported} tone="emerald" />
                    <SummaryCard label="Skipped" value={result.skipped ?? 0} tone="amber" />
                    <SummaryCard label="Failed" value={result.failed ?? 0} tone="rose" />
                  </div>
                  {result.errors && result.errors.length > 0 ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-xs text-rose-900">
                      <p className="font-semibold">Failed rows</p>
                      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                        {result.errors.map((e) => (
                          <li key={`${e.row}-${e.message}`}>
                            Row {e.row}: {e.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {result.recalcErrors && result.recalcErrors.length > 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs text-amber-950">
                      <p className="font-semibold">Imported, but recalculate had issues</p>
                      <p className="mt-1">Run <strong>Recalculate</strong> on the register manually.</p>
                    </div>
                  ) : null}
                  <p className="text-xs text-muted">
                    Recommended: run <strong>Recalculate</strong> on the register after large
                    imports. Open the register to print QR labels for imported assets.
                  </p>
                  <button type="button" className="btn-primary" onClick={handleClose}>
                    Done
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>

        {step < 3 || (step === 3 && !result) ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-4 sm:px-6">
            <button
              type="button"
              className="btn-secondary"
              disabled={importing || loadingPreview}
              onClick={() => {
                if (step === 0) handleClose();
                else setStep((s) => Math.max(0, s - 1));
              }}
            >
              <ChevronLeft size={16} />
              {step === 0 ? 'Cancel' : 'Back'}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!canNext() || loadingPreview || importing}
              onClick={() => void goNext()}
            >
              {loadingPreview || importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : step === 2 ? (
                <>Import ready rows</>
              ) : (
                <>
                  Continue <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ImportIssueDownloadButton({
  label,
  description,
  count,
  tone,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  description: string;
  count: number;
  tone: 'amber' | 'rose';
  icon: typeof Copy;
  disabled?: boolean;
  onClick: () => void;
}) {
  const styles =
    tone === 'amber'
      ? {
          card: 'border-amber-200/80 bg-amber-50/70 hover:border-amber-300 hover:bg-amber-50',
          badge: 'bg-amber-100 text-amber-950 ring-amber-200/80',
          icon: 'bg-amber-100 text-amber-800',
        }
      : {
          card: 'border-rose-200/80 bg-rose-50/70 hover:border-rose-300 hover:bg-rose-50',
          badge: 'bg-rose-100 text-rose-950 ring-rose-200/80',
          icon: 'bg-rose-100 text-rose-800',
        };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group flex min-w-[220px] max-w-sm flex-1 items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${styles.card}`}
    >
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-navy">{label}</span>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${styles.badge}`}
          >
            {count}
          </span>
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted">{description}</span>
        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-navy/80 group-hover:text-navy">
          <Download size={12} />
          Excel (.xlsx)
        </span>
      </span>
    </button>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'emerald' | 'amber' | 'rose';
}) {
  const bg =
    tone === 'emerald'
      ? 'bg-emerald-50 border-emerald-200'
      : tone === 'amber'
        ? 'bg-amber-50 border-amber-200'
        : tone === 'rose'
          ? 'bg-rose-50 border-rose-200'
          : 'bg-slate-50 border-border';
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${bg}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="text-lg font-semibold text-navy">{value}</p>
    </div>
  );
}
