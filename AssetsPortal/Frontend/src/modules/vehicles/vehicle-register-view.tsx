'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Columns3,
  Download,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { AssetsDataTable, type AssetsTableColumn } from '@/components/assets-data-table';
import { ConfirmActionModal } from '@/components/confirm-delete-modal';
import { vehicleApi, type VehicleListParams } from '@/services/vehicle-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatDate, formatNumber, formatRwf } from '@/utils/format';
import type { VehicleMeta, VehicleRecord, VehicleSetupSummary } from '@/types';
import { VehicleFormDrawer } from './vehicle-form-drawer';
import { VehicleDetailDrawer } from './vehicle-detail-drawer';
import { VehicleHistoryDrawer } from './vehicle-history-drawer';
import { exportRowsToExcel, printVehicleRecord, printVehicleReport } from './vehicle-export';

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

const SORT_MAP: Record<string, string> = {
  no: 'sequence',
  name: 'name',
  label: 'label',
  location: 'location',
  type: 'vehicleType',
  category: 'category',
  supplier: 'supplier',
  upi: 'upi',
  sku: 'sku',
  purchaseDate: 'purchaseDate',
  purchaseUnitPrice: 'purchaseUnitPrice',
  saleBalance: 'saleBalance',
  openingAmount: 'openingAmount',
  totalBalance: 'totalBalance',
  accumulatedDepreciation: 'accumulatedDepreciation',
  annualDep: 'annualDep',
  totalDep: 'totalDep',
  netBookValue: 'netBookValue',
  quantity: 'quantity',
  depRate: 'depRate',
};

type ColumnOption = { key: string; label: string };

const COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'no', label: 'No.' },
  { key: 'name', label: 'Vehicle Name' },
  { key: 'label', label: 'Label' },
  { key: 'location', label: 'Location' },
  { key: 'type', label: 'Type' },
  { key: 'category', label: 'Category' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'upi', label: 'UPI' },
  { key: 'sku', label: 'SKU' },
  { key: 'purchaseDate', label: 'Purchase Date' },
  { key: 'purchaseUnitPrice', label: 'Purchase Unit Price' },
  { key: 'saleBalance', label: 'Sale Balance' },
  { key: 'openingAmount', label: 'Opening Amount' },
  { key: 'totalBalance', label: 'Total Balance' },
  { key: 'accumulatedDepreciation', label: 'Accumulated Depreciation' },
  { key: 'annualDep', label: 'Annual Depreciation' },
  { key: 'totalDep', label: 'Total Depreciation' },
  { key: 'netBookValue', label: 'Net Book Value' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'depMode', label: 'Depreciation Mode' },
  { key: 'depRate', label: 'Depreciation Rate' },
  { key: 'usefulYears', label: 'Useful Years' },
];

const DEFAULT_HIDDEN = new Set<string>(['label', 'sku', 'depMode', 'usefulYears']);

