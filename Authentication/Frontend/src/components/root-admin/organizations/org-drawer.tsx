'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  formatNumber,
  timeAgo,
  type OrgDetails,
  type OrgStatus,
} from '@/lib/organizations';
import { StatusBadge } from './status-badge';
import { BarChart } from './charts';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';

interface OrgDrawerProps {
  orgId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function OrgDrawer({ orgId, onClose, onChanged }: OrgDrawerProps) {
  const platform = usePlatformAdmin();
  const [details, setDetails] = useState<OrgDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!orgId) {
      setDetails(null);
      return;
    }
    setLoading(true);
    api
      .get(`${platform.apiPrefix}/organizations/${orgId}`)
      .then((res) => setDetails(res.data.data))
      .catch(() => setDetails(null))
      .finally(() => setLoading(false));
  }, [orgId, platform.apiPrefix]);

  async function changeStatus(status: OrgStatus) {
    if (!orgId) return;
    setBusy(true);
    try {
      await api.patch(`${platform.apiPrefix}/organizations/${orgId}`, { status });
      const res = await api.get(`${platform.apiPrefix}/organizations/${orgId}`);
      setDetails(res.data.data);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const open = Boolean(orgId);

  const activityCounts = details
    ? (() => {
        const counts = [0, 0, 0, 0, 0, 0];
        for (const log of details.recentActivity) {
          const daysAgo = Math.min(5, Math.floor((Date.now() - new Date(log.createdAt).getTime()) / (86400000)));
          counts[5 - daysAgo] += 1;
        }
        return counts;
      })()
    : [];

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300 sm:max-w-lg ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {loading || !details ? (
          <div className="flex h-full items-center justify-center text-muted">
            {loading ? 'Loading organization…' : 'No organization selected'}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-navy to-navy-light px-6 py-6">
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-poppins-bold text-navy">
                  {details.name[0]?.toUpperCase()}
                </span>
                <div>
                  <h2 className="font-montserrat text-lg font-bold text-white">{details.name}</h2>
                  <p className="text-xs uppercase tracking-wider text-white/50">{details.slug}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusBadge status={details.status} />
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-poppins-medium text-white/80">
                  {details.subscriptionTier ?? 'No plan'}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-poppins-medium text-white/80">
                  {details.type}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                {details && [
                  { label: 'Total Users', value: formatNumber(details.metrics.totalUsers) },
                  { label: 'Active', value: formatNumber(details.metrics.activeUsers) },
                  { label: 'Admins', value: formatNumber(details.metrics.admins) },
                  { label: 'Suspended', value: formatNumber(details.metrics.suspendedUsers) },
                  { label: 'Roles', value: formatNumber(details.metrics.roles) },
                  { label: 'Plan', value: details.subscriptionTier ?? '—' },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-xl border border-border bg-white p-3 text-center">
                    <p className="font-montserrat text-lg font-bold text-navy">{kpi.value}</p>
                    <p className="text-[11px] text-muted">{kpi.label}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="rounded-xl border border-border bg-white p-4">
                <p className="mb-2 font-poppins-semibold text-sm text-navy">Activity (last 6 days)</p>
                <div className="h-28">
                  <BarChart values={activityCounts.length ? activityCounts : [0, 0, 0, 0, 0, 0]} />
                </div>
              </div>

              {/* Recent activity */}
              <div className="rounded-xl border border-border bg-white p-4">
                <p className="mb-3 font-poppins-semibold text-sm text-navy">Recent Activity</p>
                {details.recentActivity.length === 0 ? (
                  <p className="text-xs text-muted">No recent activity recorded.</p>
                ) : (
                  <ul className="space-y-3">
                    {details.recentActivity.slice(0, 6).map((log) => (
                      <li key={log.id} className="flex gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-poppins-medium text-navy">
                            {log.action.replace(/_/g, ' ')}
                          </p>
                          <p className="text-[11px] text-muted">
                            {log.user ? `${log.user.firstName} ${log.user.lastName} · ` : ''}
                            {timeAgo(log.createdAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t border-border bg-white px-6 py-4">
              <Link
                href={platform.orgDetailPath(details.id)}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-poppins-semibold text-primary transition hover:bg-navy-light"
              >
                Open Full Management
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => changeStatus(details.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED')}
                  className="rounded-lg border border-amber-500/30 py-2 text-xs font-poppins-semibold text-amber-600 transition hover:bg-amber-500/10 disabled:opacity-50"
                >
                  {details.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => changeStatus('ARCHIVED')}
                  className="rounded-lg border border-border py-2 text-xs font-poppins-semibold text-muted transition hover:bg-navy/5 disabled:opacity-50"
                >
                  Archive
                </button>
                <Link
                  href={`${platform.orgDetailPath(details.id)}?tab=settings`}
                  className="flex items-center justify-center rounded-lg border border-border py-2 text-xs font-poppins-semibold text-navy transition hover:bg-navy/5"
                >
                  Manage
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
