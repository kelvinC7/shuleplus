'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  KeyRound,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  createDeoOfficerAdmin,
  deleteDeoOfficerAdmin,
  fetchDeoOfficersAdmin,
  resetDeoOfficerPasswordAdmin,
} from '@/lib/deo-officers-api';
import { fetchDistricts, fetchProvinces } from '@/lib/smart-access-api';
import { PageHeader } from '@/components/shared';
import { useConfirm, useToast } from '@/shared/notifications';

type DeoRow = Awaited<ReturnType<typeof fetchDeoOfficersAdmin>>[number];
type ModalKind = 'create' | 'password' | null;

type FormState = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  provinceId: string;
  districtId: string;
  districtName: string;
  credentialMode: 'email' | 'manual';
  requirePasswordChange: boolean;
  grantNesaDashboard: boolean;
};

const EMPTY: FormState = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  password: '',
  provinceId: '',
  districtId: '',
  districtName: '',
  credentialMode: 'email',
  requirePasswordChange: true,
  grantNesaDashboard: false,
};

function DeoModal({
  open,
  onClose,
  eyebrow,
  title,
  description,
  onSubmit,
  submitLabel,
  saving,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  description?: string;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  saving: boolean;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-navy/55 p-4 backdrop-blur-sm sm:items-center">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <form
        onSubmit={onSubmit}
        className="relative my-auto flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-2xl"
      >
        <div className="border-b border-navy/8 bg-gradient-to-br from-[#000435] via-[#000435] to-[#1a2a6c] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FCB038]">{eyebrow}</p>
              <h2 className="mt-1 text-xl font-bold">{title}</h2>
              {description ? <p className="mt-1 text-sm text-white/75">{description}</p> : null}
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-white/80 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-slate-50/80 px-6 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FCB038] px-5 py-2.5 text-sm font-bold text-[#000435] disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-navy/70">{label}</span>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </label>
  );
}

const inputCls =
  'w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-navy outline-none transition focus:border-[#FCB038] focus:ring-2 focus:ring-[#FCB038]/25';

