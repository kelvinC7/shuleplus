'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApprovalsDashboard, type ApprovalStatusFilter } from '@/components/approvals/approvals-dashboard';

const VALID_FILTERS = new Set<string>([
  'all',
  'pending',
  'under-review',
  'returned',
  'approved',
  'rejected',
]);

function parseFilter(raw: string | null): ApprovalStatusFilter {
  if (raw && VALID_FILTERS.has(raw)) return raw as ApprovalStatusFilter;
  return 'all';
}

function ApprovalsPageInner() {
  const searchParams = useSearchParams();
  const initialFilter = parseFilter(searchParams.get('status'));

  return (
    <div className="mx-auto max-w-7xl">
      <ApprovalsDashboard initialFilter={initialFilter} />
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl py-8 text-sm text-navy/45">Loading inbox…</div>}>
      <ApprovalsPageInner />
    </Suspense>
  );
}
