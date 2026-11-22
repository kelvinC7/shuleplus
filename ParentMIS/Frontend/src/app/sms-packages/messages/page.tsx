'use client';

import { useEffect, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { api } from '@/services/api';
import { formatShortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SmsMessageRow } from '@/lib/sms-packages-types';

const FILTERS = ['ALL', 'DELIVERED', 'FAILED'] as const;

export default function SmsMessagesPage() {
  const [rows, setRows] = useState<SmsMessageRow[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ data: SmsMessageRow[] }>('/sms-packages/messages', { params: { status: filter } })
      .then(({ data }) => setRows(data.data ?? []))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        eyebrow="Family communication"
        title="Messages & Delivery Reports"
        description="Full SMS text, delivery status, and segment usage."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold',
              filter === f ? 'bg-navy text-white' : 'border border-navy/10 bg-white text-navy'
            )}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<MessageSquareText />} title="No messages yet" description="School SMS sent to your number will show here." />
      ) : (
        <div className="space-y-2">
          {rows.map((m) => (
            <div key={m.id} className="rounded-2xl border border-navy/8 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    m.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-800' : m.status === 'FAILED' ? 'bg-red-50 text-red-800' : 'bg-slate-100 text-navy'
                  )}
                >
                  {m.status}
                </span>
                <span className="text-xs text-muted">{formatShortDate(m.createdAt)}</span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-navy whitespace-pre-wrap">{m.messageBody}</p>
              <p className="mt-2 text-xs text-muted">
                {m.segments} segment{m.segments === 1 ? '' : 's'}
                {m.studentSummary ? ` · ${m.studentSummary}` : ''}
              </p>
              {m.failureReason ? <p className="mt-1 text-xs text-red-600">{m.failureReason}</p> : null}
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-primary"
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
              >
                {expanded === m.id ? 'Hide' : 'Details'}
              </button>
              {expanded === m.id ? (
                <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap text-navy">{m.messageBody}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
