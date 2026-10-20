'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Download,
  Plus,
  RefreshCw,
  Upload,
  QrCode,
  Pencil,
  Trash2,
  X,
  Calculator,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { AssetQrCode } from '@/components/asset-qr-code';
import { AssetsDataTable, type AssetsTableColumn } from '@/components/assets-data-table';
import {
  ConfirmActionModal,
  DeleteAllRegisterModal,
  DeleteAssetsModal,
  type DeleteAllScope,
  type DeleteConfirmState,
} from '@/components/confirm-delete-modal';
import { ExportExcelModal, type ExportExcelOptions } from '@/components/export-excel-modal';
import {
  RegisterFiltersPanel,
  RegisterFiltersButton,
  activeFilterCount,
  type RegisterFilters,
} from '@/components/register-filters-panel';
import { StatusBadge } from '@/components/status-badge';
import { assetsApi } from '@/services/assets-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { assetQrLookupCode } from '@/utils/asset-qr';
import { isVehicleCategory } from '@/lib/register-math';
import { formatRwf } from '@/utils/format';
import type { AssetRow, Category, FinancialYear, RegisterStats } from '@/types';
import {
  AddAssetWizard,
  emptyAddAssetForm,
  formFromAsset,
  type AddAssetFormState,
} from './add-asset-wizard';
import { AssetImportWizard } from './asset-import-wizard';

const PAGE_SIZE_DEFAULT = 30;

