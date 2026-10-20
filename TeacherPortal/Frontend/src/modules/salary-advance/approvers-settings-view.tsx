'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Trash2, UserCog } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { addApprover, fetchApprovers, removeApprover } from '@/services/teacher-api';
import { SALARY_ADVANCE } from '@/config/salary-advance-brand';
import type { ShuleAvanceApprover } from '@/types';

const ROLE_LABELS: Record<'manager' | 'accountant', string> = {
  manager: 'Manager approver',
  accountant: 'Finance approver',
};

export function ApproversSettingsView() {
  const { avanceAccess } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [approvers, setApprovers] = useState<ShuleAvanceApprover[]>([]);
  const [form, setForm] = useState({
    userId: '',
    email: '',
    displayName: '',
    role: 'manager' as 'manager' | 'accountant',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchApprovers();
      setApprovers(rows);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to load approvers';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!avanceAccess?.canManageApprovers) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-navy">Organization admin only</h1>
        <p className="mt-2 text-sm text-muted">
          Only organization administrators can designate {SALARY_ADVANCE.shortName} approvers.
        </p>
        <Link href="/salary-advance/approvals" className="btn-primary mt-6 inline-block">
          Go to approvals
        </Link>
      </div>
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.userId.trim()) {
      setError('IAM user ID is required');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await addApprover({
        userId: form.userId.trim(),
        email: form.email.trim() || undefined,
        displayName: form.displayName.trim() || undefined,
        role: form.role,
      });
      setForm({ userId: '', email: '', displayName: '', role: form.role });
      setSuccess(`Approver added. They can open Teacher Portal and use ${SALARY_ADVANCE.approvals}.`);
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to add approver';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this designated approver?')) return;
    try {
      await removeApprover(id);
      setSuccess('Approver removed');
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to remove approver';
      setError(message);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-navy">
            <UserCog className="h-7 w-7 text-primary" />
            Manage approvers
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Designate staff who can approve or reject {SALARY_ADVANCE.shortName} requests. They need the Teacher
            Portal module and their IAM user ID below. Organization admins always have full approval
            access.
          </p>
        </div>
        <Link href="/salary-advance/approvals" className="btn-secondary text-sm">
          Open approval queue
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-success/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleAdd}
          className="rounded-2xl border border-border bg-white p-6 shadow-sm"
        >
          <h2 className="font-semibold text-navy">Add designated approver</h2>
          <p className="mt-1 text-xs text-muted">
            Use the IAM user UUID (JWT <code className="text-navy">sub</code>) from Authentication.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">IAM user ID *</label>
              <input
                className="input font-mono text-xs"
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Display name</label>
              <input
                className="input"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Jane Mukamana"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane@school.rw"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Approval role *</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value as 'manager' | 'accountant' }))
                }
              >
                <option value="manager">Manager — final approve/reject cashouts</option>
                <option value="accountant">Finance — review services, forward to manager</option>
              </select>
            </div>
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {saving ? 'Adding…' : 'Add approver'}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-navy">How it works</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <strong className="text-navy">Finance approvers</strong> see service requests in the
              pending accountant queue.
            </li>
            <li>
              <strong className="text-navy">Manager approvers</strong> give final approve/reject on
              cashouts and forwarded requests.
            </li>
            <li>Assignees open Teacher Portal → <strong>{SALARY_ADVANCE.approvals}</strong> (no API needed).</li>
            <li>They must be licensed for the teacher-portal module on IAM.</li>
          </ul>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-navy">Current approvers</h2>
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : approvers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted">
            No designated approvers yet. Organization admins can still approve all requests.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50 text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Person</th>
                  <th className="px-4 py-3 font-semibold">IAM user ID</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {approvers.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy">{row.displayName ?? '—'}</p>
                      <p className="text-xs text-muted">{row.email ?? 'No email'}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{row.userId}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          row.role === 'manager'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ROLE_LABELS[row.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(row.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-danger hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
