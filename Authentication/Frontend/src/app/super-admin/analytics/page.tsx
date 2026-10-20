'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { type PlatformDashboardData } from '@/components/platform/platform-dashboard-view';
import {
  PlatformAreaChart,
  PlatformBarChart,
  PlatformDonutChart,
  PlatformLineChart,
} from '@/components/platform/platform-charts';
import { StatCard } from '@/components/super-admin/stat-card';

export default function SuperAdminAnalyticsPage() {
  const [data, setData] = useState<PlatformDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/super-admin/dashboard')
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats;
  const analytics = data?.analytics;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-navy to-navy-light px-6 py-7 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/15" />
        <h1 className="relative font-montserrat text-2xl font-bold">Platform Analytics</h1>
        <p className="relative mt-1 text-sm text-white/70">
          Real-time metrics — hover charts for detailed values
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/80" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Organizations" value={stats.organizations} change={`${stats.activeOrganizations} active`} trend="up" />
          <StatCard label="Users" value={stats.users} trend="neutral" />
          <StatCard label="Pending registrations" value={stats.pendingRegistrations ?? 0} trend="neutral" />
          <StatCard label="Module adoption" value={`${analytics?.moduleAdoption ?? 0}%`} trend="up" />
        </div>
      ) : null}

      {analytics && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-navy">Organization Growth</h3>
            <p className="mt-0.5 text-xs text-muted">New organizations per month</p>
            <div className="mt-4">
              <PlatformLineChart
                labels={analytics.labels}
                values={analytics.organizationTrend}
                height={180}
                name="Organizations"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-navy">User Registrations</h3>
            <p className="mt-0.5 text-xs text-muted">New users per month</p>
            <div className="mt-4">
              <PlatformAreaChart
                labels={analytics.labels}
                values={analytics.userTrend}
                height={180}
                name="Users"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-navy">Platform Activity</h3>
            <p className="mt-0.5 text-xs text-muted">Audit events per month</p>
            <div className="mt-4">
              <PlatformBarChart
                labels={analytics.labels}
                values={analytics.activityTrend}
                height={180}
                name="Events"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-navy">Module Adoption</h3>
            <p className="mt-0.5 text-xs text-muted">
              {analytics.orgsUsingModules ?? 0} organizations using modules
            </p>
            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {data?.subscriptionUsage && data.subscriptionUsage.length > 0 ? (
                <>
                  <PlatformDonutChart segments={data.subscriptionUsage} size={170} />
                  <ul className="space-y-2 text-sm">
                    {data.subscriptionUsage.map((s) => (
                      <li key={s.label} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-muted">{s.label}</span>
                        <span className="font-semibold text-navy">{s.value}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-muted">No adoption data yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
