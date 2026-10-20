'use client';

import { useCallback, useEffect, useState } from 'react';
import { orgAdminApi, type AcademicSettings } from '@/lib/org-admin-api';
import { useToast } from '@/shared/notifications';

const YEAR_PATTERN = /^\d{4}-\d{4}$/;

function validateYear(value: string): boolean {
  if (!YEAR_PATTERN.test(value)) return false;
  const [a, b] = value.split('-').map(Number);
  return b === a + 1;
}

function suggestNextYear(years: string[]): string {
  if (!years.length) {
    const start = new Date().getFullYear();
    return `${start}-${start + 1}`;
  }
  const sorted = [...years].sort();
  const end = Number(sorted[sorted.length - 1].split('-')[1]);
  return `${end}-${end + 1}`;
}

interface AcademicSettingsViewProps {
  embedded?: boolean;
}

export function AcademicSettingsView({ embedded = false }: AcademicSettingsViewProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AcademicSettings | null>(null);
  const [newYear, setNewYear] = useState('');
  const [newTerm, setNewTerm] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await orgAdminApi.getAcademicSettings();
      setSettings(data.data);
    } catch {
      setError('Failed to load academic settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await orgAdminApi.updateAcademicSettings(settings);
      setSettings(data.data);
      toast.success(
        'All modules will use this current year.',
        'Academic settings saved'
      );
    } catch {
      toast.error('Failed to save academic settings', 'Save failed');
    } finally {
      setSaving(false);
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
    setError(null);
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
    setError(null);
  }

  function updateTermDate(term: string, field: 'start' | 'end', value: string) {
    if (!settings) return;
    const termDates = { ...(settings.termDates ?? {}) };
    const current = termDates[term] ?? { start: '', end: '' };
    termDates[term] = { ...current, [field]: value };
    setSettings({ ...settings, termDates });
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!settings) {
    return <p className="text-sm text-red-600">{error ?? 'Unable to load settings'}</p>;
  }

  return (
    <div className={embedded ? 'space-y-6' : 'mx-auto max-w-3xl space-y-6'}>
      {!embedded ? (
        <div>
          <h1 className="text-2xl font-bold text-navy">Academic Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Set the current academic year and term for Timetable, Student Management, Babyeyi, ShuleKit, and your
            public school website.
          </p>
        </div>
      ) : null}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Current period</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Current academic year
            </span>
            <select
              value={settings.currentAcademicYear ?? ''}
              onChange={(e) => setSettings({ ...settings, currentAcademicYear: e.target.value })}
              className="w-full rounded-xl border border-border bg-[#f8fafc] px-3 py-2.5 text-sm text-navy outline-none focus:border-primary"
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
              className="w-full rounded-xl border border-border bg-[#f8fafc] px-3 py-2.5 text-sm text-navy outline-none focus:border-primary"
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

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Academic years</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.academicYears.map((year) => (
            <span
              key={year}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                settings.currentAcademicYear === year
                  ? 'bg-primary text-navy'
                  : 'bg-navy/5 text-navy'
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
            className="min-w-[160px] flex-1 rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={addYear}
            className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-navy hover:bg-primary/20"
          >
            Add year
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Terms</h2>
        <p className="mt-1 text-xs text-muted">
          Set start and end dates for each term. Attendance uses these for performance bars and analytics.
        </p>
        <div className="mt-4 space-y-3">
          {settings.terms.map((term) => (
            <div
              key={term}
              className="grid gap-3 rounded-xl border border-border/80 bg-slate-50/80 p-3 sm:grid-cols-[minmax(0,1fr)_1fr_1fr]"
            >
              <span className="self-center text-sm font-semibold text-navy">{term}</span>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold uppercase tracking-wide text-muted">Start</span>
                <input
                  type="date"
                  value={settings.termDates?.[term]?.start ?? ''}
                  onChange={(e) => updateTermDate(term, 'start', e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold uppercase tracking-wide text-muted">End</span>
                <input
                  type="date"
                  value={settings.termDates?.[term]?.end ?? ''}
                  onChange={(e) => updateTermDate(term, 'end', e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="e.g. Term 1"
            className="min-w-[160px] flex-1 rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={addTerm}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-navy hover:bg-navy/5"
          >
            Add term
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-navy">Report cards</h3>
        <p className="mt-1 text-xs text-muted">Comments and verification for term report cards (Academic & TichaPortal).</p>
        {settings && (
          <div className="mt-4 space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.reportCard?.enableClassTeacherComments !== false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reportCard: {
                      ...settings.reportCard,
                      enableClassTeacherComments: e.target.checked,
                    },
                  })
                }
              />
              Class teachers can write comments (TichaPortal)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.reportCard?.enableHeadTeacherComments !== false}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reportCard: {
                      ...settings.reportCard,
                      enableHeadTeacherComments: e.target.checked,
                    },
                  })
                }
              />
              Head teacher comment on report cards
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-navy">Default head teacher comment</span>
              <textarea
                value={settings.reportCard?.defaultHeadTeacherComment ?? ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reportCard: {
                      ...settings.reportCard,
                      defaultHeadTeacherComment: e.target.value,
                    },
                  })
                }
                rows={3}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="Optional default text when no custom comment is saved"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-navy">Hint for class teachers</span>
              <input
                value={settings.reportCard?.classTeacherCommentHint ?? ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reportCard: {
                      ...settings.reportCard,
                      classTeacherCommentHint: e.target.value,
                    },
                  })
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="e.g. Comment on effort and conduct"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-navy">Report verification URL (optional)</span>
              <input
                value={settings.reportCard?.verifyBaseUrl ?? ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reportCard: {
                      ...settings.reportCard,
                      verifyBaseUrl: e.target.value,
                    },
                  })
                }
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="https://your-domain/api/v1/public/report-card/verify"
              />
            </label>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="rounded-xl bg-navy px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-navy/90 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
