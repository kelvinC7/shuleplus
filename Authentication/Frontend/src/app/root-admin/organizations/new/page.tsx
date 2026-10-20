'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { BackButton } from '@/components/root-admin/back-button';
import { ORG_TYPES, type OrgType } from '@/lib/organizations';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';

const STEPS = ['Basics', 'Contact', 'Subscription', 'Review'];

const PLANS = [
  { id: 'Free', desc: 'Up to 100 users · core modules', price: '$0' },
  { id: 'Standard', desc: 'Up to 1,000 users · all academic modules', price: '$199/mo' },
  { id: 'Premium', desc: 'Unlimited users · finance + analytics', price: '$499/mo' },
];

interface FormState {
  name: string;
  type: OrgType;
  email: string;
  phone: string;
  address: string;
  subscriptionTier: string;
  status: 'ACTIVE' | 'PENDING';
}

export default function NewOrganizationPage() {
  const router = useRouter();
  const platform = usePlatformAdmin();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: '',
    type: 'SCHOOL',
    email: '',
    phone: '',
    address: '',
    subscriptionTier: 'Standard',
    status: 'ACTIVE',
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function canProceed(): boolean {
    if (step === 0) return form.name.trim().length >= 2;
    return true;
  }

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post(`${platform.apiPrefix}/organizations`, {
        name: form.name,
        type: form.type,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        subscriptionTier: form.subscriptionTier,
        status: form.status,
      });
      router.push(platform.orgDetailPath(res.data.data.id));
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to create organization.'
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton href={platform.organizationsPath} label="Back to Organizations" />
      <h1 className="font-montserrat text-2xl font-bold text-navy">Create Organization</h1>
      <p className="mb-6 text-sm text-muted">Register a new tenant on the ShulePlus platform.</p>

      {/* Stepper */}
      <div className="mb-8 flex items-center">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-poppins-bold transition ${
                  i < step
                    ? 'bg-primary text-navy'
                    : i === step
                    ? 'bg-navy text-primary'
                    : 'bg-navy/5 text-muted'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </span>
              <span
                className={`mt-1.5 text-[11px] font-poppins-medium ${
                  i === step ? 'text-navy' : 'text-muted'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 rounded ${i < step ? 'bg-primary' : 'bg-navy/10'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded-lg bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>
        )}

        {/* Step 0: Basics */}
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Organization Name *">
              <input
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Kigali International School"
                suppressHydrationWarning
                className="input"
              />
            </Field>
            <Field label="Organization Type">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ORG_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update('type', t)}
                    className={`rounded-lg border py-2 text-xs font-poppins-medium transition ${
                      form.type === t
                        ? 'border-primary bg-primary/10 text-navy'
                        : 'border-border text-muted hover:border-primary/40'
                    }`}
                  >
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* Step 1: Contact */}
        {step === 1 && (
          <div className="space-y-4">
            <Field label="Owner / Admin Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="admin@organization.com"
                suppressHydrationWarning
                className="input"
              />
            </Field>
            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+250 7XX XXX XXX"
                suppressHydrationWarning
                className="input"
              />
            </Field>
            <Field label="Address">
              <input
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="City, Country"
                suppressHydrationWarning
                className="input"
              />
            </Field>
          </div>
        )}

        {/* Step 2: Subscription */}
        {step === 2 && (
          <div className="space-y-4">
            <Field label="Subscription Plan">
              <div className="space-y-2">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => update('subscriptionTier', p.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                      form.subscriptionTier === p.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div>
                      <p className="font-poppins-semibold text-navy">{p.id}</p>
                      <p className="text-xs text-muted">{p.desc}</p>
                    </div>
                    <span className="font-poppins-bold text-primary">{p.price}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Initial Status">
              <div className="flex gap-2">
                {(['ACTIVE', 'PENDING'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update('status', s)}
                    className={`flex-1 rounded-lg border py-2.5 text-sm font-poppins-medium transition ${
                      form.status === s
                        ? 'border-primary bg-primary/10 text-navy'
                        : 'border-border text-muted hover:border-primary/40'
                    }`}
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="font-poppins-semibold text-navy">Review &amp; Confirm</p>
            {[
              ['Name', form.name],
              ['Type', form.type],
              ['Email', form.email || '—'],
              ['Phone', form.phone || '—'],
              ['Address', form.address || '—'],
              ['Plan', form.subscriptionTier],
              ['Status', form.status],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-border py-2 text-sm">
                <span className="text-muted">{label}</span>
                <span className="font-poppins-medium text-navy">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Nav */}
        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={() => (step === 0 ? router.back() : setStep((s) => s - 1))}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-poppins-medium text-navy transition hover:bg-navy/5"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!canProceed()}
              onClick={() => setStep((s) => s + 1)}
              className="rounded-xl bg-navy px-6 py-2.5 text-sm font-poppins-semibold text-primary transition hover:bg-navy-light disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-poppins-semibold text-navy transition hover:bg-primary-hover disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create Organization'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-poppins-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
