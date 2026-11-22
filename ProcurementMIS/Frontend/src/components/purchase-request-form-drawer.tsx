'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Building2,
  FileText,
  LoaderCircle,
  Package,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FormField, SectionHeading, SelectField } from '@/components/procurement-form-ui';
import type { AcademicSettings } from '@/lib/academic-settings';
import type { PurchaseRequest } from '@/types';

export type PurchaseRequestFormItem = {
  itemName: string;
  description: string;
  unit: string;
  quantity: string;
  categoryId: string;
  warehouseLocation: string;
};

export type PurchaseRequestFormValues = {
  requestType: string;
  departmentId: string;
  departmentOther: string;
  purpose: string;
  priority: string;
  neededDate: string;
  academicYear: string;
  term: string;
  items: PurchaseRequestFormItem[];
};

type DepartmentOption = { id: string; name: string; code: string };

const UNITS = ['EA', 'PCS', 'KG', 'G', 'L', 'ML', 'M', 'Box', 'Carton', 'Pair', 'Set', 'Pack'];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const REQUEST_TYPE_OPTIONS = [
  { value: 'GOODS', label: 'Goods' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'WORKS', label: 'Works' },
];

export const emptyPurchaseRequestItem = (): PurchaseRequestFormItem => ({
  itemName: '',
  description: '',
  unit: 'EA',
  quantity: '',
  categoryId: '',
  warehouseLocation: '',
});

export const emptyPurchaseRequestForm = (): PurchaseRequestFormValues => ({
  requestType: 'GOODS',
  departmentId: '',
  departmentOther: '',
  purpose: '',
  priority: 'MEDIUM',
  neededDate: '',
  academicYear: '',
  term: '',
  items: [emptyPurchaseRequestItem()],
});

interface PurchaseRequestFormDrawerProps {
  open: boolean;
  editing: PurchaseRequest | null;
  initialValues: PurchaseRequestFormValues;
  departments: DepartmentOption[];
  academicSettings: AcademicSettings;
  otherDepartmentId: string;
  onClose: () => void;
  onSave: (
    values: PurchaseRequestFormValues,
    action: 'draft' | 'submit',
  ) => Promise<void>;
}

function validate(values: PurchaseRequestFormValues, otherDepartmentId: string) {
  const errors: string[] = [];
  if (values.departmentId && values.departmentId === otherDepartmentId && !values.departmentOther.trim()) {
    errors.push('Specify the department name.');
  }
  if (values.items.length === 0) errors.push('Add at least one item.');
  if (values.items.some((item) => !item.itemName.trim())) {
    errors.push('Every item needs a name.');
  }
  if (values.items.some((item) => !(Number(item.quantity) > 0))) {
    errors.push('Every item needs a quantity greater than zero.');
  }
  return errors;
}

