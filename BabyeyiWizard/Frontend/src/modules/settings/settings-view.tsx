'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useAcademicPeriod } from '@/contexts/academic-period-context';
import {
  parseAcademicSettings,
  suggestNextYear,
  validateYear,
  type AcademicSettings,
} from '@/lib/academic-settings';
import { useToast } from '@/shared/notifications';
import {
  fetchAcademicSettings,
  fetchSettings,
  updateAcademicSettings,
  updateSettings,
} from '@/services/babyeyi-api';

export function SettingsView() {
  const toast = useToast();
  const { refresh: refreshPeriod } = useAcademicPeriod();
  const [loading, setLoading] = useState(true);
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [auditLogs, setAuditLogs] = useState<Array<{ action: string; actorName?: string; createdAt: string }>>([]);
  const [settings, setSettings] = useState<AcademicSettings | null>(null);
  const [newYear, setNewYear] = useState('');
  const [newTerm, setNewTerm] = useState('');
  const [themeColor, setThemeColor] = useState('#FCB038');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [academicRaw, general] = await Promise.all([fetchAcademicSettings(), fetchSettings()]);
      setSettings(parseAcademicSettings(academicRaw));
      setAuditLogs(general.auditLogs ?? []);
      setThemeColor((general.profile?.themeColor as string) ?? '#FCB038');
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveAcademic() {
    if (!settings) return;
    setSavingAcademic(true);
    try {
      const data = parseAcademicSettings(await updateAcademicSettings(settings));
      setSettings(data);
      await refreshPeriod();
      toast.success('All modules will use this current year.', 'Academic settings saved');
    } catch {
      toast.error('Failed to save academic settings', 'Save failed');
    } finally {
      setSavingAcademic(false);
    }
  }

  async function handleSaveBranding() {
    setSavingBranding(true);
    try {
      await updateSettings({ themeColor });
      toast.success('Branding saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSavingBranding(false);
    }
  }

  function addYear() {
    if (!settings) return;
    const value = newYear.trim() || suggestNextYear(settings.academicYears);
    if (!validateYear(value)) {
      toast.error('Use format 2025-2026', 'Invalid academic year');
      return;
    }
    if (settings.academicYears.includes(value)) {
      toast.error('Academic year already exists', 'Duplicate year');
      return;
    }
    setSettings({
      ...settings,
      academicYears: [...settings.academicYears, value].sort(),
      currentAcademicYear: settings.currentAcademicYear ?? value,
    });
    setNewYear('');
  }

  function removeYear(year: string) {
    if (!settings || settings.academicYears.length <= 1) return;
    const academicYears = settings.academicYears.filter((y) => y !== year);
    setSettings({
      ...settings,
      academicYears,
      currentAcademicYear:
        settings.currentAcademicYear === year ? academicYears[0] : settings.currentAcademicYear,
    });
  }

  function addTerm() {
    if (!settings) return;
    const value = newTerm.trim();
    if (!value) return;
    if (settings.terms.includes(value)) {
      toast.error('Term already exists', 'Duplicate term');
      return;
    }
    setSettings({ ...settings, terms: [...settings.terms, value] });
    setNewTerm('');
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!settings) {
    return <p className="text-sm text-red-600">Unable to load settings</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Academic year and term are shared with organization settings and used across Babyeyi, ShuleKit,
          and other modules.
        </p>
      </div>

      <section className="hr-card p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Current period</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Current academic year
            </span>
            <select
              value={settings.currentAcademicYear ?? ''}
              onChange={(e) => setSettings({ ...settings, currentAcademicYear: e.target.value })}
              className="input w-full"
            >
              {settings.academicYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Current term</span>
            <select
              value={settings.currentTerm ?? ''}
              onChange={(e) => setSettings({ ...settings, currentTerm: e.target.value })}
              className="input w-full"
            >
              {settings.terms.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="hr-card p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Academic years</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.academicYears.map((year) => (
            <span
              key={year}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                settings.currentAcademicYear === year ? 'bg-primary text-navy' : 'bg-navy/5 text-navy'
              }`}
            >
              {year}
              {settings.currentAcademicYear === year && <span className="opacity-70">· current</span>}
              {settings.academicYears.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeYear(year)}
                  className="rounded-full p-0.5 hover:bg-black/10"
                  aria-label={`Remove ${year}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={newYear}
            onChange={(e) => setNewYear(e.target.value)}
            placeholder={suggestNextYear(settings.academicYears)}
            className="input min-w-[160px] flex-1"
          />
          <button type="button" onClick={addYear} className="btn-secondary">
            Add year
          </button>
        </div>
      </section>

      <section className="hr-card p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Terms</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.terms.map((term) => (
            <span key={term} className="rounded-full bg-navy/5 px-3 py-1.5 text-xs font-semibold text-navy">
              {term}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="e.g. Term 1"
            className="input min-w-[160px] flex-1"
          />
          <button type="button" onClick={addTerm} className="btn-secondary">
            Add term
          </button>
        </div>
        <button
          type="button"
          disabled={savingAcademic}
          onClick={() => void handleSaveAcademic()}
          className="btn-primary mt-4"
        >
          <Save size={16} /> {savingAcademic ? 'Saving…' : 'Save academic settings'}
        </button>
      </section>

      <section className="hr-card p-6">
        <h3 className="font-bold text-navy">Branding</h3>
        <div className="mt-4">
          <label className="text-xs font-semibold text-navy">Theme Color</label>
          <input
            className="input mt-1 max-w-[120px]"
            type="color"
            value={themeColor}
            onChange={(e) => setThemeColor(e.target.value)}
          />
        </div>
        <button type="button" onClick={() => void handleSaveBranding()} className="btn-secondary mt-4">
          <Save size={16} /> {savingBranding ? 'Saving…' : 'Save branding'}
        </button>
      </section>

      <section className="hr-card p-6">
        <h3 className="font-bold text-navy">Audit Logs</h3>
        <div className="mt-4 space-y-2">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted">No audit entries yet.</p>
          ) : (
            auditLogs.map((log, i) => (
              <div key={i} className="flex justify-between border-b border-border py-2 text-sm">
                <span className="text-navy">{log.action}</span>
                <span className="text-muted">
                  {log.actorName} · {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
