'use client';

import type { ReactNode } from 'react';
import {
  CheckCircle,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Link2,
  LoaderCircle,
  Package,
  Printer,
  RotateCcw,
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
import { formatFrw } from '@/utils/currency';
import { RETURN_STATUS_LABELS, returnStatusTone } from '@/lib/grn-constants';
import type { GoodsReturn } from '@/types';

const RESOLUTION_STEPS = [
  'Return Created',
  'Approved',
  'Sent to Supplier',
  'Supplier Response',
  'Replacement / Credit',
  'Closed',
];

function workflowStep(status: string): number {
  switch (status) {
    case 'DRAFT':
    case 'PENDING_APPROVAL':
      return 0;
    case 'APPROVED':
      return 1;
    case 'SENT_TO_SUPPLIER':
      return 2;
    case 'REPLACEMENT_PENDING':
      return 3;
    case 'REPLACED':
    case 'CREDIT_RECEIVED':
      return 4;
    case 'CLOSED':
      return 5;
    case 'REJECTED':
      return -1;
    default:
      return 0;
  }
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

function resolutionLabel(value?: string | null) {
  if (!value) return '—';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (char) => char.toUpperCase());
}

interface GoodsReturnDetailDrawerProps {
  open: boolean;
  ret: GoodsReturn | null;
  pdfLoading?: boolean;
  onClose: () => void;
  onDownloadPdf: (ret: GoodsReturn) => void;
  onPrint: (ret: GoodsReturn) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function GoodsReturnDetailDrawer({
  open,
  ret,
  pdfLoading,
  onClose,
  onDownloadPdf,
  onPrint,
  onStatusChange,
}: GoodsReturnDetailDrawerProps) {
  if (!ret) return null;

  const items = ret.items ?? [];
  const grn = ret.grn;
  const purchaseOrder = grn?.purchaseOrder;
  const supplierName = purchaseOrder?.supplier?.companyName || '—';
  const departmentName = purchaseOrder?.purchaseRequest?.department?.name || '—';
  const totalReturnQty = items.reduce((sum, item) => sum + Number(item.returnQty || 0), 0);
  const computedValue = items.reduce(
    (sum, item) => sum + Number(item.returnQty || 0) * Number(item.unitPrice || 0),
    0,
  );
  const returnValue = Number(ret.returnValue ?? computedValue ?? 0);
  const currentStep = workflowStep(ret.status);
  const rejected = ret.status === 'REJECTED';

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
                <RotateCcw className="h-3 w-3" /> Goods Return
              </div>
              <SheetTitle className="truncate text-2xl font-bold text-white">
                {ret.returnNumber}
              </SheetTitle>
              <SheetDescription className="mt-1 flex flex-wrap items-center gap-2 text-white/65">
                <span className="truncate">{supplierName}</span>
                <span className="text-white/30">·</span>
                <span>Created {formatDate(ret.createdAt)}</span>
              </SheetDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge tone={returnStatusTone(ret.status)} className="!bg-white/10 !text-white">
                  {RETURN_STATUS_LABELS[ret.status] ?? ret.status.replace(/_/g, ' ')}
                </StatusBadge>
                <StatusBadge tone="info" className="!bg-white/10 !text-white">
                  {ret.reason}
                </StatusBadge>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close return details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-5 py-6 sm:px-8">
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<ClipboardList className="h-4 w-4 text-primary" />} title="Return Information" />
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Reason" value={ret.reason} />
                  <DetailItem label="Resolution" value={resolutionLabel(ret.resolution)} />
                  <DetailItem label="Return Value" value={formatFrw(returnValue)} />
                  <DetailItem label="Created By" value={formatPersonName(ret.createdByName) || '—'} />
                  <DetailItem label="Created" value={formatDateTime(ret.createdAt)} />
                  <DetailItem label="Updated" value={formatDateTime(ret.updatedAt)} />
                  {ret.reasonDescription?.trim() ? (
                    <DetailItem
                      label="Reason Description"
                      value={ret.reasonDescription}
                      className="sm:col-span-2"
                    />
                  ) : null}
                </dl>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<Link2 className="h-4 w-4 text-primary" />} title="Related Documents" />
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailItem label="GRN" value={grn?.grnNumber || '—'} />
                  <DetailItem label="Purchase Order" value={purchaseOrder?.poNumber || '—'} />
                  <DetailItem label="Supplier" value={supplierName} />
                  <DetailItem label="Department" value={departmentName} />
                  <DetailItem label="Received Date" value={formatDate(grn?.receivedDate)} />
                  <DetailItem
                    label="Received By"
                    value={formatPersonName(grn?.receivedByName) || '—'}
                  />
                </dl>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionTitle
                  icon={<Package className="h-4 w-4 text-primary" />}
                  title={`Returned Items (${items.length})`}
                />
                <div className="grid grid-cols-2 gap-3 text-right">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Items</p>
                    <p className="text-lg font-bold tabular-nums text-navy">{items.length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Return Qty</p>
                    <p className="text-lg font-bold tabular-nums text-navy">{totalReturnQty}</p>
                  </div>
                </div>
              </div>

              {items.length > 0 ? (
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-2.5 text-left">#</th>
                        <th className="px-4 py-2.5 text-left">Item</th>
                        <th className="px-4 py-2.5 text-right">Received Qty</th>
                        <th className="px-4 py-2.5 text-right">Return Qty</th>
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
                            {item.reason ? (
                              <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                                {item.reason}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                            {Number(item.receivedQty || 0)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-navy">
                            {Number(item.returnQty || 0)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                            {item.unitPrice != null ? formatFrw(Number(item.unitPrice)) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-navy">
                            {item.unitPrice != null
                              ? formatFrw(Number(item.returnQty || 0) * Number(item.unitPrice))
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                          Total Return Value
                        </td>
                        <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-navy">
                          {formatFrw(returnValue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No items have been added to this return.
                </p>
              )}
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<ShieldCheck className="h-4 w-4 text-primary" />} title="Return Status" />
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <StatusBadge tone={returnStatusTone(ret.status)}>
                    {RETURN_STATUS_LABELS[ret.status] ?? ret.status.replace(/_/g, ' ')}
                  </StatusBadge>
                  <span className="text-xs text-slate-500">Updated {formatDateTime(ret.updatedAt)}</span>
                </div>
                {rejected ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>This return was rejected and cannot proceed through the workflow.</p>
                  </div>
                ) : null}
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    {ret.status === 'PENDING_APPROVAL'
                      ? 'Waiting for approval before the return is sent to the supplier.'
                      : ret.status === 'APPROVED'
                        ? 'Approved and ready to send to the supplier.'
                        : ret.status === 'SENT_TO_SUPPLIER'
                          ? 'Sent to the supplier and awaiting a response.'
                          : ret.status === 'CLOSED'
                            ? 'This return is fully resolved and closed.'
                            : 'Track the return progress below.'}
                  </span>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<Truck className="h-4 w-4 text-primary" />} title="Resolution Workflow" />
                <ol className="mt-4 space-y-2.5">
                  {RESOLUTION_STEPS.map((step, index) => {
                    const completed = !rejected && currentStep >= 0 && index <= currentStep;
                    const active = !rejected && index === currentStep;
                    return (
                      <li key={step} className="flex items-center gap-3">
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
                            {step}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {active
                              ? 'Current stage'
                              : completed
                                ? 'Completed'
                                : rejected
                                  ? 'Return rejected'
                                  : 'Awaiting'}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
              <SectionTitle icon={<FileText className="h-4 w-4 text-primary" />} title="Procurement Chain" />
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-slate-100 px-3 py-1">Purchase Request</span>
                <span className="text-slate-300">→</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Purchase Order</span>
                <span className="text-slate-300">→</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Goods Received</span>
                <span className="text-slate-300">→</span>
                <span className="rounded-full bg-[#fcb038]/20 px-3 py-1 text-navy">Goods Return</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                {grn?.grnNumber
                  ? `This return is recorded against ${grn.grnNumber}${purchaseOrder?.poNumber ? ` from ${purchaseOrder.poNumber}` : ''}.`
                  : 'No goods received note is linked to this return.'}
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
              onClick={() => onDownloadPdf(ret)}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-60"
            >
              {pdfLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>
            <button
              type="button"
              disabled={pdfLoading}
              onClick={() => onPrint(ret)}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-60"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            {ret.status === 'PENDING_APPROVAL' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onStatusChange(ret.id, 'REJECTED');
                    onClose();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onStatusChange(ret.id, 'APPROVED');
                    onClose();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <CheckCircle className="h-4 w-4" /> Approve
                </button>
              </>
            ) : null}
            {ret.status === 'APPROVED' ? (
              <button
                type="button"
                onClick={() => {
                  onStatusChange(ret.id, 'SENT_TO_SUPPLIER');
                  onClose();
                }}
                className="btn-primary inline-flex items-center gap-2 px-5"
              >
                <Truck className="h-4 w-4" /> Mark Sent to Supplier
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
