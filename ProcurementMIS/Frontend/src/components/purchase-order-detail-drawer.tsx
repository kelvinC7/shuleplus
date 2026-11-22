'use client';

import type { ReactNode } from 'react';
import {
  Building2,
  CheckCircle,
  ClipboardList,
  DollarSign,
  Download,
  Link2,
  LoaderCircle,
  Package,
  ShieldCheck,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { StatusBadge } from '@/components/list-ui';
import { formatPersonName } from '@/utils/person-name';
import { formatFrw as formatMoney } from '@/utils/currency';
import type { PurchaseOrder } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent to Supplier',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  PARTIALLY_DELIVERED: 'Partially Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const PAYMENT_LABELS: Record<string, string> = {
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
};

const PAYMENT_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] as const;

const ORDER_STEPS = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'SENT', label: 'Sent to Supplier' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'COMPLETED', label: 'Completed' },
];

const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  DRAFT: { status: 'SENT', label: 'Send to Supplier' },
  SENT: { status: 'ACCEPTED', label: 'Mark Accepted' },
  ACCEPTED: { status: 'PREPARING', label: 'Mark Preparing' },
  PREPARING: { status: 'IN_TRANSIT', label: 'Mark In Transit' },
  IN_TRANSIT: { status: 'DELIVERED', label: 'Mark Delivered' },
  DELIVERED: { status: 'COMPLETED', label: 'Mark Completed' },
};

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'CANCELLED') return 'danger';
  if (status === 'COMPLETED') return 'success';
  if (status === 'DRAFT') return 'neutral';
  if (status === 'PARTIALLY_DELIVERED') return 'warning';
  return 'info';
}

function paymentTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'PAID') return 'success';
  if (status === 'PARTIALLY_PAID') return 'warning';
  if (status === 'OVERDUE') return 'danger';
  return 'neutral';
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stepIndex(status: string): number {
  if (status === 'PARTIALLY_DELIVERED') {
    return ORDER_STEPS.findIndex((step) => step.key === 'DELIVERED');
  }
  return ORDER_STEPS.findIndex((step) => step.key === status);
}

interface PurchaseOrderDetailDrawerProps {
  open: boolean;
  po: PurchaseOrder | null;
  isSupervisor: boolean;
  pdfLoading?: boolean;
  onClose: () => void;
  onDownloadPdf: (po: PurchaseOrder) => void;
  onStatusChange: (id: string, status: string) => void;
  onPaymentChange: (id: string, status: string) => void;
}

