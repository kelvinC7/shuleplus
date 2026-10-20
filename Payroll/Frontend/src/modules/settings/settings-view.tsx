'use client';

import { useEffect, useState } from 'react';
import { Calendar, Save } from 'lucide-react';
import { PayrollPageLayout } from '@/components/payroll-page-layout';
import { payrollApi } from '@/services/payroll-api';
import { defaultAcademicYear } from '@/utils/academicCalendar';

export function SettingsView() {
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [term, setTerm] = useState('Term 1');
  const [terms, setTerms] = useState(['Term 1', 'Term 2', 'Term 3']);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    payrollApi.getSettings().then(({ data }) => {
      const s = data.data;
      setAcademicYear(s.currentAcademicYear ?? defaultAcademicYear());
      setTerm(s.currentTerm ?? 'Term 1');
      if (Array.isArray(s.termsJson) && s.termsJson.length) setTerms(s.termsJson as string[]);
    });
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await payrollApi.saveSettings({
        currentAcademicYear: academicYear,
        currentTerm: term,
        termsJson: terms,
      });
      setMessage('Payroll settings saved. Academic year applies to Run, Reports and Payslips.');
    } catch {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PayrollPageLayout
      title="Payroll Settings"
      subtitle="Academic year and term — used across payroll run, reports and payslips"
      backHref="/dashboard"
      actions={
        <button type="button" className="btn-primary" onClick={() => void save()} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}
        </button>
      }
    >
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.includes('saved') ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hr-card">
        <div className="mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-amber" />
          <h2 className="font-semibold text-navy">Academic Calendar</h2>
        </div>
        <p className="mb-6 text-sm text-muted">
          Set the active academic year and term here. Payroll Run will use these values automatically instead of manual entry on each run.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">Academic Year</label>
            <input
              className="input"
              placeholder="e.g. 2025-2026"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">Current Term</label>
            <select className="input" value={term} onChange={(e) => setTerm(e.target.value)}>
              {terms.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">Terms (one per line)</label>
          <textarea
            className="input min-h-[100px] font-mono text-sm"
            value={terms.join('\n')}
            onChange={(e) => setTerms(e.target.value.split('\n').map((t) => t.trim()).filter(Boolean))}
          />
        </div>
      </div>
    </PayrollPageLayout>
  );
}
