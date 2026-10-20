'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Ban,
  Building2,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import {
  createChiefAccountantAdmin,
  deleteChiefAccountantAdmin,
  fetchChiefAccountantAssignableSchools,
  fetchChiefAccountantsAdmin,
  resetChiefAccountantPasswordAdmin,
  setChiefAccountantAssignments,
  updateChiefAccountantAdmin,
} from '@/lib/chief-accountant-api';
import { PageHeader } from '@/components/shared';
import { useConfirm, useToast } from '@/shared/notifications';

const MODULE_KEYS = ['schoolFees', 'expenses', 'payroll', 'accounting', 'budget', 'reports', 'approvals'] as const;

type ChiefAccountantRow = Awaited<ReturnType<typeof fetchChiefAccountantsAdmin>>[number];

type ModalKind = 'create' | 'edit' | 'assign' | 'password' | null;

type FormState = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  organizationIds: string[];
  enforceMfa: boolean;
  accessLevel: 'prepare' | 'approve';
  requirePasswordChange: boolean;
  sendCredentialsEmail: boolean;
};

const EMPTY_FORM: FormState = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  password: '',
  organizationIds: [],
  enforceMfa: false,
  accessLevel: 'prepare',
  requirePasswordChange: true,
  sendCredentialsEmail: false,
};

function statusTone(status: string) {
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-800';
  if (status === 'SUSPENDED') return 'bg-rose-100 text-rose-800';
  if (status === 'LOCKED') return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-700';
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function apiErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === 'object' && 'response' in e) {
    return (
      (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
    );
  }
  return fallback;
}