export function VehicleRegisterView() {
  const toast = useToast();
  const [meta, setMeta] = useState<VehicleMeta>(EMPTY_META);
  const [year, setYear] = useState<number | null>(null);
  const [setup, setSetup] = useState<VehicleSetupSummary | null>(null);
  const [rows, setRows] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    totalPurchaseValue: 0,
    totalSaleBalance: 0,
    totalQuantity: 0,
    totalAnnualDepreciation: 0,
    totalDepreciation: 0,
    totalNetBookValue: 0,
  });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(DEFAULT_HIDDEN));
  const [sortKey, setSortKey] = useState('no');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<VehicleRecord | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [historyRecord, setHistoryRecord] = useState<VehicleRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const loadMeta = useCallback(async () => {
    try {
      const response = await vehicleApi.meta();
      const payload = response.data.data;
      setMeta(payload);
      setYear((current) => current ?? payload.activeYear ?? payload.years[0]?.year ?? null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load vehicle metadata'));
    }
  }, [toast]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const query = useMemo<VehicleListParams>(
    () => ({
      page,
      limit: pageSize,
      year: year ?? undefined,
      location: filters.location || undefined,
      type: filters.type || undefined,
      category: filters.category || undefined,
      supplier: filters.supplier || undefined,
      purchase_year: filters.purchaseYear ? Number(filters.purchaseYear) : undefined,
      q: search || undefined,
      sort_by: SORT_MAP[sortKey] ?? 'sequence',
      sort_dir: sortDir,
    }),
    [page, pageSize, year, filters, search, sortKey, sortDir]
  );

  const load = useCallback(async () => {
    if (!year) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [recordsRes, setupRes] = await Promise.all([
        vehicleApi.records(query),
        vehicleApi.setup(year),
      ]);
      setRows(recordsRes.data.data ?? []);
      setTotal(recordsRes.data.total ?? 0);
      setTotalPages(recordsRes.data.totalPages ?? 1);
      setSummary(
        recordsRes.data.summary ?? {
          totalPurchaseValue: 0,
          totalSaleBalance: 0,
          totalQuantity: 0,
          totalAnnualDepreciation: 0,
          totalDepreciation: 0,
          totalNetBookValue: 0,
        }
      );
      setSetup(setupRes.data.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load the vehicle register'));
    } finally {
      setLoading(false);
    }
  }, [year, query, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeFilters = Object.values(filters).filter(Boolean).length + (search ? 1 : 0);

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSearch('');
    setSearchInput('');
    setPage(1);
  }

  function onSort(key: string) {
    const backendKey = SORT_MAP[key];
    if (!backendKey) return;
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  function toggleColumn(key: string) {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openCreate() {
    if (!setup?.configured) {
      toast.error(`Set the Vehicle opening amount for ${year} before registering vehicles.`);
      return;
    }
    setEditing(null);
    setFormMode('create');
    setFormOpen(true);
  }

  function openEdit(record: VehicleRecord) {
    setEditing(record);
    setFormMode('edit');
    setFormOpen(true);
    setDetailId(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await vehicleApi.deleteRecord(deleteTarget.id);
      toast.success('Vehicle record deleted. Subsequent balances were recalculated.');
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not delete the vehicle record'));
    } finally {
      setDeleting(false);
    }
  }

  async function handleExport(kind: 'excel' | 'pdf') {
    if (!year) return;
    setExporting(kind);
    try {
      const reportRes = await vehicleApi.report('register', {
        year,
        location: filters.location || undefined,
        type: filters.type || undefined,
        category: filters.category || undefined,
        supplier: filters.supplier || undefined,
        purchase_year: filters.purchaseYear ? Number(filters.purchaseYear) : undefined,
      });
      const report = reportRes.data.data;
      if (kind === 'excel') {
        exportRowsToExcel(
          `vehicle-register-${year}-${new Date().toISOString().slice(0, 10)}.xlsx`,
          report.columns,
          report.rows
        );
        toast.success('Vehicle register exported to Excel.');
      } else {
        printVehicleReport(report);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not export the vehicle register'));
    } finally {
      setExporting(null);
    }
  }

  function purchaseDateLabel(row: VehicleRecord) {
    if (row.purchaseDate) return formatDate(row.purchaseDate);
    if (!row.purchaseYear) return '—';
    const month = row.purchaseMonth ? `-${String(row.purchaseMonth).padStart(2, '0')}` : '';
    const day = row.purchaseDay ? `-${String(row.purchaseDay).padStart(2, '0')}` : '';
    return `${row.purchaseYear}${month}${day}`;
  }

  const columns: AssetsTableColumn<VehicleRecord>[] = [
    {
      key: 'no',
      header: 'No.',
      sortable: true,
      render: (row) => <span className="font-semibold tabular-nums text-navy">{row.sequence}</span>,
    },
    {
      key: 'name',
      header: 'Vehicle Name',
      sortable: true,
      render: (row) => <span className="font-medium text-navy">{row.name || '—'}</span>,
    },
    { key: 'label', header: 'Label', sortable: true, render: (row) => row.label || '—' },
    { key: 'location', header: 'Location', sortable: true, render: (row) => row.location || '—' },
    { key: 'type', header: 'Type', sortable: true, render: (row) => row.type || row.vehicleType || '—' },
    { key: 'category', header: 'Category', sortable: true, render: (row) => row.category || '—' },
    { key: 'supplier', header: 'Supplier', sortable: true, render: (row) => row.supplier || '—' },
    {
      key: 'upi',
      header: 'UPI',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-navy">{row.upi || '—'}</span>,
    },
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-navy">{row.sku || '—'}</span>,
    },
    {
      key: 'purchaseDate',
      header: 'Purchase Date',
      sortable: true,
      render: (row) => purchaseDateLabel(row),
    },
    {
      key: 'purchaseUnitPrice',
      header: 'Purchase Unit Price',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className="whitespace-nowrap font-medium tabular-nums text-navy">
          {formatRwf(row.purchaseUnitPrice)}
        </span>
      ),
    },
    {
      key: 'saleBalance',
      header: 'Sale Balance',
      sortable: true,
      className: 'text-right',
      render: (row) =>
        row.saleBalance > 0 ? (
          <span className="whitespace-nowrap font-medium tabular-nums text-amber-700">
            − {formatRwf(row.saleBalance)}
          </span>
        ) : (
          <span className="whitespace-nowrap tabular-nums text-muted">—</span>
        ),
    },
    {
      key: 'openingAmount',
      header: 'Opening Amount',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-muted">{formatRwf(row.openingAmount)}</span>
      ),
    },
    {
      key: 'totalBalance',
      header: 'Total Balance',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className="whitespace-nowrap font-semibold tabular-nums text-navy">
          {formatRwf(row.totalBalance)}
        </span>
      ),
    },
    {
      key: 'accumulatedDepreciation',
      header: 'Accumulated Depreciation',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-muted">
          {formatRwf(row.accumulatedDepreciation)}
        </span>
      ),
    },
    {
      key: 'annualDep',
      header: 'Annual Depreciation',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-muted">{formatRwf(row.annualDep)}</span>
      ),
    },
    {
      key: 'totalDep',
      header: 'Total Depreciation',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-muted">{formatRwf(row.totalDep)}</span>
      ),
    },
    {
      key: 'netBookValue',
      header: 'Net Book Value',
      sortable: true,
      className: 'text-right',
      render: (row) => (
        <span className="whitespace-nowrap font-semibold tabular-nums text-emerald-700">
          {formatRwf(row.netBookValue)}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      sortable: true,
      className: 'text-right',
      render: (row) => <span className="tabular-nums text-navy">{formatNumber(row.quantity ?? 1)}</span>,
    },
    { key: 'depMode', header: 'Depreciation Mode', render: (row) => row.depMode || '—' },
    {
      key: 'depRate',
      header: 'Depreciation Rate',
      sortable: true,
      className: 'text-right',
      render: (row) => <span className="tabular-nums text-navy">{formatNumber(row.depRate)}%</span>,
    },
    {
      key: 'usefulYears',
      header: 'Useful Years',
      className: 'text-right',
      render: (row) => <span className="tabular-nums text-navy">{formatNumber(row.usefulYears ?? 0)}</span>,
    },
  ];

  const visibleColumns = columns.filter((column) => !hiddenColumns.has(column.key));

  const optionList = (values: Array<string | number>) =>
    values.map((value) => (
      <option key={String(value)} value={value}>
        {value}
      </option>
    ));

  return (
    <AssetsPageLayout
      title="Vehicle Register"
      subtitle="Independent vehicle register with sequential balances, sale balance and depreciation"
      actions={
        <>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleExport('excel')}
            disabled={!rows.length || exporting !== null}
          >
            {exporting === 'excel' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Excel
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleExport('pdf')}
            disabled={!rows.length || exporting !== null}
          >
            {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            PDF
          </button>
          <Link href="/vehicles/import" className="btn-secondary">
            <Upload size={16} /> Import Excel
          </Link>
          <button type="button" className="btn-primary" onClick={openCreate}>
            Add Vehicle
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <div className="hr-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Vehicle Records</p>
          <p className="mt-1 text-xl font-bold text-navy">{formatNumber(total)}</p>
          <p className="text-[11px] text-muted">Financial year {year ?? '—'}</p>
        </div>
        <div className="hr-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Opening Amount</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-navy">
            {setup?.configured ? formatRwf(setup.openingAmount) : '—'}
          </p>
          <p className="text-[11px] text-muted">
            {setup?.configured ? 'From Vehicle Setup' : 'Vehicle Setup not configured'}
          </p>
        </div>
        <div className="hr-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Purchase Value</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-navy">
            {formatRwf(summary.totalPurchaseValue)}
          </p>
          <p className="text-[11px] text-muted">Filtered purchase unit prices</p>
        </div>
        <div className="hr-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Sale Balance</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-amber-700">
            {formatRwf(summary.totalSaleBalance)}
          </p>
          <p className="text-[11px] text-muted">Filtered sale balances</p>
        </div>
        <div className="hr-card border-primary/20 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ochre">Closing Balance</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-navy">
            {setup ? formatRwf(setup.closingBalance) : '—'}
          </p>
          <p className="text-[11px] text-muted">Latest total balance for {year ?? 'the year'}</p>
        </div>
        <div className="hr-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Total Depreciation</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-navy">
            {formatRwf(summary.totalDepreciation)}
          </p>
          <p className="text-[11px] text-muted">Filtered accumulated + annual</p>
        </div>
        <div className="hr-card border-emerald-200 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Net Book Value</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-navy">
            {formatRwf(summary.totalNetBookValue)}
          </p>
          <p className="text-[11px] text-muted">Total balance − total depreciation</p>
        </div>
      </div>

      {year && setup && !setup.configured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Vehicle Setup required.</strong> No opening amount is configured for {year}.{' '}
          <Link href="/vehicles/setup" className="font-semibold underline">
            Set the opening amount
          </Link>{' '}
          before registering or importing vehicles.
        </div>
      ) : null}

      <div className="hr-card p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
              Search
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-10"
                placeholder="Vehicle name, UPI, SKU, location, supplier, type…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full xl:w-40">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
              Financial Year
            </label>
            <select
              className="input"
              value={year ?? ''}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setPage(1);
              }}
            >
              {meta.years.map((fy) => (
                <option key={fy.id} value={fy.year}>
                  {fy.year} {fy.year === meta.activeYear ? '• Active' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <button
              type="button"
              className={`btn-secondary ${hiddenColumns.size !== DEFAULT_HIDDEN.size ? 'border-primary/40 text-ochre' : ''}`}
              onClick={() => setShowColumns((prev) => !prev)}
            >
              <Columns3 size={16} /> Columns
            </button>
            {showColumns ? (
              <div className="absolute right-0 z-30 mt-2 max-h-80 w-64 overflow-y-auto rounded-2xl border border-border bg-white p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Visible columns
                  </p>
                  <button
                    type="button"
                    className="text-[11px] font-medium text-ochre hover:underline"
                    onClick={() => setHiddenColumns(new Set())}
                  >
                    Show all
                  </button>
                </div>
                {COLUMN_OPTIONS.map((option) => (
                  <label
                    key={option.key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-navy hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                      checked={!hiddenColumns.has(option.key)}
                      onChange={() => toggleColumn(option.key)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className={`btn-secondary ${activeFilters ? 'border-primary/40 text-ochre' : ''}`}
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            <Filter size={16} /> Filters{activeFilters ? ` (${activeFilters})` : ''}
          </button>
          <button type="button" className="btn-secondary" onClick={() => void load()} title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        {showAdvanced ? (
          <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-5">
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
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, [key]: e.target.value }));
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {optionList(options)}
                </select>
              </div>
            ))}
            {activeFilters ? (
              <div className="sm:col-span-2 xl:col-span-5">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-ochre hover:underline"
                  onClick={clearFilters}
                >
                  <X size={14} /> Clear all filters
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <AssetsDataTable
        columns={visibleColumns}
        data={rows}
        rowKey={(row) => row.id}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onSort={onSort}
        sortKey={sortKey}
        sortDir={sortDir}
        loading={loading}
        onView={(row) => setDetailId(row.id)}
        onEdit={openEdit}
        onPrint={(row) => printVehicleRecord(row, meta.organizationName)}
        onHistory={(row) => setHistoryRecord(row)}
        onDelete={(row) => setDeleteTarget(row)}
        emptyMessage="No vehicle records match your filters"
        emptyAction={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" className="btn-primary" onClick={openCreate}>
              Add your first vehicle record
            </button>
            <Link href="/vehicles/import" className="btn-secondary">
              <Upload size={16} /> Import Excel
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <Wallet size={13} /> Total quantity: {formatNumber(summary.totalQuantity)}
        </span>
        <span className="text-border">•</span>
        <span className="inline-flex items-center gap-1">
          Opening + purchase − sale balance = total balance. Balances are recalculated by the backend
          after every change.
        </span>
      </div>

      <VehicleFormDrawer
        open={formOpen}
        mode={formMode}
        year={year ?? 0}
        record={editing}
        setup={setup}
        onClose={() => setFormOpen(false)}
        onSaved={() => void load()}
      />

      <VehicleDetailDrawer
        open={Boolean(detailId)}
        recordId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={openEdit}
        onHistory={(record) => {
          setDetailId(null);
          setHistoryRecord(record);
        }}
      />

      <VehicleHistoryDrawer
        open={Boolean(historyRecord)}
        record={historyRecord}
        year={historyRecord?.year ?? year ?? undefined}
        onClose={() => setHistoryRecord(null)}
      />

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title="Delete vehicle record?"
        description={
          <>
            Remove <strong>vehicle record #{deleteTarget?.sequence}</strong>
            {deleteTarget?.name ? <> ({deleteTarget.name})</> : null}? Later vehicle records will be
            recalculated so their opening and total balances stay consistent.
          </>
        }
        confirmLabel="Delete record"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </AssetsPageLayout>
  );
}
