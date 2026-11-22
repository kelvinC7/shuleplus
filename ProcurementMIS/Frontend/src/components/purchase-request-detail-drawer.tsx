'use client';

import type { ReactNode } from 'react';
import {
  Building2,
  CheckCircle,
  ClipboardList,
  Download,
  FileText,
  LoaderCircle,
  Package,
  Paperclip,
  Pencil,
  ShieldCheck,
  ShoppingBag,
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
import { canShowSetOrder } from '@/utils/permissions';
import type { PurchaseRequest } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  DEPARTMENT_HEAD_APPROVED: 'Dept. Head Approved',
  FINANCE_APPROVED: 'Finance Approved',
  PROCUREMENT_APPROVED: 'Procurement Approved',
  MD_APPROVED: 'Fully Approved',
  REJECTED: 'Rejected',
  CONVERTED_TO_PO: 'Converted to PO',
  CANCELLED: 'Cancelled',
};

const APPROVAL_STAGES = [
  { key: 'Employee', label: 'Employee Submission' },
  { key: 'Department Head', label: 'Department Head' },
  { key: 'Finance', label: 'Finance' },
  { key: 'Procurement Officer', label: 'Procurement Officer' },
  { key: 'Managing Director', label: 'Managing Director' },
];

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'REJECTED' || status === 'CANCELLED') return 'danger';
  if (status === 'CONVERTED_TO_PO' || status === 'MD_APPROVED') return 'success';
  if (status === 'PENDING' || status === 'DRAFT') return 'warning';
  return 'info';
}

