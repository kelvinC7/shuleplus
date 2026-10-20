'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  X,
  Package,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { procurementApi } from '@/services/procurement-api';
import type { PurchaseOrder, PoReceivingLineItem } from '@/types';
import { FormField, SelectField } from '@/components/procurement-form-ui';
import { formatFrw } from '@/utils/currency';
import {
  ITEM_CONDITIONS,
  QUALITY_STATUSES,
  STORAGE_LOCATIONS,
} from '@/lib/grn-constants';

type ReceiveItemForm = {
  poItemId: string;
  itemName: string;
  unit: string;
  unitPrice: number;
  orderedQty: number;
  previouslyReceived: number;
  receivingNow: string;
  condition: string;
  qualityStatus: string;
  warehouseLocation: string;
  batchNumber: string;
  serialNumber: string;
  expiryDate: string;
  manufacturingDate: string;
  warrantyMonths: string;
  itemNotes: string;
  trackBatch: boolean;
};

interface ReceiveGoodsDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPoId?: string | null;
}

const STEPS = [
  { id: 1, label: 'Purchase Order', icon: Package },
  { id: 2, label: 'Items', icon: ClipboardCheck },
  { id: 3, label: 'Inspection & Storage', icon: MapPin },
];

function lineToForm(line: PoReceivingLineItem): ReceiveItemForm {
  return {
    poItemId: line.poItemId,
    itemName: line.itemName,
    unit: line.unit,
    unitPrice: line.unitPrice,
    orderedQty: line.orderedQty,
    previouslyReceived: line.previouslyReceived,
    receivingNow: line.remainingQty > 0 ? String(line.remainingQty) : '0',
    condition: 'Good',
    qualityStatus: 'ACCEPTED',
    warehouseLocation: 'Main Store',
    batchNumber: '',
    serialNumber: '',
    expiryDate: '',
    manufacturingDate: '',
    warrantyMonths: '',
    itemNotes: '',
    trackBatch: false,
  };
}

