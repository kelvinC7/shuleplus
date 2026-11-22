'use client';

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api';
import { formatShortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SmsPurchaseRow } from '@/lib/sms-packages-types';

const FILTERS = ['ALL', 'ACTIVATED', 'PENDING_APPROVAL', 'PENDING_PAYMENT'] as const;

function statusLabel(s: string) {
  if (s === 'ACTIVATED') return 'Activated';
  if (s === 'PENDING_APPROVAL') return 'Pending';
  if (s === 'PENDING_PAYMENT') return 'Awaiting payment';
  return s.replace(/_/g, ' ');
}

export default function SmsPurchaseHistoryPage() {
  const [rows, setRows] = useState<SmsPurchaseRow[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ data: SmsPurchaseRow[] }>('/sms-packages/purchases', { params: { status: filter } })
      .then(({ data }) => setRows(data.data ?? []))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-4 pb-8">
      <PageHeader eyebrow="Family communication" title="SMS Purchase History" description="Purchases, payment status, and receipts." />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold',
              filter === f ? 'bg-navy text-white' : 'bg-white text-navy border border-navy/10'
            )}
          >
            {f === 'ALL' ? 'All' : statusLabel(f)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<History />} title="No purchases yet" description="When you buy an SMS package it will appear here." />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-navy/8 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-navy">{r.packageTitle ?? 'SMS Package'}</p>
                  <p className="text-xs text-muted">
                    {r.purchaseRef} · {formatShortDate(r.createdAt)}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-navy">
                  {statusLabel(r.status)}
                </span>
              </div>
              <p className="mt-2 text-sm">
                RWF {r.totalAmountRwf.toLocaleString()} · {r.totalSegments.toLocaleString()} segments
              </p>
              {r.lines?.length ? (
                <p className="mt-1 text-xs text-muted">{r.lines.map((l) => l.studentName).join(', ')}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
