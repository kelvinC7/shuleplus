'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import { PageHeader } from '@/components/shared';
import { useConfirm, useToast } from '@/shared/notifications';

type PrintCardUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

const EMPTY_FORM = { email: '', password: '' };

function statusTone(status: string) {
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-800';
  if (status === 'SUSPENDED') return 'bg-rose-100 text-rose-800';
  return 'bg-slate-100 text-slate-700';
}

export function PrintCardUsersView() {
  const platform = usePlatformAdmin();
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<PrintCardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<PrintCardUser | null>(null);
  const [editForm, setEditForm] = useState({ email: '', firstName: '', lastName: '' });
  const [resetUser, setResetUser] = useState<PrintCardUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`${platform.apiPrefix}/print-card/users`);
      setUsers(res.data.data ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [platform.apiPrefix]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`${platform.apiPrefix}/print-card/users`, {
        email: form.email.trim(),
        password: form.password,
      });
      toast.success(`${form.email.trim()} can now sign in to Print Card.`, 'User created');
      setForm(EMPTY_FORM);
      setFormOpen(false);
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not create user.',
        'Create failed'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(user: PrintCardUser) {
    setEditUser(user);
    setEditForm({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setBusyId(editUser.id);
    try {
      await api.patch(`${platform.apiPrefix}/platform-users/${editUser.id}`, {
        email: editForm.email.trim(),
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
      });
      toast.success('User updated.', 'Saved');
      setEditUser(null);
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not update user.',
        'Update failed'
      );
    } finally {
      setBusyId(null);
    }
  }

  async function submitReset(e: FormEvent) {
    e.preventDefault();
    if (!resetUser) return;
    setBusyId(resetUser.id);
    setTempPassword(null);
    try {
      const { data } = await api.post(
        `${platform.apiPrefix}/platform-users/${resetUser.id}/reset-password`,
        {
          password: resetPassword.trim() || undefined,
          sendEmail: false,
        }
      );
      const pwd = data.data?.tempPassword as string | undefined;
      if (pwd) setTempPassword(pwd);
      toast.success(`Password reset for ${resetUser.email}.`, 'Password reset');
      setResetUser(null);
      setResetPassword('');
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not reset password.',
        'Reset failed'
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(user: PrintCardUser) {
    const ok = await confirm({
      title: 'Delete Print Card user',
      message: `Delete ${user.email}? They will lose access to the Print Card module.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    setBusyId(user.id);
    try {
      await api.delete(`${platform.apiPrefix}/platform-users/${user.id}`);
      toast.success('User deleted.', 'Deleted');
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not delete user.',
        'Delete failed'
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Smart Access & IDs"
        title="Print Card Users"
        description="Register operators who can sign in and use the Print Card module. They log in through ShulePlus and open Print Card from their dashboard."
        action={
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FCB038] px-4 py-2.5 text-sm font-semibold text-[#000435] shadow-sm transition hover:bg-[#FCB038]/90"
          >
            {formOpen ? <Plus className="h-4 w-4 rotate-45" /> : <UserPlus className="h-4 w-4" />}
            {formOpen ? 'Cancel' : 'Add user'}
          </button>
        }
      />

      {tempPassword && (
        <div className="rounded-xl border border-[#FCB038]/40 bg-[#FCB038]/10 px-4 py-3 text-sm text-[#000435]">
          <p className="font-semibold">Temporary password (share securely):</p>
          <code className="mt-1 block font-mono text-base">{tempPassword}</code>
        </div>
      )}

      {formOpen && (
        <form onSubmit={onCreate} className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#000435]" />
            <h2 className="text-base font-bold text-navy">New Print Card user</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-navy">Email</span>
              <input
                required
                type="email"
                className="input w-full"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="operator@example.com"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-navy">Password</span>
              <input
                required
                type="password"
                minLength={8}
                className="input w-full"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Register user'}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last login</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No Print Card users yet. Register one to grant module access.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-navy">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(user.status)}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(user.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title="Edit"
                        disabled={busyId === user.id}
                        onClick={() => openEdit(user)}
                        className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-navy disabled:opacity-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Reset password"
                        disabled={busyId === user.id}
                        onClick={() => {
                          setResetUser(user);
                          setResetPassword('');
                          setTempPassword(null);
                        }}
                        className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-navy disabled:opacity-50"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        disabled={busyId === user.id}
                        onClick={() => void removeUser(user)}
                        className="rounded-lg p-2 text-muted hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={saveEdit}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-navy">Edit user</h3>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <input
                type="email"
                required
                className="input w-full"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">First name</span>
                <input
                  required
                  className="input w-full"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Last name</span>
                <input
                  required
                  className="input w-full"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId === editUser.id}
                className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitReset}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-navy">Reset password</h3>
            <p className="text-sm text-muted">
              Set a new password for <strong>{resetUser.email}</strong>. Leave blank to generate one.
            </p>
            <input
              type="password"
              minLength={8}
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="New password (optional, min. 8 characters)"
              className="input w-full"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetUser(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId === resetUser.id}
                className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Reset password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
