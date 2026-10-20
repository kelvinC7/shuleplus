'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  CA_FINANCE_MODULES,
  type CaFinancePermissions,
} from '@/lib/chief-accountant-permission-ui';
import { orgAdminApi, type OrgChiefAccountantRow } from '@/lib/org-admin-api';

type Props = {
  row: OrgChiefAccountantRow | null;
  onClose: () => void;
  onSaved: (rows: OrgChiefAccountantRow[]) => void;
};

export function ManageOrgChiefAccountantModal({ row, onClose, onSaved }: Props) {
  const [permissions, setPermissions] = useState<CaFinancePermissions>({});
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!row) return;
    setPermissions({ ...row.permissions });
    setStatus(row.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE');
    setError('');
  }, [row]);

  if (!row) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await orgAdminApi.updateChiefAccountantAssignment(row!.userId, {
        permissions,
        status,
      });
      onSaved(data.data);
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not save';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Chief Accountant</p>
            <h2 className="text-lg font-bold text-navy">
              {row.user.firstName} {row.user.lastName}
            </h2>
            <p className="text-sm text-slate-500">{row.user.email}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Access</label>
            <select
              className="input w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'SUSPENDED')}
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended (this school)</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CA_FINANCE_MODULES.map((mod) => (
              <div key={mod.key}>
                <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">{mod.label}</label>
                <select
                  className="input w-full text-sm"
                  value={permissions[mod.key] ?? ''}
                  onChange={(e) =>
                    setPermissions((p) => ({ ...p, [mod.key]: e.target.value }))
                  }
                >
                  {mod.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-primary disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
