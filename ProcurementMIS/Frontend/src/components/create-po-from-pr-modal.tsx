'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { procurementApi } from '@/services/procurement-api';
import type { PurchaseRequest, Supplier } from '@/types';
import {
  AddItemButton,
  FormField,
  ItemFormCard,
  ModalStepWizard,
  MoneyDisplay,
  SelectField,
  SummaryPanel,
  SummaryRow,
} from '@/components/procurement-form-ui';
import { formatFrw } from '@/utils/currency';

const PO_WIZARD_STEPS = [
  { title: 'Supplier', description: 'Choose the vendor for this purchase order' },
  { title: 'Item Costs', description: 'Enter unit price per line item in Frw' },
  { title: 'Adjustments', description: 'Optional tax, discount, and shipping' },
  { title: 'Review', description: 'Confirm totals before creating the order' },
];

type POItemForm = {
  itemName: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
};

interface CreatePOFromPRModalProps {
  open: boolean;
  purchaseRequest: PurchaseRequest | null;
  onClose: () => void;
  onCreated: () => void;
}

export function CreatePOFromPRModal({
  open,
  purchaseRequest,
  onClose,
  onCreated,
}: CreatePOFromPRModalProps) {
  const [step, setStep] = useState(1);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<POItemForm[]>([]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [applyTax, setApplyTax] = useState(false);
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setStep(1);
    setSupplierId('');
    setItems([]);
    setExpectedDelivery('');
    setDeliveryAddress('');
    setPaymentTerms('');
    setNotes('');
    setApplyDiscount(false);
    setApplyTax(false);
    setDiscount('');
    setTax('');
    setShippingCost('');
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
        unitPrice: item.estimatedPrice ? String(item.estimatedPrice) : '',
      })),
    );
    void procurementApi.suppliers.list().then(setSuppliers).catch(() => {});
  }, [open, purchaseRequest, reset]);

  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const discountAmount = applyDiscount ? Number(discount) || 0 : 0;
  const taxAmount = applyTax ? Number(tax) || 0 : 0;
  const shipping = Number(shippingCost) || 0;
  const total = subtotal - discountAmount + taxAmount + shipping;

  const supplierName =
    suppliers.find((s) => s.id === supplierId)?.companyName ?? '—';

  const handleClose = () => {
    onClose();
    setTimeout(reset, 250);
  };

  const handleSubmit = async () => {
    if (!purchaseRequest) return;
    if (!supplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (items.some((i) => !i.itemName || !i.quantity || !i.unitPrice)) {
      toast.error('Please enter unit price for all items');
      return;
    }

    setSubmitting(true);
    try {
      await procurementApi.purchaseOrders.create({
        prId: purchaseRequest.id,
        supplierId,
        expectedDelivery: expectedDelivery || undefined,
        deliveryAddress: deliveryAddress || undefined,
        paymentTerms: paymentTerms || undefined,
        notes: notes || undefined,
        discount: discountAmount,
        tax: taxAmount,
        shippingCost: shipping,
        items: items.map((item) => ({
          itemName: item.itemName,
          description: item.description || undefined,
          unit: item.unit,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });
      toast.success('Purchase order created');
      handleClose();
      onCreated();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create purchase order';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateItem = (idx: number, field: keyof POItemForm, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  };

  if (!purchaseRequest) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-h-[95vh] max-w-[calc(100%-1rem)] overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:max-w-4xl">
        <ModalStepWizard
          steps={PO_WIZARD_STEPS}
          currentStep={step - 1}
          onCancel={handleClose}
          onBack={() => setStep((s) => Math.max(1, s - 1))}
          onNext={() => setStep((s) => Math.min(4, s + 1))}
          onSubmit={handleSubmit}
          isLastStep={step === 4}
          saving={submitting}
          submitLabel="Create Order"
        >
          {step === 1 && (
            <div className="space-y-5">
              <SummaryPanel title={`From Request ${purchaseRequest.prNumber}`}>
                <SummaryRow label="Department" value={purchaseRequest.department?.name ?? '—'} />
                <SummaryRow label="Requested By" value={purchaseRequest.requestedByName ?? '—'} />
                <SummaryRow
                  label="Estimate"
                  value={formatFrw(Number(purchaseRequest.totalEstimate || 0))}
                />
              </SummaryPanel>
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Supplier"
                  required
                  value={supplierId}
                  onChange={setSupplierId}
                  options={suppliers.map((s) => ({ value: s.id, label: s.companyName }))}
                  placeholder="Select supplier"
                  className="sm:col-span-2"
                />
                <FormField label="Expected Delivery">
                  <input
                    type="date"
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                    className="input"
                  />
                </FormField>
                <FormField label="Payment Terms">
                  <input
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="input"
                    placeholder="Net 30, COD, etc."
                  />
                </FormField>
                <FormField label="Delivery Address" className="sm:col-span-2">
                  <textarea
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="input min-h-[72px] resize-y"
                    rows={2}
                    placeholder="Delivery location"
                  />
                </FormField>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {items.map((item, idx) => (
                <ItemFormCard
                  key={idx}
                  index={idx}
                  canRemove={items.length > 1}
                  onRemove={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField label="Item Name" required className="sm:col-span-2">
                      <input
                        value={item.itemName}
                        onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
                        className="input"
                      />
                    </FormField>
                    <FormField label="Unit" required>
                      <input
                        value={item.unit}
                        onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                        className="input"
                      />
                    </FormField>
                    <FormField label="Quantity" required>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="input"
                      />
                    </FormField>
                    <FormField label="Unit Price (Frw)" required>
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                        className="input"
                        placeholder="0"
                      />
                    </FormField>
                    <FormField label="Line Total">
                      <MoneyDisplay
                        amount={(Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)}
                      />
                    </FormField>
                    <FormField label="Description" className="sm:col-span-3">
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        className="input"
                        placeholder="Additional details"
                      />
                    </FormField>
                  </div>
                </ItemFormCard>
              ))}
              <AddItemButton
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    { itemName: '', description: '', unit: 'EA', quantity: '1', unitPrice: '' },
                  ])
                }
              />
              <div className="rounded-2xl border border-navy/10 bg-navy/[0.03] px-4 py-3 text-right">
                <span className="text-sm text-muted">Subtotal: </span>
                <span className="text-lg font-bold text-navy">{formatFrw(subtotal)}</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-navy">Apply Discount</p>
                    <p className="text-xs text-muted">Subtract from subtotal</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={applyDiscount}
                    onChange={(e) => setApplyDiscount(e.target.checked)}
                    className="h-5 w-5 rounded accent-[#fcb038]"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-navy">Apply Tax</p>
                    <p className="text-xs text-muted">Add tax amount to order</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={applyTax}
                    onChange={(e) => setApplyTax(e.target.checked)}
                    className="h-5 w-5 rounded accent-[#fcb038]"
                  />
                </label>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {applyDiscount ? (
                  <FormField label="Discount Amount (Frw)">
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="input"
                      placeholder="0"
                    />
                  </FormField>
                ) : null}
                {applyTax ? (
                  <FormField label="Tax Amount (Frw)">
                    <input
                      type="number"
                      min="0"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      className="input"
                      placeholder="0"
                    />
                  </FormField>
                ) : null}
                <FormField label="Shipping Cost (Frw)" className="sm:col-span-2">
                  <input
                    type="number"
                    min="0"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className="input"
                    placeholder="0"
                  />
                </FormField>
                <FormField label="Notes" className="sm:col-span-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input min-h-[72px] resize-y"
                    rows={2}
                    placeholder="Internal notes for this order"
                  />
                </FormField>
              </div>
              <SummaryPanel title="Running Total">
                <SummaryRow label="Subtotal" value={formatFrw(subtotal)} />
                {applyDiscount ? (
                  <SummaryRow label="Discount" value={`− ${formatFrw(discountAmount)}`} />
                ) : null}
                {applyTax ? <SummaryRow label="Tax" value={formatFrw(taxAmount)} /> : null}
                {shipping > 0 ? (
                  <SummaryRow label="Shipping" value={formatFrw(shipping)} />
                ) : null}
                <SummaryRow label="Grand Total" value={formatFrw(total)} />
              </SummaryPanel>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <SummaryPanel title="Order Summary">
                <SummaryRow label="Purchase Request" value={purchaseRequest.prNumber} />
                <SummaryRow label="Supplier" value={supplierName} />
                {expectedDelivery ? (
                  <SummaryRow label="Expected Delivery" value={expectedDelivery} />
                ) : null}
                {deliveryAddress ? (
                  <SummaryRow label="Delivery Address" value={deliveryAddress} />
                ) : null}
              </SummaryPanel>
              <SummaryPanel title={`Items (${items.length})`}>
                {items.map((item, i) => (
                  <SummaryRow
                    key={i}
                    label={`${item.itemName} × ${item.quantity} ${item.unit}`}
                    value={formatFrw((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
                  />
                ))}
              </SummaryPanel>
              <SummaryPanel title="Totals">
                <SummaryRow label="Subtotal" value={formatFrw(subtotal)} />
                {applyDiscount && discountAmount > 0 ? (
                  <SummaryRow label="Discount" value={`− ${formatFrw(discountAmount)}`} />
                ) : null}
                {applyTax && taxAmount > 0 ? (
                  <SummaryRow label="Tax" value={formatFrw(taxAmount)} />
                ) : null}
                {shipping > 0 ? (
                  <SummaryRow label="Shipping" value={formatFrw(shipping)} />
                ) : null}
                <SummaryRow label="Grand Total" value={formatFrw(total)} />
              </SummaryPanel>
            </div>
          )}
        </ModalStepWizard>
      </DialogContent>
    </Dialog>
  );
}
