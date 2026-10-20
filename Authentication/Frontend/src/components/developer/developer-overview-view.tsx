'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  fetchApiCatalog,
  fetchDeveloperDashboard,
  fetchSandboxOverview,
  type ApiModule,
} from '@/lib/developer-api';
import { developerAccessLabel } from '@/lib/developer-auth';
import { useDeveloperPortal } from '@/components/developer/developer-shell';
import { EmptyState, PageHeader, StatCard } from '@/components/developer/developer-page-ui';

function countGrantedPermissions(modules: Record<string, Record<string, boolean>>) {
  let count = 0;
  for (const perms of Object.values(modules)) {
    for (const enabled of Object.values(perms)) {
      if (enabled) count++;
    }
  }
  return count;
}

export function DeveloperOverviewView() {
  const { user, environment } = useDeveloperPortal();
  const [chartDays, setChartDays] = useState(7);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchDeveloperDashboard>>['stats'] | null>(null);
  const [chart, setChart] = useState<Awaited<ReturnType<typeof fetchDeveloperDashboard>>['chart']>([]);
  const [catalog, setCatalog] = useState<ApiModule[]>([]);
  const [sandboxOrg, setSandboxOrg] = useState<string | null>(null);
  const [productionStatus, setProductionStatus] = useState<string>('NONE');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchDeveloperDashboard(chartDays),
      fetchApiCatalog(),
      fetchSandboxOverview(),
    ])
      .then(([dashboard, catalogData, sandbox]) => {
        setStats(dashboard.stats);
        setChart(dashboard.chart);
        setCatalog(catalogData.modules);
        setSandboxOrg(sandbox.sandbox.organization?.name ?? null);
        setProductionStatus(sandbox.production.accessStatus);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chartDays]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const maxRequests = Math.max(...chart.map((c) => c.requests), 1);
  const moduleLabels = useMemo(() => catalog.map((m) => m.name), [catalog]);
  const scopeCount = user ? countGrantedPermissions(user.allowedModules) : 0;

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${user?.firstName ?? 'Developer'}`}
        description={`${user?.partner.name ?? 'Partner'} · ${user ? developerAccessLabel(user.accessType) : 'Developer'} · ${environment} environment`}
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Your assigned access</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted">API modules</p>
              <p className="mt-1 text-2xl font-bold text-navy">{moduleLabels.length}</p>
              <p className="mt-1 text-xs text-muted">{scopeCount} permission scopes granted</p>
            </div>
            <div>
              <p className="text-xs text-muted">Environments</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {user?.allowedEnvironments.map((env) => (
                  <span
                    key={env}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      env === environment ? 'bg-navy text-primary' : 'bg-navy/5 text-navy'
                    }`}
                  >
                    {env}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {moduleLabels.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {moduleLabels.map((label) => (
                <span key={label} className="rounded-lg bg-[#f4f6fb] px-3 py-1.5 text-xs font-medium text-navy">
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No module scopes assigned yet. Contact your platform administrator.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link href="/developers/docs" className="font-semibold text-navy underline-offset-2 hover:underline">
              Open API docs
            </Link>
            <span className="text-muted">·</span>
            <Link href="/developers/sandbox" className="font-semibold text-navy underline-offset-2 hover:underline">
              Go to sandbox
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Sandbox & production</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Sandbox organization</dt>
              <dd className="font-semibold text-navy">{sandboxOrg ?? 'Not provisioned yet'}</dd>
            </div>
            <div>
              <dt className="text-muted">Production access</dt>
              <dd className="font-semibold text-navy">{productionStatus.replace(/_/g, ' ')}</dd>
            </div>
            {user?.lastLoginAt && (
              <div>
                <dt className="text-muted">Last sign-in</dt>
                <dd className="text-navy">{new Date(user.lastLoginAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="API Requests Today"
          value={loading ? '—' : stats?.requestsToday.toLocaleString() ?? '0'}
          subtitle={stats?.lastActivityAt ? `Last activity ${new Date(stats.lastActivityAt).toLocaleString()}` : 'No API activity yet'}
        />
        <StatCard
          title="Successful Requests"
          value={loading ? '—' : stats?.successfulRequests.toLocaleString() ?? '0'}
          subtitle={`${stats?.successRate ?? '100.00'}% success rate today`}
          accent="green"
        />
        <StatCard
          title="Failed Requests"
          value={loading ? '—' : stats?.failedRequests.toLocaleString() ?? '0'}
          subtitle={
            stats && stats.requestsToday > 0
              ? `${((stats.failedRequests / stats.requestsToday) * 100).toFixed(2)}% error rate`
              : 'No errors today'
          }
          accent="red"
        />
        <StatCard title="Active Applications" value={loading ? '—' : stats?.activeApplications ?? 0} />
        <StatCard
          title="Daily API Quota"
          value={loading ? '—' : `${stats?.quotaPercent ?? 0}%`}
          subtitle={`${stats?.quotaUsed.toLocaleString() ?? 0} / ${stats?.quotaLimit.toLocaleString() ?? 0} requests`}
          accent="amber"
        />
        <StatCard
          title="MFA Protection"
          value={user?.mfaEnabled ? 'Enabled' : 'Not enabled'}
          subtitle={user?.mfaEnabled ? 'Account secured with authenticator' : 'Enable MFA in Security'}
          accent={user?.mfaEnabled ? 'green' : 'amber'}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-navy">API requests — last {chartDays} days</h2>
          <select
            value={chartDays}
            onChange={(e) => setChartDays(Number(e.target.value))}
            className="rounded-lg border border-border bg-[#f4f6fb] px-3 py-1.5 text-sm"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>
        {chart.every((d) => d.requests === 0) ? (
          <EmptyState
            title="No API traffic yet"
            description="Use the API Explorer or sandbox scenarios to generate your first requests."
          />
        ) : (
          <div className="flex h-48 items-end gap-2">
            {chart.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-navy to-primary/80 transition-all"
                  style={{
                    height: `${(day.requests / maxRequests) * 100}%`,
                    minHeight: day.requests > 0 ? '8px' : '2px',
                  }}
                  title={`${day.requests} requests · ${day.successRate}% success · ${day.avgResponseMs}ms avg`}
                />
                <span className="text-[10px] text-muted">
                  {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {(stats?.quotaPercent ?? 0) >= 75 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have used {stats?.quotaPercent}% of your daily API quota.
        </div>
      )}
    </div>
  );
}
