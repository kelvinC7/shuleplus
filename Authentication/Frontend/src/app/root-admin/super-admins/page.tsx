'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BackButton } from '@/components/root-admin/back-button';
import { useToast, useConfirm } from '@/shared/notifications';

type SuperAdmin = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
};

export default function RootAdminSuperAdminsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editAdmin, setEditAdmin] = useState<SuperAdmin | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [resetAdmin, setResetAdmin] = useState<SuperAdmin | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetSendEmail, setResetSendEmail] = useState(true);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/root-admin/super-admins');
      setAdmins(res.data.data ?? []);
    } catch {
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/root-admin/super-admins', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      toast.success(`${form.email.trim()} can now sign in as Super Admin.`, 'Super Admin created');
      setForm(EMPTY);
      setFormOpen(false);
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not create Super Admin.',
        'Create failed'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(admin: SuperAdmin) {
    setEditAdmin(admin);
    setEditForm({
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      phone: admin.phone ?? '',
    });
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editAdmin) return;
    setBusyId(editAdmin.id);
    try {
      await api.patch(`/root-admin/super-admins/${editAdmin.id}`, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
      });
      toast.success('Super Admin profile updated.', 'Saved');
      setEditAdmin(null);
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not update Super Admin.',
        'Update failed'
      );
    } finally {
      setBusyId(null);
    }
  }

  async function submitResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!resetAdmin) return;
    setBusyId(resetAdmin.id);
    setTempPassword(null);
    try {
      const { data } = await api.post(`/root-admin/super-admins/${resetAdmin.id}/reset-password`, {
        password: resetPassword.trim() || undefined,
        sendEmail: resetSendEmail,
      });
      const pwd = data.data?.tempPassword as string | undefined;
      if (pwd && !resetSendEmail) setTempPassword(pwd);
      toast.success(
        resetSendEmail
          ? `New password emailed to ${resetAdmin.email}.`
          : 'Password reset. Copy the temporary password below.',
        'Password reset'
      );
      if (resetSendEmail) {
        setResetAdmin(null);
        setResetPassword('');
      }
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

  async function toggleStatus(admin: SuperAdmin) {
    const activating = admin.status === 'SUSPENDED';
    const ok = await confirm({
      title: activating ? 'Activate Super Admin' : 'Suspend Super Admin',
      message: activating
        ? `Re-activate ${admin.firstName} ${admin.lastName}? They will be able to sign in again.`
        : `Suspend ${admin.firstName} ${admin.lastName}? They will be logged out and cannot sign in.`,
      confirmLabel: activating ? 'Activate' : 'Suspend',
      cancelLabel: 'Cancel',
      variant: activating ? 'default' : 'danger',
    });
    if (!ok) return;

    setBusyId(admin.id);
    try {
      await api.patch(`/root-admin/users/${admin.id}/status`, {
        status: activating ? 'ACTIVE' : 'SUSPENDED',
      });
      toast.success(
        activating ? 'Super Admin activated.' : 'Super Admin suspended.',
        activating ? 'Activated' : 'Suspended'
      );
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not update status.',
        'Failed'
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeAdmin(admin: SuperAdmin) {
    const ok = await confirm({
      title: 'Delete Super Admin',
      message: `Delete ${admin.firstName} ${admin.lastName}? This permanently removes their account.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    setBusyId(admin.id);
    try {
      await api.delete(`/root-admin/super-admins/${admin.id}`);
      toast.success('Super Admin deleted.', 'Deleted');
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not delete Super Admin.',
        'Delete failed'
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <BackButton href="/root-admin" />
          <h1 className="font-montserrat text-2xl font-bold text-navy">Super Admins</h1>
          <p className="mt-1 text-sm text-muted">
            Create and manage Super Admin accounts — edit profiles, reset passwords, suspend, or delete.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-primary-hover"
        >
          {formOpen ? 'Cancel' : 'Add Super Admin'}
        </button>
      </div>

      {formOpen ? (
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-white p-5">
          <h2 className="text-base font-bold text-navy">New Super Admin account</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-navy">First name</span>
              <input
                required
                className="input w-full"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-navy">Last name</span>
              <input
                required
                className="input w-full"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-navy">Email</span>
              <input
                required
                type="email"
                className="input w-full"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-navy">Phone (optional)</span>
              <input
                className="input w-full"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-navy">Temporary password</span>
              <input
                required
                type="password"
                minLength={12}
                className="input w-full"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 12 characters"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Super Admin'}
          </button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
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
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No Super Admin accounts yet.
                </td>
              </tr>
            ) : (
              admins.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-navy">
                    {a.firstName} {a.lastName}
                  </td>
                  <td className="px-4 py-3">{a.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        a.status === 'ACTIVE'
                          ? 'text-success'
                          : a.status === 'SUSPENDED'
                            ? 'text-danger'
                            : 'text-muted'
                      }
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => openEdit(a)}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-background"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => {
                          setResetAdmin(a);
                          setResetPassword('');
                          setTempPassword(null);
                          setResetSendEmail(true);
                        }}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-background"
                      >
                        Reset password
                      </button>
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => void toggleStatus(a)}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                      >
                        {a.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => void removeAdmin(a)}
                        className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/5"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editAdmin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={saveEdit}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold text-navy">Edit Super Admin</h2>
            <div className="grid gap-3 sm:grid-cols-2">
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
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium">Email</span>
                <input
                  required
                  type="email"
                  className="input w-full"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium">Phone</span>
                <input
                  className="input w-full"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditAdmin(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId === editAdmin.id}
                className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {resetAdmin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitResetPassword}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold text-navy">Reset password</h2>
            <p className="text-sm text-muted">
              Set a new password for {resetAdmin.firstName} {resetAdmin.lastName} ({resetAdmin.email}).
            </p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">New password (optional — auto-generated if empty)</span>
              <input
                type="password"
                minLength={12}
                className="input w-full"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Min. 12 characters"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={resetSendEmail}
                onChange={(e) => setResetSendEmail(e.target.checked)}
              />
              Email the new password to the user
            </label>
            {tempPassword ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <p className="font-medium text-navy">Temporary password:</p>
                <code className="mt-1 block break-all text-navy">{tempPassword}</code>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setResetAdmin(null);
                  setTempPassword(null);
                }}
                className="rounded-xl border border-border px-4 py-2 text-sm"
              >
                {tempPassword ? 'Close' : 'Cancel'}
              </button>
              {!tempPassword ? (
                <button
                  type="submit"
                  disabled={busyId === resetAdmin.id}
                  className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Reset password
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
