'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { assetsApi } from '@/services/assets-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatRwf } from '@/utils/format';
import {
  computeAssetRegisterMath,
  isBuildingsCategory,
  isLandCategory,
  isVehicleCategory,
} from '@/lib/register-math';
import type { AssetRow, Category, FinancialYear, OpeningContext } from '@/types';
import { AssetFinancialsPanel } from '@/modules/register/asset-financials-panel';

export type AddAssetFormState = {
  firstTime: boolean;
  entryMode: 'year_setup' | 'legacy';
  registerYear: number;
  assetName: string;
  category: string;
  buildingStatus: string;
  location: string;
  locationLabel: string;
  labelTag: string;
  skuMode: 'auto' | 'manual';
  sku: string;
  quantity: number;
  assetHealthStatus: string;
  purchasePrice: number;
  purchaseDate: string;
  conditionCode: string;
  receiptRefs: string;
  applyTax: boolean;
  serialNumber: string;
  supplier: string;
  applySaleBalance: boolean;
  saleBalance: number;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export function emptyAddAssetForm(
  activeYear: number,
  defaultCategory = ''
): AddAssetFormState {
  return {
    firstTime: true,
    entryMode: 'year_setup',
    registerYear: activeYear,
    assetName: '',
    category: defaultCategory,
    buildingStatus: 'Finished',
    location: '',
    locationLabel: '',
    labelTag: '',
    skuMode: 'auto',
    sku: '',
    quantity: 1,
    assetHealthStatus: 'Used',
    purchasePrice: 0,
    purchaseDate: todayIso(),
    conditionCode: 'Good',
    receiptRefs: '',
    applyTax: true,
    serialNumber: '',
    supplier: '',
    applySaleBalance: false,
    saleBalance: 0,
  };
}

export function formFromAsset(asset: AssetRow): AddAssetFormState {
  return {
    firstTime: Boolean(asset.firstTime ?? false),
    entryMode: asset.entryMode === 'legacy' ? 'legacy' : 'year_setup',
    registerYear: asset.registerYear,
    assetName: asset.assetName,
    category: asset.categoryName,
    buildingStatus:
      asset.buildingStatus === 'WorkingProgress' ? 'Working Progress' : 'Finished',
    location: asset.location ?? '',
    locationLabel: asset.locationLabel ?? '',
    labelTag: asset.labelTag ?? '',
    skuMode: 'manual',
    sku: asset.sku ?? '',
    quantity: 1,
    assetHealthStatus: asset.assetHealthStatus === 'NotUsedOld' ? 'NotUsedOld' : 'Used',
    purchasePrice: asset.unitPrice,
    purchaseDate: asset.purchaseDate
      ? String(asset.purchaseDate).slice(0, 10)
      : todayIso(),
    conditionCode: asset.conditionCode || 'Good',
    receiptRefs: asset.receiptRefs ?? '',
    applyTax: asset.applyTax !== false,
    serialNumber: asset.serialNumber ?? '',
    supplier: asset.supplier ?? '',
    applySaleBalance: Boolean(asset.applySaleBalance),
    saleBalance: Number(asset.saleBalance) || 0,
  };
}

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  editId?: string | null;
  editAsset?: AssetRow | null;
  categories: Category[];
  years: FinancialYear[];
  initial?: AddAssetFormState;
  onClose: () => void;
  onSaved: (created?: AssetRow | AssetRow[]) => void;
};