export function PurchaseOrderDetailDrawer({
  open,
  po,
  isSupervisor,
  pdfLoading,
  onClose,
  onDownloadPdf,
  onStatusChange,
  onPaymentChange,
}: PurchaseOrderDetailDrawerProps) {
  if (!po) return null;

  const items = po.items ?? [];
  const purchaseRequest = po.purchaseRequest;
  const supplierName = po.supplier?.companyName || '—';
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const nextAction = NEXT_STATUS[po.status];
  const currentStep = stepIndex(po.status);
  const cancelled = po.status === 'CANCELLED';

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!w-[min(1040px,96vw)] !max-w-[1040px] flex flex-col gap-0 overflow-hidden border-l border-border p-0"
      >
        <SheetHeader className="shrink-0 border-b border-white/10 bg-navy px-5 py-5 text-white sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#fcb038]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#fcb038]">
                <Truck className="h-3 w-3" /> Purchase Order
              </div>
              <SheetTitle className="truncate text-2xl font-bold text-white">{po.poNumber}</SheetTitle>
              <SheetDescription className="mt-1 flex flex-wrap items-center gap-2 text-white/65">
                <span className="truncate">{supplierName}</span>
                <span className="text-white/30">·</span>
                <span>Ordered {formatDate(po.orderDate)}</span>
              </SheetDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge tone={statusTone(po.status)} className="!bg-white/10 !text-white">
                  {STATUS_LABELS[po.status] ?? po.status.replace(/_/g, ' ')}
                </StatusBadge>
                <StatusBadge tone={paymentTone(po.paymentStatus)} className="!bg-white/10 !text-white">
                  {PAYMENT_LABELS[po.paymentStatus] ?? po.paymentStatus.replace(/_/g, ' ')}
                </StatusBadge>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close purchase order details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-5 py-6 sm:px-8">
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<ClipboardList className="h-4 w-4 text-primary" />} title="Order Information" />
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Supplier" value={supplierName} />
                  <DetailItem label="Order Date" value={formatDate(po.orderDate)} />
                  <DetailItem label="Expected Delivery" value={formatDate(po.expectedDelivery)} />
                  <DetailItem label="Payment Terms" value={po.paymentTerms || '—'} />
                  <DetailItem label="Created By" value={formatPersonName(po.createdByName) || '—'} />
                  <DetailItem label="Created" value={formatDateTime(po.createdAt)} />
                  <DetailItem
                    label="Delivery Address"
                    value={po.deliveryAddress?.trim() || '—'}
                    className="sm:col-span-2"
                  />
                  {po.notes?.trim() ? (
                    <DetailItem label="Notes" value={po.notes} className="sm:col-span-2" />
                  ) : null}
                </dl>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<Link2 className="h-4 w-4 text-primary" />} title="Related Request" />
                {purchaseRequest ? (
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DetailItem label="PR Number" value={purchaseRequest.prNumber} />
                    <DetailItem
                      label="Department"
                      value={purchaseRequest.department?.name || '—'}
                    />
                    <DetailItem
                      label="Requested By"
                      value={formatPersonName(purchaseRequest.requestedByName) || '—'}
                    />
                    <DetailItem label="Academic Year" value={purchaseRequest.academicYear || '—'} />
                    <DetailItem label="Term" value={purchaseRequest.term || '—'} />
                  </dl>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    This order was not created from a purchase request.
                  </p>
                )}
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionTitle
                  icon={<Package className="h-4 w-4 text-primary" />}
                  title={`Order Items (${items.length})`}
                />
                <div className="grid grid-cols-2 gap-3 text-right">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Items</p>
                    <p className="text-lg font-bold tabular-nums text-navy">{items.length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Total Qty</p>
                    <p className="text-lg font-bold tabular-nums text-navy">{totalQuantity}</p>
                  </div>
                </div>
              </div>

              {items.length > 0 ? (
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-2.5 text-left">#</th>
                        <th className="px-4 py-2.5 text-left">Item</th>
                        <th className="px-4 py-2.5 text-right">Qty</th>
                        <th className="px-4 py-2.5 text-left">Unit</th>
                        <th className="px-4 py-2.5 text-right">Unit Price</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2.5 text-xs text-slate-500">{index + 1}</td>
                          <td className="px-4 py-2.5 font-semibold text-navy">
                            {item.itemName}
                            {item.description ? (
                              <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                                {item.description}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                            {Number(item.quantity)}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{item.unit}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                            {formatMoney(Number(item.unitPrice))}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-navy">
                            {formatMoney(Number(item.totalPrice))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No items have been added to this order.
                </p>
              )}
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<DollarSign className="h-4 w-4 text-primary" />} title="Order Totals" />
                <dl className="mt-4 space-y-2.5 text-sm">
                  <TotalRow label="Subtotal" value={formatMoney(Number(po.subtotal))} />
                  <TotalRow label="Discount" value={`-${formatMoney(Number(po.discount || 0))}`} />
                  <TotalRow label="Tax" value={formatMoney(Number(po.tax || 0))} />
                  <TotalRow label="Shipping" value={formatMoney(Number(po.shippingCost || 0))} />
                  <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Grand Total</dt>
                    <dd className="text-lg font-bold tabular-nums text-navy">
                      {formatMoney(Number(po.totalAmount))}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<ShieldCheck className="h-4 w-4 text-primary" />} title="Status & Payment" />
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <StatusBadge tone={statusTone(po.status)}>
                    {STATUS_LABELS[po.status] ?? po.status.replace(/_/g, ' ')}
                  </StatusBadge>
                  <span className="text-xs text-slate-500">Updated {formatDateTime(po.updatedAt)}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                    Payment Status
                  </span>
                  {isSupervisor ? (
                    <select
                      value={po.paymentStatus}
                      onChange={(event) => onPaymentChange(po.id, event.target.value)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-navy outline-none focus:border-primary"
                      aria-label="Update payment status"
                    >
                      {PAYMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {PAYMENT_LABELS[status] ?? status.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <StatusBadge tone={paymentTone(po.paymentStatus)}>
                      {PAYMENT_LABELS[po.paymentStatus] ?? po.paymentStatus.replace(/_/g, ' ')}
                    </StatusBadge>
                  )}
                </div>

                <ol className="mt-4 space-y-2.5">
                  {ORDER_STEPS.map((step, index) => {
                    const completed = !cancelled && currentStep >= 0 && index <= currentStep;
                    const active = !cancelled && index === currentStep;
                    return (
                      <li key={step.key} className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ${
                            completed
                              ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                              : 'bg-white text-slate-400 ring-slate-200'
                          }`}
                        >
                          {completed ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-slate-300" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold ${active ? 'text-navy' : 'text-slate-600'}`}>
                            {step.label}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {active
                              ? 'Current stage'
                              : completed
                                ? 'Completed'
                                : cancelled
                                  ? 'Order cancelled'
                                  : 'Awaiting'}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {cancelled ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>This purchase order has been cancelled.</p>
                  </div>
                ) : null}
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
              <SectionTitle icon={<Building2 className="h-4 w-4 text-primary" />} title="Procurement Chain" />
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1">Purchase Request</span>
                <span className="text-slate-300">→</span>
                <span className="rounded-full bg-[#fcb038]/20 px-3 py-1 text-navy">Purchase Order</span>
                <span className="text-slate-300">→</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Goods Received</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                {purchaseRequest
                  ? `Linked to ${purchaseRequest.prNumber}. Receiving is recorded against this order when goods arrive.`
                  : 'This standalone order is not linked to a purchase request.'}
              </p>
            </section>
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-t border-border bg-white px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[110px] rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
          >
            Close
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pdfLoading}
              onClick={() => onDownloadPdf(po)}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-60"
            >
              {pdfLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>
            {nextAction && !cancelled ? (
              <button
                type="button"
                onClick={() => {
                  onStatusChange(po.id, nextAction.status);
                  onClose();
                }}
                className="btn-primary inline-flex items-center gap-2 px-5"
              >
                <CheckCircle className="h-4 w-4" /> {nextAction.label}
              </button>
            ) : null}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({ icon, title }: { icon?: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{title}</h3>
    </div>
  );
}

function DetailItem({
  label,
  value,
  className = '',
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold text-navy">{value}</dd>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="tabular-nums font-semibold text-navy">{value}</dd>
    </div>
  );
}
