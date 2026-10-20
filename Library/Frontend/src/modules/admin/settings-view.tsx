'use client';

import { useState, useEffect } from 'react';
import { Settings, AlertCircle, Save } from 'lucide-react';
import { LibPageLayout } from '@/components/lib-page-layout';
import { FormField } from '@/components/lib-modal';
import { libApi } from '@/services/lib-api';
import type { LibrarySettings } from '@/types';

export default function SettingsView() {
  const [form, setForm] = useState<Partial<LibrarySettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    libApi.getSettings()
      .then((data) => setForm(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (field: keyof LibrarySettings, value: string | number | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    setSaved(false);
    try {
      await libApi.updateSettings(form);
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LibPageLayout title="Library Settings" subtitle="Configure loan rules and library preferences">
        <div className="hr-card flex items-center justify-center p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </LibPageLayout>
    );
  }

  return (
    <LibPageLayout
      title="Library Settings"
      subtitle="Configure loan periods, fines, and library preferences"
      actions={
        <button form="settings-form" type="submit" disabled={saving} className="btn-primary">
          {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent" /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      }
    >
      <form id="settings-form" onSubmit={handleSubmit} className="hr-card space-y-6 p-6">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {saved && (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            Settings saved successfully.
          </div>
        )}

        <div>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-navy">
            <Settings size={16} /> Loan Rules
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Loan Period (days)">
              <input className="input" type="number" min="1" value={form.loanPeriodDays ?? 14} onChange={(e) => set('loanPeriodDays', Number(e.target.value))} />
            </FormField>
            <FormField label="Max Books (Student)">
              <input className="input" type="number" min="1" value={form.maxBooksStudent ?? 3} onChange={(e) => set('maxBooksStudent', Number(e.target.value))} />
            </FormField>
            <FormField label="Max Books (Teacher)">
              <input className="input" type="number" min="1" value={form.maxBooksTeacher ?? 5} onChange={(e) => set('maxBooksTeacher', Number(e.target.value))} />
            </FormField>
            <FormField label="Max Renewals">
              <input className="input" type="number" min="0" value={form.maxRenewals ?? 2} onChange={(e) => set('maxRenewals', Number(e.target.value))} />
            </FormField>
            <FormField label="Due Reminder (days before)">
              <input className="input" type="number" min="0" value={form.dueReminderDays ?? 2} onChange={(e) => set('dueReminderDays', Number(e.target.value))} />
            </FormField>
            <FormField label="Overdue Reminder (days after)">
              <input className="input" type="number" min="0" value={form.overdueReminderDays ?? 1} onChange={(e) => set('overdueReminderDays', Number(e.target.value))} />
            </FormField>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-navy">
            <input type="checkbox" checked={form.renewalsAllowed ?? true} onChange={(e) => set('renewalsAllowed', e.target.checked)} className="h-4 w-4 rounded" />
            Allow loan renewals
          </label>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-navy">Fines</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex items-center gap-2 text-sm text-navy sm:col-span-3">
              <input type="checkbox" checked={form.finesEnabled ?? false} onChange={(e) => set('finesEnabled', e.target.checked)} className="h-4 w-4 rounded" />
              Enable fines for overdue books
            </label>
            <FormField label="Fine per Day">
              <input className="input" type="number" min="0" step="0.01" value={form.finePerDay ?? 0} onChange={(e) => set('finePerDay', Number(e.target.value))} disabled={!form.finesEnabled} />
            </FormField>
            <FormField label="Maximum Fine">
              <input className="input" type="number" min="0" step="0.01" value={form.maxFine ?? 0} onChange={(e) => set('maxFine', Number(e.target.value))} disabled={!form.finesEnabled} />
            </FormField>
            <FormField label="Lost Book Policy">
              <select className="input" value={form.lostBookPolicy ?? 'REPLACE'} onChange={(e) => set('lostBookPolicy', e.target.value)}>
                <option value="REPLACE">Replace book</option>
                <option value="PAY_FINE">Pay fine</option>
                <option value="BOTH">Replace and pay fine</option>
              </select>
            </FormField>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-navy">Scanning</h3>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-navy">
              <input type="checkbox" checked={form.barcodeEnabled ?? true} onChange={(e) => set('barcodeEnabled', e.target.checked)} className="h-4 w-4 rounded" />
              Barcode scanning enabled
            </label>
            <label className="flex items-center gap-2 text-sm text-navy">
              <input type="checkbox" checked={form.qrEnabled ?? true} onChange={(e) => set('qrEnabled', e.target.checked)} className="h-4 w-4 rounded" />
              QR code scanning enabled
            </label>
          </div>
        </div>
      </form>
    </LibPageLayout>
  );
}
