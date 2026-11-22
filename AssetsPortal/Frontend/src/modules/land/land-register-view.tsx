'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Download,
  FileText,
  Filter,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { AssetsDataTable, type AssetsTableColumn } from '@/components/assets-data-table';
import { ConfirmActionModal } from '@/components/confirm-delete-modal';
import { landApi, type LandListParams } from '@/services/land-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatDate, formatNumber, formatRwf } from '@/utils/format';
import type { LandMeta, LandRecord, LandSetupSummary } from '@/types';
import { LandFormDrawer } from './land-form-drawer';
import { LandDetailDrawer } from './land-detail-drawer';
import { exportRowsToExcel, printLandReport } from './land-export';

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

const SORT_MAP: Record<string, string> = {
  no: 'sequence',
  province: 'province',
  district: 'district',
  sector: 'sector',
  category: 'category',
  supplier: 'supplier',
  upi: 'upi',
  size: 'sizeValue',
  purchaseDate: 'purchaseDate',
  purchaseUnitPrice: 'purchaseUnitPrice',
  openingAmount: 'openingAmount',
  totalBalance: 'totalBalance',
};

export function LandRegisterView() {
  const toast = useToast();
  const [meta, setMeta] = useState<LandMeta>(EMPTY_META);
  const [year, setYear] = useState<number | null>(null);
  const [setup, setSetup] = useState<LandSetupSummary | null>(null);
  const [rows, setRows] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ totalPurchaseValue: 0, totalSize: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortKey, setSortKey] = useState('no');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<LandRecord | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LandRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const loadMeta = useCallback(async () => {
    try {
      const response = await landApi.meta();
      const payload = response.data.data;
      setMeta(payload);
      setYear((current) => current ?? payload.activeYear);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load land metadata'));
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

  const query = useMemo<LandListParams>(
    () => ({
      page,
      limit: pageSize,
      year: year ?? undefined,
      province: filters.province || undefined,
      district: filters.district || undefined,
      sector: filters.sector || undefined,
      category: filters.category || undefined,
      supplier: filters.supplier || undefined,
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
        landApi.records(query),
        landApi.setup(year),
      ]);
      setRows(recordsRes.data.data ?? []);
      setTotal(recordsRes.data.total ?? 0);
      setTotalPages(recordsRes.data.totalPages ?? 1);
      setSummary(recordsRes.data.summary ?? { totalPurchaseValue: 0, totalSize: 0 });
      setSetup(setupRes.data.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load the land register'));
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

  function openCreate() {
    if (!setup?.configured) {
      toast.error(`Set the Land opening amount for ${year} before registering land.`);
      return;
    }
    setEditing(null);
    setFormMode('create');
    setFormOpen(true);
  }

  function openEdit(record: LandRecord) {
    setEditing(record);
    setFormMode('edit');
    setFormOpen(true);
    setDetailId(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await landApi.deleteRecord(deleteTarget.id);
      toast.success('Land record deleted. Subsequent balances were recalculated.');
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not delete the land record'));
    } finally {
      setDeleting(false);
    }
  }

  async function handleExport(kind: 'excel' | 'pdf') {
    if (!year) return;
    setExporting(kind);
    try {
      const reportRes = await landApi.report('register', {
        year,
        province: filters.province || undefined,
        district: filters.district || undefined,
        sector: filters.sector || undefined,
        category: filters.category || undefined,
        supplier: filters.supplier || undefined,
      });
      const report = reportRes.data.data;
      if (kind === 'excel') {
        exportRowsToExcel(
          `land-register-${year}-${new Date().toISOString().slice(0, 10)}.xlsx`,
          report.columns,
          report.rows
        );
        toast.success('Land register exported to Excel.');
      } else {
        printLandReport(report);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not export the land register'));
    } finally {
      setExporting(null);
    }
  }

  const columns: AssetsTableColumn<LandRecord>[] = [
    {
      key: 'no',
      header: 'No.',
      sortable: true,
      render: (row) => <span className="font-semibold tabular-nums text-navy">{row.sequence}</span>,
    },
    { key: 'province', header: 'Province', sortable: true, render: (row) => row.province || '—' },
    { key: 'district', header: 'District', sortable: true, render: (row) => row.district || '—' },
    { key: 'sector', header: 'Sector', sortable: true, render: (row) => row.sector || '—' },
    { key: 'cellule', header: 'Cellule', render: (row) => row.cellule || '—' },
    { key: 'village', header: 'Village', render: (row) => row.village || '—' },
    { key: 'type', header: 'Type', render: (row) => row.landType || '—' },
    { key: 'category', header: 'Category', sortable: true, render: (row) => row.category || '—' },
    { key: 'supplier', header: 'Supplier', sortable: true, render: (row) => row.supplier || '—' },
    {
      key: 'upi',
      header: 'UPI',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-navy">{row.upi || '—'}</span>,
    },
    { key: 'size', header: 'Size', sortable: true, render: (row) => row.size || '—' },
    {
      key: 'purchaseDate',
      header: 'Purchase Date',
      sortable: true,
      render: (row) =>
        row.purchaseDate
          ? formatDate(row.purchaseDate)
          : row.purchaseYear
            ? `${row.purchaseYear}${row.purchaseMonth ? `-${String(row.purchaseMonth).padStart(2, '0')}` : ''}${row.purchaseDay ? `-${String(row.purchaseDay).padStart(2, '0')}` : ''}`
            : '—',
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
  ];

  const optionList = (values: string[]) =>
    values.map((value) => (
      <option key={value} value={value}>
        {value}
      </option>
    ));

  return (
    <AssetsPageLayout
      title="Land Register"
      subtitle="Manage land parcels and their balances"
      actions={
        <>
          <Link href="/land/import" className="btn-secondary">
            <Upload size={16} /> Import
          </Link>
          <div className="relative">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setExportOpen((prev) => !prev)}
              disabled={!rows.length || exporting !== null}
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export
              <ChevronDown size={14} />
            </button>
            {exportOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-navy hover:bg-slate-50"
                  onClick={() => {
                    setExportOpen(false);
                    void handleExport('excel');
                  }}
                  disabled={!rows.length || exporting !== null}
                >
                  <Download size={15} /> Excel
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-navy hover:bg-slate-50"
                  onClick={() => {
                    setExportOpen(false);
                    void handleExport('pdf');
                  }}
                  disabled={!rows.length || exporting !== null}
                >
                  <FileText size={15} /> PDF
                </button>
              </div>
            ) : null}
          </div>
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add Land
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="hr-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Land Records</p>
          <p className="mt-1 text-xl font-bold text-navy">{formatNumber(total)}</p>
          <p className="text-[11px] text-muted">Financial year {year ?? '—'}</p>
        </div>
        <div className="hr-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Opening Amount</p>
          <p className="mt-1 text-xl font-bold text-navy">{setup ? formatRwf(setup.openingAmount) : '—'}</p>
          <p className="text-[11px] text-muted">
            {setup?.configured ? 'From Land Setup' : 'Land Setup not configured'}
          </p>
        </div>
        <div className="hr-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Purchase Value</p>
          <p className="mt-1 text-xl font-bold text-navy">{formatRwf(summary.totalPurchaseValue)}</p>
          <p className="text-[11px] text-muted">Filtered purchase unit prices</p>
        </div>
        <div className="hr-card border-primary/20 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ochre">Current Balance</p>
          <p className="mt-1 text-xl font-bold text-navy">
            {setup ? formatRwf(setup.closingBalance) : '—'}
          </p>
          <p className="text-[11px] text-muted">Closing balance for {year ?? 'the year'}</p>
        </div>
      </div>

      {year && setup && !setup.configured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Land Setup required.</strong> No opening amount is configured for {year}.{' '}
          <Link href="/land/setup" className="font-semibold underline">
            Set the opening amount
          </Link>{' '}
          before registering or importing land.
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
                placeholder="UPI, SKU, province, district, supplier…"
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
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">Province</label>
              <select className="input" value={filters.province} onChange={(e) => { setFilters((f) => ({ ...f, province: e.target.value })); setPage(1); }}>
                <option value="">All provinces</option>
                {optionList(meta.provinces)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">District</label>
              <select className="input" value={filters.district} onChange={(e) => { setFilters((f) => ({ ...f, district: e.target.value })); setPage(1); }}>
                <option value="">All districts</option>
                {optionList(meta.districts)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">Sector</label>
              <select className="input" value={filters.sector} onChange={(e) => { setFilters((f) => ({ ...f, sector: e.target.value })); setPage(1); }}>
                <option value="">All sectors</option>
                {optionList(meta.sectors)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">Category</label>
              <select className="input" value={filters.category} onChange={(e) => { setFilters((f) => ({ ...f, category: e.target.value })); setPage(1); }}>
                <option value="">All categories</option>
                {optionList(meta.categories)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">Supplier</label>
              <select className="input" value={filters.supplier} onChange={(e) => { setFilters((f) => ({ ...f, supplier: e.target.value })); setPage(1); }}>
                <option value="">All suppliers</option>
                {optionList(meta.suppliers)}
              </select>
            </div>
            {activeFilters ? (
              <div className="sm:col-span-2 xl:col-span-5">
                <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-ochre hover:underline" onClick={clearFilters}>
                  <X size={14} /> Clear all filters
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <AssetsDataTable
        columns={columns}
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
        onDelete={(row) => setDeleteTarget(row)}
        emptyMessage="No land records match your filters"
        emptyAction={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> Add your first land record
            </button>
            <Link href="/land/import" className="btn-secondary">
              <Upload size={16} /> Import Excel
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <MapPin size={13} /> Total land size: {formatNumber(summary.totalSize)}
        </span>
      </div>

      <LandFormDrawer
        open={formOpen}
        mode={formMode}
        year={year ?? 0}
        record={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => void load()}
      />

      <LandDetailDrawer
        open={Boolean(detailId)}
        recordId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={openEdit}
      />

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title="Delete land record?"
        description={
          <>
            Remove <strong>land record #{deleteTarget?.sequence}</strong>
            {deleteTarget?.upi ? <> (UPI {deleteTarget.upi})</> : null}? Later land records will be
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