export function DeoOfficersManagementView() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<DeoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [provinces, setProvinces] = useState<Array<{ id: string; name: string }>>([]);
  const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);
  const [passwordForm, setPasswordForm] = useState({ password: '', mode: 'email' as 'email' | 'manual' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchDeoOfficersAdmin());
    } catch {
      toast.error('Could not load DEO officers', 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    fetchProvinces().then(setProvinces).catch(() => {});
  }, [load]);

  useEffect(() => {
    if (!form.provinceId) {
      setDistricts([]);
      return;
    }
    fetchDistricts(form.provinceId).then(setDistricts).catch(() => setDistricts([]));
  }, [form.provinceId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        (r.profile?.districtName ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const province = provinces.find((p) => p.id === form.provinceId);
      const district = districts.find((d) => d.id === form.districtId);
      const districtName = district?.name ?? form.districtName.trim();
      if (!districtName) {
        toast.error('Select an assigned district', 'Validation');
        return;
      }
      const result = await createDeoOfficerAdmin({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        districtName,
        provinceId: form.provinceId || undefined,
        provinceName: province?.name,
        districtId: form.districtId || undefined,
        sendCredentialsEmail: form.credentialMode === 'email',
        password: form.credentialMode === 'manual' ? form.password : undefined,
        requirePasswordChange: form.requirePasswordChange,
        grantNesaDashboard: form.grantNesaDashboard,
      });
      if (result.tempPassword) {
        toast.success(`Account created. Temporary password: ${result.tempPassword}`, 'DEO created');
      } else {
        toast.success('DEO account created — credentials emailed', 'DEO created');
      }
      setModal(null);
      setForm(EMPTY);
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

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    setSaving(true);
    try {
      const result = await resetDeoOfficerPasswordAdmin(activeId, {
        sendCredentialsEmail: passwordForm.mode === 'email',
        password: passwordForm.mode === 'manual' ? passwordForm.password : undefined,
        requirePasswordChange: true,
      });
      if (result.tempPassword) toast.success(`New password: ${result.tempPassword}`, 'Password reset');
      else toast.success('New password sent by email', 'Password reset');
      setModal(null);
    } catch {
      toast.error('Password reset failed', 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="DEO Officers"
        description="Create District Education Officers, assign districts, grant DEO MIS access, and enforce dual OTP login."
        actions={
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY);
              setModal('create');
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FCB038] px-4 py-2.5 text-sm font-bold text-[#000435]"
          >
            <UserPlus className="h-4 w-4" />
            Add DEO
          </button>
        }
      />

      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Search name, email, district…"
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
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="py-3 pr-4 font-bold">Officer</th>
                  <th className="py-3 pr-4 font-bold">District</th>
                  <th className="py-3 pr-4 font-bold">Phone</th>
                  <th className="py-3 pr-4 font-bold">DEO MIS</th>
                  <th className="py-3 pr-4 font-bold">NESA</th>
                  <th className="py-3 pr-4 font-bold">Security</th>
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
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 text-navy">
                        <MapPin className="h-3.5 w-3.5 text-[#FCB038]" />
                        {row.profile?.districtName ?? 'Not set'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted">{row.phone ?? 'Not set'}</td>
                    <td className="py-3 pr-4">
                      {row.hasDeoMisAccess ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Licensed</span>
                      ) : (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">Missing</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {row.hasNesaDashboardAccess ? (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-900">Yes</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">No</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#FCB038]" />
                        Dual OTP
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                          onClick={() => {
                            setActiveId(row.id);
                            setPasswordForm({ password: '', mode: 'email' });
                            setModal('password');
                          }}
                        >
                          <KeyRound className="mr-1 inline h-3.5 w-3.5" />
                          Reset password
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Remove DEO officer?',
                              message: `Delete ${row.email}? This cannot be undone.`,
                              confirmLabel: 'Delete',
                              destructive: true,
                            });
                            if (!ok) return;
                            await deleteDeoOfficerAdmin(row.id);
                            toast.success('DEO officer removed', 'Deleted');
                            load();
                          }}
                        >
                          <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <p className="py-10 text-center text-sm text-muted">No DEO officers yet.</p>}
          </div>
        )}
      </div>

      <DeoModal
        open={modal === 'create'}
        onClose={() => setModal(null)}
        eyebrow="District MIS"
        title="Add DEO officer"
        description="Credentials by email or manual password. Login always requires email OTP then SMS OTP."
        onSubmit={handleCreate}
        submitLabel="Create & grant access"
        saving={saving}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <input className={inputCls} required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label="Last name">
            <input className={inputCls} required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className={inputCls} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone (SMS OTP)" hint="Required for step 2 verification at login">
            <input className={inputCls} required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Province">
            <select
              className={inputCls}
              value={form.provinceId}
              onChange={(e) => setForm({ ...form, provinceId: e.target.value, districtId: '', districtName: '' })}
            >
              <option value="">Select…</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Assigned district">
            <select
              className={inputCls}
              required
              value={form.districtId}
              onChange={(e) => {
                const d = districts.find((x) => x.id === e.target.value);
                setForm({ ...form, districtId: e.target.value, districtName: d?.name ?? '' });
              }}
              disabled={!form.provinceId}
            >
              <option value="">Select…</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-slate-50/80 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-border"
            checked={form.grantNesaDashboard}
            onChange={(e) => setForm({ ...form, grantNesaDashboard: e.target.checked })}
          />
          <span className="text-sm">
            <span className="font-bold text-navy">Also grant NESA Dashboard access</span>
            <span className="mt-0.5 block text-muted">Officer can open NESA Dashboard in addition to DEO MIS.</span>
          </span>
        </label>

        <div className="rounded-xl border border-[#FCB038]/40 bg-[#FCB038]/10 p-4 text-sm text-navy">
          <p className="font-bold">Dual verification at every login</p>
          <p className="mt-1 text-muted">Step 1: email OTP · Step 2: SMS OTP to the phone above.</p>
        </div>

        <Field label="Credentials">
          <div className="flex gap-2">
            {(['email', 'manual'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setForm({ ...form, credentialMode: mode })}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold ${form.credentialMode === mode ? 'border-[#FCB038] bg-[#FCB038]/15 text-navy' : 'border-border text-muted'}`}
              >
                {mode === 'email' ? 'Email password' : 'Set manually'}
              </button>
            ))}
          </div>
        </Field>
        {form.credentialMode === 'manual' ? (
          <Field label="Password">
            <input
              className={inputCls}
              type="password"
              minLength={8}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
        ) : null}
      </DeoModal>

      <DeoModal
        open={modal === 'password'}
        onClose={() => setModal(null)}
        eyebrow="Security"
        title="Reset password"
        onSubmit={handleResetPassword}
        submitLabel="Update password"
        saving={saving}
      >
        <Field label="Delivery">
          <div className="flex gap-2">
            {(['email', 'manual'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPasswordForm({ ...passwordForm, mode })}
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold ${passwordForm.mode === mode ? 'border-[#FCB038] bg-[#FCB038]/15' : 'border-border text-muted'}`}
              >
                {mode === 'email' ? 'Email new password' : 'Show once'}
              </button>
            ))}
          </div>
        </Field>
        {passwordForm.mode === 'manual' ? (
          <Field label="New password">
            <input
              className={inputCls}
              type="password"
              minLength={8}
              required
              value={passwordForm.password}
              onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
            />
          </Field>
        ) : null}
      </DeoModal>
    </div>
  );
}