export function ReceiveGoodsDrawer({
  open,
  onClose,
  onSuccess,
  initialPoId,
}: ReceiveGoodsDrawerProps) {
  const [step, setStep] = useState(1);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [poId, setPoId] = useState('');
  const [poContext, setPoContext] = useState<{
    purchaseOrder: PurchaseOrder;
    lineItems: PoReceivingLineItem[];
  } | null>(null);
  const [items, setItems] = useState<ReceiveItemForm[]>([]);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingContext, setLoadingContext] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setStep(1);
    setPoId('');
    setPoContext(null);
    setItems([]);
    setInspectionNotes('');
    setNotes('');
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    void procurementApi.purchaseOrders
      .list()
      .then((orders) =>
        setPurchaseOrders(
          orders.filter((o) => !['CANCELLED', 'DRAFT'].includes(o.status)),
        ),
      )
      .catch(() => {});
  }, [open, reset]);

  useEffect(() => {
    if (!open || !initialPoId) return;
    setPoId(initialPoId);
  }, [open, initialPoId]);

  useEffect(() => {
    if (!open || !poId) return;
    setLoadingContext(true);
    void procurementApi.goodsReceivings
      .poContext(poId)
      .then((ctx) => {
        setPoContext(ctx);
        setItems(ctx.lineItems.map(lineToForm));
      })
      .catch(() => toast.error('Failed to load purchase order'))
      .finally(() => setLoadingContext(false));
  }, [open, poId]);

  const po = poContext?.purchaseOrder;
  const receiptTotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const qty = Number(item.receivingNow) || 0;
        return sum + qty * item.unitPrice;
      }, 0),
    [items],
  );

  const updateItem = (idx: number, patch: Partial<ReceiveItemForm>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const receiveAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        receivingNow: String(Math.max(0, item.orderedQty - item.previouslyReceived)),
      })),
    );
  };

  const canProceedStep1 = Boolean(poId && po && !loadingContext);
  const canProceedStep2 = items.some((i) => Number(i.receivingNow) > 0);

  const handleSubmit = async () => {
    const activeItems = items.filter((i) => Number(i.receivingNow) > 0);
    if (activeItems.length === 0) {
      toast.error('Enter quantity for at least one item');
      return;
    }

    for (const item of activeItems) {
      const qty = Number(item.receivingNow);
      const remaining = item.orderedQty - item.previouslyReceived;
      if (qty > remaining) {
        toast.error(`${item.itemName}: cannot receive more than ${remaining} remaining`);
        return;
      }
      if (!item.warehouseLocation) {
        toast.error(`Select storage location for ${item.itemName}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await procurementApi.goodsReceivings.create({
        poId,
        inspectionNotes: inspectionNotes || undefined,
        notes: notes || undefined,
        items: activeItems.map((item) => {
          const receivingNow = Number(item.receivingNow);
          const isRejected = item.qualityStatus === 'REJECTED';
          const isDamaged = item.condition === 'Damaged';
          return {
            poItemId: item.poItemId,
            itemName: item.itemName,
            orderedQty: item.orderedQty,
            receivedQty: receivingNow,
            acceptedQty: isRejected ? 0 : receivingNow,
            rejectedQty: isRejected ? receivingNow : 0,
            damagedQty: isDamaged && !isRejected ? receivingNow : 0,
            condition: item.condition,
            qualityStatus: item.qualityStatus,
            warehouseLocation: item.warehouseLocation,
            batchNumber: item.batchNumber || undefined,
            serialNumber: item.serialNumber || undefined,
            expiryDate: item.expiryDate || undefined,
            manufacturingDate: item.manufacturingDate || undefined,
            warrantyMonths: item.warrantyMonths ? Number(item.warrantyMonths) : undefined,
            itemNotes: item.itemNotes || undefined,
          };
        }),
      });
      toast.success('Goods received successfully');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to receive goods';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

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
                Receive Goods
              </div>
              <SheetTitle className="text-xl font-bold text-white">Goods Received Note</SheetTitle>
              <SheetDescription className="mt-1 text-white/65">
                Record delivery, inspect quality, and update inventory stock.
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

          <div className="mt-5 flex gap-2">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const active = step === s.id;
              const done = step > s.id;
              return (
                <div
                  key={s.id}
                  className={`flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                    active
                      ? 'bg-[#fcb038]/25 text-[#fcb038]'
                      : done
                        ? 'bg-white/10 text-white/80'
                        : 'bg-white/5 text-white/45'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{s.label}</span>
                </div>
              );
            })}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-6 py-6 sm:px-8">
          {step === 1 && (
            <div className="space-y-5">
              <SelectField
                label="Purchase Order"
                required
                value={poId}
                onChange={setPoId}
                options={purchaseOrders.map((o) => ({
                  value: o.id,
                  label: `${o.poNumber} — ${o.supplier?.companyName ?? 'Supplier'}`,
                }))}
                placeholder="Search / select PO"
              />

              {loadingContext ? (
                <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted">
                  Loading order details…
                </div>
              ) : po ? (
                <div className="grid gap-3 rounded-2xl border border-[#fcb038]/25 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Supplier</p>
                    <p className="mt-0.5 font-semibold text-navy">{po.supplier?.companyName ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">PO Date</p>
                    <p className="mt-0.5 font-semibold text-navy">
                      {new Date(po.orderDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Department</p>
                    <p className="mt-0.5 font-semibold text-navy">
                      {po.purchaseRequest?.department?.name ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Requester</p>
                    <p className="mt-0.5 font-semibold text-navy">
                      {po.purchaseRequest?.requestedByName ?? po.createdByName ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Expected Delivery</p>
                    <p className="mt-0.5 font-semibold text-navy">
                      {po.expectedDelivery
                        ? new Date(po.expectedDelivery).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">PO Total</p>
                    <p className="mt-0.5 font-semibold text-navy">{formatFrw(po.totalAmount)}</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">Enter quantities being received now.</p>
                <button type="button" className="btn-ghost !rounded-xl text-xs" onClick={receiveAll}>
                  Receive All Remaining
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-navy text-left text-[11px] font-bold uppercase tracking-wider text-[#fcb038]">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3 text-right">Ordered</th>
                        <th className="px-4 py-3 text-right">Prev. Received</th>
                        <th className="px-4 py-3 text-right">Receiving Now</th>
                        <th className="px-4 py-3 text-right">Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const receiving = Number(item.receivingNow) || 0;
                        const remaining = Math.max(
                          0,
                          item.orderedQty - item.previouslyReceived - receiving,
                        );
                        return (
                          <tr key={item.poItemId} className="border-t border-border/70">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-navy">{item.itemName}</p>
                              <p className="text-xs text-muted">{item.unit}</p>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">{item.orderedQty}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted">
                              {item.previouslyReceived}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                min={0}
                                max={item.orderedQty - item.previouslyReceived}
                                value={item.receivingNow}
                                onChange={(e) => updateItem(idx, { receivingNow: e.target.value })}
                                className="w-20 rounded-lg border border-border px-2 py-1.5 text-right text-sm outline-none focus:border-primary/50"
                              />
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-semibold text-navy">
                              {remaining}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-[#fcb038]/30 bg-[#fcb038]/10 px-4 py-3 text-sm">
                <span className="text-muted">Receipt value: </span>
                <span className="font-bold text-navy">{formatFrw(receiptTotal)}</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <FormField label="Inspection Notes">
                <textarea
                  className="input min-h-[80px]"
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="Overall inspection remarks…"
                />
              </FormField>
              <FormField label="Additional Notes">
                <textarea
                  className="input min-h-[60px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional delivery notes…"
                />
              </FormField>

              {items
                .filter((i) => Number(i.receivingNow) > 0)
                .map((item, idx) => {
                  const realIdx = items.findIndex((x) => x.poItemId === item.poItemId);
                  return (
                    <div
                      key={item.poItemId}
                      className="rounded-2xl border border-border bg-white p-5 shadow-sm"
                    >
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-navy">{item.itemName}</p>
                          <p className="text-xs text-muted">
                            Receiving {item.receivingNow} {item.unit}
                          </p>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-medium text-muted">
                          <input
                            type="checkbox"
                            checked={item.trackBatch}
                            onChange={(e) => updateItem(realIdx, { trackBatch: e.target.checked })}
                            className="accent-[#fcb038]"
                          />
                          Track batch / serial / expiry
                        </label>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <SelectField
                          label="Condition"
                          value={item.condition}
                          onChange={(v) => updateItem(realIdx, { condition: v })}
                          options={ITEM_CONDITIONS.map((c) => ({ value: c, label: c }))}
                        />
                        <SelectField
                          label="Quality Status"
                          value={item.qualityStatus}
                          onChange={(v) => updateItem(realIdx, { qualityStatus: v })}
                          options={QUALITY_STATUSES.map((q) => ({ value: q.value, label: q.label }))}
                        />
                        <SelectField
                          label="Storage Location"
                          required
                          value={item.warehouseLocation}
                          onChange={(v) => updateItem(realIdx, { warehouseLocation: v })}
                          options={STORAGE_LOCATIONS.map((s) => ({ value: s, label: s }))}
                        />
                      </div>

                      {item.trackBatch ? (
                        <div className="mt-3 grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                          <FormField label="Batch Number">
                            <input
                              className="input"
                              value={item.batchNumber}
                              onChange={(e) => updateItem(realIdx, { batchNumber: e.target.value })}
                            />
                          </FormField>
                          <FormField label="Serial Number">
                            <input
                              className="input"
                              value={item.serialNumber}
                              onChange={(e) => updateItem(realIdx, { serialNumber: e.target.value })}
                            />
                          </FormField>
                          <FormField label="Expiry Date">
                            <input
                              type="date"
                              className="input"
                              value={item.expiryDate}
                              onChange={(e) => updateItem(realIdx, { expiryDate: e.target.value })}
                            />
                          </FormField>
                          <FormField label="Manufacturing Date">
                            <input
                              type="date"
                              className="input"
                              value={item.manufacturingDate}
                              onChange={(e) => updateItem(realIdx, { manufacturingDate: e.target.value })}
                            />
                          </FormField>
                          <FormField label="Warranty (months)">
                            <input
                              type="number"
                              className="input"
                              value={item.warrantyMonths}
                              onChange={(e) => updateItem(realIdx, { warrantyMonths: e.target.value })}
                            />
                          </FormField>
                          <FormField label="Item Notes">
                            <input
                              className="input"
                              value={item.itemNotes}
                              onChange={(e) => updateItem(realIdx, { itemNotes: e.target.value })}
                            />
                          </FormField>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <SheetFooter className="shrink-0 flex-row justify-between gap-3 border-t border-border bg-white px-6 py-4 sm:px-8">
          <div>
            {step > 1 ? (
              <button
                type="button"
                className="btn-ghost inline-flex items-center gap-1"
                onClick={() => setStep((s) => s - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            {step < 3 ? (
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-1"
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                onClick={() => setStep((s) => s + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-1"
                disabled={submitting}
                onClick={handleSubmit}
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitting ? 'Saving…' : `Complete Receipt · ${formatFrw(receiptTotal)}`}
              </button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
