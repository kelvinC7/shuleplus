'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { X, RotateCcw, Package } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { procurementApi } from '@/services/procurement-api';
import type { GoodsReceiving, GrnReturnLineItem } from '@/types';
import { FormField, SelectField } from '@/components/procurement-form-ui';
import { formatFrw } from '@/utils/currency';
import { RETURN_REASONS, RETURN_RESOLUTIONS } from '@/lib/grn-constants';

type ReturnLineForm = GrnReturnLineItem & { returnQty: string };

interface CreateReturnDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialGrnId?: string | null;
}

export function CreateReturnDrawer({
  open,
  onClose,
  onSuccess,
  initialGrnId,
}: CreateReturnDrawerProps) {
  const [grns, setGrns] = useState<GoodsReceiving[]>([]);
  const [grnId, setGrnId] = useState('');
  const [grn, setGrn] = useState<GoodsReceiving | null>(null);
  const [lines, setLines] = useState<ReturnLineForm[]>([]);
  const [reason, setReason] = useState('Damaged');
  const [reasonDescription, setReasonDescription] = useState('');
  const [resolution, setResolution] = useState('REPLACEMENT');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setGrnId('');
    setGrn(null);
    setLines([]);
    setReason('Damaged');
    setReasonDescription('');
    setResolution('REPLACEMENT');
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    void procurementApi.goodsReceivings
      .list()
      .then(setGrns)
      .catch(() => {});
  }, [open, reset]);

  useEffect(() => {
    if (!open || !initialGrnId) return;
    setGrnId(initialGrnId);
  }, [open, initialGrnId]);

  useEffect(() => {
    if (!open || !grnId) return;
    setLoading(true);
    void procurementApi.returns
      .grnContext(grnId)
      .then((ctx) => {
        setGrn(ctx.grn);
        setLines(
          ctx.lineItems.map((line) => ({
            ...line,
            returnQty: line.returnableQty > 0 ? '0' : '',
          })),
        );
      })
      .catch(() => toast.error('Failed to load GRN'))
      .finally(() => setLoading(false));
  }, [open, grnId]);

  const returnTotal = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const qty = Number(line.returnQty) || 0;
        return sum + qty * line.unitPrice;
      }, 0),
    [lines],
  );

  const updateLine = (idx: number, returnQty: string) => {
    setLines((prev) => prev.map((line, i) => (i === idx ? { ...line, returnQty } : line)));
  };

  const handleSubmit = async () => {
    const active = lines.filter((l) => Number(l.returnQty) > 0);
    if (active.length === 0) {
      toast.error('Enter return quantity for at least one item');
      return;
    }

    for (const line of active) {
      const qty = Number(line.returnQty);
      if (qty > line.returnableQty) {
        toast.error(`${line.itemName}: max returnable is ${line.returnableQty}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await procurementApi.returns.create({
        grnId,
        reason,
        reasonDescription: reasonDescription || undefined,
        resolution,
        status: 'PENDING_APPROVAL',
        items: active.map((line) => ({
          grnItemId: line.grnItemId,
          itemName: line.itemName,
          receivedQty: line.receivedQty,
          returnQty: Number(line.returnQty),
          unitPrice: line.unitPrice,
          reason,
        })),
      });
      toast.success('Return submitted for approval');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create return';
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
        className="!w-[min(880px,96vw)] !max-w-[880px] flex flex-col gap-0 overflow-hidden border-l border-border p-0"
      >
        <SheetHeader className="shrink-0 border-b border-white/10 bg-navy px-6 py-5 text-white sm:px-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#fcb038]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#fcb038]">
                <RotateCcw className="h-3 w-3" />
                Create Return
              </div>
              <SheetTitle className="text-xl font-bold text-white">Return to Supplier</SheetTitle>
              <SheetDescription className="mt-1 text-white/65">
                Start from a goods received note and record items to return.
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
          <SelectField
            label="Goods Received Note (GRN)"
            required
            value={grnId}
            onChange={setGrnId}
            options={grns.map((g) => ({
              value: g.id,
              label: `${g.grnNumber} — ${g.purchaseOrder?.poNumber ?? g.poId.slice(0, 8)}`,
            }))}
            placeholder="Select GRN"
            className="mb-5"
          />

          {loading ? (
            <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted">
              Loading GRN items…
            </div>
          ) : grn ? (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-2xl border border-[#fcb038]/25 bg-white p-4 shadow-sm sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">GRN</p>
                  <p className="mt-0.5 font-semibold text-navy">{grn.grnNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">PO</p>
                  <p className="mt-0.5 font-semibold text-navy">
                    {grn.purchaseOrder?.poNumber ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Supplier</p>
                  <p className="mt-0.5 font-semibold text-navy">
                    {grn.purchaseOrder?.supplier?.companyName ?? '—'}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="border-b border-border bg-navy px-5 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#fcb038]">
                    Return Items
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-[#f8fafc] text-left text-[11px] font-bold uppercase tracking-wider text-muted">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3 text-right">Received</th>
                        <th className="px-4 py-3 text-right">Returnable</th>
                        <th className="px-4 py-3 text-right">Return Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => (
                        <tr key={line.grnItemId} className="border-t border-border/70">
                          <td className="px-4 py-3 font-semibold text-navy">{line.itemName}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{line.receivedQty}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted">
                            {line.returnableQty}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {line.returnableQty > 0 ? (
                              <input
                                type="number"
                                min={0}
                                max={line.returnableQty}
                                value={line.returnQty}
                                onChange={(e) => updateLine(idx, e.target.value)}
                                className="w-20 rounded-lg border border-border px-2 py-1.5 text-right text-sm outline-none focus:border-primary/50"
                              />
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Return Reason"
                  required
                  value={reason}
                  onChange={setReason}
                  options={RETURN_REASONS.map((r) => ({ value: r, label: r }))}
                />
                <SelectField
                  label="Resolution"
                  required
                  value={resolution}
                  onChange={setResolution}
                  options={RETURN_RESOLUTIONS.map((r) => ({ value: r.value, label: r.label }))}
                />
              </div>

              <FormField label="Reason Description">
                <textarea
                  className="input min-h-[80px]"
                  value={reasonDescription}
                  onChange={(e) => setReasonDescription(e.target.value)}
                  placeholder="Describe the issue in detail…"
                />
              </FormField>

              <div className="rounded-xl border border-[#fcb038]/30 bg-[#fcb038]/10 px-4 py-3 text-sm">
                <span className="text-muted">Return value: </span>
                <span className="font-bold text-navy">{formatFrw(returnTotal)}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-12 text-center">
              <Package className="mb-3 h-8 w-8 text-muted" />
              <p className="text-sm text-muted">Select a GRN to begin a return</p>
            </div>
          )}
        </div>

        <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-white px-6 py-4 sm:px-8">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={submitting || !grnId}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting…' : `Submit Return · ${formatFrw(returnTotal)}`}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