function priorityTone(priority: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (priority === 'URGENT') return 'danger';
  if (priority === 'HIGH') return 'warning';
  if (priority === 'LOW') return 'neutral';
  return 'info';
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

interface PurchaseRequestDetailDrawerProps {
  open: boolean;
  pr: PurchaseRequest | null;
  isSupervisor: boolean;
  currentUserId?: string;
  pdfLoading?: boolean;
  onClose: () => void;
  onEdit: (pr: PurchaseRequest) => void;
  onSetOrder: (pr: PurchaseRequest) => void;
  onDownloadPdf: (pr: PurchaseRequest) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function PurchaseRequestDetailDrawer({
  open,
  pr,
  isSupervisor,
  currentUserId,
  pdfLoading,
  onClose,
  onEdit,
  onSetOrder,
  onDownloadPdf,
  onApprove,
  onReject,
}: PurchaseRequestDetailDrawerProps) {
  if (!pr) return null;

  const items = pr.items ?? [];
  const approvals = pr.approvals ?? [];
  const departmentName = pr.departmentOther?.trim() || pr.department?.name || '—';
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const canEdit =
    ['DRAFT', 'PENDING'].includes(pr.status) &&
    (isSupervisor || Boolean(currentUserId && pr.requestedBy === currentUserId));
  const canSetOrder = canShowSetOrder(pr.status, isSupervisor);
  const canApproveReject = isSupervisor && pr.status === 'PENDING';

  const approvalStageStatus = (stage: string) => {
    const record = approvals.find((approval) => approval.stage === stage);
    if (record) return record;
    return undefined;
  };

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!w-[min(1040px,96vw)] !max-w-[1040px] flex flex-col gap-0 overflow-hidden border-l border-border p-0"
      >
        <SheetHeader className="shrink-0 border-b border-white/10 bg-navy px-6 py-5 text-white sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#fcb038]/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#fcb038]">
                <FileText className="h-3 w-3" /> Purchase Request
              </div>
              <SheetTitle className="truncate text-2xl font-bold text-white">{pr.prNumber}</SheetTitle>
              <SheetDescription className="mt-1 flex flex-wrap items-center gap-2 text-white/65">
                <span>{departmentName}</span>
                <span className="text-white/30">·</span>
                <span>Created {formatDate(pr.createdAt)}</span>
              </SheetDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge tone={statusTone(pr.status)} className="!bg-white/10 !text-white">
                  {STATUS_LABELS[pr.status] ?? pr.status}
                </StatusBadge>
                <StatusBadge tone={priorityTone(pr.priority)} className="!bg-white/10 !text-white">
                  {pr.priority} priority
                </StatusBadge>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close request details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fafc] px-6 py-6 sm:px-8">
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<FileText className="h-4 w-4 text-primary" />} title="Request Information" />
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Request Type" value={pr.requestType.replace(/_/g, ' ')} />
                  <DetailItem label="Priority" value={pr.priority} />
                  <DetailItem label="Academic Year" value={pr.academicYear || '—'} />
                  <DetailItem label="Term" value={pr.term || '—'} />
                  <DetailItem label="Needed By" value={formatDate(pr.neededDate)} />
                  <DetailItem label="Submitted" value={formatDate(pr.createdAt)} />
                  <DetailItem
                    label="Purpose"
                    value={pr.purpose?.trim() || '—'}
                    className="sm:col-span-2"
                  />
                </dl>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<Building2 className="h-4 w-4 text-primary" />} title="Department Information" />
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Department" value={departmentName} />
                  <DetailItem
                    label="Assignment"
                    value={pr.departmentOther ? 'Other (custom department)' : 'Existing department'}
                  />
                  <DetailItem
                    label="Requested By"
                    value={formatPersonName(pr.requestedByName) || '—'}
                    className="sm:col-span-2"
                  />
                  <DetailItem
                    label="Current Approver"
                    value={pr.currentApprover ? 'Pending action' : '—'}
                    className="sm:col-span-2"
                  />
                </dl>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionTitle
                  icon={<Package className="h-4 w-4 text-primary" />}
                  title={`Requested Items (${items.length})`}
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
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-2.5 text-left">#</th>
                        <th className="px-4 py-2.5 text-left">Item</th>
                        <th className="px-4 py-2.5 text-right">Quantity</th>
                        <th className="px-4 py-2.5 text-left">Unit</th>
                        <th className="px-4 py-2.5 text-left">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2.5 text-xs text-slate-500">{index + 1}</td>
                          <td className="px-4 py-2.5 font-semibold text-navy">{item.itemName}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                            {Number(item.quantity)}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{item.unit}</td>
                          <td className="px-4 py-2.5 text-slate-500">{item.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No items have been added to this request.
                </p>
              )}
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<ShieldCheck className="h-4 w-4 text-primary" />} title="Request Status" />
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <StatusBadge tone={statusTone(pr.status)}>
                    {STATUS_LABELS[pr.status] ?? pr.status}
                  </StatusBadge>
                  <span className="text-xs text-slate-500">
                    Updated {formatDateTime(pr.updatedAt)}
                  </span>
                </div>
                {pr.rejectionReason ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{pr.rejectionReason}</p>
                  </div>
                ) : null}

                <ol className="mt-4 space-y-2.5">
                  {APPROVAL_STAGES.map((stage) => {
                    const record = approvalStageStatus(stage.key);
                    const approved = record?.status === 'APPROVED';
                    const rejected = record?.status === 'REJECTED';
                    return (
                      <li key={stage.key} className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ${
                            approved
                              ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                              : rejected
                                ? 'bg-red-100 text-red-700 ring-red-200'
                                : 'bg-white text-slate-400 ring-slate-200'
                          }`}
                        >
                          {approved ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : rejected ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-slate-300" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-navy">{stage.label}</p>
                          <p className="truncate text-[11px] text-slate-500">
                            {record
                              ? `${record.status.replace(/_/g, ' ')}${record.approvedAt ? ` · ${formatDate(record.approvedAt)}` : ''}`
                              : record === undefined && pr.status === 'DRAFT'
                                ? 'Not submitted yet'
                                : 'Awaiting action'}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
                <SectionTitle icon={<ClipboardList className="h-4 w-4 text-primary" />} title="Approval History" />
                {approvals.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {approvals.map((approval) => {
                      const approved = approval.status === 'APPROVED';
                      return (
                        <div key={approval.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              approved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {approved ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-navy">
                                {approval.stage.replace(/_/g, ' ')}
                              </span>
                              <StatusBadge tone={approved ? 'success' : 'danger'}>
                                {approval.status.replace(/_/g, ' ')}
                              </StatusBadge>
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {formatPersonName(approval.approverName) || approval.approverEmail || approval.approverId}
                            </p>
                            {approval.comment ? (
                              <p className="mt-1 text-xs text-slate-600">{approval.comment}</p>
                            ) : null}
                            <p className="mt-1 text-[11px] text-slate-400">
                              {formatDateTime(approval.approvedAt ?? approval.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No approval actions have been recorded yet.
                  </p>
                )}
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
              <SectionTitle icon={<Paperclip className="h-4 w-4 text-primary" />} title="Attachments" />
              <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                <Paperclip className="h-5 w-5 text-slate-400" />
                <p className="text-sm font-semibold text-navy">No attachments</p>
                <p className="text-xs text-slate-500">
                  Supporting documents will appear here when the request includes them.
                </p>
              </div>
            </section>
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-t border-border bg-white px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[110px] rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
          >
            Close
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {canApproveReject && onApprove ? (
              <button
                type="button"
                onClick={() => onApprove(pr.id)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                <CheckCircle className="h-4 w-4" /> Approve
              </button>
            ) : null}
            {canApproveReject && onReject ? (
              <button
                type="button"
                onClick={() => onReject(pr.id)}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                <XCircle className="h-4 w-4" /> Reject
              </button>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                onClick={() => onEdit(pr)}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            ) : null}
            <button
              type="button"
              disabled={pdfLoading}
              onClick={() => onDownloadPdf(pr)}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-60"
            >
              {pdfLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>
            {canSetOrder ? (
              <button
                type="button"
                onClick={() => onSetOrder(pr)}
                className="btn-primary inline-flex items-center gap-2 px-5"
              >
                <ShoppingBag className="h-4 w-4" /> Set Order
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
