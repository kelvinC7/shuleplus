'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  formatNumber,
  timeAgo,
  type OrgDetails,
  type OrgStatus,
} from '@/lib/organizations';
import { StatusBadge } from '@/components/root-admin/organizations/status-badge';
import { BarChart, DonutChart } from '@/components/root-admin/organizations/charts';
import { BackButton } from '@/components/root-admin/back-button';
import { PasswordInput } from '@/components/ui/password-input';
import { ActionMenu } from '@/components/ui/action-menu';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import Link from 'next/link';

const TABS = [
  'Overview',
  'Students',
  'Staff',
  'Academics',
  'Finance',
  'Subscription',
  'Audit Logs',
  'Settings',
] as const;

type Tab = (typeof TABS)[number];

export default function OrgManagementPage() {
  const params = useParams();
  const router = useRouter();
  const platform = usePlatformAdmin();
  const orgId = params.id as string;

  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('Overview');
  const [busy, setBusy] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'settings') setTab('Settings');
  }, []);

  function load() {
    setLoading(true);
    api
      .get(`${platform.apiPrefix}/organizations/${orgId}`)
      .then((res) => setOrg(res.data.data))
      .catch(() => setOrg(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (orgId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, platform.apiPrefix]);

  useEffect(() => {
    if (!org) return;
    setAdminEmail(org.adminUser?.email ?? org.email ?? '');
    setAdminFirstName(org.adminUser?.firstName ?? '');
    setAdminLastName(org.adminUser?.lastName ?? '');
  }, [org]);

  const activityTrend = useMemo(() => {
    if (!org) return [0, 0, 0, 0, 0, 0];
    const counts = [0, 0, 0, 0, 0, 0];
    for (const log of org.recentActivity) {
      const daysAgo = Math.min(5, Math.floor((Date.now() - new Date(log.createdAt).getTime()) / 86400000));
      counts[5 - daysAgo] += 1;
    }
    return counts;
  }, [org]);

  const userStatusSegments = useMemo(() => {
    if (!org) return [];
    const active = org.metrics.activeUsers;
    const suspended = org.metrics.suspendedUsers;
    const total = active + suspended || 1;
    return [
      { label: 'Active', value: Math.round((active / total) * 100), color: '#FCB038' },
      { label: 'Suspended', value: Math.round((suspended / total) * 100), color: '#000435' },
    ];
  }, [org]);

  async function changeStatus(status: OrgStatus) {
    setBusy(true);
    setMessage('');
    setMessageIsError(false);
    try {
      await api.patch(`${platform.apiPrefix}/organizations/${orgId}`, { status });
      load();
      setMessage(`Organization ${status.toLowerCase()}.`);
    } finally {
      setBusy(false);
    }
  }

  async function transferOwnership() {
    if (!transferEmail) return;
    setBusy(true);
    setMessage('');
    try {
      await api.post(`${platform.apiPrefix}/organizations/${orgId}/transfer`, {
        newOwnerEmail: transferEmail,
      });
      setTransferEmail('');
      load();
      setMessage('Ownership transferred.');
    } catch {
      setMessage('Failed to transfer ownership.');
    } finally {
      setBusy(false);
    }
  }

  async function saveAdminCredentials() {
    if (!adminEmail.trim()) return;
    if (adminPassword.trim() && adminPassword.trim().length < 12) {
      setMessageIsError(true);
      setMessage('Password must be at least 12 characters, or leave blank to auto-generate.');
      return;
    }
    setBusy(true);
    setMessage('');
    setMessageIsError(false);
    try {
      const res = await api.put(`${platform.apiPrefix}/organizations/${orgId}/admin-credentials`, {
        email: adminEmail.trim(),
        ...(adminPassword.trim() ? { password: adminPassword.trim() } : {}),
        ...(adminFirstName.trim() ? { firstName: adminFirstName.trim() } : {}),
        ...(adminLastName.trim() ? { lastName: adminLastName.trim() } : {}),
        requirePasswordChange,
        sendCredentials: true,
      });
      setAdminPassword('');
      load();
      setMessageIsError(false);
      setMessage(res.data.data?.message ?? 'Administrator credentials updated.');
    } catch (err: unknown) {
      setMessageIsError(true);
      const data = (err as { response?: { data?: { message?: string; errors?: { message: string }[] } } })
        ?.response?.data;
      setMessage(data?.errors?.[0]?.message ?? data?.message ?? 'Failed to update administrator credentials.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteOrg() {
    if (!confirm('Permanently delete this organization and all its users? This cannot be undone.')) {
      return;
    }
    setBusy(true);
    try {
      await api.delete(`${platform.apiPrefix}/organizations/${orgId}`);
      router.push(platform.organizationsPath);
    } catch {
      setMessage('Failed to delete organization.');
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="h-40 animate-pulse rounded-3xl bg-white/60" />
        <div className="h-12 animate-pulse rounded-xl bg-white/60" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/60" />
          ))}
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <BackButton href={platform.organizationsPath} label="Back to Organizations" />
        <p className="font-poppins-semibold text-navy">Organization not found.</p>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Users', value: org.metrics.totalUsers, icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0 .01' },
    { label: 'Active Users', value: org.metrics.activeUsers, icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3' },
    { label: 'Admins', value: org.metrics.admins, icon: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M8.5 11a4 4 0 1 0 0 .01' },
    { label: 'Suspended', value: org.metrics.suspendedUsers, icon: 'M18 6L6 18M6 6l12 12' },
    { label: 'Roles', value: org.metrics.roles, icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <BackButton href={platform.organizationsPath} label="Back to Organizations" />

      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${
            messageIsError ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
          }`}
        >
          {message}
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy to-navy-light p-6 shadow-lg sm:p-8">
        <span aria-hidden className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/15" />
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-poppins-bold text-navy">
              {org.name[0]?.toUpperCase()}
            </span>
            <div className="space-y-1.5">
              <h1 className="font-montserrat text-xl font-bold text-white sm:text-2xl">{org.name}</h1>
              <p className="text-xs uppercase tracking-widest text-white/50">{org.slug}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge status={org.status} />
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-poppins-medium text-white/80">
                  {org.subscriptionTier ?? 'No plan'}
                </span>
                <span className="text-[11px] text-white/50">Last activity {timeAgo(org.updatedAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={platform.orgModulesPath(org.id)}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-poppins-semibold text-navy transition hover:bg-primary-hover"
            >
              Modules
            </Link>
            <button
              type="button"
              onClick={() => router.push(`${platform.organizationsPath}/${org.id}/edit`)}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-poppins-semibold text-white transition hover:bg-white/20"
            >
              Edit Organization
            </button>
            <ActionMenu
              label="Org actions"
              triggerClassName="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/40"
              items={[
                {
                  label: 'Open modules',
                  onClick: () => router.push(platform.orgModulesPath(org.id)),
                },
                {
                  label: org.status === 'ACTIVE' ? 'Suspend' : 'Activate',
                  disabled: busy,
                  onClick: () =>
                    void changeStatus(org.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'),
                },
                {
                  label: 'Block',
                  disabled: busy || org.status === 'DISABLED',
                  onClick: () => void changeStatus('DISABLED'),
                },
                {
                  label: 'Archive',
                  disabled: busy || org.status === 'ARCHIVED',
                  onClick: () => void changeStatus('ARCHIVED'),
                },
                {
                  label: 'Settings',
                  separatorBefore: true,
                  onClick: () => setTab('Settings'),
                },
                {
                  label: 'Delete',
                  destructive: true,
                  separatorBefore: true,
                  disabled: busy,
                  onClick: () => void deleteOrg(),
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="sticky top-[60px] z-20 mt-5 -mx-4 overflow-x-auto border-b border-border bg-white/80 px-4 backdrop-blur sm:top-[68px]">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative whitespace-nowrap px-4 py-3 text-sm font-poppins-medium transition ${
                tab === t ? 'text-navy' : 'text-muted hover:text-navy'
              }`}
            >
              {t}
              {tab === t && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="py-6">
        {tab === 'Overview' && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
              {kpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="group rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy/[0.04] text-navy transition-colors group-hover:bg-navy group-hover:text-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d={kpi.icon} />
                    </svg>
                  </span>
                  <p className="mt-3 font-montserrat text-xl font-bold text-navy">{formatNumber(kpi.value)}</p>
                  <p className="text-xs text-muted">{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Analytics */}
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Recent Activity">
                <BarChart values={activityTrend} />
              </ChartCard>
              <ChartCard title="User Status">
                <div className="flex h-full items-center">
                  <DonutChart segments={userStatusSegments} />
                </div>
              </ChartCard>
            </div>

            <Timeline org={org} />
            <QuickAccess orgId={org.id} />
          </div>
        )}

        {tab === 'Students' && (
          <CrossServiceTab
            title="Students"
            note="Student records are managed by the ShulePlus Academic microservice. Connect the Academic module to view live enrollment data."
            stats={[
              { label: 'IAM Users', value: formatNumber(org.metrics.totalUsers) },
              { label: 'Organization Status', value: org.status },
              { label: 'Subscription', value: org.subscriptionTier ?? '—' },
            ]}
          >
            <ChartCard title="Platform Activity">
              <BarChart values={activityTrend} />
            </ChartCard>
          </CrossServiceTab>
        )}

        {tab === 'Staff' && (
          <CrossServiceTab
            title="Staff"
            note="Staff & HR records are managed by the ShulePlus HR microservice."
            stats={[
              { label: 'Platform Users', value: formatNumber(org.metrics.totalUsers) },
              { label: 'Admins', value: formatNumber(org.metrics.admins) },
              { label: 'Active Users', value: formatNumber(org.metrics.activeUsers) },
            ]}
          >
            <ChartCard title="User Status">
              <BarChart values={[org.metrics.activeUsers, org.metrics.suspendedUsers, org.metrics.admins]} />
            </ChartCard>
          </CrossServiceTab>
        )}

        {tab === 'Academics' && (
          <CrossServiceTab
            title="Academics"
            note="Academic data is managed by the ShulePlus Academic microservice. Assign the Academic module to enable live class and enrollment data."
            stats={[
              { label: 'Organization', value: org.name },
              { label: 'Type', value: org.type },
              { label: 'Status', value: org.status },
            ]}
          >
            <ChartCard title="Platform Activity">
              <BarChart values={activityTrend} />
            </ChartCard>
          </CrossServiceTab>
        )}

        {tab === 'Finance' && (
          <CrossServiceTab
            title="Finance"
            note="Billing & finance is managed by the ShulePlus Finance microservice."
            stats={[
              { label: 'Subscription Plan', value: org.subscriptionTier ?? '—' },
              { label: 'Organization Type', value: org.type },
              { label: 'IAM Users', value: formatNumber(org.metrics.totalUsers) },
            ]}
          >
            <ChartCard title="User Status">
              <div className="flex h-full items-center">
                <DonutChart segments={userStatusSegments} />
              </div>
            </ChartCard>
          </CrossServiceTab>
        )}

        {tab === 'Subscription' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-white p-6">
              <p className="text-xs uppercase tracking-wide text-muted">Current Plan</p>
              <p className="mt-1 font-montserrat text-2xl font-bold text-navy">
                {org.subscriptionTier ?? 'No plan'}
              </p>
              <p className="mt-1 text-sm text-muted">
                Manage plans, renewals, and lifecycle from Subscriptions.
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  href={platform.orgSubscriptionPath(org.id)}
                  className="rounded-xl bg-navy px-4 py-2 text-sm font-poppins-semibold text-primary"
                >
                  Manage subscription
                </Link>
                <Link
                  href={platform.subscriptionsPath}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-poppins-medium text-navy"
                >
                  All plans
                </Link>
              </div>
            </div>
            <ChartCard title="User Account Status">
              <div className="flex h-full items-center">
                <DonutChart segments={userStatusSegments} />
              </div>
            </ChartCard>
          </div>
        )}

        {tab === 'Audit Logs' && (
          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="mb-4 font-poppins-semibold text-navy">Recent Activity</p>
            {org.recentActivity.length === 0 ? (
              <p className="text-sm text-muted">No activity recorded for this organization.</p>
            ) : (
              <ul className="space-y-1">
                {org.recentActivity.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span className="font-poppins-medium text-navy">{log.action.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-navy">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                      </p>
                      <p className="text-[11px] text-muted">{timeAgo(log.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'Settings' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-white p-6">
              <p className="font-poppins-semibold text-navy">Full Organization Profile</p>
              <p className="mb-4 text-sm text-muted">
                Edit organization type, location, branding (logo, signature, stamp), leadership, school details and more — same steps as registration.
              </p>
              <button
                type="button"
                onClick={() => router.push(`${platform.organizationsPath}/${org.id}/edit`)}
                className="rounded-xl bg-navy px-5 py-2.5 text-sm font-poppins-semibold text-primary transition hover:bg-navy-light"
              >
                Open Edit Wizard
              </button>
            </div>

            {/* Status control */}
            <div className="rounded-2xl border border-border bg-white p-6">
              <p className="font-poppins-semibold text-navy">Organization Status</p>
              <p className="mb-4 text-sm text-muted">Control access and lifecycle state.</p>
              <div className="flex flex-wrap gap-2">
                {(['ACTIVE', 'SUSPENDED', 'DISABLED', 'ARCHIVED'] as OrgStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy || org.status === s}
                    onClick={() => changeStatus(s)}
                    className={`rounded-lg border px-4 py-2 text-xs font-poppins-semibold transition disabled:opacity-40 ${
                      org.status === s
                        ? 'border-primary bg-primary/10 text-navy'
                        : 'border-border text-navy hover:border-primary'
                    }`}
                  >
                    {s === 'DISABLED' ? 'BLOCKED' : s}
                  </button>
                ))}
              </div>
            </div>

            {/* Organization administrator */}
            <div className="rounded-2xl border border-border bg-white p-6">
              <p className="font-poppins-semibold text-navy">Organization Administrator</p>
              <p className="mb-4 text-sm text-muted">
                Update login email and password. Credentials are sent to the administrator&apos;s email.
                {org.adminUser?.lastLoginAt && (
                  <> Last login: {timeAgo(org.adminUser.lastLoginAt)}.</>
                )}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-xs font-poppins-semibold uppercase text-muted">Email</span>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@school.com"
                    className="input w-full"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-poppins-semibold uppercase text-muted">First name</span>
                  <input
                    value={adminFirstName}
                    onChange={(e) => setAdminFirstName(e.target.value)}
                    placeholder="Admin"
                    className="input w-full"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-poppins-semibold uppercase text-muted">Last name</span>
                  <input
                    value={adminLastName}
                    onChange={(e) => setAdminLastName(e.target.value)}
                    placeholder="User"
                    className="input w-full"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-xs font-poppins-semibold uppercase text-muted">
                    Password
                  </span>
                  <PasswordInput
                    value={adminPassword}
                    onChange={setAdminPassword}
                    placeholder="Leave blank to auto-generate a secure password"
                  />
                </label>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={requirePasswordChange}
                  onChange={(e) => setRequirePasswordChange(e.target.checked)}
                  className="rounded border-border"
                />
                Require password change on first login
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !adminEmail.trim()}
                  onClick={saveAdminCredentials}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-poppins-semibold text-navy transition hover:bg-primary-hover disabled:opacity-50"
                >
                  Save &amp; Send Credentials
                </button>
              </div>
            </div>

            {/* Transfer ownership */}
            <div className="rounded-2xl border border-border bg-white p-6">
              <p className="font-poppins-semibold text-navy">Transfer Ownership</p>
              <p className="mb-4 text-sm text-muted">
                Quick email-only transfer. For a full credential reset, use Organization Administrator above.
                Current owner email: {org.email ?? '—'}
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="email"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  placeholder="new.owner@email.com"
                  suppressHydrationWarning
                  className="input max-w-xs flex-1"
                />
                <button
                  type="button"
                  disabled={busy || !transferEmail}
                  onClick={transferOwnership}
                  className="rounded-xl bg-navy px-5 py-2.5 text-sm font-poppins-semibold text-primary transition hover:bg-navy-light disabled:opacity-50"
                >
                  Transfer
                </button>
              </div>
            </div>

            {/* Danger zone */}
            <div className="rounded-2xl border border-danger/30 bg-danger/[0.03] p-6">
              <p className="font-poppins-semibold text-danger">Danger Zone</p>
              <p className="mb-4 text-sm text-muted">
                Deleting an organization permanently removes it and all of its users. This cannot be undone.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={deleteOrg}
                className="rounded-xl bg-danger px-5 py-2.5 text-sm font-poppins-semibold text-white transition hover:bg-danger/90 disabled:opacity-50"
              >
                Delete Organization
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <p className="mb-3 font-poppins-semibold text-sm text-navy">{title}</p>
      <div className="h-36">{children}</div>
    </div>
  );
}

function CrossServiceTab({
  title,
  note,
  stats,
  children,
}: {
  title: string;
  note: string;
  stats: { label: string; value: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3 text-xs text-navy/70">
        <span className="font-poppins-semibold text-navy">{title}: </span>
        {note}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-white p-4 text-center">
            <p className="font-montserrat text-xl font-bold text-navy">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

function Timeline({ org }: { org: OrgDetails }) {
  if (org.recentActivity.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <p className="mb-4 font-poppins-semibold text-navy">Recent Activity Timeline</p>
      <ol className="relative space-y-4 border-l border-border pl-5">
        {org.recentActivity.slice(0, 8).map((log) => (
          <li key={log.id} className="relative">
            <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary" />
            <p className="text-sm font-poppins-medium text-navy">{log.action.replace(/_/g, ' ')}</p>
            <p className="text-xs text-muted">
              {log.user ? `${log.user.firstName} ${log.user.lastName} · ` : ''}
              {timeAgo(log.createdAt)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function QuickAccess({ orgId }: { orgId: string }) {
  const platform = usePlatformAdmin();
  const items = [
    { label: 'Modules', href: platform.orgModulesPath(orgId) },
    { label: 'Subscription', href: platform.orgSubscriptionPath(orgId) },
    { label: 'Students', href: undefined as string | undefined },
    { label: 'Staff', href: undefined as string | undefined },
  ];
  return (
    <div>
      <p className="mb-3 font-poppins-semibold text-navy">Quick Access</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className="group rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <p className="font-poppins-semibold text-navy">{item.label}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-poppins-semibold text-primary">
                Manage
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          ) : (
            <div
              key={item.label}
              className="group cursor-pointer rounded-2xl border border-navy/[0.06] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <p className="font-poppins-semibold text-navy">{item.label}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-poppins-semibold text-primary">
                Manage
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
