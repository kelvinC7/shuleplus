'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getStoredUser, type AuthUser } from '@/lib/auth';
import { StatCard } from '@/components/super-admin/stat-card';
import {
  PlatformAreaChart,
  PlatformBarChart,
  PlatformDonutChart,
  PlatformLineChart,
} from '@/components/platform/platform-charts';
import { timeAgo } from '@/lib/organizations';

export interface PlatformDashboardData {
  stats: {
    organizations: number;
    users: number;
    activeOrganizations: number;
    auditLogs: number;
    totalAuditLogs?: number;
    pendingRegistrations?: number;
    platformAdmins?: number;
    activeModules?: number;
  };
  analytics?: {
    labels: string[];
    organizationTrend: number[];
    userTrend: number[];
    activityTrend: number[];
    moduleAdoption?: number;
    orgsUsingModules?: number;
  };
  subscriptionUsage?: { label: string; value: number; color: string }[];
  recentActivity?: {
    id: string;
    action: string;
    createdAt: string;
    user?: { firstName: string; lastName: string; email: string } | null;
    organization?: { name: string } | null;
  }[];
  systemHealth?: {
    database: string;
    activeSessions: number;
    loginsLast24h: number;
    uptime: number;
  };
}

interface Props {
  apiPrefix: '/root-admin' | '/super-admin';
  roleLabel: string;
  quickActions: { label: string; href: string; primary?: boolean }[];
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function PlatformDashboardView({ apiPrefix, roleLabel, quickActions }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [greeting, setGreeting] = useState('Hello');
  const [data, setData] = useState<PlatformDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    setGreeting(getGreeting());
    api
      .get(`${apiPrefix}/dashboard`)
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [apiPrefix]);

  const stats = data?.stats;
  const analytics = data?.analytics;
  const health = data?.systemHealth;
  const healthLabel = health?.database === 'healthy' ? 'Healthy' : 'Degraded';
  const healthTrend = health?.database === 'healthy' ? 'up' : 'down';

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">{roleLabel}</p>
            <h1 className="mt-1 font-montserrat text-xl font-bold text-navy sm:text-2xl">
              {greeting}, {user?.firstName ?? 'Admin'}
            </h1>
           
            <p className="mt-0.5 text-xs text-muted/80" suppressHydrationWarning>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={
                  action.primary
                    ? 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-navy shadow-sm transition hover:brightness-105 sm:px-4 sm:py-2.5'
                    : 'inline-flex items-center justify-center rounded-lg border border-border bg-white/80 px-3 py-2 text-sm font-semibold text-navy backdrop-blur-sm transition hover:bg-white sm:px-4 sm:py-2.5'
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/80" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Organizations"
            value={stats.organizations}
            change={`${stats.activeOrganizations} active`}
            trend="up"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 21h18M5 21V7l7-4 7 4v14" />
              </svg>
            }
          />
          <StatCard
            label="Platform Users"
            value={stats.users}
            change={`${stats.platformAdmins ?? 0} platform admins`}
            trend="neutral"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            }
          />
          <StatCard
            label="Today's Activity"
            value={stats.auditLogs}
            change={`${stats.totalAuditLogs ?? 0} total audit entries`}
            trend="neutral"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <StatCard
            label="System Status"
            value={healthLabel}
            change={health ? `${health.activeSessions} sessions · ${formatUptime(health.uptime)} uptime` : 'Checking…'}
            trend={healthTrend as 'up' | 'down'}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          />
        </div>
      ) : null}

      {analytics && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-navy">Organization Growth</h2>
            <p className="mt-0.5 text-xs text-muted">New organizations per month</p>
            <div className="mt-4">
              <PlatformLineChart
                labels={analytics.labels}
                values={analytics.organizationTrend}
                height={150}
                name="Organizations"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-navy">User Registrations</h2>
            <p className="mt-0.5 text-xs text-muted">New users per month</p>
            <div className="mt-4">
              <PlatformAreaChart
                labels={analytics.labels}
                values={analytics.userTrend}
                height={150}
                name="Users"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-navy">Platform Activity</h2>
            <p className="mt-0.5 text-xs text-muted">Audit events per month</p>
            <div className="mt-4">
              <PlatformBarChart
                labels={analytics.labels}
                values={analytics.activityTrend}
                height={150}
                name="Events"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-navy">Module Adoption</h2>
            <p className="mt-0.5 text-xs text-muted">
              {analytics.orgsUsingModules ?? 0} of {stats?.organizations ?? 0} organizations using modules
            </p>
            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {data?.subscriptionUsage && data.subscriptionUsage.length > 0 ? (
                <>
                  <PlatformDonutChart segments={data.subscriptionUsage} size={160} />
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

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-navy">Recent Activity</h2>
          <div className="mt-4 divide-y divide-border/60">
            {!data?.recentActivity?.length && (
              <p className="py-8 text-center text-sm text-muted">No recent platform activity</p>
            )}
            {data?.recentActivity?.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">{log.action.replace(/_/g, ' ')}</p>
                  <p className="truncate text-xs text-muted">
                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                    {log.organization ? ` · ${log.organization.name}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted">{timeAgo(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-navy">Platform Snapshot</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex justify-between">
                <span className="text-muted">Active modules</span>
                <span className="font-semibold text-navy">{stats?.activeModules ?? 0}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted">Pending registrations</span>
                <span className="font-semibold text-amber-700">{stats?.pendingRegistrations ?? 0}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted">Logins (24h)</span>
                <span className="font-semibold text-navy">{health?.loginsLast24h ?? 0}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted">Database</span>
                <span className={`font-semibold ${health?.database === 'healthy' ? 'text-emerald-600' : 'text-danger'}`}>
                  {health?.database ?? '—'}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
