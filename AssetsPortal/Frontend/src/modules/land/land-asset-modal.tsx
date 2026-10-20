'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2 } from 'lucide-react';
import { assetsApi } from '@/services/assets-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatRwf } from '@/utils/format';
import { computeAssetRegisterMath } from '@/lib/register-math';
import type { AssetRow, FinancialYear, OpeningContext } from '@/types';

const LAND_CATEGORY = 'Land';

export type LandFormState = {
  firstTime: boolean;
  entryMode: 'year_setup' | 'legacy';
  registerYear: number;
  landProvince: string;
  landDistrict: string;
  landSector: string;
  landCellule: string;
  landVillage: string;
  landUpi: string;
  purchasePrice: number;
  supplier: string;
  sku: string;
};

function emptyLandForm(activeYear: number): LandFormState {
  return {
    firstTime: true,
    entryMode: 'year_setup',
    registerYear: activeYear,
    landProvince: '',
    landDistrict: '',
    landSector: '',
    landCellule: '',
    landVillage: '',
    landUpi: '',
    purchasePrice: 0,
    supplier: '',
    sku: '',
  };
}

function landFormFromAsset(asset: AssetRow): LandFormState {
  return {
    firstTime: Boolean(asset.firstTime ?? false),
    entryMode: asset.entryMode === 'legacy' ? 'legacy' : 'year_setup',
    registerYear: asset.registerYear,
    landProvince: asset.landProvince ?? '',
    landDistrict: asset.landDistrict ?? '',
    landSector: asset.landSector ?? '',
    landCellule: asset.landCellule ?? '',
    landVillage: asset.landVillage ?? '',
    landUpi: asset.landUpi ?? '',
    purchasePrice: asset.unitPrice,
    supplier: asset.supplier ?? '',
    sku: asset.sku ?? '',
  };
}

function buildLandName(form: LandFormState) {
  const parts = [
    form.landProvince,
    form.landDistrict,
    form.landSector,
    form.landCellule,
    form.landVillage,
    form.landUpi,
  ].filter(Boolean);
  return parts.length ? `Land — ${parts.join(' / ')}` : 'Land parcel';
}

function landLocation(form: LandFormState) {
  const parts = [form.landProvince, form.landDistrict, form.landSector].filter(Boolean);
  return parts.length ? parts.join(' / ') : 'Land';
}

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  editId?: string | null;
  editAsset?: AssetRow | null;
  years: FinancialYear[];
  onClose: () => void;
  onSaved: (asset?: AssetRow) => void;
};

