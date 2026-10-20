'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { type PlatformDashboardData } from '@/components/platform/platform-dashboard-view';
import { AreaChart, BarChart, DonutChart, LineChart } from '@/components/root-admin/organizations/charts';
import { StatCard } from '@/components/super-admin/stat-card';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';

export default function AnalyticsPage() {
  const platform = usePlatformAdmin();
  const [data, setData] = useState<PlatformDashboardData | null>(null);

  useEffect(() => {
    api.get(`${platform.apiPrefix}/dashboard`).then((res) => setData(res.data.data));
  }, [platform.apiPrefix]);

  const stats = data?.stats;
  const analytics = data?.analytics;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="font-montserrat text-2xl font-bold text-navy">Platform Analytics</h1>
        <p className="mt-1 text-sm text-muted">Live metrics from IAM database — no mock data</p>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Organizations" value={stats.organizations} change={`${stats.activeOrganizations} active`} trend="up" />
          <StatCard label="Users" value={stats.users} trend="neutral" />
          <StatCard label="Audit (today)" value={stats.auditLogs} change={`${stats.totalAuditLogs ?? 0} all time`} trend="neutral" />
          <StatCard label="Module adoption" value={`${analytics?.moduleAdoption ?? 0}%`} change={`${analytics?.orgsUsingModules ?? 0} orgs`} trend="up" />
        </div>
      )}

      {analytics && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-navy">Organization Growth</h3>
            <div className="mt-4 h-40">
              <LineChart values={analytics.organizationTrend} height={160} />
            </div>
          </div>
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-navy">User Registrations</h3>
            <div className="mt-4 h-40">
              <AreaChart values={analytics.userTrend} height={160} />
            </div>
          </div>
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-navy">Platform Activity</h3>
            <div className="mt-4 h-40">
              <BarChart values={analytics.activityTrend} height={160} />
            </div>
          </div>
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-navy">Module Adoption</h3>
            <div className="mt-6 flex justify-center">
              {data?.subscriptionUsage && <DonutChart segments={data.subscriptionUsage} size={150} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
