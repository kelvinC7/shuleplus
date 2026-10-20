'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, Plus, Trash2, X } from 'lucide-react';
import { type OrgDepartment, orgAdminApi } from '@/lib/org-admin-api';

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

export function ManageDepartmentsModal({ open, onClose, onChanged }: Props) {
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    branch: '',
    departmentHead: '',
    departmentType: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await orgAdminApi.listDepartments();
      setDepartments(data.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to load departments';
      setError(message);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Department name is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await orgAdminApi.createDepartment({
        name: form.name.trim(),
        branch: form.branch.trim() || undefined,
        departmentHead: form.departmentHead.trim() || undefined,
        departmentType: form.departmentType.trim() || undefined,
      });
      setForm({ name: '', branch: '', departmentHead: '', departmentType: '' });
      await load();
      onChanged?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create department';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(department: OrgDepartment) {
    if (
      !window.confirm(
        `Delete department "${department.name}"? Users assigned to this department will keep the name on their profile.`
      )
    ) {
      return;
    }
    setBusyId(department.id);
    setError('');
    try {
      await orgAdminApi.deleteDepartment(department.id);
      await load();
      onChanged?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to delete department';
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-navy px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Building2 className="size-5 text-primary" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Organization</p>
              <h2 className="text-lg font-bold">Manage Departments</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 p-2 text-white/80 transition hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <form onSubmit={(e) => void handleCreate(e)} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-sm font-semibold text-navy">Add department</p>
            <p className="mt-1 text-xs text-slate-500">
              Works without the HR module — departments are stored in your organization HR records.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2 space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-500">Department name *</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy outline-none focus:border-primary/40"
                  placeholder="e.g. Academic Affairs"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-500">Branch</span>
                <input
                  value={form.branch}
                  onChange={(e) => setForm((p) => ({ ...p, branch: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy outline-none focus:border-primary/40"
                  placeholder="Optional"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-500">Department head</span>
                <input
                  value={form.departmentHead}
                  onChange={(e) => setForm((p) => ({ ...p, departmentHead: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy outline-none focus:border-primary/40"
                  placeholder="Optional"
                />
              </label>
              <label className="sm:col-span-2 space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-500">Department type</span>
                <select
                  value={form.departmentType}
                  onChange={(e) => setForm((p) => ({ ...p, departmentType: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy outline-none focus:border-primary/40"
                >
                  <option value="">Select type (optional)</option>
                  <option value="ACADEMIC">Academic</option>
                  <option value="ADMINISTRATIVE">Administrative</option>
                  <option value="SUPPORT">Support</option>
                  <option value="OPERATIONS">Operations</option>
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add department
            </button>
          </form>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <div className="mt-5">
            <p className="text-sm font-semibold text-navy">
              Existing departments ({departments.length})
            </p>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-6 animate-spin text-slate-400" />
              </div>
            ) : departments.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                No departments yet. Add your first department above.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                {departments.map((dept) => (
                  <li key={dept.id} className="flex items-center justify-between gap-3 bg-white px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-navy">{dept.name}</p>
                      {dept.code ? (
                        <p className="text-xs text-slate-500">Code: {dept.code}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={busyId === dept.id}
                      onClick={() => void handleDelete(dept)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      {busyId === dept.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