export function LandAssetModal({
  open,
  mode,
  editId,
  editAsset,
  years,
  onClose,
  onSaved,
}: Props) {
  const toast = useToast();
  const activeYear =
    years.find((y) => y.status === 'Active')?.year ?? new Date().getFullYear();
  const [form, setForm] = useState<LandFormState>(emptyLandForm(activeYear));
  const [opening, setOpening] = useState<OpeningContext | null>(null);
  const [loadingOpening, setLoadingOpening] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOpening(null);
    setForm(
      mode === 'edit' && editAsset ? landFormFromAsset(editAsset) : emptyLandForm(activeYear)
    );
  }, [open, mode, editAsset, activeYear]);

  const assetName = useMemo(() => buildLandName(form), [form]);

  const math = useMemo(() => {
    if (!opening) return null;
    return computeAssetRegisterMath({
      opening: opening.effective_opening,
      purchasePrice: Number(form.purchasePrice) || 0,
      accumulatedStart: 0,
      rate: 0,
      categoryName: LAND_CATEGORY,
    });
  }, [opening, form.purchasePrice]);

  const needsYearSetup = Boolean(
    mode === 'create' &&
      opening &&
      opening.source === 'year_setup' &&
      (opening.assets_in_year ?? 0) === 0 &&
      opening.effective_opening === 0,
  );

  async function loadOpening() {
    setLoadingOpening(true);
    try {
      const { data } = await assetsApi.registerOpening({
        year: form.registerYear,
        category: LAND_CATEGORY,
        entry_mode: form.entryMode,
        edit_asset_id: mode === 'edit' && editId ? editId : undefined,
      });
      const ctx = data.data;
      setOpening(ctx);
      if (mode === 'create') {
        const isFirstInYear = (ctx.assets_in_year ?? 0) === 0 && ctx.source === 'year_setup';
        setForm((f) => ({
          ...f,
          firstTime: isFirstInYear,
          entryMode: isFirstInYear ? 'year_setup' : 'legacy',
        }));
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not load opening context'), 'Error');
    } finally {
      setLoadingOpening(false);
    }
  }

  useEffect(() => {
    if (open) void loadOpening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.registerYear, editId, mode]);

  async function save() {
    if (Number(form.purchasePrice) <= 0 && mode === 'create') {
      toast.error('Enter the purchase price for this land parcel');
      return;
    }
    if (Number(form.purchasePrice) < 0) {
      toast.error('Purchase price cannot be negative');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        assetName,
        category: LAND_CATEGORY,
        registerYear: form.registerYear,
        location: landLocation(form),
        locationLabel: (form.landUpi || 'LAND').slice(0, 12).toUpperCase(),
        purchasePrice: Number(form.purchasePrice) || 0,
        entryMode: form.entryMode,
        firstTime: form.firstTime,
        skuMode: form.sku.trim() ? 'manual' : 'auto',
        sku: form.sku.trim() || undefined,
        supplier: form.supplier.trim() || undefined,
        applyTax: false,
        assetHealthStatus: 'Used',
        landProvince: form.landProvince.trim() || undefined,
        landDistrict: form.landDistrict.trim() || undefined,
        landSector: form.landSector.trim() || undefined,
        landCellule: form.landCellule.trim() || undefined,
        landVillage: form.landVillage.trim() || undefined,
        landUpi: form.landUpi.trim() || undefined,
      };

      if (mode === 'edit' && editId) {
        await assetsApi.updateAsset(editId, payload);
        const { data } = await assetsApi.getAsset(editId);
        toast.success('Land parcel updated.', 'Updated');
        onSaved(data.data);
      } else {
        const { data } = await assetsApi.createAsset(payload);
        toast.success('Land parcel added.', 'Created');
        onSaved(Array.isArray(data.data) ? data.data[0] : data.data);
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save land parcel'), 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-navy">
            {mode === 'edit' ? 'Edit Land Parcel' : 'Add Land Parcel'}
          </h2>
          <p className="text-xs text-muted">
            Enter purchase only — opening and total balance are calculated automatically
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {needsYearSetup ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-medium">Set Land opening in Year Setup first</p>
              <p className="mt-1 text-xs">
                For {form.registerYear}, enter the land opening amount in Year Setup. The first
                parcel uses that opening; later parcels in the same year chain from the previous
                total balance.
              </p>
              <Link
                href="/year-setup"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ochre hover:underline"
              >
                Open Year Setup <ExternalLink size={12} />
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-950">
              <p>
                <strong>Opening</strong> comes from Year Setup (first parcel in a year) or from the
                last land total balance (same year or previous year). You only enter{' '}
                <strong>purchase price</strong> here.
              </p>
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-navy">Financial year</span>
            <select
              className="input"
              disabled={mode === 'edit'}
              value={form.registerYear}
              onChange={(e) =>
                setForm({ ...form, registerYear: Number(e.target.value) })
              }
            >
              {years.map((y) => (
                <option key={y.id} value={y.year}>
                  {y.year} — {y.status}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['Province', 'landProvince'],
                ['District', 'landDistrict'],
                ['Sector', 'landSector'],
                ['Cellule', 'landCellule'],
                ['Village', 'landVillage'],
                ['UPI', 'landUpi'],
              ] as const
            ).map(([label, key]) => (
              <label key={key} className="block text-sm">
                <span className="mb-1 block font-medium text-navy">{label}</span>
                <input
                  className="input"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>

          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            Asset name: <strong>{assetName}</strong>
          </p>

          {opening ? (
            <div className="rounded-xl border border-border bg-slate-50 p-3 text-sm">
              <p>
                Calculated opening: <strong>{formatRwf(opening.effective_opening)}</strong>
              </p>
              <p className="text-xs text-muted">{opening.source_label || opening.source}</p>
              {(opening.assets_in_year ?? 0) > 0 ? (
                <p className="mt-1 text-xs text-muted">
                  {opening.assets_in_year} parcel(s) already in {form.registerYear} — this row
                  continues from the last total balance.
                </p>
              ) : null}
            </div>
          ) : loadingOpening ? (
            <p className="text-sm text-muted">Loading opening…</p>
          ) : null}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-navy">Purchase price (RWF) *</span>
            <input
              className="input"
              type="number"
              min={0}
              value={form.purchasePrice || ''}
              onChange={(e) =>
                setForm({ ...form, purchasePrice: Number(e.target.value) || 0 })
              }
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-navy">UPI / SKU (optional)</span>
              <input
                className="input"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-navy">Supplier</span>
              <input
                className="input"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
            </label>
          </div>

          {math ? (
            <div className="rounded-xl border border-navy/10 bg-navy/[0.03] p-4 text-sm">
              <p>
                Total balance: <strong>{formatRwf(math.totalBalance)}</strong>
              </p>
              <p className="text-xs text-muted">
                {formatRwf(opening?.effective_opening ?? 0)} opening +{' '}
                {formatRwf(Number(form.purchasePrice) || 0)} purchase
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={saving || (needsYearSetup && mode === 'create')}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === 'edit' ? 'Save changes' : 'Add land'}
          </button>
        </div>
      </div>
    </div>
  );
}
