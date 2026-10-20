'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, KeyRound, Loader2, Search, Trash2, UserPlus, X } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { useConfirm, useToast } from '@/shared/notifications';
import {
  createNesaDashboardUserAdmin,
  deletePlatformUserAdmin,
  fetchNesaDashboardUsersAdmin,
  resetPlatformUserPasswordAdmin,
} from '@/lib/nesa-dashboard-users-api';

type Row = Awaited<ReturnType<typeof fetchNesaDashboardUsersAdmin>>[number];

const inputCls =
  'w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none transition focus:border-[#FCB038] focus:ring-2 focus:ring-[#FCB038]/25';

export function NesaDashboardUsersView() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    password: '',
    credentialMode: 'email' as 'email' | 'manual',
    requirePasswordChange: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchNesaDashboardUsersAdmin());
    } catch {
      toast.error('Could not load NESA Dashboard users', 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        (r.department ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await createNesaDashboardUserAdmin({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        department: form.department || undefined,
        position: form.position || undefined,
        sendCredentialsEmail: form.credentialMode === 'email',
        password: form.credentialMode === 'manual' ? form.password : undefined,
        requirePasswordChange: form.requirePasswordChange,
      });
      if (result.tempPassword) {
        toast.success(`Created. Temporary password: ${result.tempPassword}`, 'NESA user');
      } else {
        toast.success('NESA Dashboard user created — credentials emailed', 'NESA user');
      }
      setOpen(false);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        password: '',
        credentialMode: 'email',
        requirePasswordChange: true,
      });
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Create failed',
        'Error'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="NESA Dashboard Users"
        description="Register national officers and staff under the DEO & district workflow. Users log in with email and land on the NESA Dashboard."
        actions={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FCB038] px-4 py-2.5 text-sm font-bold text-[#000435]"
          >
            <UserPlus className="h-4 w-4" />
            Register user
          </button>
        }
      />

      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Search name, email, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#FCB038]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="py-3 pr-4 font-bold">User</th>
                  <th className="py-3 pr-4 font-bold">Department</th>
                  <th className="py-3 pr-4 font-bold">Status</th>
                  <th className="py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-border/80">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-navy">
                        {row.firstName} {row.lastName}
                      </p>
                      <p className="text-xs text-muted">{row.email}</p>
                    </td>
                    <td className="py-3 pr-4 text-muted">{row.department ?? row.position ?? '—'}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        <BarChart3 className="h-3 w-3" />
                        NESA
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                          onClick={() => setResetId(row.id)}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Reset password
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            void confirm({
                              title: 'Remove NESA user?',
                              message: `${row.email} will lose platform access.`,
                              confirmLabel: 'Remove',
                              destructive: true,
                            }).then(async (ok) => {
                              if (!ok) return;
                              await deletePlatformUserAdmin(row.id);
                              toast.success('User removed', 'Deleted');
                              await load();
                            });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="py-10 text-center text-sm text-muted">No NESA Dashboard users yet.</p>
            )}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-navy/55 p-4 backdrop-blur-sm sm:items-center">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={() => setOpen(false)} />
          <form
            onSubmit={handleCreate}
            className="relative my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-2xl"
          >
            <div className="border-b border-navy/8 bg-gradient-to-br from-[#000435] via-[#000435] to-[#1a2a6c] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FCB038]">NESA Dashboard</p>
                  <h2 className="mt-1 text-xl font-bold">Register user</h2>
                  <p className="mt-1 text-sm text-white/75">Module-only access — opens NESA Dashboard after login.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-white/80 hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1.5 block text-xs font-bold uppercase text-navy/70">First name</span>
                  <input className={inputCls} required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block text-xs font-bold uppercase text-navy/70">Last name</span>
                  <input className={inputCls} required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold uppercase text-navy/70">Email</span>
                  <input className={inputCls} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block text-xs font-bold uppercase text-navy/70">Department</span>
                  <input className={inputCls} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. NESA" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block text-xs font-bold uppercase text-navy/70">Position</span>
                  <input className={inputCls} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                </label>
              </div>
              <div className="flex gap-2">
                {(['email', 'manual'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setForm({ ...form, credentialMode: mode })}
                    className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold ${form.credentialMode === mode ? 'border-[#FCB038] bg-[#FCB038]/15 text-navy' : 'border-border text-muted'}`}
                  >
                    {mode === 'email' ? 'Email credentials' : 'Set password manually'}
                  </button>
                ))}
              </div>
              {form.credentialMode === 'manual' && (
                <label className="block text-sm">
                  <span className="mb-1.5 block text-xs font-bold uppercase text-navy/70">Password</span>
                  <input
                    className={inputCls}
                    type="password"
                    minLength={8}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </label>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border bg-slate-50/80 px-6 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FCB038] px-5 py-2.5 text-sm font-bold text-[#000435] disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create & grant NESA
              </button>
            </div>
          </form>
        </div>
      )}

      {resetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <p className="font-bold text-navy">Reset password</p>
            <p className="mt-1 text-sm text-muted">A new password will be emailed to the user.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold" onClick={() => setResetId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-[#FCB038] px-4 py-2 text-sm font-bold text-[#000435]"
                onClick={() => {
                  void resetPlatformUserPasswordAdmin(resetId, { sendCredentialsEmail: true, requirePasswordChange: true })
                    .then(() => {
                      toast.success('Password reset email sent', 'Done');
                      setResetId(null);
                    })
                    .catch(() => toast.error('Reset failed', 'Error'));
                }}
              >
                Send reset email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
