'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

import { DeviceFormModal } from '@/components/device-form-modal';
import { ModuleHeader } from '@/components/layout/module-header';
import { Wizard } from '@/components/shared/wizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

const STEPS = [
  { id: 'org', title: 'Organization', description: 'Basic organization details' },
  { id: 'modules', title: 'Modules', description: 'Select modules to activate' },
  { id: 'users', title: 'Admin User', description: 'Set up the primary administrator' },
  { id: 'review', title: 'Review', description: 'Confirm and complete setup' },
];

export function OnboardingView() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    orgName: '',
    country: '',
    industry: '',
    adminName: '',
    adminEmail: '',
    modules: { hr: true, finance: true, inventory: false },
    notes: '',
  });

  useEffect(() => {
    if (!done) setOpen(true);
  }, [done]);

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[16px] border border-border/60 bg-card p-12 text-center shadow-soft">
        <CheckCircle className="size-16 text-success" />
        <h2 className="mt-4 text-2xl font-bold text-foreground">Onboarding Complete!</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your organization is ready. Head to the dashboard to get started.</p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mt-6 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <ModuleHeader
          title="Onboarding Wizard"
          breadcrumbs={['Home', 'Onboarding']}
          backHref="/dashboard"
          icon={<WandIcon />}
          iconClassName="bg-emerald-500"
        />
        <div className="hr-card flex flex-col items-center justify-center p-10 text-center">
          <p className="text-sm text-muted">Complete organization setup in a guided wizard.</p>
          <button type="button" className="btn-primary mt-4" onClick={() => setOpen(true)}>
            Start Setup
          </button>
        </div>
      </div>

      <DeviceFormModal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next && !done) router.push('/dashboard');
        }}
        title="Onboarding Wizard"
        description="Set up your organization, modules, and admin user"
        size="xl"
      >
      <Wizard
        steps={STEPS}
        currentStep={step}
        onStepChange={setStep}
        onFinish={() => setDone(true)}
        finishLabel="Complete Setup"
        isLastStepValid={!!form.orgName && !!form.adminEmail}
      >
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Organization Name *</Label>
              <Input value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} placeholder="Acme School" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v ?? '' })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rw">Rwanda</SelectItem>
                    <SelectItem value="ke">Kenya</SelectItem>
                    <SelectItem value="ug">Uganda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v ?? '' })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="health">Healthcare</SelectItem>
                    <SelectItem value="ngo">NGO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {[
              { key: 'hr' as const, label: 'Human Resources', desc: 'Staff management, payroll, attendance' },
              { key: 'finance' as const, label: 'Finance & Budget', desc: 'Budgeting, expenses, reporting' },
              { key: 'inventory' as const, label: 'Inventory', desc: 'Asset and stock management' },
            ].map((mod) => (
              <label key={mod.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-4 hover:bg-muted/30">
                <Checkbox
                  checked={form.modules[mod.key]}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, modules: { ...form.modules, [mod.key]: !!checked } })
                  }
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{mod.label}</p>
                  <p className="text-xs text-muted-foreground">{mod.desc}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Admin Full Name</Label>
              <Input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} placeholder="Jean Ishimwe" />
            </div>
            <div className="space-y-2">
              <Label>Admin Email *</Label>
              <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="admin@organization.com" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/40 p-4 text-sm">
              <p><span className="font-medium">Organization:</span> {form.orgName || '—'}</p>
              <p className="mt-1"><span className="font-medium">Country:</span> {form.country || '—'}</p>
              <p className="mt-1"><span className="font-medium">Admin:</span> {form.adminName} ({form.adminEmail})</p>
              <p className="mt-1"><span className="font-medium">Modules:</span>{' '}
                {Object.entries(form.modules).filter(([, v]) => v).map(([k]) => k).join(', ') || 'None'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Any special requirements…" />
            </div>
          </div>
        )}
      </Wizard>
      </DeviceFormModal>
    </>
  );
}

function WandIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8l1.4 1.4M6.2 6.2L4.8 4.8M17.8 6.2l1.4-1.4M6.2 11.8l-1.4 1.4M12 18a6 6 0 100-12 6 6 0 000 12z" />
    </svg>
  );
}
