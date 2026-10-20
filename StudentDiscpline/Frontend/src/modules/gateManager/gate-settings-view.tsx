'use client';

import { useCallback, useEffect, useState } from 'react';
import { GatePageLayout } from '@/modules/gateManager/gate-page-layout';
import { useGateContext } from '@/modules/gateManager/gate-context';
import { FormField } from '@/components/discipline-modal';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { Gate } from '@/types/discipline';
import { toast } from 'sonner';

export function GateSettingsView() {
  const { gates, reload } = useGateContext();
  const [rows, setRows] = useState<Gate[]>([]);
  const [form, setForm] = useState({ name: '', code: '', location: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await disciplineApi.gates();
      setRows(data.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load gates'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addGate() {
    if (!form.name.trim()) {
      toast.error('Gate name is required');
      return;
    }
    setSaving(true);
    try {
      await disciplineApi.createGate({
        name: form.name.trim(),
        code: form.code || undefined,
        location: form.location || undefined,
      });
      toast.success('Gate created');
      setForm({ name: '', code: '', location: '' });
      await load();
      await reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create gate'));
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(id: string) {
    try {
      await disciplineApi.updateGate(id, { isDefault: true });
      toast.success('Default gate updated');
      await load();
      await reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Update failed'));
    }
  }

  return (
    <GatePageLayout title="Gate Settings" subtitle="Configure campus gates and locations">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="hr-card p-5">
          <h2 className="text-sm font-semibold text-[#000435]">Campus Gates</h2>
          <p className="mt-1 text-xs text-slate-500">Each transaction is tagged with the active gate.</p>
          <div className="mt-4 space-y-2">
            {rows.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="font-semibold text-[#000435]">{g.name}</p>
                  <p className="text-xs text-slate-500">{g.code ?? '—'} · {g.location ?? 'No location'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {g.isDefault ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Default</span> : (
                    <button type="button" className="btn-secondary py-1 text-xs" onClick={() => void setDefault(g.id)}>Set Default</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hr-card p-5">
          <h2 className="text-sm font-semibold text-[#000435]">Add Gate</h2>
          <div className="mt-4 space-y-4">
            <FormField label="Gate Name" required>
              <input className="discipline-input" placeholder="Main Gate" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Code"><input className="discipline-input" placeholder="MAIN" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></FormField>
            <FormField label="Location"><input className="discipline-input" placeholder="Front entrance" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></FormField>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void addGate()}>{saving ? 'Saving…' : 'Add Gate'}</button>
          </div>

          <div className="mt-8 rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-semibold text-[#000435]">Security rule</p>
            <p className="mt-2">Students cannot exit with a card alone. The gate verifies active enrollment, valid approved permission, date/time validity, and checkout status before allowing exit.</p>
          </div>
        </div>
      </div>
    </GatePageLayout>
  );
}
