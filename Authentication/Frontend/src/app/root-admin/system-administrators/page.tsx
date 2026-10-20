'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { BackButton } from '@/components/root-admin/back-button';
import { AdminHighlightCards, AdminStatsCards } from '@/components/root-admin/system-administrator/admin-stats';
import { CategoryCards } from '@/components/root-admin/system-administrator/category-cards';
import { AdminTable } from '@/components/root-admin/system-administrator/admin-table';
import { useToast, useConfirm } from '@/shared/notifications';
import { hasActiveSession } from '@/lib/auth';
import type { PlatformAdmin, PlatformAdminStats } from '@/lib/platform-administrators';

export default function SystemAdministratorsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [stats, setStats] = useState<PlatformAdminStats | null>(null);
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [busy, setBusy] = useState(false);
  const [resetAdmin, setResetAdmin] = useState<PlatformAdmin | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetSendEmail, setResetSendEmail] = useState(true);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function load() {
    if (!hasActiveSession()) return;
    setLoading(true);
    Promise.all([
      api.get('/root-admin/platform-administrators/stats'),
      api.get('/root-admin/platform-administrators'),
    ])
      .then(([statsRes, adminsRes]) => {
        setStats(statsRes.data.data);
        setAdmins(adminsRes.data.data);
      })
      .catch((err: unknown) => {
        setStats(null);
        setAdmins([]);
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          toast.error('You do not have permission to view platform administrators.', 'Access denied');
        } else if (status === 401) {
          toast.error('Your session expired. Please sign in again.', 'Unauthorized');
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return admins.filter((a) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        a.firstName.toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'ALL' || a.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [admins, search, roleFilter]);

  async function handleActivate(id: string) {
    setBusy(true);
    try {
      await api.patch(`/root-admin/users/${id}/status`, { status: 'ACTIVE' });
      toast.success('Administrator has been activated.', 'Activated');
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to activate administrator.';
      toast.error(message, 'Could not activate');
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(admin: PlatformAdmin) {
    setResetAdmin(admin);
    setResetPassword('');
    setTempPassword(null);
    setResetSendEmail(true);
  }

  async function submitResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!resetAdmin) return;
    setBusy(true);
    setTempPassword(null);
    try {
      const { data } = await api.post(`/root-admin/super-admins/${resetAdmin.id}/reset-password`, {
        password: resetPassword.trim() || undefined,
        sendEmail: resetSendEmail,
      });
      const pwd = data.data?.tempPassword as string | undefined;
      if (pwd && !resetSendEmail) setTempPassword(pwd);
      toast.success(
        resetSendEmail ? `New password emailed to ${resetAdmin.email}.` : 'Password reset.',
        'Password reset'
      );
      if (resetSendEmail) {
        setResetAdmin(null);
        setResetPassword('');
      }
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to reset password.',
        'Could not reset'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSuspend(id: string) {
    setBusy(true);
    try {
      await api.post(`/root-admin/users/${id}/suspend`);
      toast.success('Administrator has been suspended.', 'Suspended');
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to suspend administrator.';
      toast.error(message, 'Could not suspend');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    const ok = await confirm({
      title: 'Delete Administrator',
      message: `Delete ${name}? This permanently removes their account and cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    setBusy(true);
    try {
      await api.delete(`/root-admin/platform-administrators/${id}`);
      toast.success(`${name} was deleted.`, 'Administrator deleted');
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to delete administrator.';
      toast.error(message, 'Could not delete');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <BackButton href="/root-admin" />
          <h1 className="font-montserrat text-2xl font-bold text-navy">Platform Administrators</h1>
          <p className="text-sm text-muted">Manage system administrators, roles, teams & invitations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/root-admin/system-administrators/teams"
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-poppins-semibold text-navy transition hover:border-primary"
          >
            Teams
          </Link>
          <Link
            href="/root-admin/system-administrators/invitations"
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-poppins-semibold text-navy transition hover:border-primary"
          >
            Invitations
          </Link>
          <Link
            href="/root-admin/system-administrators/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-poppins-semibold text-navy shadow-sm transition hover:bg-primary-hover"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create Administrator
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/60" />
          ))}
        </div>
      ) : stats ? (
        <>
          <AdminHighlightCards stats={stats} />
          <AdminStatsCards stats={stats} />
        </>
      ) : null}

      <CategoryCards onSelect={(role) => setRoleFilter(role)} />

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-montserrat text-lg font-bold text-navy">Administrators</h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search administrators..."
              suppressHydrationWarning
              className="input max-w-xs"
            />
            {roleFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setRoleFilter('ALL')}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-poppins-semibold text-navy"
              >
                {roleFilter.replace(/_/g, ' ')} ×
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="h-48 animate-pulse rounded-2xl bg-white/60" />
        ) : (
          <AdminTable
            admins={filtered}
            onSuspend={handleSuspend}
            onActivate={handleActivate}
            onResetPassword={handleResetPassword}
            onDelete={handleDelete}
            busy={busy}
          />
        )}
      </div>

      {resetAdmin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitResetPassword}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold text-navy">Reset password</h2>
            <p className="text-sm text-muted">
              {resetAdmin.firstName} {resetAdmin.lastName} ({resetAdmin.email})
            </p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">New password (optional)</span>
              <input
                type="password"
                minLength={12}
                className="input w-full"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={resetSendEmail}
                onChange={(e) => setResetSendEmail(e.target.checked)}
              />
              Email the new password
            </label>
            {tempPassword ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <code className="block break-all">{tempPassword}</code>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetAdmin(null)} className="rounded-xl border px-4 py-2 text-sm">
                {tempPassword ? 'Close' : 'Cancel'}
              </button>
              {!tempPassword ? (
                <button type="submit" disabled={busy} className="rounded-xl bg-navy px-4 py-2 text-sm text-white">
                  Reset
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
