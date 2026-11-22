'use client';

import { useEffect, useState } from 'react';
import { PieChart } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { KpiCard, StatsGrid } from '@/components/shared/stat-card';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/auth-context';
import type { SmsUsageSummary } from '@/lib/sms-packages-types';
import { formatShortDate } from '@/lib/format';

export default function SmsUsagePage() {
  const { linkedStudents } = useAuth();
  const [summary, setSummary] = useState<SmsUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: SmsUsageSummary }>('/sms-packages/summary')
      .then(({ data }) => setSummary(data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4 pb-8">
      <PageHeader eyebrow="Family communication" title="SMS Usage" description="Credits purchased, used, and remaining per child." />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : summary ? (
        <>
          <StatsGrid>
            <KpiCard label="Purchased" value={summary.totalPurchased.toLocaleString()} hint="segments" />
            <KpiCard label="Remaining" value={summary.totalRemaining.toLocaleString()} hint="segments" />
            <KpiCard label="Used" value={summary.totalUsed.toLocaleString()} hint="segments" />
          </StatsGrid>

          <div className="rounded-2xl border border-navy/8 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-navy">
              <PieChart className="h-4 w-4 text-primary" />
              <p className="font-semibold">Balance by child</p>
            </div>
            {summary.balances.length === 0 ? (
              <p className="text-sm text-muted">No active credit balances yet.</p>
            ) : (
              <div className="space-y-2">
                {summary.balances.map((b) => {
                  const child = linkedStudents.find((s) => s.id === b.studentId);
                  return (
                    <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-navy">{child?.fullName ?? 'Family balance'}</p>
                        {b.expiresAt ? (
                          <p className="text-xs text-muted">Expires {formatShortDate(b.expiresAt)}</p>
                        ) : null}
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-bold text-navy">{b.segmentsRemaining.toLocaleString()} left</p>
                        <p className="text-xs text-muted">
                          {b.segmentsUsed}/{b.segmentsGranted} used
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
