'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X, ShoppingBag, Package } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { procurementApi } from '@/services/procurement-api';
import type { PurchaseRequest, Supplier } from '@/types';
import { FormField, SelectField } from '@/components/procurement-form-ui';
import { formatFrw } from '@/utils/currency';

type POItemForm = {
  itemName: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
};

interface SetOrdersDrawerProps {
  open: boolean;
  purchaseRequest: PurchaseRequest | null;
  onClose: () => void;
}

export function SetOrdersDrawer({ open, purchaseRequest, onClose }: SetOrdersDrawerProps) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<POItemForm[]>([]);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [applyTax, setApplyTax] = useState(false);
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setSupplierId('');
    setItems([]);
    setApplyDiscount(false);
    setApplyTax(false);
    setDiscount('');
    setTax('');
    setNotes('');
  }, []);

  useEffect(() => {
    if (!open || !purchaseRequest) return;
    reset();
    setItems(
      (purchaseRequest.items ?? []).map((item) => ({
        itemName: item.itemName,
        description: item.description ?? '',
        unit: item.unit,
        quantity: String(item.quantity),
        unitPrice: '',
      })),
    );
    void procurementApi.suppliers.list().then(setSuppliers).catch(() => {});
  }, [open, purchaseRequest, reset]);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        return sum + qty * price;
      }, 0),
    [items],
  );

  const discountAmount = applyDiscount ? Number(discount) || 0 : 0;
  const taxAmount = applyTax ? Number(tax) || 0 : 0;
  const total = subtotal - discountAmount + taxAmount;

  const updateItem = (idx: number, field: keyof POItemForm, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  };

  const handleSubmit = async () => {
    if (!purchaseRequest) return;
    if (!supplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (items.some((i) => !i.itemName || !i.quantity || !i.unitPrice)) {
      toast.error('Enter unit price for all items');
      return;
    }

    setSubmitting(true);
    try {
      await procurementApi.purchaseOrders.create({
        prId: purchaseRequest.id,
        supplierId,
        notes: notes || undefined,
        discount: discountAmount,
        tax: taxAmount,
        shippingCost: 0,
        items: items.map((item) => ({
          itemName: item.itemName,
          description: item.description || undefined,
          unit: item.unit,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });
      toast.success('Purchase order created');
      onClose();
      router.push('/purchase-orders');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create purchase order';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!purchaseRequest) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!w-[min(960px,96vw)] !max-w-[960px] flex flex-col gap-0 overflow-hidden border-l border-border p-0"
      >
        <SheetHeader className="shrink-0 border-b border-white/10 bg-navy px-6 py-5 text-white sm:px-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#fcb038]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#fcb038]">
                <Package className="h-3 w-3" />
                Set Order
              </div>
              <SheetTitle className="text-xl font-bold text-white">
                {purchaseRequest.prNumber}
              </SheetTitle>
              <SheetDescription className="mt-1 text-white/65">
                Enter unit prices per item, review totals, then create the purchase order.
              </SheetDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-6 py-6 sm:px-8">
          <div className="mb-5 grid gap-3 rounded-2xl border border-[#fcb038]/25 bg-white p-4 shadow-sm sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Department</p>
              <p className="mt-0.5 font-semibold text-navy">
                {purchaseRequest.departmentOther || purchaseRequest.department?.name || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Requested By</p>
              <p className="mt-0.5 font-semibold text-navy">{purchaseRequest.requestedByName ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Items</p>
              <p className="mt-0.5 font-semibold text-navy">{items.length} line item(s)</p>
            </div>
          </div>

          <SelectField
            label="Supplier"
            required
            value={supplierId}
            onChange={setSupplierId}
            options={suppliers.map((s) => ({ value: s.id, label: s.companyName }))}
            placeholder="Select supplier"
            className="mb-5"
          />

          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="border-b border-border bg-navy px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#fcb038]">
                Line Items & Pricing
              </p>
            </div>
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[38%]" />
                <col className="w-[14%]" />
                <col className="w-[24%]" />
                <col className="w-[24%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="px-5 py-3">Item</th>
                  <th className="px-5 py-3 text-center">Qty</th>
                  <th className="px-5 py-3 text-right">Unit Price (Frw)</th>
                  <th className="px-5 py-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const lineTotal =
                    (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                  return (
                    <tr key={idx} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-navy">{item.itemName}</p>
                        {item.description ? (
                          <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-center align-top tabular-nums text-muted">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                          className="input w-full text-right tabular-nums"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-5 py-4 text-right align-top font-semibold tabular-nums text-navy">
                        {formatFrw(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#fcb038]/10">
                  <td colSpan={3} className="px-5 py-4 text-right text-sm font-bold text-navy">
                    Subtotal
                  </td>
                  <td className="px-5 py-4 text-right text-base font-extrabold tabular-nums text-navy">
                    {formatFrw(subtotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
              <span className="text-sm font-medium text-navy">Apply discount</span>
              <input
                type="checkbox"
                checked={applyDiscount}
                onChange={(e) => setApplyDiscount(e.target.checked)}
                className="h-4 w-4 accent-[#fcb038]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
              <span className="text-sm font-medium text-navy">Apply tax</span>
              <input
                type="checkbox"
                checked={applyTax}
                onChange={(e) => setApplyTax(e.target.checked)}
                className="h-4 w-4 accent-[#fcb038]"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {applyDiscount ? (
              <FormField label="Discount (Frw)">
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="input"
                />
              </FormField>
            ) : null}
            {applyTax ? (
              <FormField label="Tax (Frw)">
                <input
                  type="number"
                  min="0"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className="input"
                />
              </FormField>
            ) : null}
            <FormField label="Notes" className="sm:col-span-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input min-h-[72px] resize-y"
                rows={2}
                placeholder="Optional order notes…"
              />
            </FormField>
          </div>

          <div className="mt-5 rounded-2xl border-2 border-navy/10 bg-white p-5 shadow-sm">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-semibold tabular-nums">{formatFrw(subtotal)}</span>
              </div>
              {applyDiscount && discountAmount > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted">Discount</span>
                  <span className="font-semibold tabular-nums text-red-600">
                    − {formatFrw(discountAmount)}
                  </span>
                </div>
              ) : null}
              {applyTax && taxAmount > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted">Tax</span>
                  <span className="font-semibold tabular-nums">{formatFrw(taxAmount)}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex items-center justify-between border-t-2 border-[#fcb038]/40 pt-4">
              <span className="text-sm font-bold uppercase tracking-wide text-navy">
                Grand Total
              </span>
              <span className="text-2xl font-extrabold tabular-nums text-navy">
                {formatFrw(total)}
              </span>
            </div>
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-row gap-3 border-t border-border bg-white px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[120px] rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || total <= 0}
            className="btn-primary flex min-w-0 flex-1 items-center justify-center gap-2 px-6 py-2.5 disabled:opacity-70"
          >
            <ShoppingBag className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {submitting ? 'Creating…' : `Create Order · ${formatFrw(total)}`}
            </span>
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
