'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  Car,
  Loader2,
  MapPin,
  Receipt,
  Save,
  Settings2,
  Truck,
  Wallet,
} from 'lucide-react';
import { SideDrawer, DrawerSection } from '@/components/side-drawer';
import { vehicleApi, type VehicleFormPayload } from '@/services/vehicle-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatRwf } from '@/utils/format';
import type { VehicleRecord, VehicleSetupSummary } from '@/types';

type FormState = {
  location: string;
  name: string;
  label: string;
  type: string;
  category: string;
  supplier: string;
  tax: string;
  upi: string;
  sku: string;
  size: string;
  material: string;
  purchase_year: string;
  purchase_month: string;
  purchase_day: string;
  purchase_unit_price: string;
  sale_balance: string;
  quantity: string;
  use_setup_depreciation: boolean;
  dep_mode: string;
  depreciation_rate: string;
  useful_years: string;
};

const EMPTY: FormState = {
  location: '',
  name: '',
  label: '',
  type: '',
  category: 'Vehicles',
  supplier: '',
  tax: '',
  upi: '',
  sku: '',
  size: '',
  material: '',
  purchase_year: '',
  purchase_month: '',
  purchase_day: '',
  purchase_unit_price: '',
  sale_balance: '',
  quantity: '1',
  use_setup_depreciation: true,
  dep_mode: 'Diminishing',
  depreciation_rate: '',
  useful_years: '',
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function recordToForm(record: VehicleRecord): FormState {
  return {
    location: record.location ?? '',
    name: record.name ?? '',
    label: record.label ?? '',
    type: record.type ?? record.vehicleType ?? '',
    category: record.category ?? 'Vehicles',
    supplier: record.supplier ?? '',
    tax: record.tax ?? '',
    upi: record.upi ?? '',
    sku: record.sku ?? '',
    size: record.size ?? '',
    material: record.material ?? '',
    purchase_year: record.purchaseYear ? String(record.purchaseYear) : '',
    purchase_month: record.purchaseMonth ? String(record.purchaseMonth) : '',
    purchase_day: record.purchaseDay ? String(record.purchaseDay) : '',
    purchase_unit_price: record.purchaseUnitPrice ? String(record.purchaseUnitPrice) : '',
    sale_balance: record.saleBalance ? String(record.saleBalance) : '',
    quantity: record.quantity ? String(record.quantity) : '1',
    use_setup_depreciation: record.useSetupDepreciation !== false,
    dep_mode: record.depMode || 'Diminishing',
    depreciation_rate: record.depRate ? String(record.depRate) : '',
    useful_years: record.usefulYears ? String(record.usefulYears) : '',
  };
}

function parseMoney(raw: string): number | null {
  const value = raw.replace(/,/g, '').trim();
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-muted">{hint}</p>
      ) : null}
    </label>
  );
}

interface VehicleFormDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  year: number;
  record?: VehicleRecord | null;
  setup?: VehicleSetupSummary | null;
  onClose: () => void;
  onSaved: () => void;
}

