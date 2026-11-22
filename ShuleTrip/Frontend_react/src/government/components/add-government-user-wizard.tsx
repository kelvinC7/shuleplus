import { useState } from 'react';
import { GOV_ROLE_CATALOG } from '@/government/config/roles';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { govApi } from '@/services/api';

export type GovOfficial = {
  id: string;
  fullName: string;
  email: string;
  employeeRef?: string;
  roleSlug: string;
  authority: string;
  jurisdictionScope: 'assigned_only' | 'sectors' | 'districts' | 'national';
  districts: string[];
  sectors: string[];
  permissions: string[];
  canFinalApprove: boolean;
  status: 'invited' | 'active' | 'suspended';
  invitedAt: string;
  assignedApplicationCount: number;
};

export function AddGovernmentUserWizard({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    employeeRef: '',
    roleSlug: 'education_reviewer',
    authority: 'District Education Office',
    jurisdictionScope: 'districts' as const,
    districts: '',
    sectors: '',
    canFinalApprove: false,
  });

  const role = GOV_ROLE_CATALOG.find((r) => r.slug === form.roleSlug);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await govApi.post('/government/admin/officials', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        employeeRef: form.employeeRef.trim() || undefined,
        roleSlug: form.roleSlug,
        authority: form.authority.trim(),
        jurisdictionScope: form.jurisdictionScope,
        districts: form.districts.split(',').map((s) => s.trim()).filter(Boolean),
        sectors: form.sectors.split(',').map((s) => s.trim()).filter(Boolean),
        permissions: role?.defaultPermissions ?? [],
        canFinalApprove: form.canFinalApprove,
        status: 'invited',
      });
      onCreated();
      onClose();
      setStep(0);
      setForm({
        fullName: '',
        email: '',
        employeeRef: '',
        roleSlug: 'education_reviewer',
        authority: 'District Education Office',
        jurisdictionScope: 'districts',
        districts: '',
        sectors: '',
        canFinalApprove: false,
      });
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not create official');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add government user" size="lg">
      <div className="mb-6 flex gap-2">
        {['Personal', 'Role', 'Jurisdiction', 'Confirm'].map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-bold ${i <= step ? 'bg-navy text-white' : 'bg-slate-100 text-slate-500'}`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {step === 0 ? (
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-700">
            Full name
            <input
              className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Official's full name"
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Official email
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="official@organization.gov"
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Employee reference (optional)
            <input
              className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm"
              value={form.employeeRef}
              onChange={(e) => setForm({ ...form, employeeRef: e.target.value })}
            />
          </label>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-700">
            Government role
            <select
              className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm"
              value={form.roleSlug}
              onChange={(e) => setForm({ ...form, roleSlug: e.target.value })}
            >
              {GOV_ROLE_CATALOG.filter((r) => r.slug !== 'super_admin').map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          {role ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{role.summary}</p> : null}
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <input
              type="checkbox"
              checked={form.canFinalApprove}
              onChange={(e) => setForm({ ...form, canFinalApprove: e.target.checked })}
            />
            Grant final approval permission (subject to workflow rules)
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-700">
            Authority / organization
            <input
              className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm"
              value={form.authority}
              onChange={(e) => setForm({ ...form, authority: e.target.value })}
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Access scope
            <select
              className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm"
              value={form.jurisdictionScope}
              onChange={(e) =>
                setForm({ ...form, jurisdictionScope: e.target.value as typeof form.jurisdictionScope })
              }
            >
              <option value="assigned_only">Assigned applications only</option>
              <option value="sectors">Assigned sector(s)</option>
              <option value="districts">Assigned district(s)</option>
              <option value="national">National (explicit authorization)</option>
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Districts (comma-separated)
            <input
              className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm"
              value={form.districts}
              onChange={(e) => setForm({ ...form, districts: e.target.value })}
            />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Sectors (comma-separated)
            <input
              className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm"
              value={form.sectors}
              onChange={(e) => setForm({ ...form, sectors: e.target.value })}
            />
          </label>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3 rounded-xl border border-line bg-slate-50 p-4 text-sm">
          <p>
            <strong>{form.fullName}</strong> · {form.email}
          </p>
          <p>Role: {role?.label}</p>
          <p>Authority: {form.authority}</p>
          <p className="text-slate-600">
            After saving, create or invite the login in <strong>Shule+ IAM</strong> with matching email and assign the
            IAM role slug <code className="rounded bg-white px-1">{form.roleSlug}</code> (or mapped district officer role).
            ShuleTrip never stores plain-text passwords.
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="mt-6 flex justify-between gap-2">
        <Button variant="outline" onClick={() => (step === 0 ? onClose() : setStep(step - 1))} disabled={busy}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < 3 ? (
          <Button
            variant="primary"
            onClick={() => setStep(step + 1)}
            disabled={step === 0 && (form.fullName.length < 2 || !form.email.includes('@'))}
          >
            Continue
          </Button>
        ) : (
          <Button variant="amber" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Create official record'}
          </Button>
        )}
      </div>
    </Modal>
  );
}
