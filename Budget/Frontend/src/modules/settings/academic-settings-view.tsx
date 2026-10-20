'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Save } from 'lucide-react';
import { budgetApi, unwrap } from '@/services/budget-api';
import { useToast } from '@/shared/notifications';
import { useAuth } from '@/contexts/auth-context';
import { getApiErrorMessage } from '@/utils/api-error';
import {
  defaultAcademicSettings,
  suggestNextYear,
  validateAcademicYear,
  type AcademicSettings,
} from '@/lib/academic-settings';

function isOrgAdmin(roles: string[]) {
  return roles.some((r) => {
    const lower = r.toLowerCase();
    return lower.includes('organization_admin') || lower === 'super_admin' || lower === 'root_admin';
  });
}

export function AcademicSettingsView() {
  const toast = useToast();
  const { user } = useAuth();
  const canEdit = isOrgAdmin(user?.roles ?? []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AcademicSettings>(defaultAcademicSettings());
  const [newYear, setNewYear] = useState('');
  const [newTerm, setNewTerm] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await budgetApi.getAcademicSettings();
      const data = unwrap(res.data);
      setSettings({
        academicYears: data.academicYears?.length ? data.academicYears : defaultAcademicSettings().academicYears,
        terms: data.terms?.length ? data.terms : defaultAcademicSettings().terms,
        currentAcademicYear: data.currentAcademicYear,
        currentTerm: data.currentTerm,
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load academic settings'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await budgetApi.updateAcademicSettings(settings);
      setSettings(unwrap(res.data));
      toast.success('Academic settings saved — all modules will use these values.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  }

  function addYear() {
    const value = newYear.trim() || suggestNextYear(settings.academicYears);
    if (!validateAcademicYear(value)) {
      toast.error('Use format 2025-2026');
      return;
    }
    if (settings.academicYears.includes(value)) {
      toast.error('Academic year already exists');
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
    if (settings.academicYears.length <= 1) return;
    const academicYears = settings.academicYears.filter((y) => y !== year);
    setSettings({
      ...settings,
      academicYears,
      currentAcademicYear:
        settings.currentAcademicYear === year ? academicYears[0] : settings.currentAcademicYear,
    });
  }

  function addTerm() {
    const value = newTerm.trim();
    if (!value) return;
    if (settings.terms.includes(value)) {
      toast.error('Term already exists');
      return;
    }
    setSettings({ ...settings, terms: [...settings.terms, value] });
    setNewTerm('');
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-muted">
        Loading academic settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-navy">
            <Image
              src="/yellow-icon.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-lg object-contain"
            />
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted">
            Academic year and term — synced with Organization Admin. Used when creating budgets.
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        ) : null}
      </div>

      {!canEdit ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Only organization admins can change academic settings. You can still use the values below when creating budgets.
        </div>
      ) : null}

      <section className="hr-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-navy/70">
          <CalendarDays size={16} className="text-primary" />
          Current period
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Current academic year
            </span>
            <select
              value={settings.currentAcademicYear ?? ''}
              onChange={(e) => setSettings({ ...settings, currentAcademicYear: e.target.value || null })}
              disabled={!canEdit}
              className="input disabled:opacity-70"
            >
              {settings.academicYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Current term</span>
            <select
              value={settings.currentTerm ?? ''}
              onChange={(e) => setSettings({ ...settings, currentTerm: e.target.value || null })}
              disabled={!canEdit}
              className="input disabled:opacity-70"
            >
              {settings.terms.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="hr-card p-5 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/70">Academic years</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.academicYears.map((year) => (
            <span
              key={year}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                settings.currentAcademicYear === year ? 'bg-primary text-navy' : 'bg-navy/5 text-navy'
              }`}
            >
              {year}
              {settings.currentAcademicYear === year ? <span className="opacity-70">· current</span> : null}
              {canEdit && settings.academicYears.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeYear(year)}
                  className="rounded-full p-0.5 hover:bg-black/10"
                  aria-label={`Remove ${year}`}
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
        </div>
        {canEdit ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              placeholder={suggestNextYear(settings.academicYears)}
              className="input min-w-[160px] flex-1"
            />
            <button
              type="button"
              onClick={addYear}
              className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-navy hover:bg-primary/20"
            >
              Add year
            </button>
          </div>
        ) : null}
      </section>

      <section className="hr-card p-5 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/70">Terms</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {settings.terms.map((term) => (
            <span key={term} className="rounded-full bg-navy/5 px-3 py-1.5 text-xs font-semibold text-navy">
              {term}
            </span>
          ))}
        </div>
        {canEdit ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder="e.g. Term 1"
              className="input min-w-[160px] flex-1"
            />
            <button
              type="button"
              onClick={addTerm}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-50"
            >
              Add term
            </button>
          </div>
        ) : null}
      </section>

      <p className="text-xs text-muted">
        These settings are shared with{' '}
        <Link href={process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'} className="font-semibold text-primary hover:underline">
          Organization Admin
        </Link>
        . Changes apply across Babyeyi, Student Management, Procurement, and Budget.
      </p>
    </div>
  );
}
