'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { BackButton } from '@/components/root-admin/back-button';
import {
  ADMIN_ROLES,
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
  defaultPermissionsForRole,
  formatAdminRole,
  formatLastLogin,
  getInitials,
  statusStyle,
  type AdminRole,
  type PlatformAdminDetails,
} from '@/lib/platform-administrators';

const TABS = ['Profile', 'Permissions', 'Organizations', 'Sessions', 'Security', 'Activity'] as const;
type Tab = (typeof TABS)[number];

export default function AdministratorProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [admin, setAdmin] = useState<PlatformAdminDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('Profile');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'permissions') setTab('Permissions');
    if (t === 'sessions') setTab('Sessions');
    if (t === 'activity') setTab('Activity');
  }, []);

  function load() {
    setLoading(true);
    api
      .get(`/root-admin/platform-administrators/${id}`)
      .then((res) => setAdmin(res.data.data))
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function terminateSession(sessionId: string) {
    setBusy(true);
    try {
      await api.post(`/root-admin/platform-administrators/${id}/sessions/${sessionId}/terminate`);
      load();
      setMessage('Session terminated.');
    } finally {
      setBusy(false);
    }
  }

  async function terminateAll() {
    setBusy(true);
    try {
      await api.post(`/root-admin/platform-administrators/${id}/sessions/terminate-all`);
      load();
      setMessage('All sessions terminated.');
    } finally {
      setBusy(false);
    }
  }

  async function suspend() {
    setBusy(true);
    try {
      await api.post(`/root-admin/users/${id}/suspend`);
      load();
      setMessage('Administrator suspended.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl h-64 animate-pulse rounded-3xl bg-white/60" />;
  }

  if (!admin) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <BackButton href="/root-admin/system-administrators" label="Back to Administrators" />
        <p className="font-poppins-semibold text-navy">Administrator not found.</p>
      </div>
    );
  }

  const st = statusStyle(admin.status);
  const perms = defaultPermissionsForRole((admin.role as AdminRole) || 'SUPER_ADMIN');

  return (
    <div className="mx-auto max-w-5xl">
      <BackButton href="/root-admin/system-administrators" label="Back to Administrators" />
      {message && <div className="mb-4 rounded-lg bg-success/10 px-4 py-2 text-sm text-success">{message}</div>}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy to-navy-light p-6 shadow-lg sm:p-8">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-poppins-bold text-navy">
              {getInitials(admin.firstName, admin.lastName)}
            </span>
            <div>
              <h1 className="font-montserrat text-xl font-bold text-white sm:text-2xl">
                {admin.firstName} {admin.lastName}
              </h1>
              <p className="text-sm text-white/60">{admin.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-poppins-semibold ${st.chip}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                  {admin.status.replace(/_/g, ' ')}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/80">
                  {formatAdminRole(admin.role)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {admin.status !== 'SUSPENDED' && (
              <button
                type="button"
                disabled={busy}
                onClick={suspend}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-poppins-semibold text-navy disabled:opacity-50"
              >
                Suspend
              </button>
            )}
            <button
              type="button"
              onClick={() => setTab('Sessions')}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-poppins-semibold text-white hover:bg-white/20"
            >
              View Sessions
            </button>
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
              className={`relative whitespace-nowrap px-4 py-3 text-sm font-poppins-medium ${
                tab === t ? 'text-navy' : 'text-muted hover:text-navy'
              }`}
            >
              {t === 'Activity' ? 'Activity Logs' : t}
              {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </div>

      <div className="py-6">
        {tab === 'Profile' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Email', admin.email],
              ['Phone', admin.phone ?? '—'],
              ['Role', formatAdminRole(admin.role)],
              ['Organizations Managed', String(admin.organizationsManaged)],
              ['Last Login', formatLastLogin(admin.lastLoginAt)],
              ['MFA', admin.mfaEnabled ? 'Enabled' : 'Disabled'],
              ['Member Since', new Date(admin.createdAt).toLocaleDateString()],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-white p-4">
                <p className="text-xs text-muted">{k}</p>
                <p className="mt-1 font-poppins-semibold text-navy">{v}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'Permissions' && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Permissions for <strong>{formatAdminRole(admin.role)}</strong>
            </p>
            {PERMISSION_MODULES.map((mod) => (
              <div key={mod.key} className="rounded-xl border border-border bg-white p-4">
                <p className="mb-3 font-poppins-semibold text-navy">{mod.label}</p>
                <div className="flex flex-wrap gap-3">
                  {PERMISSION_ACTIONS.map((action) => {
                    const allowed = perms[mod.key]?.[action];
                    return (
                      <span
                        key={action}
                        className={`rounded-lg px-3 py-1.5 text-xs font-poppins-semibold capitalize ${
                          allowed ? 'bg-success/10 text-success' : 'bg-navy/5 text-muted line-through'
                        }`}
                      >
                        {action}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="font-poppins-semibold text-navy">Role Capabilities</p>
              <ul className="mt-2 list-inside list-disc text-sm text-muted">
                {ADMIN_ROLES.find((r) => r.id === admin.role)?.canManage.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === 'Organizations' && (
          <div className="rounded-2xl border border-border bg-white p-6 text-center">
            <p className="font-montserrat text-3xl font-bold text-navy">{admin.organizationsManaged}</p>
            <p className="text-sm text-muted">Organizations managed by this administrator</p>
            <Link
              href="/root-admin/organizations"
              className="mt-4 inline-flex items-center gap-1 text-sm font-poppins-semibold text-primary hover:underline"
            >
              View all organizations →
            </Link>
          </div>
        )}

        {tab === 'Sessions' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy || admin.sessions.length === 0}
                onClick={terminateAll}
                className="rounded-xl border border-danger/30 px-4 py-2 text-sm font-poppins-semibold text-danger hover:bg-danger/5 disabled:opacity-40"
              >
                Terminate All Sessions
              </button>
            </div>
            {admin.sessions.length === 0 ? (
              <p className="text-sm text-muted">No active sessions.</p>
            ) : (
              admin.sessions.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-white p-4">
                  <div>
                    <p className="font-poppins-semibold text-navy">
                      {[s.browser, s.os].filter(Boolean).join(' · ') || s.deviceName || 'Unknown device'}
                    </p>
                    <p className="text-xs text-muted">
                      {s.ipAddress ?? '—'} · Last active {formatLastLogin(s.lastActivity)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => terminateSession(s.id)}
                    className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-poppins-semibold text-danger hover:bg-danger/5"
                  >
                    Terminate
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'Security' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['MFA Status', admin.mfaEnabled ? 'Enabled' : 'Not enabled'],
              ['Email Verified', admin.emailVerifiedAt ? 'Yes' : 'Pending'],
              ['Password Change Required', admin.mustChangePassword ? 'Yes' : 'No'],
              ['Failed Login Count', String(admin.failedLoginCount ?? 0)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-white p-4">
                <p className="text-xs text-muted">{k}</p>
                <p className="mt-1 font-poppins-semibold text-navy">{v}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'Activity' && (
          <div className="rounded-2xl border border-border bg-white p-5">
            {admin.recentActivity.length === 0 ? (
              <p className="text-sm text-muted">No activity recorded.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-border pl-5">
                {admin.recentActivity.map((log) => (
                  <li key={log.id} className="relative">
                    <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary" />
                    <p className="text-sm font-poppins-medium text-navy">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted">{new Date(log.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
