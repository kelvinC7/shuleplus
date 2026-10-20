'use client';

import { useEffect, useState } from 'react';
import { HrChartCard } from '@/components/charts/hr-chart-card';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { DonutChart, GroupedBarChart, NAVY, PRIMARY, TEAL, LAVENDER } from '@/components/charts/hr-charts';
import { fetchAnalytics } from '@/services/babyeyi-api';

export function AnalyticsView() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAnalytics>> | null>(null);

  useEffect(() => {
    void fetchAnalytics().then(setData);
  }, []);

  const statusSegments = (data?.statusCounts ?? []).map((s: { status: string; _count: { id: number } }, i: number) => ({
    label: s.status,
    value: s._count.id,
    color: [NAVY, PRIMARY, TEAL, LAVENDER, '#ef4444', '#94a3b8'][i % 6],
  }));

  const heatMap = data?.heatMap ?? [];

  return (
    <div className="space-y-6">
      <StatsGrid>
        <StatCard label="Total Downloads" value={data?.totals.downloads ?? 0} />
        <StatCard label="Parent Views" value={data?.totals.views ?? 0} />
        <StatCard label="QR Usage" value={data?.totals.qrScans ?? 0} />
        <StatCard label="Most Shared" value={data?.totals.shares ?? 0} />
      </StatsGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <HrChartCard title="Status Distribution" subtitle="All circulars">
          <DonutChart segments={statusSegments} centerLabel="All" />
        </HrChartCard>
        <HrChartCard title="Monthly Statistics" subtitle="Created vs scans">
          <GroupedBarChart groups={(data?.monthlyStats ?? []).slice(0, 6).map((m: { month: string; created: number; scans: number }) => ({ label: m.month, budget: m.created, actual: m.scans }))} />
        </HrChartCard>
      </div>

      <HrChartCard title="Heat Map — Circular Creation by Month" subtitle="Which months create most circulars">
        <div className="space-y-3">
          {heatMap.slice(0, 6).map((m: { month: string; created: number }) => (
            <div key={m.month} className="flex items-center gap-3">
              <span className="w-20 text-sm font-medium text-navy">{m.month}</span>
              <div className="flex-1 h-6 overflow-hidden rounded-full bg-navy/5">
                <div className="h-full rounded-full bg-gradient-to-r from-navy to-primary" style={{ width: `${Math.min(100, m.created * 15)}%` }} />
              </div>
              <span className="text-sm font-semibold text-muted">{m.created}</span>
            </div>
          ))}
        </div>
      </HrChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="hr-card p-5">
          <h3 className="font-bold text-navy">Most Downloaded</h3>
          <ul className="mt-3 space-y-2">
            {(data?.topDownloaded ?? []).map((c: { id: string; className: string; downloadCount: number }) => (
              <li key={c.id} className="flex justify-between text-sm"><span>{c.className}</span><span className="font-semibold">{c.downloadCount}</span></li>
            ))}
          </ul>
        </div>
        <div className="hr-card p-5">
          <h3 className="font-bold text-navy">Most Shared</h3>
          <ul className="mt-3 space-y-2">
            {(data?.topShared ?? []).map((c: { id: string; className: string; shareCount: number }) => (
              <li key={c.id} className="flex justify-between text-sm"><span>{c.className}</span><span className="font-semibold">{c.shareCount}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
