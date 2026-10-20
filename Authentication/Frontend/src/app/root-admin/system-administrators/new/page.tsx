'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { BackButton } from '@/components/root-admin/back-button';
import { useToast } from '@/shared/notifications';
import {
  ADMIN_ROLES,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  defaultPermissionsForRole,
  type AdminRole,
  type DataScope,
} from '@/lib/platform-administrators';

const STEPS = ['Information', 'Account', 'Role', 'Permissions', 'Security', 'Review'];

export default function CreateAdministratorPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    requirePasswordChange: true,
    accountExpiry: '',
    role: 'SUPER_ADMIN' as AdminRole,
    dataScope: 'GLOBAL' as DataScope,
    customScope: '',
    requireMfa: true,
    requireEmailVerification: true,
    requireStrongPassword: true,
    restrictIp: false,
    restrictDevice: false,
    sendInvitation: true,
  });

  const [permissions, setPermissions] = useState(() =>
    defaultPermissionsForRole('SUPER_ADMIN')
  );

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === 'role') {
      setPermissions(defaultPermissionsForRole(value as AdminRole));
    }
  }

  function togglePermission(module: string, action: string) {
    setPermissions((p) => ({
      ...p,
      [module]: { ...p[module], [action]: !p[module]?.[action] },
    }));
  }

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/root-admin/platform-administrators', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.sendInvitation ? undefined : form.password || undefined,
        role: form.role,
        requirePasswordChange: form.requirePasswordChange,
        sendInvitation: form.sendInvitation,
      });
      const { invitationSent } = res.data.data as {
        id: string;
        invitationSent?: boolean;
      };

      if (form.sendInvitation) {
        if (invitationSent) {
          toast.success(
            `${form.firstName} ${form.lastName} was created. Setup invitation sent to ${form.email}.`,
            'Administrator created'
          );
        } else {
          toast.warning(
            `${form.firstName} ${form.lastName} was created, but the setup email could not be sent. Check SMTP settings or resend the invitation.`,
            'Invitation not sent'
          );
        }
      } else {
        toast.success(
          `${form.firstName} ${form.lastName} was created as ${form.role.replace(/_/g, ' ')}.`,
          'Administrator created'
        );
      }
      router.push(`/root-admin/system-administrators/${res.data.data.id}`);
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { message?: string; errors?: { field: string; message: string }[] } };
      };
      const fieldErrors = apiError?.response?.data?.errors;
      const message =
        fieldErrors?.length
          ? fieldErrors.map((e) => `${e.field}: ${e.message}`).join(', ')
          : apiError?.response?.data?.message ?? 'Failed to create administrator.';
      setError(message);
      toast.error(message, 'Could not create administrator');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackButton href="/root-admin/system-administrators" label="Back to Administrators" />
      <h1 className="font-montserrat text-2xl font-bold text-navy">Create Administrator</h1>
      <p className="mb-6 text-sm text-muted">Register a new platform administrator with role-based access.</p>

      {/* Stepper */}
      <div className="mb-8 flex overflow-x-auto pb-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex min-w-[72px] flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-poppins-bold ${
                  i < step ? 'bg-primary text-navy' : i === step ? 'bg-navy text-primary' : 'bg-navy/5 text-muted'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </span>
              <span className={`mt-1 text-[10px] ${i === step ? 'text-navy font-poppins-semibold' : 'text-muted'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-1 h-0.5 flex-1 rounded ${i < step ? 'bg-primary' : 'bg-navy/10'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {error && <div className="mb-4 rounded-lg bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

        {step === 0 && (
          <Section title="Administrator Information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First Name *">
                <input className="input" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required suppressHydrationWarning />
              </Field>
              <Field label="Last Name *">
                <input className="input" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required suppressHydrationWarning />
              </Field>
              <Field label="Email *">
                <input type="email" className="input sm:col-span-2" value={form.email} onChange={(e) => update('email', e.target.value)} required suppressHydrationWarning />
              </Field>
              <Field label="Phone Number">
                <input className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} suppressHydrationWarning />
              </Field>
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section title="Account Information">
            <div className="space-y-4">
              <Field label="Username">
                <input className="input" placeholder="Auto-generated from email" value={form.username} onChange={(e) => update('username', e.target.value)} suppressHydrationWarning />
              </Field>
              <label className="flex items-center gap-3 rounded-xl border border-border p-4">
                <input type="checkbox" checked={form.sendInvitation} onChange={(e) => update('sendInvitation', e.target.checked)} className="h-4 w-4 accent-primary" />
                <div>
                  <p className="font-poppins-semibold text-sm text-navy">Send invitation email</p>
                  <p className="text-xs text-muted">Admin sets their own password after accepting (recommended)</p>
                </div>
              </label>
              {!form.sendInvitation && (
                <Field label="Temporary Password *">
                  <input type="password" className="input" minLength={12} value={form.password} onChange={(e) => update('password', e.target.value)} suppressHydrationWarning />
                </Field>
              )}
              <label className="flex items-center gap-2 text-sm text-navy">
                <input type="checkbox" checked={form.requirePasswordChange} onChange={(e) => update('requirePasswordChange', e.target.checked)} className="accent-primary" />
                Require password change on first login
              </label>
              <Field label="Account Expiry Date">
                <input type="date" className="input" value={form.accountExpiry} onChange={(e) => update('accountExpiry', e.target.value)} suppressHydrationWarning />
              </Field>
            </div>
          </Section>
        )}

        {step === 2 && (
          <Section title="Administrator Role">
            <div className="grid gap-3 sm:grid-cols-2">
              {ADMIN_ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => update('role', r.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    form.role === r.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <p className="font-poppins-semibold text-navy">{r.label}</p>
                  <p className="mt-1 text-xs text-muted">{r.description}</p>
                </button>
              ))}
            </div>
            <div className="mt-6">
              <p className="mb-2 text-xs font-poppins-semibold uppercase tracking-wide text-muted">Data Access Scope</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['GLOBAL', 'REGIONAL', 'COUNTRY', 'CUSTOM'] as DataScope[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update('dataScope', s)}
                    className={`rounded-lg border px-4 py-2 text-xs font-poppins-semibold ${
                      form.dataScope === s ? 'border-primary bg-primary/10 text-navy' : 'border-border text-muted'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {form.dataScope === 'CUSTOM' && (
                <input
                  className="input mt-3"
                  placeholder="e.g. East Africa Only, Rwanda Only"
                  value={form.customScope}
                  onChange={(e) => update('customScope', e.target.value)}
                  suppressHydrationWarning
                />
              )}
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section title="Permissions Assignment">
            <label className="mb-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={advancedMode} onChange={(e) => setAdvancedMode(e.target.checked)} className="accent-primary" />
              <span className="font-poppins-semibold text-navy">Advanced Mode</span>
            </label>
            {advancedMode ? (
              <div className="space-y-4">
                {PERMISSION_MODULES.map((mod) => (
                  <div key={mod.key} className="rounded-xl border border-border p-4">
                    <p className="mb-3 font-poppins-semibold text-sm text-navy">{mod.label}</p>
                    <div className="flex flex-wrap gap-4">
                      {PERMISSION_ACTIONS.map((action) => (
                        <label key={action} className="flex items-center gap-2 text-sm capitalize">
                          <input
                            type="checkbox"
                            checked={permissions[mod.key]?.[action] ?? false}
                            onChange={() => togglePermission(mod.key, action)}
                            className="accent-primary"
                          />
                          {action}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                Default permissions for <strong>{form.role.replace(/_/g, ' ')}</strong> will be applied automatically.
              </p>
            )}
          </Section>
        )}

        {step === 4 && (
          <Section title="Security Settings">
            <div className="space-y-3">
              {[
                { key: 'requireMfa' as const, label: 'Require MFA', desc: 'Mandatory two-factor authentication' },
                { key: 'requireEmailVerification' as const, label: 'Require Email Verification', desc: 'Must verify email before access' },
                { key: 'requireStrongPassword' as const, label: 'Require Strong Password', desc: 'Enforce 12+ character password policy' },
                { key: 'restrictIp' as const, label: 'Restrict IP Access', desc: 'Limit login to approved IP addresses' },
                { key: 'restrictDevice' as const, label: 'Restrict Device Access', desc: 'Only registered devices allowed' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <p className="font-poppins-semibold text-sm text-navy">{item.label}</p>
                    <p className="text-xs text-muted">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form[item.key]}
                    onChange={(e) => update(item.key, e.target.checked)}
                    className="h-5 w-5 accent-primary"
                  />
                </label>
              ))}
            </div>
          </Section>
        )}

        {step === 5 && (
          <Section title="Review & Confirm">
            <div className="space-y-2">
              {[
                ['Name', `${form.firstName} ${form.lastName}`],
                ['Email', form.email],
                ['Phone', form.phone || '—'],
                ['Role', form.role.replace(/_/g, ' ')],
                ['Data Scope', form.dataScope + (form.customScope ? ` (${form.customScope})` : '')],
                ['Delivery', form.sendInvitation ? 'Send invitation email' : 'Set password manually'],
                ['MFA Required', form.requireMfa ? 'Yes' : 'No'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border py-2 text-sm">
                  <span className="text-muted">{k}</span>
                  <span className="font-poppins-medium text-navy">{v}</span>
                </div>
              ))}
            </div>
            {form.sendInvitation && (
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-navy">
                <p className="font-poppins-semibold">Invitation workflow</p>
                <p className="mt-1 text-xs text-muted">
                  Create Admin → Send Invitation → Admin Accepts → Sets Password → Enable MFA
                </p>
              </div>
            )}
          </Section>
        )}

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={() => (step === 0 ? router.back() : setStep((s) => s - 1))}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-poppins-medium text-navy hover:bg-navy/5"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={step === 0 && !form.firstName.trim()}
              onClick={() => setStep((s) => s + 1)}
              className="rounded-xl bg-navy px-6 py-2.5 text-sm font-poppins-semibold text-primary disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-poppins-semibold text-navy disabled:opacity-50"
            >
              {submitting ? 'Creating…' : form.sendInvitation ? 'Create & Send Invitation' : 'Create Administrator'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 font-montserrat text-lg font-bold text-navy">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-poppins-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}