export function VehicleFormDrawer({
  open,
  mode,
  year,
  record,
  setup,
  onClose,
  onSaved,
}: VehicleFormDrawerProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && record) {
      setForm(recordToForm(record));
    } else {
      setForm({
        ...EMPTY,
        dep_mode: setup?.depreciationMode ?? 'Diminishing',
        depreciation_rate:
          setup && setup.depreciationRate > 0 ? String(setup.depreciationRate) : '',
        useful_years: setup && setup.usefulYears > 0 ? String(setup.usefulYears) : '',
        use_setup_depreciation: true,
      });
    }
    setErrors({});
    setFormError(null);
  }, [open, mode, record, setup]);

  const set = <K extends keyof FormState>(key: K) => (value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const priceNumber = useMemo(() => parseMoney(form.purchase_unit_price), [form.purchase_unit_price]);
  const saleNumber = useMemo(() => parseMoney(form.sale_balance), [form.sale_balance]);

  const purchaseYearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const start = Math.max(current, Number(form.purchase_year) || 0);
    const list: number[] = [];
    for (let y = start; y >= 1900; y -= 1) list.push(y);
    return list;
  }, [form.purchase_year]);

  const daysInMonth = useMemo(() => {
    if (!form.purchase_month) return 31;
    const y = Number(form.purchase_year) || new Date().getFullYear();
    return new Date(y, Number(form.purchase_month), 0).getDate();
  }, [form.purchase_year, form.purchase_month]);

  function updatePurchaseDate(
    patch: Partial<Pick<FormState, 'purchase_year' | 'purchase_month' | 'purchase_day'>>
  ) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (!next.purchase_year) {
        next.purchase_month = '';
        next.purchase_day = '';
      } else if (next.purchase_day) {
        const max = next.purchase_month
          ? new Date(Number(next.purchase_year), Number(next.purchase_month), 0).getDate()
          : 31;
        if (Number(next.purchase_day) > max) next.purchase_day = '';
      }
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.purchase_year;
      delete next.purchase_month;
      delete next.purchase_day;
      return next;
    });
  }

  const openingAmount =
    mode === 'edit' && record ? record.openingAmount : setup?.closingBalance ?? 0;
  const previewTotal =
    openingAmount + (priceNumber ?? 0) - (saleNumber !== null ? saleNumber : 0);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.purchase_unit_price.trim()) {
      next.purchase_unit_price = 'Purchase unit price is required';
    } else if (priceNumber === null || priceNumber < 0) {
      next.purchase_unit_price = 'Enter a valid positive number';
    }

    if (form.sale_balance.trim()) {
      if (saleNumber === null || saleNumber <= 0) {
        next.sale_balance = 'Sale balance must be a positive number, or left empty';
      }
    }

    if (form.quantity.trim()) {
      const qty = Number(form.quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        next.quantity = 'Quantity must be a whole number of at least 1';
      }
    }

    if (!form.purchase_year.trim() && (form.purchase_month.trim() || form.purchase_day.trim())) {
      next.purchase_year = 'Select a purchase year first';
    }

    if (!form.use_setup_depreciation) {
      if (form.depreciation_rate.trim()) {
        const rate = Number(form.depreciation_rate);
        if (!Number.isFinite(rate) || rate < 0) {
          next.depreciation_rate = 'Enter a valid depreciation rate';
        }
      }
      if (form.useful_years.trim()) {
        const years = Number(form.useful_years);
        if (!Number.isInteger(years) || years < 0) {
          next.useful_years = 'Useful years must be a whole number';
        }
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    setFormError(null);
    if (!validate()) {
      setFormError('Please fix the highlighted fields before saving.');
      return;
    }

    const payload: VehicleFormPayload = {
      year,
      location: form.location,
      name: form.name,
      label: form.label,
      type: form.type,
      category: form.category,
      supplier: form.supplier,
      tax: form.tax,
      upi: form.upi,
      sku: form.sku,
      size: form.size,
      material: form.material,
      purchase_year: form.purchase_year || null,
      purchase_month: form.purchase_month || null,
      purchase_day: form.purchase_day || null,
      purchase_unit_price: priceNumber ?? 0,
      sale_balance: form.sale_balance.trim() ? saleNumber : 0,
      quantity: form.quantity.trim() ? Number(form.quantity) : 1,
      use_setup_depreciation: form.use_setup_depreciation,
      ...(form.use_setup_depreciation
        ? {}
        : {
            dep_mode: form.dep_mode,
            depreciation_rate: form.depreciation_rate.trim() ? Number(form.depreciation_rate) : 0,
            useful_years: form.useful_years.trim() ? Number(form.useful_years) : 0,
          }),
    };

    setSaving(true);
    try {
      if (mode === 'edit' && record) {
        const { year: _year, ...updatePayload } = payload;
        await vehicleApi.updateRecord(record.id, updatePayload);
        toast.success('Vehicle record updated. Balances were recalculated.');
      } else {
        await vehicleApi.createRecord(payload);
        toast.success('Vehicle record added. Opening amount carried forward automatically.');
      }
      onSaved();
      onClose();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Could not save the vehicle record');
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (mode === 'edit' && record) {
      setForm(recordToForm(record));
    } else {
      setForm({
        ...EMPTY,
        dep_mode: setup?.depreciationMode ?? 'Diminishing',
        depreciation_rate:
          setup && setup.depreciationRate > 0 ? String(setup.depreciationRate) : '',
        useful_years: setup && setup.usefulYears > 0 ? String(setup.usefulYears) : '',
      });
    }
    setErrors({});
    setFormError(null);
  }

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Vehicle Record' : 'Add Vehicle Record'}
      subtitle={`Financial year ${year} • Opening amount is calculated automatically`}
      icon={<Car size={20} />}
      width="xl"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={handleReset} disabled={saving}>
            Reset
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Save Vehicle'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/60 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-ochre shadow-sm">
              <Calculator size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy">Sequential vehicle balance chain</p>
              <p className="mt-0.5 text-xs text-amber-900/80">
                Opening + Purchase unit price − Sale balance = Total balance. The opening amount and
                total balance are calculated by the backend using Vehicle Setup and the previous
                vehicle record.
              </p>
              <p className="mt-2 text-xs font-medium text-navy">
                Live preview: {formatRwf(openingAmount)} + {formatRwf(priceNumber ?? 0)} −{' '}
                {formatRwf(saleNumber ?? 0)} = {formatRwf(previewTotal)}
              </p>
            </div>
          </div>
        </div>

        {formError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        ) : null}

        <DrawerSection
          title="Vehicle Identification"
          description="Vehicle name, label and unique identification."
        >
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted">
            <MapPin size={14} /> Location and identification
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Vehicle Name">
              <input
                className="input"
                value={form.name}
                onChange={(e) => set('name')(e.target.value)}
                placeholder="e.g. Toyota Land Cruiser"
              />
            </Field>
            <Field label="Label">
              <input
                className="input"
                value={form.label}
                onChange={(e) => set('label')(e.target.value)}
                placeholder="e.g. Pool vehicle"
              />
            </Field>
            <Field label="Location">
              <input
                className="input"
                value={form.location}
                onChange={(e) => set('location')(e.target.value)}
                placeholder="e.g. Kigali HQ"
              />
            </Field>
            <Field label="Type" hint="e.g. Pickup, Bus, Motorcycle">
              <input
                className="input"
                value={form.type}
                onChange={(e) => set('type')(e.target.value)}
                placeholder="Vehicle type"
              />
            </Field>
            <Field label="UPI" hint="Unique vehicle identifier">
              <input
                className="input"
                value={form.upi}
                onChange={(e) => set('upi')(e.target.value)}
                placeholder="UPI"
              />
            </Field>
            <Field label="SKU">
              <input
                className="input"
                value={form.sku}
                onChange={(e) => set('sku')(e.target.value)}
                placeholder="SKU"
              />
            </Field>
          </div>
        </DrawerSection>

        <DrawerSection title="Supplier Information" description="Who supplied this vehicle.">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted">
            <Truck size={14} /> Supplier and tax details are optional
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Supplier">
              <input
                className="input"
                value={form.supplier}
                onChange={(e) => set('supplier')(e.target.value)}
                placeholder="Supplier name"
              />
            </Field>
            <Field label="Tax">
              <input
                className="input"
                value={form.tax}
                onChange={(e) => set('tax')(e.target.value)}
                placeholder="e.g. 18% VAT or amount"
              />
            </Field>
          </div>
        </DrawerSection>

        <DrawerSection title="Vehicle Specifications" description="Category and physical characteristics.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Category">
              <input
                className="input"
                value={form.category}
                onChange={(e) => set('category')(e.target.value)}
                placeholder="Vehicles"
              />
            </Field>
            <Field label="Size" hint="Free text, e.g. 4x4, 3 tonnes">
              <input
                className="input"
                value={form.size}
                onChange={(e) => set('size')(e.target.value)}
                placeholder="e.g. 4x4"
              />
            </Field>
            <Field label="Material">
              <input
                className="input"
                value={form.material}
                onChange={(e) => set('material')(e.target.value)}
                placeholder="e.g. Diesel, Petrol"
              />
            </Field>
          </div>
        </DrawerSection>

        <DrawerSection title="Purchase Information">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted">
            <Receipt size={14} /> Acquisition date and cost
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Purchase Year" error={errors.purchase_year}>
              <select
                className="input"
                value={form.purchase_year}
                onChange={(e) => updatePurchaseDate({ purchase_year: e.target.value })}
              >
                <option value="">Not set</option>
                {purchaseYearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Purchase Month">
              <select
                className="input"
                value={form.purchase_month}
                onChange={(e) => updatePurchaseDate({ purchase_month: e.target.value })}
                disabled={!form.purchase_year}
              >
                <option value="">Not set</option>
                {MONTHS.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Purchase Day">
              <select
                className="input"
                value={form.purchase_day}
                onChange={(e) => updatePurchaseDate({ purchase_day: e.target.value })}
                disabled={!form.purchase_year}
              >
                <option value="">Not set</option>
                {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Purchase Unit Price (RWF)" required error={errors.purchase_unit_price}>
              <input
                className={`input ${errors.purchase_unit_price ? 'border-red-300 ring-2 ring-red-500/10' : ''}`}
                inputMode="decimal"
                value={form.purchase_unit_price}
                onChange={(e) => set('purchase_unit_price')(e.target.value)}
                placeholder="e.g. 25,000,000"
              />
            </Field>
          </div>
        </DrawerSection>

        <DrawerSection
          title="Financial Adjustments"
          description="Sale balance reduces the total balance and carries into the next record. Depreciation is not reduced by the sale balance."
        >
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted">
            <Wallet size={14} /> Opening amount is read-only
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Opening Amount (RWF)" hint="Calculated from Vehicle Setup or the previous record">
              <input
                className="input bg-slate-50"
                value={formatRwf(openingAmount)}
                readOnly
                aria-readonly="true"
              />
            </Field>
            <Field
              label="Sale Balance (RWF)"
              error={errors.sale_balance}
              hint="Optional. Leave empty when there is no sale."
            >
              <input
                className={`input ${errors.sale_balance ? 'border-red-300 ring-2 ring-red-500/10' : ''}`}
                inputMode="decimal"
                value={form.sale_balance}
                onChange={(e) => set('sale_balance')(e.target.value)}
                placeholder="e.g. 2,000,000"
              />
            </Field>
            <Field label="Total Balance (RWF)" hint="Opening + Purchase unit price − Sale balance">
              <input
                className="input bg-slate-50 font-semibold"
                value={formatRwf(previewTotal)}
                readOnly
                aria-readonly="true"
              />
            </Field>
            <Field label="Quantity" error={errors.quantity} hint="Whole number of vehicles in this record">
              <input
                className="input"
                inputMode="numeric"
                value={form.quantity}
                onChange={(e) => set('quantity')(e.target.value)}
                placeholder="1"
              />
            </Field>
          </div>
        </DrawerSection>

        <DrawerSection
          title="Depreciation Configuration"
          description="By default this vehicle uses the Vehicle Setup depreciation. You may override it for this record."
        >
          <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
            <Settings2 size={14} /> Vehicle Setup: {setup?.depreciationMode ?? '—'} ·{' '}
            {formatNumber(setup?.depreciationRate ?? 0)}% · {setup?.usefulYears ?? 0} years
          </div>

          <label className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
              checked={form.use_setup_depreciation}
              onChange={(e) => set('use_setup_depreciation')(e.target.checked)}
            />
            <span>
              <span className="block font-medium text-navy">Use Vehicle Setup depreciation</span>
              <span className="block text-[11px] text-muted">
                Inherit the mode, rate and useful years configured in Vehicle Setup.
              </span>
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Depreciation Mode">
              <select
                className="input"
                value={form.dep_mode}
                onChange={(e) => set('dep_mode')(e.target.value)}
                disabled={form.use_setup_depreciation}
              >
                <option value="Diminishing">Diminishing</option>
                <option value="Straight Line">Straight Line</option>
              </select>
            </Field>
            <Field label="Depreciation Rate (%)" error={errors.depreciation_rate}>
              <input
                className="input"
                inputMode="decimal"
                value={form.depreciation_rate}
                onChange={(e) => set('depreciation_rate')(e.target.value)}
                placeholder="e.g. 25"
                disabled={form.use_setup_depreciation}
              />
            </Field>
            <Field label="Useful Years" error={errors.useful_years}>
              <input
                className="input"
                inputMode="numeric"
                value={form.useful_years}
                onChange={(e) => set('useful_years')(e.target.value)}
                placeholder="e.g. 5"
                disabled={form.use_setup_depreciation}
              />
            </Field>
          </div>
        </DrawerSection>
      </div>
    </SideDrawer>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-RW', { maximumFractionDigits: 2 }).format(Number(value) || 0);
}