export function PurchaseRequestFormDrawer({
  open,
  editing,
  initialValues,
  departments,
  academicSettings,
  otherDepartmentId,
  onClose,
  onSave,
}: PurchaseRequestFormDrawerProps) {
  const [values, setValues] = useState<PurchaseRequestFormValues>(initialValues);
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null);
  const [error, setError] = useState('');
  const initialRef = useRef(initialValues);
  initialRef.current = initialValues;

  useEffect(() => {
    if (!open) return;
    setValues(initialRef.current);
    setError('');
    setSaving(null);
  }, [open]);

  const isOtherDepartment = values.departmentId === otherDepartmentId;
  const editableDraft = !editing || editing.status === 'DRAFT';

  const updateField = <K extends keyof PurchaseRequestFormValues>(
    key: K,
    value: PurchaseRequestFormValues[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const updateItem = (index: number, field: keyof PurchaseRequestFormItem, value: string) =>
    setValues((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));

  const addItem = () =>
    setValues((current) => ({
      ...current,
      items: [...current.items, emptyPurchaseRequestItem()],
    }));

  const removeItem = (index: number) =>
    setValues((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));

  const submit = async (action: 'draft' | 'submit') => {
    const problems = validate(values, otherDepartmentId);
    if (problems.length > 0) {
      setError(problems[0]);
      return;
    }
    setError('');
    setSaving(action);
    try {
      await onSave(values, action);
    } catch (saveError: any) {
      setError(
        saveError?.response?.data?.message ||
          saveError?.message ||
          'The purchase request could not be saved.',
      );
    } finally {
      setSaving(null);
    }
  };

  const close = () => {
    if (saving) return;
    onClose();
  };

  const totalQuantity = values.items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0,
  );

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : close())}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!w-[min(1040px,96vw)] !max-w-[1040px] flex flex-col gap-0 overflow-hidden border-l border-border p-0"
      >
        <SheetHeader className="shrink-0 border-b border-white/10 bg-navy px-6 py-5 text-white sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#fcb038]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#fcb038]">
                <FileText className="h-3 w-3" />
                {editing ? 'Edit Request' : 'New Request'}
              </div>
              <SheetTitle className="truncate text-2xl font-bold text-white">
                {editing ? `Purchase Request ${editing.prNumber}` : 'New Purchase Request'}
              </SheetTitle>
              <SheetDescription className="mt-1 text-white/65">
                Capture request information, department ownership and every item needed.
              </SheetDescription>
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close purchase request form"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-6 py-6 sm:px-8">
          <div className="space-y-5">
            {error ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)] sm:p-6">
              <SectionHeading
                title="Request Information"
                icon={<FileText className="h-4 w-4 text-primary" />}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SelectField
                  label="Request Type"
                  required
                  value={values.requestType}
                  onChange={(value) => updateField('requestType', value)}
                  options={REQUEST_TYPE_OPTIONS}
                  placeholder="Select type"
                />
                <SelectField
                  label="Priority"
                  required
                  value={values.priority}
                  onChange={(value) => updateField('priority', value)}
                  options={PRIORITY_OPTIONS}
                  placeholder="Select priority"
                />
                <FormField label="Needed By">
                  <input
                    type="date"
                    value={values.neededDate}
                    onChange={(event) => updateField('neededDate', event.target.value)}
                    className="input"
                  />
                </FormField>
                <SelectField
                  label="Academic Year"
                  value={values.academicYear}
                  onChange={(value) => updateField('academicYear', value)}
                  options={academicSettings.academicYears.map((year) => ({
                    value: year,
                    label: year,
                  }))}
                  placeholder="Select academic year"
                />
                <SelectField
                  label="Term"
                  value={values.term}
                  onChange={(value) => updateField('term', value)}
                  options={academicSettings.terms.map((term) => ({
                    value: term,
                    label: term,
                  }))}
                  placeholder="Optional"
                />
                <FormField label="Purpose" className="sm:col-span-2 lg:col-span-3">
                  <textarea
                    value={values.purpose}
                    onChange={(event) => updateField('purpose', event.target.value)}
                    className="input min-h-[90px] resize-y"
                    rows={3}
                    placeholder="Why is this request needed?"
                  />
                </FormField>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)] sm:p-6">
              <SectionHeading
                title="Department Information"
                icon={<Building2 className="h-4 w-4 text-primary" />}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Department"
                  value={values.departmentId}
                  onChange={(value) =>
                    setValues((current) => ({
                      ...current,
                      departmentId: value,
                      departmentOther: '',
                    }))
                  }
                  options={departments.map((department) => ({
                    value: department.id,
                    label: department.name,
                  }))}
                  placeholder="Select department (optional)"
                />
                {isOtherDepartment ? (
                  <FormField label="Specify Department" required>
                    <input
                      value={values.departmentOther}
                      onChange={(event) => updateField('departmentOther', event.target.value)}
                      className="input"
                      placeholder="Enter department name"
                    />
                  </FormField>
                ) : (
                  <div className="flex items-end">
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
                      Department is optional. When selected, it is used for approval routing and reporting.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionHeading
                  title={`Requested Items (${values.items.length})`}
                  icon={<Package className="h-4 w-4 text-primary" />}
                />
                <div className="mb-4 text-right text-xs text-slate-500">
                  <p>
                    Total quantity:{' '}
                    <span className="font-bold text-navy">{totalQuantity}</span>
                  </p>
                  <p>Pricing is captured later on the purchase order.</p>
                </div>
              </div>

              <div className="space-y-4">
                {values.items.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-navy">
                        Item {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={values.items.length === 1}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <FormField label="Item Name" required className="sm:col-span-2">
                        <input
                          value={item.itemName}
                          onChange={(event) => updateItem(index, 'itemName', event.target.value)}
                          className="input"
                          placeholder="e.g. Exercise books"
                        />
                      </FormField>
                      <FormField label="Unit" required>
                        <input
                          list={`pr-units-${index}`}
                          value={item.unit}
                          onChange={(event) => updateItem(index, 'unit', event.target.value)}
                          className="input"
                          placeholder="EA"
                        />
                        <datalist id={`pr-units-${index}`}>
                          {UNITS.map((unit) => (
                            <option key={unit} value={unit} />
                          ))}
                        </datalist>
                      </FormField>
                      <FormField label="Quantity" required>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          value={item.quantity}
                          onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                          className="input"
                          placeholder="0"
                        />
                      </FormField>
                      <FormField label="Description" className="sm:col-span-2 lg:col-span-4">
                        <input
                          value={item.description}
                          onChange={(event) => updateItem(index, 'description', event.target.value)}
                          className="input"
                          placeholder="Specifications, brand or other details"
                        />
                      </FormField>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addItem}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3.5 text-sm font-semibold text-navy transition hover:border-primary hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4" /> Add another item
                </button>
              </div>
            </section>
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-t border-border bg-white px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={close}
            disabled={Boolean(saving)}
            className="min-w-[110px] rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <div className="flex flex-wrap items-center gap-3">
            {editableDraft ? (
              <button
                type="button"
                onClick={() => void submit('draft')}
                disabled={Boolean(saving)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-slate-50 disabled:opacity-60"
              >
                {saving === 'draft' ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Draft
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void submit('submit')}
              disabled={Boolean(saving)}
              className="btn-primary inline-flex items-center gap-2 px-6 disabled:opacity-60"
            >
              {saving === 'submit' ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {editing ? 'Saving…' : 'Submitting…'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {editing ? (editableDraft ? 'Submit Request' : 'Save Changes') : 'Submit Request'}
                </>
              )}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
