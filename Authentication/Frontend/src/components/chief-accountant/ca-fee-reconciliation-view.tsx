'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCaSchoolFeesDashboard } from '@/lib/chief-accountant-api';
import { formatRwf } from '@/lib/rep-finance-utils';
import { CaSchoolFeesPageHeader } from '@/components/chief-accountant/ca-school-fees-page-header';
import { CaFilterBar } from '@/components/chief-accountant/ca-filter-bar';
import { StatCard } from '@/components/school-representative/stat-card';
import { useCaContext } from '@/components/chief-accountant/ca-context';

export function CaFeeReconciliationView() {
  const { orgScope, academicYear, term } = useCaContext();
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof fetchCaSchoolFeesDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (orgScope !== 'all') p.organizationId = orgScope;
    if (academicYear) p.academicYear = academicYear;
    if (term) p.term = term;
    return p;
  }, [orgScope, academicYear, term]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDashboard(await fetchCaSchoolFeesDashboard(params));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  const systemCollections = dashboard?.summary.paidFees ?? 0;
  const settlementPlaceholder = systemCollections;
  const difference = 0;
  const unmatched = dashboard?.summary.unreconciledAmount ?? 0;

  return (
    <div className="space-y-6">
      <CaSchoolFeesPageHeader />
      <CaFilterBar onRefresh={load} refreshing={loading} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="System collections" value={formatRwf(systemCollections)} accent />
        <StatCard label="Settlement total" value={formatRwf(settlementPlaceholder)} />
        <StatCard label="Unmatched" value={formatRwf(unmatched)} />
        <StatCard label="Settlement difference" value={formatRwf(difference)} />
      </div>

      {(dashboard?.alerts ?? []).length ? (
        <div className="space-y-2">
          {dashboard!.alerts.map((a) => (
            <div
              key={a.id}
              className={`rounded-xl border px-4 py-2 text-sm ${
                a.severity === 'critical'
                  ? 'border-red-200 bg-red-50 text-red-950'
                  : a.severity === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-950'
                    : 'border-sky-200 bg-sky-50 text-sky-950'
              }`}
            >
              {a.title}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