export function RegisterView() {
  const toast = useToast();
  const toastErrorRef = useRef(toast.error);
  toastErrorRef.current = toast.error;
  const deepLinkAttemptRef = useRef<string | null>(null);
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<AssetRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [years, setYears] = useState<FinancialYear[]>([]);
  const [registerYears, setRegisterYears] = useState<number[]>([]);
  const [stats, setStats] = useState<RegisterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [yearFilter, setYearFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState(
    () => searchParams.get('health') ?? ''
  );
  const [q, setQ] = useState(() => searchParams.get('q') ?? '');

  useEffect(() => {
    const urlQ = searchParams.get('q') ?? '';
    setQ(urlQ);
    setPage(1);
  }, [searchParams]);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState<string | null>(null);
  const [editAsset, setEditAsset] = useState<AssetRow | null>(null);
  const [wizardInitial, setWizardInitial] = useState<AddAssetFormState | undefined>();
  const [preview, setPreview] = useState<AssetRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtersMobileOpen, setFiltersMobileOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [recalcConfirmOpen, setRecalcConfirmOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [allRegisterTotal, setAllRegisterTotal] = useState(0);

  const filters: RegisterFilters = useMemo(
    () => ({
      year: yearFilter,
      category: categoryFilter,
      health: healthFilter,
      q,
    }),
    [yearFilter, categoryFilter, healthFilter, q]
  );

  const hasActiveFilters = Boolean(
    categoryFilter || healthFilter || q.trim() || yearFilter
  );

  const deleteAllScope: DeleteAllScope | null = useMemo(() => {
    const count = hasActiveFilters ? total : allRegisterTotal || stats?.totalAssets || total;
    if (count <= 0) return null;
    return {
      count,
      hasFilters: hasActiveFilters,
      filters: {
        year: yearFilter || undefined,
        category: categoryFilter || undefined,
        health: healthFilter || undefined,
        q: q.trim() || undefined,
      },
    };
  }, [
    hasActiveFilters,
    total,
    allRegisterTotal,
    stats?.totalAssets,
    yearFilter,
    categoryFilter,
    healthFilter,
    q,
  ]);

  function patchFilters(patch: Partial<RegisterFilters>) {
    setPage(1);
    if (patch.year !== undefined) setYearFilter(patch.year);
    if (patch.category !== undefined) setCategoryFilter(patch.category);
    if (patch.health !== undefined) setHealthFilter(patch.health);
    if (patch.q !== undefined) setQ(patch.q);
  }

  function resetFilters() {
    setPage(1);
    setYearFilter('');
    setCategoryFilter('');
    setHealthFilter('');
    setQ('');
  }

  useEffect(() => {
    void assetsApi.registerList({ page: 1, limit: 1 }).then(({ data }) => {
      setAllRegisterTotal(data.total ?? 0);
    });
  }, []);

  useEffect(() => {
    if (!exportOpen && !deleteAllOpen) return;
    void assetsApi.registerList({ page: 1, limit: 1 }).then(({ data }) => {
      setAllRegisterTotal(data.total ?? 0);
    });
  }, [exportOpen, deleteAllOpen]);

  const activeYear =
    years.find((y) => y.status === 'Active')?.year ?? new Date().getFullYear();

  const loadMeta = useCallback(async () => {
    try {
      const { data } = await assetsApi.registerMeta();
      setCategories(data.data.categories ?? []);
      setYears(data.data.years ?? []);
      setRegisterYears(data.data.registerYears ?? []);
      // Default: all years — user can narrow with filters
    } catch {
      // list can still load
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await assetsApi.registerStats(
        yearFilter ? Number(yearFilter) : undefined
      );
      setStats(data.data);
    } catch {
      setStats(null);
    }
  }, [yearFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setRows([]);
    try {
      const { data } = await assetsApi.registerList({
        page,
        limit: pageSize,
        register_year: yearFilter ? Number(yearFilter) : undefined,
        category: categoryFilter || undefined,
        asset_health_status: healthFilter || undefined,
        q: q.trim() || undefined,
      });
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load register'), 'Error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, yearFilter, categoryFilter, healthFilter, q, toast]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void load();
    void loadStats();
  }, [load, loadStats]);

  // Deep link ?asset= / ?code=
  useEffect(() => {
    const assetId = searchParams.get('asset');
    const code = searchParams.get('code');
    if (!assetId && !code) {
      deepLinkAttemptRef.current = null;
      return;
    }

    const attemptKey = assetId ? `asset:${assetId}` : `code:${code}`;
    if (deepLinkAttemptRef.current === attemptKey) return;
    deepLinkAttemptRef.current = attemptKey;

    void (async () => {
      try {
        if (assetId) {
          const { data } = await assetsApi.getAsset(assetId);
          setPreview(data.data);
        } else if (code) {
          const { data } = await assetsApi.scanLookup({ code });
          setPreview(data.data);
        }
      } catch (err) {
        deepLinkAttemptRef.current = null;
        toastErrorRef.current(
          getApiErrorMessage(err, 'Could not open linked asset — it may have been deleted.')
        );
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('asset');
          url.searchParams.delete('code');
          window.history.replaceState({}, '', url.toString());
        }
      }
    })();
  }, [searchParams]);

  function openAdd() {
    setWizardMode('create');
    setEditId(null);
    setWizardInitial(
      emptyAddAssetForm(
        yearFilter ? Number(yearFilter) : activeYear,
        categories[0]?.name ?? ''
      )
    );
    setWizardOpen(true);
  }

  function openEdit(row: AssetRow) {
    setWizardMode('edit');
    setEditId(row.id);
    setEditAsset(row);
    setWizardInitial(formFromAsset(row));
    setWizardOpen(true);
    setPreview(null);
  }

  function requestRemoveAsset(row: AssetRow) {
    setDeleteConfirm({ kind: 'single', asset: row });
  }

  function requestBulkDelete() {
    if (!selected.size) return;
    setDeleteConfirm({ kind: 'bulk', ids: [...selected], count: selected.size });
  }

  async function executeDelete() {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      if (deleteConfirm.kind === 'single') {
        await assetsApi.deleteAsset(deleteConfirm.asset.id);
        toast.success('Asset deleted.', 'Deleted');
        if (preview?.id === deleteConfirm.asset.id) setPreview(null);
      } else {
        await assetsApi.bulkDeleteAssets(deleteConfirm.ids);
        toast.success(`Deleted ${deleteConfirm.count} assets.`);
        setSelected(new Set());
      }
      setDeleteConfirm(null);
      await loadMeta();
      await load();
      await loadStats();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete'), 'Error');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function executeDeleteAll() {
    if (!deleteAllScope) return;
    setDeleteAllLoading(true);
    try {
      const { data } = await assetsApi.deleteAllRegisterAssets({
        confirm: true,
        ...(hasActiveFilters
          ? {
              register_year: yearFilter ? Number(yearFilter) : undefined,
              category: categoryFilter || undefined,
              asset_health_status: healthFilter || undefined,
              q: q.trim() || undefined,
            }
          : {}),
      });
      const deleted = data.data?.deleted ?? deleteAllScope.count;
      toast.success(`Deleted ${deleted.toLocaleString()} assets from the register.`, 'Deleted');
      setDeleteAllOpen(false);
      setPreview(null);
      setSelected(new Set());
      setPage(1);
      await loadMeta();
      await load();
      await loadStats();
      const nextTotal = await assetsApi.registerList({ page: 1, limit: 1 });
      setAllRegisterTotal(nextTotal.data.total ?? 0);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete assets'), 'Error');
    } finally {
      setDeleteAllLoading(false);
    }
  }

  async function refresh() {
    setRows([]);
    setStats(null);
    setSelected(new Set());
    try {
      const { data } = await assetsApi.purgeTemplateSamples();
      const removed = data.data?.deleted ?? 0;
      if (removed > 0) {
        toast.success(`Removed ${removed} template sample row${removed === 1 ? '' : 's'}.`);
      }
    } catch {
      // best-effort cleanup
    }
    await loadMeta();
    await load();
    await loadStats();
    toast.success('Register refreshed.');
  }

  async function recalc() {
    setRecalcConfirmOpen(true);
  }

  async function executeRecalc() {
    try {
      await assetsApi.recalcChain(
        yearFilter
          ? {
              register_year: Number(yearFilter),
              category: categoryFilter || undefined,
            }
          : { all_years: true }
      );
      toast.success('Register recalculated.', 'Recalculated');
      setRecalcConfirmOpen(false);
      await load();
      await loadStats();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Recalc failed'), 'Error');
    }
  }

  async function exportExcel(options: ExportExcelOptions) {
    setExporting(true);
    try {
      const useFilters = options.scope === 'filtered';
      const listParams = {
        register_year: useFilters && yearFilter ? Number(yearFilter) : undefined,
        category: useFilters && categoryFilter ? categoryFilter : undefined,
        asset_health_status: useFilters && healthFilter ? healthFilter : undefined,
        q: useFilters && q.trim() ? q.trim() : undefined,
      };

      const { data } = await assetsApi.registerList({ page: 1, limit: 100, ...listParams });
      const all = [...(data.data ?? [])];
      const pages = Math.min(data.totalPages ?? 1, 20);
      for (let p = 2; p <= pages; p++) {
        const next = await assetsApi.registerList({ page: p, limit: 100, ...listParams });
        all.push(...(next.data.data ?? []));
        if (all.length >= 2000) break;
      }

      const sheet = all.slice(0, 2000).map((r, i) => ({
        'S/N': i + 1,
        YEAR: r.registerYear,
        'ASSET NAME': r.assetName,
        CATEGORY: r.categoryName,
        CODE: r.assetCode,
        SKU: r.sku ?? '',
        ...(options.includeQrColumn
          ? { 'QR SCAN CODE': assetQrLookupCode(r) }
          : {}),
        'OPENING STOCK': r.openingAmount,
        'PURCHASE PRICE': r.unitPrice,
        ...(r.applySaleBalance || isVehicleCategory(r.categoryName)
          ? { 'SALE BALANCE': r.applySaleBalance ? r.saleBalance ?? 0 : 0 }
          : {}),
        'TOTAL BALANCE': r.totalBalance,
        'ACCUMULATED DEPRECIATION': r.accumulatedDepreciation,
        'DEPRECIATION RATE': r.depRate,
        'ANNUAL DEPRECIATION': r.annualDep,
        'TOTAL DEPRECIATION': r.totalDep,
        'NET BOOK VALUE': r.netBookValue,
        'HEALTH STATUS':
          r.assetHealthStatus === 'NotUsedOld' ? 'Not Used (Old)' : 'Used',
        QUANTITY: r.quantity ?? 1,
        LOCATION: r.location ?? '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sheet);
      XLSX.utils.book_append_sheet(wb, ws, 'Asset Register');
      const suffix =
        options.scope === 'filtered'
          ? yearFilter || categoryFilter || healthFilter || q.trim()
            ? 'filtered'
            : 'view'
          : 'all';
      XLSX.writeFile(wb, `asset-register-${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Exported ${sheet.length} rows.`, 'Export complete');
      setExportOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  }

  const changeHealth = useCallback(
    async (row: AssetRow, status: string) => {
      try {
        await assetsApi.updateHealthStatus(row.id, status);
        toast.success('Health status updated.');
        await load();
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Could not update health'));
      }
    },
    [load, toast]
  );

  const showSaleColumn =
    isVehicleCategory(categoryFilter) || rows.some((r) => r.applySaleBalance);

  const columns: AssetsTableColumn<AssetRow>[] = useMemo(
    () => {
      const base: AssetsTableColumn<AssetRow>[] = [
      {
        key: 'sn',
        header: 'S/N',
        className: 'w-12',
        render: (r) => {
          const idx = rows.findIndex((x) => x.id === r.id);
          return (page - 1) * pageSize + idx + 1;
        },
      },
      {
        key: 'year',
        header: 'Year',
        render: (r) => r.registerYear,
      },
      {
        key: 'name',
        header: 'Asset name',
        render: (r) => (
          <button type="button" className="text-left" onClick={() => setPreview(r)}>
            <p className="font-medium text-navy">{r.assetName}</p>
            <p className="font-mono text-[11px] text-muted">{r.assetCode}</p>
          </button>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        render: (r) => r.categoryName,
      },
      {
        key: 'opening',
        header: 'Opening',
        render: (r) => formatRwf(r.openingAmount),
      },
      {
        key: 'purchase',
        header: 'Purchase',
        render: (r) => formatRwf(r.unitPrice),
      },
      ...(showSaleColumn
        ? [
            {
              key: 'sale',
              header: 'Sale balance',
              render: (r: AssetRow) =>
                r.applySaleBalance ? formatRwf(r.saleBalance ?? 0) : '—',
            } as AssetsTableColumn<AssetRow>,
          ]
        : []),
      {
        key: 'tb',
        header: 'Total balance',
        render: (r) => formatRwf(r.totalBalance),
      },
      {
        key: 'acc',
        header: 'Acc. dep.',
        render: (r) => formatRwf(r.accumulatedDepreciation),
      },
      {
        key: 'rate',
        header: 'Rate',
        render: (r) => `${r.depRate}%`,
      },
      {
        key: 'annual',
        header: 'Annual dep.',
        render: (r) => formatRwf(r.annualDep),
      },
      {
        key: 'td',
        header: 'Total dep.',
        render: (r) => formatRwf(r.totalDep),
      },
      {
        key: 'nbv',
        header: 'Net book',
        render: (r) => (
          <span className="font-medium text-emerald-700">{formatRwf(r.netBookValue)}</span>
        ),
      },
      {
        key: 'health',
        header: 'Health',
        render: (r) => (
          <select
            className="rounded-lg border border-border bg-white px-2 py-1 text-xs"
            value={r.assetHealthStatus === 'NotUsedOld' ? 'NotUsedOld' : 'Used'}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => void changeHealth(r, e.target.value)}
          >
            <option value="Used">Used</option>
            <option value="NotUsedOld">Not Used (Old)</option>
          </select>
        ),
      },
      {
        key: 'qty',
        header: 'Qty',
        render: (r) => r.quantity ?? 1,
      },
      {
        key: 'qr',
        header: 'QR',
        render: (r) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-navy hover:bg-slate-50"
            title={`Print QR for ${r.sku || r.assetCode}`}
            onClick={(e) => {
              e.stopPropagation();
              setPreview(r);
              const url = new URL(window.location.href);
              url.searchParams.set('asset', r.id);
              window.history.replaceState({}, '', url.toString());
            }}
          >
            <QrCode size={14} />
            QR
          </button>
        ),
      },
    ];
      return base;
    },
    [rows, page, pageSize, changeHealth, showSaleColumn]
  );

  return (
    <AssetsPageLayout
      actions={
        <>
          <button type="button" onClick={() => void refresh()} className="btn-secondary">
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" onClick={() => void recalc()} className="btn-secondary">
            <Calculator size={16} /> Recalculate
          </button>
          <button type="button" onClick={() => setExportOpen(true)} className="btn-secondary">
            <Download size={16} /> Export Excel
          </button>
          <button type="button" onClick={() => setImportOpen(true)} className="btn-secondary">
            <Upload size={16} /> Import Excel
          </button>
          <button
            type="button"
            onClick={() => setDeleteAllOpen(true)}
            disabled={!deleteAllScope}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Trash2 size={16} /> Delete all
          </button>
          <button type="button" onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Asset
          </button>
        </>
      }
      kpis={[
        { label: 'Total Assets', value: stats?.totalAssets ?? total },
        { label: 'Purchase Value', value: formatRwf(stats?.totalPurchase ?? 0) },
        { label: 'Net Book Value', value: formatRwf(stats?.totalNetBook ?? 0) },
        { label: 'Register Years', value: stats?.registerYears ?? years.length },
      ]}
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <RegisterFiltersButton
          active={activeFilterCount(filters)}
          onClick={() => setFiltersMobileOpen(true)}
        />
        <p className="text-xs text-muted">
          Swipe horizontally on the table to view all ledger columns.
        </p>
      </div>

      {selected.size > 0 ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/60 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-navy">{selected.size} selected</p>
            <p className="text-xs text-muted">Bulk actions apply to checked rows on this page</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setSelected(new Set())}>
              Clear
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              onClick={requestBulkDelete}
            >
              <Trash2 size={14} /> Delete selected
            </button>
          </div>
        </div>
      ) : null}

      <AssetsDataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        selected={selected}
        onSelectRow={(id) => {
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }}
        onSelectAll={() => {
          if (selected.size === rows.length) setSelected(new Set());
          else setSelected(new Set(rows.map((r) => r.id)));
        }}
        allSelected={rows.length > 0 && selected.size === rows.length}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        loading={loading}
        emptyMessage="No assets in register"
        emptyAction={
          <button type="button" className="btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add first asset
          </button>
        }
        onView={(row) => setPreview(row)}
        onEdit={(row) => openEdit(row)}
        onDelete={(row) => requestRemoveAsset(row)}
      />

      <RegisterFiltersPanel
        filters={filters}
        years={years}
        registerYears={registerYears}
        categories={categories}
        total={total}
        open={filtersMobileOpen}
        onOpenChange={setFiltersMobileOpen}
        onChange={patchFilters}
        onReset={resetFilters}
      />

      {preview ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="font-semibold text-navy">{preview.assetName}</h3>
                <p className="font-mono text-xs text-muted">{preview.assetCode}</p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setPreview(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
              <StatusBadge
                status={
                  preview.assetHealthStatus === 'NotUsedOld' ? 'Not Used (Old)' : 'Used'
                }
              />
              <Row label="Category" value={preview.categoryName} />
              <Row label="Year" value={String(preview.registerYear)} />
              <Row label="Location" value={preview.location || '—'} />
              <Row label="SKU" value={preview.sku || '—'} />
              <Row label="Opening" value={formatRwf(preview.openingAmount)} />
              <Row label="Purchase" value={formatRwf(preview.unitPrice)} />
              {preview.applySaleBalance ? (
                <Row label="Sale balance" value={formatRwf(preview.saleBalance ?? 0)} />
              ) : null}
              <Row label="Total balance" value={formatRwf(preview.totalBalance)} />
              <Row label="Acc. dep." value={formatRwf(preview.accumulatedDepreciation)} />
              <Row label="Annual dep." value={formatRwf(preview.annualDep)} />
              <Row label="Total dep." value={formatRwf(preview.totalDep)} />
              <Row label="Net book value" value={formatRwf(preview.netBookValue)} />
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                To add cost or depreciation corrections with audit trail, click{' '}
                <strong>Edit</strong> — adjustments are on step 2 (Financial Info &amp;
                Adjustments).
              </p>
              <div className="rounded-xl border border-border bg-slate-50/80 p-4">
                <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-muted">
                  Asset QR label
                </p>
                <AssetQrCode asset={preview} size={148} />
              </div>
            </div>
            <div className="flex gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => openEdit(preview)}
              >
                <Pencil size={16} /> Edit
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => requestRemoveAsset(preview)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AddAssetWizard
        open={wizardOpen}
        mode={wizardMode}
        editId={editId}
        editAsset={editAsset}
        categories={categories}
        years={years}
        initial={wizardInitial}
        onClose={() => {
          setWizardOpen(false);
          setEditAsset(null);
        }}
        onSaved={(created) => {
          void loadMeta();
          void load();
          void loadStats();
          if (created) {
            const list = Array.isArray(created) ? created : [created];
            if (list.length === 1) {
              setPreview(list[0]);
              if (wizardMode === 'edit') setEditAsset(list[0]);
            }
          }
        }}
      />

      <DeleteAssetsModal
        state={deleteConfirm}
        loading={deleteLoading}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={executeDelete}
      />

      <DeleteAllRegisterModal
        open={deleteAllOpen}
        scope={deleteAllScope}
        loading={deleteAllLoading}
        onClose={() => setDeleteAllOpen(false)}
        onConfirm={executeDeleteAll}
      />

      <ConfirmActionModal
        open={recalcConfirmOpen}
        variant="warning"
        title="Recalculate register?"
        confirmLabel="Recalculate"
        onClose={() => setRecalcConfirmOpen(false)}
        onConfirm={executeRecalc}
        description={
          yearFilter ? (
            <>
              Recompute depreciation and balances for register year{' '}
              <strong>{yearFilter}</strong>
              {categoryFilter ? (
                <>
                  {' '}
                  in category <strong>{categoryFilter}</strong>
                </>
              ) : null}
              .
            </>
          ) : (
            <>Recompute depreciation and balances for the full asset register across all years.</>
          )
        }
      />

      <ExportExcelModal
        open={exportOpen}
        filters={filters}
        filteredTotal={total}
        allTotal={allRegisterTotal}
        exporting={exporting}
        onClose={() => setExportOpen(false)}
        onExport={exportExcel}
      />

      <AssetImportWizard
        open={importOpen}
        years={years}
        defaultYear={yearFilter ? Number(yearFilter) : activeYear}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          if (yearFilter) {
            setYearFilter('');
            setPage(1);
          } else {
            void load();
            void loadStats();
          }
          toast.success(
            'Assets imported. Showing all register years — use Filters to narrow by year.',
            'Import complete'
          );
        }}
      />
    </AssetsPageLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 py-1.5">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-navy">{value}</span>
    </div>
  );
}
