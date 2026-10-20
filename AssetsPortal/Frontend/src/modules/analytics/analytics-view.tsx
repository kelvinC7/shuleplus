'use client';

import { useCallback, useEffect, useState } from 'react';
import { AssetsPageLayout } from '@/components/assets-page-layout';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { assetsApi } from '@/services/assets-api';
import { useToast } from '@/shared/notifications';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatNumber, formatRwf } from '@/utils/format';
import type { AnalyticsData } from '@/types';

const COLORS = ['#000435', '#fcb038', '#14b8a6', '#a78bfa', '#f97316'];

export function AnalyticsView() {
  const toast = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await assetsApi.analytics();
      setData(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load analytics'), 'Error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const byYear = data?.byYear ?? [];
  const locations = data?.topLocations ?? [];
  const categories = data?.byCategory ?? [];
  const valueByCategory = data?.valueByCategory ?? [];
  const health = data?.health;
  const totals = data?.totals;
  const maxPurchase = Math.max(...byYear.map((y) => y.purchase), 1);
  const maxLoc = Math.max(...locations.map((l) => l.value), 1);
  const maxCat = Math.max(...categories.map((c) => c.value), 1);
  const maxCatValue = Math.max(...valueByCategory.map((c) => c.value), 1);
  const healthTotal = (health?.used ?? 0) + (health?.notUsedOld ?? 0) || 1;

  return (
    <AssetsPageLayout
      title="Analytics"
      subtitle="Live aggregates from your asset register"
      kpis={[
        { label: 'Total assets', value: formatNumber(totals?.assets ?? 0) },
        { label: 'Purchase value', value: formatRwf(totals?.purchase ?? 0) },
        { label: 'Net book value', value: formatRwf(totals?.nbv ?? 0) },
        { label: 'Years tracked', value: formatNumber(byYear.length) },
      ]}
    >
      {loading ? (
        <p className="text-sm text-muted">Loading analytics…</p>
      ) : (
        <div className="space-y-6">
          <StatsGrid columns={3}>
            <StatCard label="Used assets" value={formatNumber(health?.used ?? 0)} />
            <StatCard label="Not used / old" value={formatNumber(health?.notUsedOld ?? 0)} />
            <StatCard
              label="Annual depreciation"
              value={formatRwf(totals?.depreciation ?? 0)}
            />
          </StatsGrid>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="hr-card p-5 sm:p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-navy">By financial year</h2>
                <p className="text-xs text-muted">Purchase vs net book value</p>
              </div>
              {byYear.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No year analytics yet.</p>
              ) : (
                <ul className="space-y-4">
                  {byYear.map((y, i) => (
                    <li key={y.year}>
                      <div className="mb-1 flex justify-between gap-2 text-sm">
                        <span className="font-medium text-navy">{y.year}</span>
                        <span className="text-right text-muted">
                          {formatNumber(y.count)} assets · NBV {formatRwf(y.nbv)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(4, (y.purchase / maxPurchase) * 100)}%`,
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-muted">
                          Purchase {formatRwf(y.purchase)} · Dep {formatRwf(y.dep)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="hr-card p-5 sm:p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-navy">Top locations</h2>
                <p className="text-xs text-muted">Asset count by location</p>
              </div>
              {locations.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No location data.</p>
              ) : (
                <ul className="space-y-3">
                  {locations.map((loc, i) => (
                    <li key={loc.label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-navy">{loc.label}</span>
                        <span className="text-muted">{loc.value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.max(4, (loc.value / maxLoc) * 100)}%`,
                            opacity: 1 - i * 0.1,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 rounded-xl border border-border bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase text-muted">Health mix</p>
                <div className="mt-3 flex h-3 overflow-hidden rounded-full">
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${((health?.used ?? 0) / healthTotal) * 100}%` }}
                  />
                  <div
                    className="bg-amber-400"
                    style={{ width: `${((health?.notUsedOld ?? 0) / healthTotal) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted">
                  <span>Used {health?.used ?? 0}</span>
                  <span>Not used {health?.notUsedOld ?? 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="hr-card p-5 sm:p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-navy">Assets by category</h2>
                <p className="text-xs text-muted">Register count per category</p>
              </div>
              {categories.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No category data.</p>
              ) : (
                <ul className="space-y-3">
                  {categories.map((row, i) => (
                    <li key={row.label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-navy">{row.label}</span>
                        <span className="text-muted">{row.value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(4, (row.value / maxCat) * 100)}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="hr-card p-5 sm:p-6">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-navy">Value by category</h2>
                <p className="text-xs text-muted">Net book value distribution</p>
              </div>
              {valueByCategory.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No value data.</p>
              ) : (
                <ul className="space-y-3">
                  {valueByCategory.map((row, i) => (
                    <li key={row.label}>
                      <div className="mb-1 flex justify-between gap-2 text-sm">
                        <span className="font-medium text-navy">{row.label}</span>
                        <span className="shrink-0 tabular-nums text-muted">{formatRwf(row.value)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-navy"
                          style={{
                            width: `${Math.max(4, (row.value / maxCatValue) * 100)}%`,
                            opacity: 1 - i * 0.08,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </AssetsPageLayout>
  );
}