export function AddAssetWizard({
  open,
  mode,
  editId,
  editAsset,
  categories,
  years,
  initial,
  onClose,
  onSaved,
}: Props) {
  const toast = useToast();
  const activeYear =
    years.find((y) => y.status === 'Active')?.year ?? new Date().getFullYear();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AddAssetFormState>(
    initial ?? emptyAddAssetForm(activeYear, categories[0]?.name ?? '')
  );
  const [opening, setOpening] = useState<OpeningContext | null>(null);
  const [loadingOpening, setLoadingOpening] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setOpening(null);
    setForm(initial ?? emptyAddAssetForm(activeYear, categories[0]?.name ?? ''));
  }, [open, initial, activeYear, categories]);

  const yearSetupCategories = useMemo(() => {
    if (!form.firstTime) return categories;
    const fy = years.find((y) => y.year === form.registerYear);
    const names = new Set((fy?.categoryBalances ?? []).map((b) => b.categoryName.toLowerCase()));
    if (!names.size) return categories;
    return categories.filter((c) => names.has(c.name.toLowerCase()));
  }, [form.firstTime, form.registerYear, years, categories]);

  const selectedYearBalance = useMemo(() => {
    const fy = years.find((y) => y.year === form.registerYear);
    return fy?.categoryBalances?.find(
      (b) => b.categoryName.toLowerCase() === form.category.toLowerCase()
    );
  }, [years, form.registerYear, form.category]);

  const selectedCategory = yearSetupCategories.find(
    (c) => c.name.toLowerCase() === form.category.toLowerCase()
  );
  const isBuildings = isBuildingsCategory(form.category);
  const isLand = isLandCategory(form.category);
  const isVehicle = isVehicleCategory(form.category);

  const yearOptions = useMemo(() => {
    if (form.firstTime) {
      const active = years.filter((y) => y.status === 'Active');
      return active.length ? active : years;
    }
    const fromDb = years.map((y) => y.year);
    const extras: number[] = [];
    for (let y = new Date().getFullYear(); y >= 1900; y -= 1) {
      if (!fromDb.includes(y) && extras.length < 40) extras.push(y);
    }
    const merged = [...new Set([...fromDb, ...extras])].sort((a, b) => b - a);
    return merged.map((year) => {
      const row = years.find((y) => y.year === year);
      return row ?? ({ id: `y-${year}`, year, status: 'Historical' } as FinancialYear);
    });
  }, [form.firstTime, years]);

  const math = useMemo(() => {
    if (!opening) return null;
    const pp = Number(form.purchasePrice) || 0;
    const isWip = isBuildings && form.buildingStatus === 'Working Progress';
    const existingWip = opening.wip_purchase_prices_in_year ?? [];
    const allWipPP = isWip ? [...existingWip, pp].filter((n) => n > 0) : undefined;
    const poolTB =
      isWip && allWipPP?.length
        ? (opening.category_total_balance ?? opening.effective_opening) + pp
        : opening.effective_opening + pp;

    return computeAssetRegisterMath({
      opening: opening.effective_opening,
      purchasePrice: pp,
      accumulatedStart: opening.effective_accumulated_depreciation,
      rate:
        (mode === 'edit' && editAsset?.depRate) ||
        opening.depreciation_rate ||
        selectedCategory?.depreciationRate ||
        0,
      categoryName: form.category,
      buildingStatus: isBuildings
        ? (form.buildingStatus as 'Finished' | 'Working Progress')
        : null,
      priorSameAssetNetBook: opening.prior_same_asset_net_book,
      isFirstInYear: (opening.assets_in_year ?? 0) === 0,
      yearStartOpening: opening.year_start_opening ?? opening.effective_opening,
      allWipPurchasePricesInYear: allWipPP,
      categoryTotalBalance: isWip ? poolTB : undefined,
      saleBalance: form.saleBalance,
      applySaleBalance: form.applySaleBalance,
    });
  }, [opening, form, selectedCategory, isBuildings, mode, editAsset?.depRate]);

  const allowsZeroPurchase = isLand || isVehicle;

  const step1Valid =
    Boolean(form.assetName.trim()) &&
    Boolean(form.category) &&
    Boolean(form.location.trim()) &&
    Boolean(form.locationLabel.trim()) &&
    form.registerYear > 0 &&
    (form.skuMode === 'auto' || Boolean(form.sku.trim())) &&
    form.quantity >= 1 &&
    form.quantity <= 100;

  function setFirstTime(on: boolean) {
    setForm((f) => ({
      ...f,
      firstTime: on,
      entryMode: on ? 'year_setup' : 'legacy',
      registerYear: on ? activeYear : f.registerYear,
    }));
  }

  async function goStep2() {
    if (!step1Valid) {
      toast.error('Fill required fields: name, category, location, and location label');
      return;
    }
    if (form.firstTime && !years.some((y) => y.status === 'Active')) {
      toast.error('Active financial year is required for First time mode');
      return;
    }
    if (form.skuMode === 'manual' && form.sku.trim() && mode === 'create') {
      try {
        const { data } = await assetsApi.checkIdentifiers({
          register_year: form.registerYear,
          sku: form.sku.trim(),
        });
        if (!data.data.available) {
          toast.error('Manual SKU already exists for this year');
          return;
        }
      } catch {
        // continue; server will re-check on save
      }
    }
    setLoadingOpening(true);
    try {
      const { data } = await assetsApi.registerOpening({
        year: form.registerYear,
        category: form.category,
        entry_mode: form.entryMode,
        edit_asset_id: mode === 'edit' && editId ? editId : undefined,
      });
      setOpening(data.data);
      setStep(2);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not load opening context'), 'Error');
    } finally {
      setLoadingOpening(false);
    }
  }

  async function save() {
    const pp = Number(form.purchasePrice) || 0;
    const zeroOk = isLand || isVehicle;
    if (!zeroOk && !(pp > 0)) {
      toast.error('Purchase price must be greater than 0');
      return;
    }
    if (pp < 0) {
      toast.error('Purchase price cannot be negative');
      return;
    }
    if (isVehicle && form.applySaleBalance && !(form.saleBalance > 0)) {
      toast.error('Enter a sale balance amount when sale balance is enabled');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        assetName: form.assetName.trim(),
        category: form.category,
        registerYear: form.registerYear,
        location: form.location.trim(),
        locationLabel: form.locationLabel.trim().toUpperCase(),
        labelTag: form.labelTag.trim() || undefined,
        purchasePrice: Number(form.purchasePrice),
        buildingStatus: isBuildings ? form.buildingStatus : undefined,
        entryMode: form.entryMode,
        firstTime: form.firstTime,
        skuMode: form.skuMode,
        sku: form.skuMode === 'manual' ? form.sku.trim() : undefined,
        applyTax: form.applyTax,
        assetHealthStatus: form.assetHealthStatus,
        quantity: mode === 'create' ? Math.min(100, Math.max(1, form.quantity)) : 1,
        serialNumber: form.serialNumber || undefined,
        purchaseDate: form.purchaseDate || undefined,
        supplier: form.supplier || undefined,
        conditionCode: form.conditionCode || undefined,
        receiptRefs: form.receiptRefs || undefined,
        applySaleBalance: isVehicle ? form.applySaleBalance : undefined,
        saleBalance: isVehicle && form.applySaleBalance ? Number(form.saleBalance) : undefined,
      };

      if (mode === 'edit' && editId) {
        await assetsApi.updateAsset(editId, payload);
        const { data } = await assetsApi.getAsset(editId);
        toast.success('Asset updated.', 'Updated');
        onSaved(data.data);
      } else {
        const { data } = await assetsApi.createAsset(payload);
        toast.success(
          form.quantity > 1 ? `${form.quantity} assets created.` : 'Asset created.',
          'Created'
        );
        onSaved(data.data);
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save asset'), 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`flex max-h-[92vh] w-full flex-col rounded-2xl bg-white shadow-xl ${
          mode === 'edit' ? 'max-w-3xl' : 'max-w-2xl'
        }`}
      >
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-navy">
                {mode === 'edit' ? 'Edit Asset' : 'Add Asset'}
              </h2>
              <p className="text-xs text-muted">
                Step {step} of 2 —{' '}
                {step === 1
                  ? 'Basic Info'
                  : mode === 'edit'
                    ? 'Financial Info & Adjustments'
                    : 'Financial Info'}
              </p>
            </div>
            <div className="flex gap-1">
              <span
                className={`h-2 w-8 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-slate-200'}`}
              />
              <span
                className={`h-2 w-8 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {step === 1 ? (
            <>
              {/* Register mode toggle */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  Is this your organization&apos;s first asset year?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={mode === 'edit'}
                    onClick={() => setFirstTime(true)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                      form.firstTime
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                        : 'border-border bg-white text-navy'
                    }`}
                  >
                    <p className="font-semibold">Yes, First Year</p>
                    <p className="text-xs opacity-80">Use an active year setup</p>
                  </button>
                  <button
                    type="button"
                    disabled={mode === 'edit'}
                    onClick={() => setFirstTime(false)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                      !form.firstTime
                        ? 'border-sky-400 bg-sky-50 text-sky-900'
                        : 'border-border bg-white text-navy'
                    }`}
                  >
                    <p className="font-semibold">No, Existing Year</p>
                    <p className="text-xs opacity-80">Carry forward from prior year</p>
                  </button>
                </div>
              </div>

              {form.firstTime ? (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-navy">Select year setup *</span>
                  <select
                    className="input"
                    value={form.registerYear}
                    disabled={mode === 'edit'}
                    onChange={(e) =>
                      setForm({ ...form, registerYear: Number(e.target.value), category: '' })
                    }
                  >
                    {years
                      .filter((y) => y.status === 'Active' || y.status === 'Draft')
                      .map((y) => (
                        <option key={y.id} value={y.year}>
                          {y.year} — {y.status}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-muted">
                    Categories below come from this year setup opening balances.
                  </p>
                </label>
              ) : (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-navy">Select asset year *</span>
                  <select
                    className="input"
                    value={form.registerYear}
                    disabled={mode === 'edit'}
                    onChange={(e) =>
                      setForm({ ...form, registerYear: Number(e.target.value) })
                    }
                  >
                    {yearOptions.map((y) => (
                      <option key={y.id} value={y.year}>
                        {y.year}
                        {y.status === 'Active' ? ' — Active' : ` (${y.status})`}
                      </option>
                    ))}
                  </select>
                  {years.find((y) => y.year === form.registerYear) ? (
                    <p className="mt-1 text-xs text-muted">
                      Opening balances carry forward from the previous financial year.
                    </p>
                  ) : null}
                </label>
              )}

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-navy">Asset name *</span>
                <input
                  className="input"
                  placeholder="e.g. NEW DINNING HALL"
                  value={form.assetName}
                  onChange={(e) => setForm({ ...form, assetName: e.target.value })}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-navy">Category *</span>
                <select
                  className="input"
                  value={form.category}
                  disabled={mode === 'edit'}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">Select category</option>
                  {yearSetupCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                      {isLandCategory(c.name)
                        ? ' (no depreciation)'
                        : ` (${c.depreciationRate}% dep.)`}
                    </option>
                  ))}
                </select>
                {form.firstTime && selectedYearBalance ? (
                  <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-950">
                    <p>
                      Opening balance: {formatRwf(selectedYearBalance.openingBalance)} · Acc.
                      dep: {formatRwf(selectedYearBalance.accumulatedDepreciationStart)}
                    </p>
                  </div>
                ) : null}
              </label>

              {isBuildings ? (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                    Building status
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Working Progress', 'Finished'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm({ ...form, buildingStatus: s })}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                          form.buildingStatus === s
                            ? 'border-primary bg-amber-50 text-navy'
                            : 'border-border'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {isLand ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  Land: Opening + Purchase = Total balance. No depreciation is applied.
                </p>
              ) : null}

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-navy">Location *</span>
                <input
                  className="input"
                  placeholder="e.g. Main Campus - Block A"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-navy">Label of location *</span>
                  <input
                    className="input uppercase"
                    placeholder="e.g. BLKA"
                    value={form.locationLabel}
                    onChange={(e) =>
                      setForm({ ...form, locationLabel: e.target.value.toUpperCase() })
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-navy">Label tag</span>
                  <input
                    className="input"
                    placeholder="Optional SKU tag"
                    value={form.labelTag}
                    onChange={(e) => setForm({ ...form, labelTag: e.target.value })}
                  />
                </label>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  SKU / Serial
                </p>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  {(['auto', 'manual'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm({ ...form, skuMode: m })}
                      className={`rounded-xl border px-3 py-2 text-sm capitalize ${
                        form.skuMode === m
                          ? 'border-primary bg-amber-50 font-semibold text-navy'
                          : 'border-border'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {form.skuMode === 'manual' ? (
                  <input
                    className="input font-mono text-sm"
                    placeholder="Enter unique SKU for this year"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  />
                ) : (
                  <p className="text-xs text-muted">
                    Auto: SCH/{'{LOC}'}/{'{TAG}'}/00001
                  </p>
                )}
              </div>

              {mode === 'create' ? (
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-navy">Quantity (1–100)</span>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={100}
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        quantity: Math.min(100, Math.max(1, Number(e.target.value) || 1)),
                      })
                    }
                  />
                  <span className="mt-1 block text-xs text-muted">
                    Creates separate register rows, each with its own SKU and QR.
                  </span>
                </label>
              ) : null}

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  Asset health status
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, assetHealthStatus: 'Used' })}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      form.assetHealthStatus === 'Used'
                        ? 'border-emerald-400 bg-emerald-50 font-semibold'
                        : 'border-border'
                    }`}
                  >
                    Used
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, assetHealthStatus: 'NotUsedOld' })}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      form.assetHealthStatus === 'NotUsedOld'
                        ? 'border-amber-400 bg-amber-50 font-semibold'
                        : 'border-border'
                    }`}
                  >
                    Not Used (Old)
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {opening ? (
                <div className="rounded-xl border border-border bg-slate-50 p-4 text-sm">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                    Opening stock
                  </p>
                  <div className="grid gap-1 text-navy">
                    <p>
                      Source:{' '}
                      <strong>{opening.source_label || opening.source}</strong>
                    </p>
                    <p>
                      Opening:{' '}
                      <strong>{formatRwf(opening.effective_opening)}</strong>
                    </p>
                    <p>
                      Accumulated dep. (start):{' '}
                      <strong>
                        {formatRwf(opening.effective_accumulated_depreciation)}
                      </strong>
                    </p>
                    {opening.prior_asset_name ? (
                      <p>
                        Prior asset: <strong>{opening.prior_asset_name}</strong>
                        {opening.prior_asset_code
                          ? ` (${opening.prior_asset_code})`
                          : ''}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-navy">
                  Purchase price (RWF){allowsZeroPurchase ? '' : ' *'}
                </span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  placeholder="Purchase unit price"
                  value={form.purchasePrice || ''}
                  onChange={(e) =>
                    setForm({ ...form, purchasePrice: Number(e.target.value) || 0 })
                  }
                />
              </label>

              {isVehicle ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-navy">
                    <input
                      type="checkbox"
                      checked={form.applySaleBalance}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          applySaleBalance: e.target.checked,
                          saleBalance: e.target.checked ? form.saleBalance : 0,
                        })
                      }
                    />
                    Apply sale balance (vehicle disposal / sale)
                  </label>
                  {form.applySaleBalance ? (
                    <label className="mt-3 block text-sm">
                      <span className="mb-1 block font-medium text-navy">Sale balance (RWF)</span>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={form.saleBalance || ''}
                        onChange={(e) =>
                          setForm({ ...form, saleBalance: Number(e.target.value) || 0 })
                        }
                      />
                      <p className="mt-1 text-xs text-muted">
                        Total balance = Opening + Purchase − Sale balance
                      </p>
                    </label>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-navy">Purchase date</span>
                  <input
                    className="input"
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-navy">Condition</span>
                  <select
                    className="input"
                    value={form.conditionCode}
                    onChange={(e) => setForm({ ...form, conditionCode: e.target.value })}
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-navy">
                  SD Number / Receipt Number
                </span>
                <input
                  className="input"
                  placeholder="Optional procurement reference"
                  value={form.receiptRefs}
                  onChange={(e) => setForm({ ...form, receiptRefs: e.target.value })}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-navy">Supplier</span>
                  <input
                    className="input"
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-navy">Serial number</span>
                  <input
                    className="input"
                    value={form.serialNumber}
                    onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-3 text-sm text-navy">
                <input
                  type="checkbox"
                  checked={form.applyTax}
                  onChange={(e) => setForm({ ...form, applyTax: e.target.checked })}
                />
                Apply VAT 18% on purchase
              </label>

              {mode === 'edit' && editAsset ? (
                <AssetFinancialsPanel
                  asset={editAsset}
                  embedded
                  onUpdated={() => {
                    if (editId) {
                      void assetsApi.getAsset(editId).then(({ data }) => {
                        onSaved(data.data);
                      });
                    }
                  }}
                />
              ) : math ? (
                <div className="rounded-xl border border-navy/10 bg-navy/[0.03] p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                    Auto-calculation engine
                  </p>
                  <div className="space-y-1.5 text-sm text-navy">
                    <CalcLine label="Opening stock" value={formatRwf(math.opening)} />
                    <CalcLine
                      label="Accumulated dep. (start)"
                      value={formatRwf(math.accumulatedStart)}
                    />
                    <CalcLine
                      label="+ Purchase price"
                      value={formatRwf(math.purchasePrice)}
                    />
                    {isVehicle && form.applySaleBalance ? (
                      <CalcLine
                        label="− Sale balance"
                        value={formatRwf(form.saleBalance)}
                      />
                    ) : null}
                    <CalcLine
                      label="TOTAL BALANCE"
                      value={formatRwf(math.totalBalance)}
                      strong
                    />
                    <CalcLine
                      label={`Annual depreciation (${math.rate}%)`}
                      value={formatRwf(math.annualDep)}
                    />
                    <CalcLine
                      label="TOTAL DEPRECIATION"
                      value={formatRwf(math.totalDep)}
                    />
                    <CalcLine
                      label="NET BOOK VALUE"
                      value={formatRwf(math.netBookValue)}
                      strong
                      highlight
                    />
                    {isLand ? (
                      <p className="pt-2 text-xs text-emerald-700">
                        Land rule: Annual = 0, NBV = Total balance.
                      </p>
                    ) : null}
                    {isBuildings && form.buildingStatus === 'Working Progress' ? (
                      <p className="pt-2 text-xs text-amber-800">
                        Buildings WIP: KPS year-carry / Case 1–2 formula applied.
                      </p>
                    ) : null}
                    {form.applyTax ? (
                      <p className="pt-1 text-xs text-muted">
                        VAT 18% informational:{' '}
                        {formatRwf(Math.round(math.purchasePrice * 0.18))} (register TB uses
                        purchase before tax).
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (step === 1) onClose();
              else setStep(1);
            }}
          >
            <ChevronLeft size={16} />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step === 1 ? (
            <button
              type="button"
              className="btn-primary"
              disabled={!step1Valid || loadingOpening}
              onClick={() => void goStep2()}
            >
              {loadingOpening ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Continue <ChevronRight size={16} />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={saving || !(Number(form.purchasePrice) > 0)}
              onClick={() => void save()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === 'edit' ? (
                'Update Asset'
              ) : (
                'Save Asset'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CalcLine({
  label,
  value,
  strong,
  highlight,
}: {
  label: string;
  value: string;
  strong?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        highlight ? 'rounded-lg bg-emerald-50 px-2 py-1.5' : ''
      }`}
    >
      <span className={strong ? 'font-semibold' : 'text-muted'}>{label}</span>
      <span className={`font-mono ${strong ? 'font-semibold text-navy' : ''}`}>{value}</span>
    </div>
  );
}
