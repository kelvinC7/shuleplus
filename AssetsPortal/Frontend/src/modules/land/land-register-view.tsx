'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Plus, RefreshCw, Upload, Pencil, Trash2, Calculator, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { AssetsDataTable, type AssetsTableColumn } from '@/components/assets-data-table';
import { DeleteAssetsModal, type DeleteConfirmState } from '@/components/confirm-delete-modal';
import { assetsApi } from '@/services/assets-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatRwf } from '@/utils/format';
import type { AssetRow, FinancialYear } from '@/types';
import { AssetImportWizard } from '@/modules/register/asset-import-wizard';
import { LandAssetModal } from './land-asset-modal';

const LAND_CATEGORY = 'Land';
const PAGE_SIZE = 30;

export function LandRegisterView() {
  const toast = useToast();
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [years, setYears] = useState<FinancialYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [yearFilter, setYearFilter] = useState('');
  const [q, setQ] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editAsset, setEditAsset] = useState<AssetRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, metaRes] = await Promise.all([
        assetsApi.registerList({
          page,
          limit: PAGE_SIZE,
          category: LAND_CATEGORY,
          register_year: yearFilter ? Number(yearFilter) : undefined,
          q: q.trim() || undefined,
        }),
        assetsApi.registerMeta(),
      ]);
      setRows(listRes.data.data ?? []);
      setTotal(listRes.data.total ?? 0);
      setTotalPages(listRes.data.totalPages ?? 1);
      setYears(metaRes.data.data.years ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not load land register'));
    } finally {
      setLoading(false);
    }
  }, [page, yearFilter, q, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeYear = years.find((y) => y.status === 'Active')?.year;
  const filterYearNum = yearFilter ? Number(yearFilter) : null;
  const landYearSetup = useMemo(() => {
    if (!filterYearNum) return null;
    const fy = years.find((y) => y.year === filterYearNum);
    if (!fy) return { configured: false, opening: 0 };
    const bal = fy.categoryBalances?.find(
      (b) => b.categoryName.toLowerCase() === LAND_CATEGORY.toLowerCase()
    );
    return { configured: Boolean(bal), opening: bal?.openingBalance ?? 0 };
  }, [years, filterYearNum]);

  const showYearSetupBanner =
    filterYearNum &&
    rows.length === 0 &&
    !loading &&
    landYearSetup &&
    !landYearSetup.configured;

  async function recalc() {
    try {
      await assetsApi.recalcChain({ category: LAND_CATEGORY });
      toast.success('Land register recalculated.');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Recalculate failed'));
    }
  }

  async function exportExcel() {
    try {
      const all: AssetRow[] = [];
      const first = await assetsApi.registerList({ page: 1, limit: 100, category: LAND_CATEGORY });
      all.push(...(first.data.data ?? []));
      for (let p = 2; p <= Math.min(first.data.totalPages ?? 1, 20); p++) {
        const next = await assetsApi.registerList({ page: p, limit: 100, category: LAND_CATEGORY });
        all.push(...(next.data.data ?? []));
      }
      const sheet = all.map((r, i) => ({
        'S/N': i + 1,
        YEAR: r.registerYear,
        PROVINCE: r.landProvince ?? '',
        DISTRICT: r.landDistrict ?? '',
        SECTOR: r.landSector ?? '',
        CELLULE: r.landCellule ?? '',
        VILLAGE: r.landVillage ?? '',
        UPI: r.landUpi ?? r.sku ?? '',
        NAME: r.assetName,
        'OPENING AMOUNT': r.openingAmount,
        'PURCHASE UNIT PRICE': r.unitPrice,
        'TOTAL BALANCE': r.totalBalance,
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), 'Land');
      XLSX.writeFile(wb, `land-register-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Export failed'));
    }
  }

  const columns: AssetsTableColumn<AssetRow>[] = useMemo(
    () => [
      {
        key: 'sn',
        header: 'S/N',
        render: (r) => {
          const idx = rows.findIndex((x) => x.id === r.id);
          return (page - 1) * PAGE_SIZE + idx + 1;
        },
      },
      { key: 'year', header: 'Year', render: (r) => r.registerYear },
      { key: 'province', header: 'Province', render: (r) => r.landProvince ?? '—' },
      { key: 'district', header: 'District', render: (r) => r.landDistrict ?? '—' },
      { key: 'sector', header: 'Sector', render: (r) => r.landSector ?? '—' },
      { key: 'cellule', header: 'Cellule', render: (r) => r.landCellule ?? '—' },
      { key: 'village', header: 'Village', render: (r) => r.landVillage ?? '—' },
      { key: 'upi', header: 'UPI', render: (r) => r.landUpi ?? r.sku ?? '—' },
      { key: 'opening', header: 'Opening', render: (r) => formatRwf(r.openingAmount) },
      { key: 'purchase', header: 'Purchase', render: (r) => formatRwf(r.unitPrice) },
      {
        key: 'tb',
        header: 'Total balance',
        render: (r) => <span className="font-medium text-emerald-700">{formatRwf(r.totalBalance)}</span>,
      },
      {
        key: 'actions',
        header: '',
        render: (r) => (
          <div className="flex gap-1">
            <button
              type="button"
              className="rounded-lg border border-border p-1.5 text-navy hover:bg-slate-50"
              onClick={() => {
                setEditAsset(r);
                setModalMode('edit');
                setModalOpen(true);
              }}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className="rounded-lg border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-50"
              onClick={() =>
                setDeleteConfirm({
                  kind: 'single',
                  asset: { id: r.id, assetName: r.assetName, assetCode: r.assetCode },
                })
              }
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [rows, page]
  );

  return (
    <AssetsPageLayout
      title="Land Register"
      subtitle="Set opening in Year Setup. Enter purchase only — total balance chains automatically."
      actions={
        <>
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" className="btn-secondary" onClick={() => void recalc()}>
            <Calculator size={16} /> Recalculate
          </button>
          <button type="button" className="btn-secondary" onClick={() => void exportExcel()}>
            <Download size={16} /> Export
          </button>
          <button type="button" className="btn-secondary" onClick={() => setImportOpen(true)}>
            <Upload size={16} /> Import Excel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditAsset(null);
              setModalMode('create');
              setModalOpen(true);
            }}
          >
            <Plus size={16} /> Add land
          </button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search UPI, name, district…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input max-w-[160px]"
          value={yearFilter}
          onChange={(e) => {
            setYearFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y.id} value={y.year}>
              {y.year}
            </option>
          ))}
        </select>
      </div>

      {showYearSetupBanner ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">
            Set Land opening for {filterYearNum} in Year Setup before adding or importing parcels.
          </p>
          <p className="mt-1 text-xs">
            The first parcel in a year uses that opening. Later parcels in the same year use the
            previous total balance. Next year carries forward from the last land balance.
          </p>
          <Link
            href="/year-setup"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ochre hover:underline"
          >
            Open Year Setup <ExternalLink size={12} />
          </Link>
        </div>
      ) : null}

      <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-950">
        Opening is configured in{' '}
        <Link href="/year-setup" className="font-semibold text-ochre hover:underline">
          Year Setup
        </Link>
        . When adding or importing land, enter purchase price and location only — opening and total
        balance are calculated automatically.
      </div>

      <AssetsDataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        loading={loading}
        emptyMessage="No land parcels yet. Add manually or import land.xlsx."
      />

      <LandAssetModal
        open={modalOpen}
        mode={modalMode}
        editId={editAsset?.id}
        editAsset={editAsset}
        years={years}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />

      <AssetImportWizard
        open={importOpen}
        years={years}
        defaultYear={activeYear}
        variant="land"
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setImportOpen(false);
          void load();
        }}
      />

      <DeleteAssetsModal
        state={deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          if (deleteConfirm.kind === 'single') {
            await assetsApi.deleteAsset(deleteConfirm.asset.id);
          }
          toast.success('Land parcel deleted.');
          setDeleteConfirm(null);
          await load();
        }}
      />
    </AssetsPageLayout>
  );
}
