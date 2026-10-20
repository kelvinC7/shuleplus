'use client';

import {
  Eye,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  Download,
  ShoppingBag,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PurchaseRequest } from '@/types';
import { canShowSetOrder } from '@/utils/permissions';

interface PurchaseRequestTableActionsProps {
  pr: PurchaseRequest;
  isSupervisor: boolean;
  currentUserId?: string;
  pdfLoading?: boolean;
  onView: (pr: PurchaseRequest) => void;
  onEdit: (pr: PurchaseRequest) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (pr: PurchaseRequest) => void;
  onDownloadPdf: (pr: PurchaseRequest) => void;
  onSetOrder: (pr: PurchaseRequest) => void;
}

function canEdit(pr: PurchaseRequest, isSupervisor: boolean, userId?: string): boolean {
  if (!['DRAFT', 'PENDING'].includes(pr.status)) return false;
  if (isSupervisor) return true;
  return Boolean(userId && pr.requestedBy === userId);
}

export function PurchaseRequestTableActions({
  pr,
  isSupervisor,
  currentUserId,
  pdfLoading,
  onView,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  onDownloadPdf,
  onSetOrder,
}: PurchaseRequestTableActionsProps) {
  const showSetOrder = canShowSetOrder(pr.status, isSupervisor);
  const showApproveReject = isSupervisor && pr.status === 'PENDING';
  const showEdit = canEdit(pr, isSupervisor, currentUserId);
  const showDelete = isSupervisor || (currentUserId === pr.requestedBy && pr.status === 'DRAFT');

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => onView(pr)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-sm transition hover:border-[#fcb038]/50 hover:bg-[#fcb038]/5"
      >
        <Eye className="h-3.5 w-3.5" />
        View
      </button>

      {showSetOrder ? (
        <button
          type="button"
          onClick={() => onSetOrder(pr)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-[#fcb038] shadow-sm transition hover:bg-navy/90"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Set Order
        </button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-navy shadow-sm transition hover:border-[#fcb038]/50 hover:bg-slate-50"
          aria-label="More actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[168px]">
          {showApproveReject ? (
            <>
              <DropdownMenuItem onClick={() => onApprove(pr.id)}>
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReject(pr.id)}>
                <XCircle className="h-4 w-4 text-red-500" />
                Reject
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {showSetOrder ? (
            <DropdownMenuItem onClick={() => onSetOrder(pr)}>
              <ShoppingBag className="h-4 w-4 text-[#fcb038]" />
              Set Order
            </DropdownMenuItem>
          ) : null}
          {showEdit ? (
            <DropdownMenuItem onClick={() => onEdit(pr)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() => onDownloadPdf(pr)}
            disabled={pdfLoading}
          >
            <Download className="h-4 w-4" />
            {pdfLoading ? 'Generating PDF…' : 'Download PDF'}
          </DropdownMenuItem>
          {showDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(pr)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
