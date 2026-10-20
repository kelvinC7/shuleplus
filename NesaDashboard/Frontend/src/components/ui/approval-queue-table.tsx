'use client';

import { CheckCircle2, Clock, Eye, RotateCcw, XCircle } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';

export type ApprovalQueueStatus =
  | 'pending'
  | 'under-review'
  | 'returned'
  | 'approved'
  | 'rejected';

export interface ApprovalQueueItem {
  id: string;
  title: string;
  module: string;
  submittedBy: string;
  submittedAt: string;
  status: ApprovalQueueStatus;
}

const STATUS_META: Record<
  ApprovalQueueStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  pending: { label: 'Pending', icon: Clock, className: 'text-navy/60' },
  'under-review': { label: 'Under Review', icon: Eye, className: 'text-navy/70' },
  returned: { label: 'Returned', icon: RotateCcw, className: 'text-navy/55' },
  approved: { label: 'Approved', icon: CheckCircle2, className: 'text-success' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'text-danger' },
};

const MOCK_ITEMS: ApprovalQueueItem[] = [
  {
    id: 'aq-1',
    title: 'Fee Policy 2026 — Draft B',
    module: 'Fee Policy',
    submittedBy: 'Provincial Officer — East',
    submittedAt: '2026-07-12',
    status: 'pending',
  },
  {
    id: 'aq-2',
    title: 'Circular #BE-8841',
    module: 'Circulars',
    submittedBy: 'GS Kacyiru',
    submittedAt: '2026-07-11',
    status: 'under-review',
  },
  {
    id: 'aq-3',
    title: 'School Registration — ES Remera',
    module: 'Schools',
    submittedBy: 'District Officer — Gasabo',
    submittedAt: '2026-07-10',
    status: 'returned',
  },
  {
    id: 'aq-4',
    title: 'Fee Cap Amendment Q2',
    module: 'Fee Policy',
    submittedBy: 'NESA Finance',
    submittedAt: '2026-07-08',
    status: 'approved',
  },
  {
    id: 'aq-5',
    title: 'Circular #BE-8720',
    module: 'Circulars',
    submittedBy: 'GS Nyamirambo',
    submittedAt: '2026-07-05',
    status: 'rejected',
  },
];

interface ApprovalQueueTableProps {
  status: ApprovalQueueStatus;
  items?: ApprovalQueueItem[];
}

export function ApprovalQueueTable({ status, items = MOCK_ITEMS }: ApprovalQueueTableProps) {
  const filtered = items.filter((item) => item.status === status);
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;

  const columns: DataTableColumn<ApprovalQueueItem>[] = [
    {
      key: 'title',
      header: 'Item',
      render: (row) => (
        <div>
          <p className="font-semibold text-navy">{row.title}</p>
          <p className="text-[11px] text-navy/40">{row.module}</p>
        </div>
      ),
    },
    {
      key: 'submittedBy',
      header: 'Submitted by',
      render: (row) => row.submittedBy,
    },
    {
      key: 'submittedAt',
      header: 'Date',
      render: (row) => <span className="text-navy/50">{row.submittedAt}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: () => (
        <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${meta.className}`}>
          <StatusIcon size={14} strokeWidth={2} />
          {meta.label}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={filtered}
      rowKey={(row) => row.id}
      emptyMessage={`No ${meta.label.toLowerCase()} items.`}
    />
  );
}