function RepModal({
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-navy/55 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <form
        onSubmit={onSubmit}
        className="relative my-auto flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-2xl"
      >
        <div className="border-b border-navy/8 bg-gradient-to-br from-[#000435] via-[#000435] to-[#1a2a6c] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FCB038]">
                {eyebrow}
              </p>
              <h2 className="mt-1 text-xl font-bold">{title}</h2>
              {description && <p className="mt-1 text-sm text-white/75">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">{children}</div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-slate-50/80 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:bg-slate-50"
          >
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-navy/70">
        {label}
      </span>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-[#f8fafc] px-4 py-3 transition hover:border-primary/30">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-semibold text-navy">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function ChiefAccountantsManagementView() {
  const toast = useToast();
  const confirm = useConfirm();
  const [reps, setReps] = useState<ChiefAccountantRow[]>([]);
  const [schools, setSchools] = useState<Awaited<ReturnType<typeof fetchChiefAccountantAssignableSchools>>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [selected, setSelected] = useState<ChiefAccountantRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [r, s] = await Promise.all([fetchChiefAccountantsAdmin(), fetchChiefAccountantAssignableSchools()]);
      setReps(r);
      setSchools(s);
    } catch (e: unknown) {
      const msg = apiErrorMessage(
        e,
        'Could not load ChiefAccountants. Ensure the auth API is updated and migrated.'
      );
      setLoadError(msg);
      setReps([]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredReps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reps;
    return reps.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        (r.phone?.toLowerCase().includes(q) ?? false)
    );
  }, [reps, search]);

  const filteredSchools = useMemo(() => {
    const q = schoolSearch.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.organizationCode?.toLowerCase().includes(q) ?? false)
    );
  }, [schools, schoolSearch]);

  function closeModal() {
    setModal(null);
    setSelected(null);
    setSchoolSearch('');
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    setSelected(null);
    setForm(EMPTY_FORM);
    setModal('create');
  }

  function repToForm(rep: ChiefAccountantRow): FormState {
    return {
      email: rep.email,
      firstName: rep.firstName,
      lastName: rep.lastName,
      phone: rep.phone ?? '',
      password: '',
      organizationIds: rep.assignments.map((a) => a.organizationId),
      enforceMfa: rep.profile?.enforceMfa ?? false,
      accessLevel: (rep.profile?.accessLevel as 'prepare' | 'approve') ?? 'prepare',
      requirePasswordChange: true,
      sendCredentialsEmail: false,
    };
  }

  function openEdit(rep: ChiefAccountantRow) {
    setSelected(rep);
    setForm(repToForm(rep));
    setModal('edit');
  }

  function openAssign(rep: ChiefAccountantRow) {
    setSelected(rep);
    setForm(repToForm(rep));
    setModal('assign');
  }

  function openPassword(rep: ChiefAccountantRow) {
    setSelected(rep);
    setForm({
      ...repToForm(rep),
      password: '',
      requirePasswordChange: true,
      sendCredentialsEmail: false,
    });
    setModal('password');
  }

  function toggleOrg(id: string) {
    setForm((f) => ({
      ...f,
      organizationIds: f.organizationIds.includes(id)
        ? f.organizationIds.filter((x) => x !== id)
        : [...f.organizationIds, id],
    }));
  }

  function showTempPassword(pwd: string) {
    setRevealedPassword(pwd);
    toast.info('Copy the temporary password below and share it securely.');
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await createChiefAccountantAdmin({
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password.trim() || undefined,
        requirePasswordChange: form.requirePasswordChange,
        sendCredentialsEmail: form.sendCredentialsEmail,
        accessLevel: form.accessLevel,
        enforceMfa: form.enforceMfa,
        organizationIds: form.organizationIds.length ? form.organizationIds : undefined,
        permissions: {
          academics: 'view',
          attendance: 'view',
          payroll: 'aggregated',
          finance: 'summary',
          reports: 'generate',
          alerts: 'view',
        },
      });
      toast.success('ChiefAccountant created');
      if (result.tempPassword) showTempPassword(result.tempPassword);
      closeModal();
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, 'Create failed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await updateChiefAccountantAdmin(selected.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        accessLevel: form.accessLevel,
        enforceMfa: form.enforceMfa,
      });
      toast.success('ChiefAccountant updated');
      closeModal();
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, 'Update failed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAssignments(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await setChiefAccountantAssignments(selected.id, {
        organizationIds: form.organizationIds,
      });
      await updateChiefAccountantAdmin(selected.id, {
        accessLevel: form.accessLevel,
        enforceMfa: form.enforceMfa,
      });
      toast.success('School assignments updated');
      closeModal();
      await load();
    } catch {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const result = await resetChiefAccountantPasswordAdmin(selected.id, {
        password: form.password.trim() || undefined,
        sendCredentialsEmail: form.sendCredentialsEmail,
        requirePasswordChange: form.requirePasswordChange,
      });
      toast.success(
        result.emailed ? 'New password emailed to the ChiefAccountant.' : 'Password updated.'
      );
      if (result.tempPassword) showTempPassword(result.tempPassword);
      closeModal();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, 'Password reset failed'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleSuspend(rep: ChiefAccountantRow) {
    const suspending = rep.status === 'ACTIVE';
    const ok = await confirm({
      title: suspending ? 'Suspend ChiefAccountant' : 'Reactivate ChiefAccountant',
      message: suspending
        ? `${rep.email} will not be able to sign in until reactivated.`
        : `Restore access for ${rep.email}?`,
      confirmLabel: suspending ? 'Suspend' : 'Reactivate',
      cancelLabel: 'Cancel',
      variant: suspending ? 'danger' : 'default',
    });
    if (!ok) return;

    setBusyId(rep.id);
    try {
      await updateChiefAccountantAdmin(rep.id, {
        status: suspending ? 'SUSPENDED' : 'ACTIVE',
      });
      toast.success(suspending ? 'ChiefAccountant suspended' : 'ChiefAccountant reactivated');
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, 'Status update failed'));
    } finally {
      setBusyId(null);
    }
  }

  async function removeRep(rep: ChiefAccountantRow) {
    const ok = await confirm({
      title: 'Delete ChiefAccountant',
      message: `Delete ${rep.email}? This removes their profile, school assignments, and login access.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    setBusyId(rep.id);
    try {
      await deleteChiefAccountantAdmin(rep.id);
      toast.success('ChiefAccountant deleted');
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, 'Delete failed'));
    } finally {
      setBusyId(null);
    }
  }

  const modalMeta = {
    create: {
      eyebrow: 'New account',
      title: 'Add ChiefAccountant',
      description: 'Create login access and optionally assign schools now.',
      submit: 'Create ChiefAccountant',
      onSubmit: handleCreate,
    },
    edit: {
      eyebrow: 'Profile',
      title: 'Edit ChiefAccountant',
      description: selected ? selected.email : undefined,
      submit: 'Save changes',
      onSubmit: handleEdit,
    },
    assign: {
      eyebrow: 'School access',
      title: 'Assign schools',
      description: selected ? `${selected.firstName} ${selected.lastName}` : undefined,
      submit: 'Save assignments',
      onSubmit: handleSaveAssignments,
    },
    password: {
      eyebrow: 'Security',
      title: 'Set password',
      description: selected ? selected.email : undefined,
      submit: 'Update password',
      onSubmit: handleResetPassword,
    },
  } as const;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organizations"
        title="ChiefAccountant Management"
        description="Create, assign, and control multi-school ChiefAccountants"
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FCB038] px-4 py-2.5 text-sm font-semibold text-[#000435] shadow-sm transition hover:bg-[#FCB038]/90"
          >
            <UserPlus className="h-4 w-4" />
            Add ChiefAccountant
          </button>
        }
      />

      {revealedPassword && (
        <div className="rounded-2xl border border-[#FCB038]/40 bg-gradient-to-r from-[#FCB038]/10 to-white px-5 py-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-navy/70">Temporary password</p>
          <p className="mt-1 text-sm text-muted">Share securely — user may be prompted to change it on first login.</p>
          <code className="mt-2 block rounded-xl bg-navy px-4 py-3 font-mono text-base text-[#FCB038]">
            {revealedPassword}
          </code>
          <button
            type="button"
            onClick={() => setRevealedPassword(null)}
            className="mt-3 text-xs font-semibold text-muted hover:text-navy"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ChiefAccountants…"
          className="input w-full pl-10"
        />
      </div>

      {loadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {loadError}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Schools</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last login</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : filteredReps.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  {reps.length === 0
                    ? 'No ChiefAccountants yet. Click “Add ChiefAccountant” to create one.'
                    : 'No ChiefAccountants match your search.'}
                </td>
              </tr>
            ) : (
              filteredReps.map((rep) => (
                <tr key={rep.id} className="border-b border-border/60 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-navy">
                    {rep.firstName} {rep.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted">{rep.email}</td>
                  <td className="px-4 py-3 text-muted">{rep.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-navy">
                      <Building2 className="h-3.5 w-3.5 text-muted" />
                      {rep.assignments.length}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(rep.status)}`}
                    >
                      {rep.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(rep.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        title="Edit profile"
                        disabled={busyId === rep.id}
                        onClick={() => openEdit(rep)}
                        className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-navy disabled:opacity-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Set password"
                        disabled={busyId === rep.id}
                        onClick={() => openPassword(rep)}
                        className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-navy disabled:opacity-50"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Assign schools"
                        disabled={busyId === rep.id}
                        onClick={() => openAssign(rep)}
                        className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-navy disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title={rep.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        disabled={busyId === rep.id}
                        onClick={() => void toggleSuspend(rep)}
                        className="rounded-lg p-2 text-muted hover:bg-amber-50 hover:text-amber-800 disabled:opacity-50"
                      >
                        {rep.status === 'ACTIVE' ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        disabled={busyId === rep.id}
                        onClick={() => void removeRep(rep)}
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

      {modal && (
        <RepModal
          open
          onClose={closeModal}
          eyebrow={modalMeta[modal].eyebrow}
          title={modalMeta[modal].title}
          description={modalMeta[modal].description}
          submitLabel={modalMeta[modal].submit}
          saving={saving}
          onSubmit={(e) => void modalMeta[modal].onSubmit(e)}
        >
          {(modal === 'create' || modal === 'edit') && (
            <>
              <section className="space-y-4">
                {modal === 'create' && (
                  <Field label="Email address">
                    <input
                      required
                      type="email"
                      className="input w-full"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="rep@example.com"
                    />
                  </Field>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name">
                    <input
                      required
                      className="input w-full"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </Field>
                  <Field label="Last name">
                    <input
                      required
                      className="input w-full"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Phone">
                  <input
                    className="input w-full"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Optional"
                  />
                </Field>
              </section>

              {modal === 'create' && (
                <section className="space-y-4 rounded-2xl border border-border bg-[#f8fafc] p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-navy/70">Login password</p>
                  <Field
                    label="Password"
                    hint="Leave empty to auto-generate a secure password (shown after create). Minimum 8 characters if you set one."
                  >
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      className="input w-full"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min. 8 characters"
                    />
                  </Field>
                  <ToggleRow
                    label="Require password change on first login"
                    checked={form.requirePasswordChange}
                    onChange={(v) => setForm({ ...form, requirePasswordChange: v })}
                  />
                  <ToggleRow
                    label="Email credentials to ChiefAccountant"
                    description="Sends login link and password to their inbox."
                    checked={form.sendCredentialsEmail}
                    onChange={(v) => setForm({ ...form, sendCredentialsEmail: v })}
                  />
                </section>
              )}

              <section className="space-y-3">
                <ToggleRow
                  label="Require email OTP on login"
                  description="After password, send a one-time code and use the standard OTP verification page."
                  checked={form.enforceMfa}
                  onChange={(v) => setForm({ ...form, enforceMfa: v })}
                />
                <Field label="Access mode">
                  <select
                    className="input w-full"
                    value={form.accessLevel}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        accessLevel: e.target.value as 'prepare' | 'approve',
                      })
                    }
                  >
                    <option value="prepare">View only</option>
                    <option value="approve">Authorized actions</option>
                  </select>
                </Field>
              </section>

              {modal === 'create' && (
                <section className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    Assign schools (optional)
                  </p>
                  <p className="text-xs text-muted">
                    Default modules: {MODULE_KEYS.join(', ')}. You can assign more schools later.
                  </p>
                  <input
                    placeholder="Search schools…"
                    className="input w-full"
                    value={schoolSearch}
                    onChange={(e) => setSchoolSearch(e.target.value)}
                  />
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-border bg-white p-2">
                    {filteredSchools.map((s) => (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={form.organizationIds.includes(s.id)}
                          onChange={() => toggleOrg(s.id)}
                        />
                        <span className="text-sm text-navy">
                          {s.name}{' '}
                          <span className="text-muted">{s.organizationCode ?? ''}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {modal === 'password' && (
            <section className="space-y-4">
              <Field
                label="New password"
                hint="Leave empty to generate a random password. Minimum 8 characters if you set one manually."
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  className="input w-full"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 characters"
                />
              </Field>
              <ToggleRow
                label="Require password change on next login"
                checked={form.requirePasswordChange}
                onChange={(v) => setForm({ ...form, requirePasswordChange: v })}
              />
              <ToggleRow
                label="Email new password"
                description="If off, the generated password is shown on screen after save."
                checked={form.sendCredentialsEmail}
                onChange={(v) => setForm({ ...form, sendCredentialsEmail: v })}
              />
            </section>
          )}

          {modal === 'assign' && (
            <section className="space-y-4">
              <Field label="Search schools">
                <input
                  className="input w-full"
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  placeholder="Name or code…"
                />
              </Field>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                {filteredSchools.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={form.organizationIds.includes(s.id)}
                      onChange={() => toggleOrg(s.id)}
                    />
                    <span className="text-sm text-navy">
                      {s.name} <span className="text-muted">{s.organizationCode ?? ''}</span>
                    </span>
                  </label>
                ))}
              </div>
              <ToggleRow
                label="Require email OTP on login"
                description="Uses the same OTP verification step as other ShulePlus logins."
                checked={form.enforceMfa}
                onChange={(v) => setForm({ ...form, enforceMfa: v })}
              />
              <Field label="Access mode">
                <select
                  className="input w-full"
                  value={form.accessLevel}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      accessLevel: e.target.value as 'prepare' | 'approve',
                    })
                  }
                >
                  <option value="prepare">View only</option>
                  <option value="approve">Authorized actions</option>
                </select>
              </Field>
            </section>
          )}
        </RepModal>
      )}
    </div>
  );
}
