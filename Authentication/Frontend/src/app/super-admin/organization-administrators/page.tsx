'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  KeyRound,
  LayoutGrid,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import { PageHeader } from '@/components/shared';
import { useToast } from '@/shared/notifications';

type CatalogModule = {
  id: string;
  slug: string;
  name: string;
  shortName?: string | null;
  category?: string | null;
  frontendUrl?: string | null;
};

type PlatformUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
  modules: Array<{ slug: string; name: string; accessLevel: string }>;
  lastLoginAt?: string | null;
  createdAt: string;
};

type AssignmentDraft = {
  slug: string;
  accessLevel: 'USER' | 'HEAD';
};

const STEPS = [
  { id: 'profile', title: 'Profile' },
  { id: 'modules', title: 'Modules' },
  { id: 'review', title: 'Review' },
];

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  position: '',
  password: '',
  sendCredentialsEmail: true,
  requirePasswordChange: true,
  mfaEnabled: false,
};

export default function OrganizationUsersAccessPage() {
  const platform = usePlatformAdmin();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [modules, setModules] = useState<CatalogModule[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [assignments, setAssignments] = useState<AssignmentDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const [created, setCreated] = useState<{
    email: string;
    password?: string;
    sent?: boolean;
    moduleCount?: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, modulesRes] = await Promise.all([
        api.get(`${platform.apiPrefix}/platform-users`),
        api.get(`${platform.apiPrefix}/platform-users/modules`),
      ]);
      setUsers(usersRes.data.data ?? []);
      setModules(modulesRes.data.data ?? []);
    } catch {
      setUsers([]);
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, [platform.apiPrefix]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.modules.some((m) => m.name.toLowerCase().includes(q) || m.slug.includes(q))
    );
  });

  function openWizard() {
    setWizardOpen(true);
    setStep(0);
    setForm(EMPTY);
    setAssignments([]);
    setCreated(null);
  }

  function closeWizard() {
    setWizardOpen(false);
    setCreated(null);
  }

  function toggleModule(slug: string, checked: boolean) {
    setAssignments((prev) => {
      if (!checked) return prev.filter((a) => a.slug !== slug);
      if (prev.some((a) => a.slug === slug)) return prev;
      return [...prev, { slug, accessLevel: 'USER' }];
    });
  }

  const canContinue =
    step === 0
      ? Boolean(form.firstName.trim() && form.lastName.trim() && form.email.trim())
      : step === 1
        ? assignments.length > 0
        : true;

  async function submit() {
    setSubmitting(true);
    try {
      const res = await api.post(`${platform.apiPrefix}/platform-users`, {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        department: form.department.trim() || undefined,
        position: form.position.trim() || undefined,
        password: form.password.trim() || undefined,
        moduleAssignments: assignments.map((a) => ({
          slug: a.slug,
          accessLevel: a.accessLevel,
          dataScope: a.accessLevel === 'HEAD' ? 'ORGANIZATION' : 'SELF',
        })),
        sendCredentialsEmail: form.sendCredentialsEmail,
        requirePasswordChange: form.requirePasswordChange,
        mfaEnabled: form.mfaEnabled,
        status: 'ACTIVE',
      });
      setCreated({
        email: res.data.data.email,
        password: res.data.data.tempPassword,
        sent: res.data.data.credentialsSent,
        moduleCount: assignments.length,
      });
      toast.success(
        res.data.data.credentialsSent
          ? `Credentials emailed to ${res.data.data.email}.`
          : `User created: ${res.data.data.email}.`,
        'User created'
      );
      await loadData();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to create user',
        'Create failed'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const uniqueModuleCount = new Set(users.flatMap((u) => u.modules.map((m) => m.slug))).size;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Access control"
        title="Users & Access"
        description="Register national and system-level users (NESA officers, ministry staff, auditors, etc.) with direct module access. No organization required — they log in with email and password and land in their assigned module dashboard."
        action={
          <button
            type="button"
            onClick={openWizard}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-navy transition hover:brightness-105"
          >
            <UserPlus size={16} /> Register User
          </button>
        }
      />

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-9"
              placeholder="Search users by name, email, or module…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="Platform users" value={users.length} icon={<Users size={18} />} />
          <Stat
            label="Active"
            value={users.filter((u) => u.status === 'ACTIVE').length}
            icon={<UserPlus size={18} />}
          />
          <Stat label="Available modules" value={modules.length} icon={<LayoutGrid size={18} />} />
        </div>
        {uniqueModuleCount > 0 ? (
          <p className="mt-3 text-xs text-muted">
            {uniqueModuleCount} module{uniqueModuleCount === 1 ? '' : 's'} currently assigned across
            platform users.
          </p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-navy">Module operators</h2>
          <p className="text-sm text-muted">
            Centrally managed users with no school or institution. Assigned modules define where they
            land after login.
          </p>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-muted">Loading…</p>
        ) : filteredUsers.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Users className="mx-auto text-muted" size={28} />
            <p className="mt-3 font-semibold text-navy">No platform users yet</p>
            <p className="mt-1 text-sm text-muted">
              Register the first module operator — e.g. a NESA officer for the NESA Dashboard.
            </p>
            <button type="button" onClick={openWizard} className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus size={16} /> Register User
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredUsers.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-semibold text-navy">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-sm text-muted">{u.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-lg bg-navy/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy">
                      module operator
                    </span>
                    {u.modules.map((m) => (
                      <span
                        key={m.slug}
                        className="rounded-lg border border-border px-2 py-0.5 text-[10px] font-medium text-muted"
                      >
                        {m.name}
                        {m.accessLevel === 'HEAD' ? ' · Head' : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-navy/5 text-muted'
                  }`}
                >
                  {u.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {wizardOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/45 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">New account</p>
                <h3 className="text-lg font-bold text-navy">Register module operator</h3>
              </div>
              <button type="button" onClick={closeWizard} className="rounded-lg p-2 text-muted hover:bg-navy/5">
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-border bg-navy/[0.02] px-5 py-3">
              <div className="flex items-center gap-1 overflow-x-auto">
                {STEPS.map((s, i) => (
                  <div key={s.id} className="flex items-center">
                    <div className="flex flex-col items-center px-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                          i < step
                            ? 'bg-emerald-500 text-white'
                            : i === step
                              ? 'bg-primary text-navy'
                              : 'bg-navy/10 text-muted'
                        }`}
                      >
                        {i < step ? <Check size={14} /> : i + 1}
                      </span>
                      <span className="mt-1 text-[10px] font-medium text-muted">{s.title}</span>
                    </div>
                    {i < STEPS.length - 1 ? (
                      <div className={`mx-1 h-0.5 w-6 rounded ${i < step ? 'bg-emerald-500' : 'bg-border'}`} />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {created ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <KeyRound className="text-emerald-600" size={22} />
                    <div>
                      <p className="font-semibold text-navy">User ready</p>
                      <p className="mt-1 text-sm text-muted">
                        {created.sent
                          ? `Credentials emailed to ${created.email}.`
                          : `Share login credentials with ${created.email}.`}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        {created.moduleCount === 1
                          ? 'On login they go straight into their assigned module dashboard (e.g. NESA). No organization selection required.'
                          : 'On login they pick from their assigned modules, or go direct if only one is enabled.'}
                      </p>
                    </div>
                  </div>
                  {created.password ? (
                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                      <p className="text-xs font-semibold uppercase text-muted">Temporary password</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <code className="text-base font-semibold text-navy">{created.password}</code>
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          onClick={() => void navigator.clipboard.writeText(created.password!)}
                        >
                          <Copy size={14} /> Copy
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <button type="button" onClick={closeWizard} className="btn-primary w-full">
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {step === 0 && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted">
                        Personal and account details. Email is the login username.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label="First name *"
                          value={form.firstName}
                          onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
                        />
                        <Field
                          label="Last name *"
                          value={form.lastName}
                          onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
                        />
                        <div className="sm:col-span-2">
                          <Field
                            label="Email address (login) *"
                            value={form.email}
                            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                            type="email"
                          />
                        </div>
                        <Field
                          label="Phone"
                          value={form.phone}
                          onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                        />
                        <Field
                          label="Department"
                          value={form.department}
                          onChange={(v) => setForm((f) => ({ ...f, department: v }))}
                        />
                        <Field
                          label="Position"
                          value={form.position}
                          onChange={(v) => setForm((f) => ({ ...f, position: v }))}
                        />
                        <Field
                          label="Password (optional — auto-generated if blank)"
                          value={form.password}
                          onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                          type="password"
                        />
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted">
                        Select one or more modules. Users with a single module land there directly on
                        login.
                      </p>
                      {modules.length === 0 ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                          No enabled modules in the catalog yet. Add modules in Module Catalog first.
                        </div>
                      ) : (
                        modules.map((mod) => {
                          const active = assignments.some((a) => a.slug === mod.slug);
                          const assignment = assignments.find((a) => a.slug === mod.slug);
                          return (
                            <div
                              key={mod.slug}
                              className={`rounded-2xl border p-4 transition ${
                                active ? 'border-primary bg-primary/5' : 'border-border'
                              }`}
                            >
                              <label className="flex cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  className="mt-1"
                                  checked={active}
                                  onChange={(e) => toggleModule(mod.slug, e.target.checked)}
                                />
                                <div className="flex-1">
                                  <p className="font-semibold text-navy">{mod.name}</p>
                                  <p className="text-xs text-muted">
                                    {mod.category ? `${mod.category} · ` : ''}
                                    {mod.slug}
                                    {mod.frontendUrl ? '' : ' · no launch URL yet'}
                                  </p>
                                </div>
                              </label>
                              {active ? (
                                <div className="mt-3 flex gap-2 pl-7">
                                  {(['USER', 'HEAD'] as const).map((level) => (
                                    <button
                                      key={level}
                                      type="button"
                                      onClick={() =>
                                        setAssignments((prev) =>
                                          prev.map((a) =>
                                            a.slug === mod.slug ? { ...a, accessLevel: level } : a
                                          )
                                        )
                                      }
                                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                        assignment?.accessLevel === level
                                          ? 'bg-navy text-primary'
                                          : 'border border-border text-muted'
                                      }`}
                                    >
                                      {level === 'HEAD' ? 'Module Head' : 'Module User'}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-3 rounded-2xl border border-border bg-navy/[0.02] p-4 text-sm">
                      <Row label="Name" value={`${form.firstName} ${form.lastName}`.trim()} />
                      <Row label="Email" value={form.email} />
                      <Row label="Type" value="Module operator (no organization)" />
                      <Row
                        label="Modules"
                        value={assignments.map((a) => a.slug).join(', ') || 'None'}
                      />
                      {assignments.length === 1 ? (
                        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                          Login lands directly in <strong>{assignments[0].slug}</strong> — no
                          organization or launcher step required.
                        </p>
                      ) : null}
                      <label className="flex items-center gap-2 pt-2 text-navy">
                        <input
                          type="checkbox"
                          checked={form.sendCredentialsEmail}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, sendCredentialsEmail: e.target.checked }))
                          }
                        />
                        Email login credentials
                      </label>
                      <label className="flex items-center gap-2 text-navy">
                        <input
                          type="checkbox"
                          checked={form.requirePasswordChange}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, requirePasswordChange: e.target.checked }))
                          }
                        />
                        Force password change on first login
                      </label>
                      <label className="flex items-center gap-2 text-navy">
                        <input
                          type="checkbox"
                          checked={form.mfaEnabled}
                          onChange={(e) => setForm((f) => ({ ...f, mfaEnabled: e.target.checked }))}
                        />
                        Enable two-factor authentication
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!created ? (
              <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
                <button
                  type="button"
                  onClick={() => (step === 0 ? closeWizard() : setStep((s) => s - 1))}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-navy"
                >
                  {step === 0 ? 'Cancel' : 'Back'}
                </button>
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    disabled={!canContinue}
                    onClick={() => setStep((s) => s + 1)}
                    className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-primary disabled:opacity-40"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting || !canContinue}
                    onClick={() => void submit()}
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-navy disabled:opacity-50"
                  >
                    {submitting ? 'Creating…' : 'Create & Activate'}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-navy/[0.02] px-4 py-3">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-navy">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-navy">{label}</span>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-navy">{value}</span>
    </div>
  );
}
