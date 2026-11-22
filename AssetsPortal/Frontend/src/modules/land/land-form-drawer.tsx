'use client';

import { useEffect, useMemo, useState } from 'react';
import { Landmark, Loader2, Save } from 'lucide-react';
import { SideDrawer, DrawerSection } from '@/components/side-drawer';
import { landApi, type LandFormPayload } from '@/services/land-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import type { LandRecord } from '@/types';

type SkuMode = 'auto' | 'manual';

type FormState = {
  province: string;
  district: string;
  sector: string;
  cellule: string;
  village: string;
  type: string;
  category: string;
  supplier: string;
  tax: string;
  upi: string;
  sku: string;
  sku_mode: SkuMode;
  size: string;
  material: string;
  purchase_year: string;
  purchase_month: string;
  purchase_day: string;
  purchase_unit_price: string;
};

const EMPTY: FormState = {
  province: '',
  district: '',
  sector: '',
  cellule: '',
  village: '',
  type: '',
  category: '',
  supplier: '',
  tax: '',
  upi: '',
  sku: '',
  sku_mode: 'auto',
  size: '',
  material: '',
  purchase_year: '',
  purchase_month: '',
  purchase_day: '',
  purchase_unit_price: '',
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

const AUTO_SKU = /^LAND-\d{4}-\d{4}$/;

function recordToForm(record: LandRecord): FormState {
  const hasManualSku = Boolean(record.sku) && !AUTO_SKU.test(record.sku ?? '');
  return {
    province: record.province ?? '',
    district: record.district ?? '',
    sector: record.sector ?? '',
    cellule: record.cellule ?? '',
    village: record.village ?? '',
    type: record.landType ?? '',
    category: record.category ?? '',
    supplier: record.supplier ?? '',
    tax: record.tax ?? '',
    upi: record.upi ?? '',
    sku: record.sku ?? '',
    sku_mode: hasManualSku ? 'manual' : 'auto',
    size: record.size ?? '',
    material: record.material ?? '',
    purchase_year: record.purchaseYear ? String(record.purchaseYear) : '',
    purchase_month: record.purchaseMonth ? String(record.purchaseMonth) : '',
    purchase_day: record.purchaseDay ? String(record.purchaseDay) : '',
    purchase_unit_price: record.purchaseUnitPrice ? String(record.purchaseUnitPrice) : '',
  };
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

interface LandFormDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  year: number;
  record?: LandRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

export function LandFormDrawer({
  open,
  mode,
  year,
  record,
  onClose,
  onSaved,
}: LandFormDrawerProps) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(mode === 'edit' && record ? recordToForm(record) : EMPTY);
    setErrors({});
    setFormError(null);
  }, [open, mode, record]);

  const set = <K extends keyof FormState>(key: K) => (value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    const errorKey = key as string;
    setErrors((prev) => {
      if (!prev[errorKey]) return prev;
      const next = { ...prev };
      delete next[errorKey];
      return next;
    });
  };

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

  const priceNumber = useMemo(() => {
    const raw = form.purchase_unit_price.replace(/,/g, '').trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [form.purchase_unit_price]);

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

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.purchase_unit_price.trim()) {
      next.purchase_unit_price = 'Purchase unit price is required';
    } else if (priceNumber === null || priceNumber < 0) {
      next.purchase_unit_price = 'Enter a valid positive number';
    }

    if (!form.purchase_year && (form.purchase_month || form.purchase_day)) {
      next.purchase_year = 'Select a purchase year first';
    }
    if (form.sku_mode === 'manual' && !form.sku.trim()) {
      next.sku = 'SKU is required in manual mode';
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

    const payload: LandFormPayload = {
      year,
      province: form.province,
      district: form.district,
      sector: form.sector,
      cellule: form.cellule,
      village: form.village,
      type: form.type,
      category: form.category,
      supplier: form.supplier,
      tax: form.tax,
      upi: form.upi,
      sku: form.sku_mode === 'manual' ? form.sku : '',
      sku_mode: form.sku_mode,
      size: form.size,
      material: form.material,
      purchase_year: form.purchase_year || null,
      purchase_month: form.purchase_month || null,
      purchase_day: form.purchase_day || null,
      purchase_unit_price: priceNumber ?? 0,
    };

    setSaving(true);
    try {
      if (mode === 'edit' && record) {
        const { year: _year, ...updatePayload } = payload;
        await landApi.updateRecord(record.id, updatePayload);
        toast.success('Land record updated.');
      } else {
        await landApi.createRecord(payload);
        toast.success('Land record added.');
      }
      onSaved();
      onClose();
    } catch (error) {
      const message = getApiErrorMessage(error, 'Could not save the land record');
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setForm(mode === 'edit' && record ? recordToForm(record) : EMPTY);
    setErrors({});
    setFormError(null);
  }

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Land Record' : 'Add Land Record'}
      subtitle={`Financial year ${year}`}
      icon={<Landmark size={20} />}
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
            {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Save Land'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {formError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        ) : null}

        <DrawerSection title="Location">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Province">
              <input className="input" value={form.province} onChange={(e) => set('province')(e.target.value)} placeholder="e.g. Kigali" />
            </Field>
            <Field label="District">
              <input className="input" value={form.district} onChange={(e) => set('district')(e.target.value)} placeholder="e.g. Gasabo" />
            </Field>
            <Field label="Sector">
              <input className="input" value={form.sector} onChange={(e) => set('sector')(e.target.value)} placeholder="e.g. Remera" />
            </Field>
            <Field label="Cellule">
              <input className="input" value={form.cellule} onChange={(e) => set('cellule')(e.target.value)} placeholder="e.g. Rukiri I" />
            </Field>
            <Field label="Village">
              <input className="input" value={form.village} onChange={(e) => set('village')(e.target.value)} placeholder="e.g. Amahoro" />
            </Field>
          </div>
        </DrawerSection>

        <DrawerSection title="Land Details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Type">
              <input className="input" value={form.type} onChange={(e) => set('type')(e.target.value)} placeholder="e.g. Residential" />
            </Field>
            <Field label="Category">
              <input className="input" value={form.category} onChange={(e) => set('category')(e.target.value)} placeholder="Land category" />
            </Field>
            <Field label="Size">
              <input className="input" value={form.size} onChange={(e) => set('size')(e.target.value)} placeholder="e.g. 500 sqm" />
            </Field>
            <Field label="Material">
              <input className="input" value={form.material} onChange={(e) => set('material')(e.target.value)} placeholder="e.g. Soil" />
            </Field>
            <Field label="UPI">
              <input className="input" value={form.upi} onChange={(e) => set('upi')(e.target.value)} placeholder="Unique parcel identifier" />
            </Field>
            <Field label="SKU Mode" hint="Automatic uses LAND-year-number.">
              <select
                className="input"
                value={form.sku_mode}
                onChange={(e) => set('sku_mode')(e.target.value as SkuMode)}
              >
                <option value="auto">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </Field>
            <Field label="SKU" required={form.sku_mode === 'manual'} error={errors.sku}>
              <input
                className="input"
                value={form.sku}
                onChange={(e) => set('sku')(e.target.value)}
                disabled={form.sku_mode === 'auto'}
                placeholder={form.sku_mode === 'auto' ? 'Generated when saved' : 'Enter SKU'}
              />
            </Field>
          </div>
        </DrawerSection>

        <DrawerSection title="Supplier">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Supplier">
              <input className="input" value={form.supplier} onChange={(e) => set('supplier')(e.target.value)} placeholder="Supplier name" />
            </Field>
            <Field label="Tax">
              <input className="input" value={form.tax} onChange={(e) => set('tax')(e.target.value)} placeholder="e.g. 18% VAT" />
            </Field>
          </div>
        </DrawerSection>

        <DrawerSection title="Purchase">
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
                placeholder="e.g. 5,000,000"
              />
            </Field>
          </div>
        </DrawerSection>
      </div>
    </SideDrawer>
  );
}
