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
  createSeiOfficerAdmin,
  deleteSeiOfficerAdmin,
  fetchSeiOfficersAdmin,
  resetSeiOfficerPasswordAdmin,
} from '@/lib/sei-officers-api';
import { fetchDistricts, fetchProvinces, fetchSectors } from '@/lib/smart-access-api';
import { PageHeader } from '@/components/shared';
import { useConfirm, useToast } from '@/shared/notifications';

type SeiRow = Awaited<ReturnType<typeof fetchSeiOfficersAdmin>>[number];
type ModalKind = 'create' | 'password' | null;

type FormState = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  provinceId: string;
  districtId: string;
  sectorId: string;
  sectorName: string;
  credentialMode: 'email' | 'manual';
  requirePasswordChange: boolean;
};

const EMPTY: FormState = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  password: '',
  provinceId: '',
  districtId: '',
  sectorId: '',
  sectorName: '',
  credentialMode: 'email',
  requirePasswordChange: true,
};

function SeiModal({
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

export function SeiOfficersManagementView() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<SeiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [provinces, setProvinces] = useState<Array<{ id: string; name: string }>>([]);
  const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);
  const [sectors, setSectors] = useState<Array<{ id: string; name: string }>>([]);
  const [passwordForm, setPasswordForm] = useState({ password: '', mode: 'email' as 'email' | 'manual' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchSeiOfficersAdmin());
    } catch {
      toast.error('Could not load SEI officers', 'Load failed');
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

  useEffect(() => {
    if (!form.districtId) {
      setSectors([]);
      return;
    }
    fetchSectors(form.districtId).then(setSectors).catch(() => setSectors([]));
  }, [form.districtId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        (r.profile?.sectorName ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const province = provinces.find((p) => p.id === form.provinceId);
      const district = districts.find((d) => d.id === form.districtId);
      const sector = sectors.find((s) => s.id === form.sectorId);
      const sectorName = sector?.name ?? form.sectorName.trim();
      if (!sectorName) {
        toast.error('Select or enter an assigned sector', 'Validation');
        return;
      }
      const result = await createSeiOfficerAdmin({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        sectorName,
        provinceId: form.provinceId || undefined,
        provinceName: province?.name,
        districtId: form.districtId || undefined,
        districtName: district?.name,
        sectorId: form.sectorId || undefined,
        sendCredentialsEmail: form.credentialMode === 'email',
        password: form.credentialMode === 'manual' ? form.password : undefined,
        requirePasswordChange: form.requirePasswordChange,
      });
      if (result.tempPassword) {
        toast.success(`Account created. Temporary password: ${result.tempPassword}`, 'SEI created');
      } else {
        toast.success('SEI account created — credentials emailed', 'SEI created');
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
      const result = await resetSeiOfficerPasswordAdmin(activeId, {
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
        title="SEI Officers"
        description="Create Sector Education Inspectors, assign sectors, grant Sector MIS access, and enforce dual OTP login."
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
            Add SEI
          </button>
        }
      />

      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Search name, email, sector…"
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
                  <th className="py-3 pr-4 font-bold">Sector</th>
                  <th className="py-3 pr-4 font-bold">Phone</th>
                  <th className="py-3 pr-4 font-bold">Sector MIS</th>
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
                        {row.profile?.sectorName ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted">{row.phone ?? '—'}</td>
                    <td className="py-3 pr-4">
                      {row.hasSectorMisAccess ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Licensed</span>
                      ) : (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">Missing</span>
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
                              title: 'Remove SEI officer?',
                              message: `Delete ${row.email}? This cannot be undone.`,
                              confirmLabel: 'Delete',
                              destructive: true,
                            });
                            if (!ok) return;
                            await deleteSeiOfficerAdmin(row.id);
                            toast.success('SEI officer removed', 'Deleted');
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
            {!filtered.length && <p className="py-10 text-center text-sm text-muted">No SEI officers yet.</p>}
          </div>
        )}
      </div>

      <SeiModal
        open={modal === 'create'}
        onClose={() => setModal(null)}
        eyebrow="Sector MIS"
        title="Add SEI officer"
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

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Province">
            <select
              className={inputCls}
              value={form.provinceId}
              onChange={(e) => setForm({ ...form, provinceId: e.target.value, districtId: '', sectorId: '' })}
            >
              <option value="">Select…</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="District">
            <select
              className={inputCls}
              value={form.districtId}
              onChange={(e) => setForm({ ...form, districtId: e.target.value, sectorId: '' })}
              disabled={!form.provinceId}
            >
              <option value="">Select…</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Assigned sector">
            <select
              className={inputCls}
              required
              value={form.sectorId}
              onChange={(e) => {
                const s = sectors.find((x) => x.id === e.target.value);
                setForm({ ...form, sectorId: e.target.value, sectorName: s?.name ?? '' });
              }}
              disabled={!form.districtId}
            >
              <option value="">Select…</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>

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
      </SeiModal>

      <SeiModal
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
      </SeiModal>
    </div>
  );
}
