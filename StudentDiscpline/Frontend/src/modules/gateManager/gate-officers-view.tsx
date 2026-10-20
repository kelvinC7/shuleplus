'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, LockKeyhole, Plus, Trash2, UserRound } from 'lucide-react';
import { DisciplineModal, FormField } from '@/components/discipline-modal';
import { GatePageLayout } from '@/modules/gateManager/gate-page-layout';
import { useGateContext } from '@/modules/gateManager/gate-context';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { GateOfficer } from '@/types/discipline';
import { toast } from 'sonner';

const emptyForm = {
  fullName: '',
  loginEmail: '',
  temporaryPassword: '',
  phone: '',
  pin: '',
  gateId: '',
  role: 'Gate Officer',
};

export function GateOfficersView() {
  const { gates, reload } = useGateContext();
  const { confirm, dialog } = useConfirmDialog();
  const [rows, setRows] = useState<GateOfficer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      const { data } = await disciplineApi.gateOfficers();
      setRows(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load gate officers'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openModal() {
    setForm({
      ...emptyForm,
      gateId: gates.find((g) => g.isDefault)?.id ?? gates[0]?.id ?? '',
    });
    setShowModal(true);
  }

  async function save() {
    const fullName = form.fullName.trim();
    const loginEmail = form.loginEmail.trim().toLowerCase();
    const temporaryPassword = form.temporaryPassword;

    if (!fullName) {
      toast.error('Full name is required');
      return;
    }
    if (!loginEmail) {
      toast.error('Login account email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      toast.error('Enter a valid login email');
      return;
    }
    if (!temporaryPassword.trim()) {
      toast.error('Temporary password is required');
      return;
    }
    if (temporaryPassword.trim().length < 8) {
      toast.error('Temporary password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      await disciplineApi.createGateOfficer({
        fullName,
        email: loginEmail,
        password: temporaryPassword,
        phone: form.phone.trim() || undefined,
        pin: form.pin || undefined,
        gateId: form.gateId || undefined,
        role: form.role,
      });
      toast.success('Gate officer added — they can sign in at /login');
      setShowModal(false);
      setForm(emptyForm);
      await load();
      await reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to add officer'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: GateOfficer) {
    const ok = await confirm({
      title: 'Remove gate officer',
      message: `Remove ${row.fullName} from gate officers?`,
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await disciplineApi.deleteGateOfficer(row.id);
      toast.success('Officer removed');
      await load();
      await reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Remove failed'));
    }
  }

  return (
    <GatePageLayout
      title="Gate Officers"
      subtitle="Assign staff to gates and link their login accounts"
      actions={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#fcb038] px-3 py-2 text-sm font-semibold text-[#000435] transition hover:bg-[#e09a2f]"
          onClick={openModal}
        >
          <Plus size={16} /> Add Officer
        </button>
      }
    >
      {dialog}
      <div className="hr-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Login account</th>
              <th className="px-4 py-3">Gate</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                  No gate officers yet. Add one to link a login account to gate operations.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#000435]">{r.fullName}</p>
                    <p className="text-xs text-slate-500">{r.role}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{r.email ?? '—'}</td>
                  <td className="px-4 py-3">{r.gate?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{r.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                      onClick={() => void remove(r)}
                      aria-label={`Remove ${r.fullName}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DisciplineModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Gate Officer"
        subtitle="Link an IAM login — officer lands on Gate Dashboard only"
        icon={<UserRound size={20} />}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Add Officer'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-[#000435]">
              <UserRound size={16} className="text-[#fcb038]" />
              <h3 className="text-sm font-semibold">Officer details</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full name" required>
                <input
                  className="discipline-input bg-white"
                  placeholder="e.g. John Doe"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </FormField>
              <FormField label="Assigned gate" required>
                <select
                  className="discipline-input bg-white"
                  value={form.gateId}
                  onChange={(e) => setForm((f) => ({ ...f, gateId: e.target.value }))}
                >
                  <option value="">Select gate</option>
                  {gates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </section>

          <section className="rounded-2xl border border-[#fcb038]/25 bg-[#fcb038]/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-[#000435]">
              <KeyRound size={16} className="text-[#fcb038]" />
              <h3 className="text-sm font-semibold">Login account</h3>
            </div>
            <FormField
              label="IAM email"
              required
              hint="Officer signs in at /login with this email and the temporary password below."
            >
              <input
                className="discipline-input border-[#fcb038]/30 bg-white"
                type="email"
                placeholder="officer@school.com"
                value={form.loginEmail}
                onChange={(e) => setForm((f) => ({ ...f, loginEmail: e.target.value }))}
              />
            </FormField>
            <div className="mt-4">
              <FormField
                label="Temporary password"
                required
                hint="Minimum 8 characters. Officer must change this on first login if required by your org policy."
              >
                <div className="relative">
                  <LockKeyhole size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="discipline-input border-[#fcb038]/30 bg-white pl-9"
                    type="password"
                    placeholder="Set initial login password"
                    value={form.temporaryPassword}
                    onChange={(e) => setForm((f) => ({ ...f, temporaryPassword: e.target.value }))}
                  />
                </div>
              </FormField>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <FormField label="Phone">
              <input
                className="discipline-input"
                placeholder="Optional contact number"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </FormField>
            <FormField label="Override PIN" hint="Required for emergency exit override">
              <input
                className="discipline-input"
                type="password"
                placeholder="4–6 digit PIN"
                value={form.pin}
                onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))}
              />
            </FormField>
          </section>
        </div>
      </DisciplineModal>
    </GatePageLayout>
  );
}
