'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, RotateCcw, Trash2, UserPlus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  createPrintCardUser,
  deletePrintCardUser,
  fetchPrintCardUsers,
  resetPrintCardUserPassword,
  updatePrintCardUser,
  type PrintCardUser,
} from '@/services/iam-api';

const EMPTY_FORM = { email: '', password: '' };

function statusTone(status: string) {
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-800';
  if (status === 'SUSPENDED') return 'bg-rose-100 text-rose-800';
  return 'bg-slate-100 text-slate-700';
}

export function UsersView() {
  const { session } = useAuth();
  const [users, setUsers] = useState<PrintCardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    setError('');
    try {
      setUsers(await fetchPrintCardUsers());
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to load Print Card users';
      setError(message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!session?.isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-bold text-navy">Super Admin only</h2>
        <p className="mt-2 text-sm text-muted">Only Super Admins can manage Print Card module access.</p>
      </div>
    );
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await createPrintCardUser({
        email: form.email.trim(),
        password: form.password,
      });
      setSuccess(`${form.email.trim()} can now sign in to Print Card.`);
      setForm(EMPTY_FORM);
      setFormOpen(false);
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not create user.'
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
    setError('');
    setSuccess('');
    try {
      await updatePrintCardUser(editUser.id, {
        email: editForm.email.trim(),
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
      });
      setSuccess('User updated.');
      setEditUser(null);
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not update user.'
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
    setError('');
    setSuccess('');
    try {
      const result = await resetPrintCardUserPassword(resetUser.id, {
        password: resetPassword.trim() || undefined,
        sendEmail: false,
      });
      if (result.tempPassword) setTempPassword(result.tempPassword);
      setSuccess(`Password reset for ${resetUser.email}.`);
      setResetUser(null);
      setResetPassword('');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not reset password.'
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(user: PrintCardUser) {
    if (!window.confirm(`Delete ${user.email}? They will lose Print Card access.`)) return;
    setBusyId(user.id);
    setError('');
    setSuccess('');
    try {
      await deletePrintCardUser(user.id);
      setSuccess('User deleted.');
      await load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not delete user.'
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 text-navy">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-navy">Print Card Users</h2>
            <p className="text-sm text-muted">
              Add operators who can sign in and use the Print Card module.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormOpen(true);
            setError('');
            setSuccess('');
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-navy shadow-sm hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          Add user
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}
      {tempPassword && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-navy">
          <p className="font-semibold">Temporary password (share securely):</p>
          <code className="mt-1 block font-mono text-base">{tempPassword}</code>
        </div>
      )}

      {formOpen && (
        <form
          onSubmit={onCreate}
          className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-4"
        >
          <h3 className="font-semibold text-navy">New Print Card user</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-navy">Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="operator@example.com"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-navy">Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="Min. 8 characters"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create user
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted hover:text-navy"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-muted">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted">
                    No Print Card users yet. Add one to grant module access.
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
                          <RotateCcw className="h-4 w-4" />
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
      </div>

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={saveEdit}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4"
          >
            <h3 className="text-lg font-bold text-navy">Edit user</h3>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border border-border px-3 py-2.5"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">First name</span>
                <input
                  required
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                  className="w-full rounded-xl border border-border px-3 py-2.5"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Last name</span>
                <input
                  required
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                  className="w-full rounded-xl border border-border px-3 py-2.5"
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
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4"
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
              placeholder="New password (optional)"
              className="w-full rounded-xl border border-border px-3 py-2.5 text-sm"
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
