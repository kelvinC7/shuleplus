'use client';

import type { ReactNode } from 'react';
import {
  CheckCircle,
  ClipboardList,
  Download,
  FileText,
  Link2,
  LoaderCircle,
  Package,
  Printer,
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
import { GRN_STATUS_LABELS, grnStatusTone } from '@/lib/grn-constants';
import type { GoodsReceiving } from '@/types';

const GRN_STEPS = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PENDING_INSPECTION', label: 'Pending Inspection' },
  { key: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
  { key: 'FULLY_RECEIVED', label: 'Fully Received' },
  { key: 'ACCEPTED', label: 'Accepted' },
];

function grnStepIndex(status: string): number {
  switch (status) {
    case 'DRAFT':
      return 0;
    case 'PENDING_INSPECTION':
      return 1;
    case 'PARTIALLY_RECEIVED':
      return 2;
    case 'FULLY_RECEIVED':
    case 'RECEIVED':
      return 3;
    case 'ACCEPTED':
    case 'COMPLETED':
      return 4;
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

interface GoodsReceivingDetailDrawerProps {
  open: boolean;
  grn: GoodsReceiving | null;
  pdfLoading?: boolean;
  onClose: () => void;
  onDownloadPdf: (grn: GoodsReceiving) => void;
  onPrint: (grn: GoodsReceiving) => void;
}

export function GoodsReceivingDetailDrawer({
  open,
  grn,
  pdfLoading,
  onClose,
  onDownloadPdf,
  onPrint,
}: GoodsReceivingDetailDrawerProps) {
  if (!grn) return null;

  const items = grn.items ?? [];
  const purchaseOrder = grn.purchaseOrder;
  const purchaseRequest = purchaseOrder?.purchaseRequest;
  const supplierName = purchaseOrder?.supplier?.companyName || '—';
  const acceptedQty = items.reduce((sum, item) => sum + Number(item.acceptedQty || 0), 0);
  const rejectedDamagedQty = items.reduce(
    (sum, item) => sum + Number(item.rejectedQty || 0) + Number(item.damagedQty || 0),
    0,
  );
  const currentStep = grnStepIndex(grn.status);
  const rejected = grn.status === 'REJECTED';

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
                <Package className="h-3 w-3" /> Goods Received Note
              </div>
              <SheetTitle className="truncate text-2xl font-bold text-white">{grn.grnNumber}</SheetTitle>
              <SheetDescription className="mt-1 flex flex-wrap items-center gap-2 text-white/65">
                <span className="truncate">{supplierName}</span>
                <span className="text-white/30">·</span>
                <span>Received {formatDate(grn.receivedDate)}</span>
              </SheetDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge tone={grnStatusTone(grn.status)} className="!bg-white/10 !text-white">
                  {GRN_STATUS_LABELS[grn.status] ?? grn.status.replace(/_/g, ' ')}
                </StatusBadge>
                {grn.barcode ? (
                  <StatusBadge tone="neutral" className="!bg-white/10 !text-white">
                    {grn.barcode}
                  </StatusBadge>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close goods received details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-5 py-6 sm:px-8">
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<ClipboardList className="h-4 w-4 text-primary" />} title="Receiving Information" />
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailItem label="PO Number" value={purchaseOrder?.poNumber || '—'} />
                  <DetailItem label="Supplier" value={supplierName} />
                  <DetailItem label="Received By" value={formatPersonName(grn.receivedByName) || '—'} />
                  <DetailItem label="Received Date" value={formatDate(grn.receivedDate)} />
                  <DetailItem label="Created" value={formatDateTime(grn.createdAt)} />
                  <DetailItem label="Barcode" value={grn.barcode || '—'} />
                </dl>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<Link2 className="h-4 w-4 text-primary" />} title="Related Documents" />
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Purchase Order" value={purchaseOrder?.poNumber || '—'} />
                  <DetailItem label="Purchase Request" value={purchaseRequest?.prNumber || '—'} />
                  <DetailItem label="Department" value={purchaseRequest?.department?.name || '—'} />
                  <DetailItem label="Supplier" value={supplierName} />
                </dl>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionTitle
                  icon={<Package className="h-4 w-4 text-primary" />}
                  title={`Received Items (${items.length})`}
                />
                <div className="grid grid-cols-2 gap-3 text-right">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Accepted</p>
                    <p className="text-lg font-bold tabular-nums text-emerald-700">{acceptedQty}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Rejected / Damaged</p>
                    <p className="text-lg font-bold tabular-nums text-red-600">{rejectedDamagedQty}</p>
                  </div>
                </div>
              </div>

              {items.length > 0 ? (
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-2.5 text-left">#</th>
                        <th className="px-4 py-2.5 text-left">Item</th>
                        <th className="px-4 py-2.5 text-right">Ordered</th>
                        <th className="px-4 py-2.5 text-right">Received</th>
                        <th className="px-4 py-2.5 text-right">Accepted</th>
                        <th className="px-4 py-2.5 text-right">Rejected</th>
                        <th className="px-4 py-2.5 text-left">Condition</th>
                        <th className="px-4 py-2.5 text-left">Storage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2.5 text-xs text-slate-500">{index + 1}</td>
                          <td className="px-4 py-2.5 font-semibold text-navy">{item.itemName}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                            {Number(item.orderedQty || 0)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                            {Number(item.receivedQty || 0)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-700">
                            {Number(item.acceptedQty || 0)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-red-600">
                            {Number(item.rejectedQty || 0)}
                            {Number(item.damagedQty || 0) > 0 ? (
                              <span className="block text-[11px] font-normal text-slate-500">
                                {Number(item.damagedQty)} damaged
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{item.condition || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-500">{item.warehouseLocation || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No items were recorded on this receipt.
                </p>
              )}
            </section>

            {grn.inspectionNotes?.trim() || grn.notes?.trim() ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<FileText className="h-4 w-4 text-primary" />} title="Inspection & Notes" />
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  {grn.inspectionNotes?.trim() ? (
                    <DetailItem
                      label="Inspection Notes"
                      value={grn.inspectionNotes}
                      className="sm:col-span-2"
                    />
                  ) : null}
                  {grn.notes?.trim() ? (
                    <DetailItem label="Notes" value={grn.notes} className="sm:col-span-2" />
                  ) : null}
                </dl>
              </section>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<ShieldCheck className="h-4 w-4 text-primary" />} title="Receiving Status" />
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <StatusBadge tone={grnStatusTone(grn.status)}>
                    {GRN_STATUS_LABELS[grn.status] ?? grn.status.replace(/_/g, ' ')}
                  </StatusBadge>
                  <span className="text-xs text-slate-500">Received {formatDateTime(grn.receivedDate)}</span>
                </div>
                {rejected ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>This goods received note was rejected. Review the inspection notes above.</p>
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<Truck className="h-4 w-4 text-primary" />} title="Receiving Workflow" />
                <ol className="mt-4 space-y-2.5">
                  {GRN_STEPS.map((step, index) => {
                    const completed = !rejected && currentStep >= 0 && index <= currentStep;
                    const active = !rejected && index === currentStep;
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
                                : rejected
                                  ? 'Receipt rejected'
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
                <span className="rounded-full bg-[#fcb038]/20 px-3 py-1 text-navy">Goods Received</span>
                <span className="text-slate-300">→</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Returns</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                {purchaseOrder?.poNumber
                  ? `This receipt is recorded against ${purchaseOrder.poNumber}${purchaseRequest?.prNumber ? ` from ${purchaseRequest.prNumber}` : ''}.`
                  : 'No purchase order is linked to this receipt.'}
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
              onClick={() => onDownloadPdf(grn)}
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
              onClick={() => onPrint(grn)}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-60"
            >
              <Printer className="h-4 w-4" /> Print GRN
            </button>
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
