'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  RefreshCw,
  Save,
  Scale,
  Settings2,
  Sparkles,
  Users,
} from 'lucide-react';
import { DisciplinePageLayout } from '@/components/discipline-page-layout';
import { DisciplineDataTable, type DisciplineTableColumn, PillBadge } from '@/components/discipline-data-table';
import { FormField } from '@/components/discipline-modal';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { disciplineApi, getApiErrorMessage } from '@/services/discipline-api';
import type { DisciplineMark, DisciplineOrgSettings } from '@/types/discipline';
import { signedMarkPoints } from '@/types/discipline';
import { toast } from 'sonner';

function formatSigned(type: string, points: number) {
  const signed = signedMarkPoints(type as 'REWARD' | 'DEDUCTION', points);
  return signed > 0 ? `+${signed}` : `${signed}`;
}

export function SettingsView() {
  const { confirm, dialog } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [settings, setSettings] = useState<DisciplineOrgSettings>({
    defaultMaxScore: 100,
    defaultStartingScore: 100,
    autoInitializeStudents: true,
  });
  const [defaultMarks, setDefaultMarks] = useState<DisciplineMark[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, marksRes] = await Promise.all([
        disciplineApi.disciplineSettings(),
        disciplineApi.marks({ status: 'Active', sort: 'marks' }),
      ]);
      setSettings(settingsRes.data.data);
      setDefaultMarks((marksRes.data.data ?? []).filter((m) => m.isDefault));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load settings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function applyStartingScore() {
    const ok = await confirm({
      title: 'Reset student scores',
      subtitle: `${settings.defaultStartingScore} / ${settings.defaultMaxScore}`,
      message:
        'Reset all initialized students to the current starting score? Existing case history is kept.',
      confirmLabel: 'Reset scores',
      tone: 'warning',
    });
    if (!ok) return;
    setInitializing(true);
    try {
      const { data } = await disciplineApi.applyStartingScoreToAll();
      toast.success(`Updated ${data.data.updated} student scores`);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not apply starting score'));
    } finally {
      setInitializing(false);
    }
  }

  async function saveSettings() {
    if (settings.defaultStartingScore > settings.defaultMaxScore) {
      toast.error('Starting score cannot exceed maximum score');
      return;
    }
    setSaving(true);
    try {
      const { data } = await disciplineApi.updateDisciplineSettings({
        defaultMaxScore: settings.defaultMaxScore,
        defaultStartingScore: settings.defaultStartingScore,
        autoInitializeStudents: settings.autoInitializeStudents,
      });
      setSettings((prev) => ({ ...prev, ...data.data }));
      toast.success('Discipline settings saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  async function seedDefaults() {
    setSeeding(true);
    try {
      const { data } = await disciplineApi.seedDefaultMarksFromSettings();
      if (data.data.seeded) {
        toast.success(`Added ${data.data.count ?? 11} default mark rules`);
      } else {
        toast.message('Default marks already configured');
      }
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not seed default marks'));
    } finally {
      setSeeding(false);
    }
  }

  async function initializeStudents() {
    const ok = await confirm({
      title: 'Initialize all students',
      message:
        'Initialize discipline scores for all active students from Student Management? Students who already have records will be updated.',
      confirmLabel: 'Initialize students',
      tone: 'default',
    });
    if (!ok) return;
    setInitializing(true);
    try {
      const { data } = await disciplineApi.initializeAllStudents();
      const result = data.data;
      if (result.message) {
        toast.message(result.message);
      } else {
        toast.success(`Initialized ${result.created} students (${result.skipped} already had scores)`);
      }
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Initialization failed'));
    } finally {
      setInitializing(false);
    }
  }

  const markColumns: DisciplineTableColumn<DisciplineMark>[] = [
    {
      key: 'rule',
      header: 'Default Rule',
      render: (r) => (
        <div>
          <p className="font-semibold text-[#000435]">{r.name}</p>
          <p className="text-xs text-slate-500 line-clamp-1">{r.description ?? '—'}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (r) => <PillBadge tone="blue">{r.category}</PillBadge> },
    {
      key: 'marks',
      header: 'Marks',
      render: (r) => (
        <span className={`font-semibold ${r.type === 'REWARD' ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatSigned(r.type, r.points)}
        </span>
      ),
    },
  ];

  return (
    <DisciplinePageLayout
      title="Settings"
      subtitle="Configure default discipline scores and mark rules for all students"
      actions={
        <button type="button" className="btn-primary" disabled={saving || loading} onClick={() => void saveSettings()}>
          <Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}
        </button>
      }
      kpis={[
        { label: 'Default Max Score', value: settings.defaultMaxScore },
        { label: 'Starting Score', value: settings.defaultStartingScore },
        { label: 'Students Initialized', value: settings.initializedStudents ?? 0 },
        { label: 'Active Rules', value: settings.totalMarks ?? defaultMarks.length },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="hr-card p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#000435]/10 text-[#000435]">
              <Settings2 size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#000435]">Default Student Scores</h2>
              <p className="mt-1 text-sm text-slate-500">
                Every student starts with this score. New students from Student Management use these values automatically.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Maximum Score">
              <input
                className="discipline-input"
                type="number"
                min={1}
                max={1000}
                value={settings.defaultMaxScore}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, defaultMaxScore: Math.max(1, Number(e.target.value) || 100) }))
                }
              />
            </FormField>
            <FormField label="Starting Score (all students)">
              <input
                className="discipline-input"
                type="number"
                min={0}
                max={settings.defaultMaxScore}
                value={settings.defaultStartingScore}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    defaultStartingScore: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
              />
            </FormField>
          </div>

          <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#000435]">Auto-initialize on first case</p>
              <p className="text-xs text-slate-500">Create discipline balance when a case is registered</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoInitializeStudents}
              onChange={(e) => setSettings((s) => ({ ...s, autoInitializeStudents: e.target.checked }))}
              className="h-5 w-5 rounded border-slate-300"
            />
          </label>

          <div className="mt-4 rounded-xl border border-dashed border-[#fcb038]/50 bg-[#fcb038]/5 p-4 text-sm text-slate-600">
            Preview: new students receive <strong>{settings.defaultStartingScore}</strong> /{' '}
            <strong>{settings.defaultMaxScore}</strong> discipline points.
          </div>
        </section>

        <section className="hr-card p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Users size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#000435]">Initialize All Students</h2>
              <p className="mt-1 text-sm text-slate-500">
                Pull all active students from Student Management and assign the default starting score now — no need to wait for the first case.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            disabled={initializing || loading}
            onClick={() => void initializeStudents()}
          >
            <RefreshCw size={16} className={initializing ? 'animate-spin' : ''} />
            {initializing ? 'Initializing…' : 'Initialize all students'}
          </button>

          {(settings.initializedStudents ?? 0) > 0 ? (
            <button
              type="button"
              className="btn-secondary mt-2 w-full sm:w-auto"
              disabled={initializing || loading}
              onClick={() => void applyStartingScore()}
            >
              Reset all to starting score ({settings.defaultStartingScore}/{settings.defaultMaxScore})
            </button>
          ) : null}

          <p className="mt-3 text-xs text-slate-500">
            Students who already have a discipline record are skipped. Safe to run multiple times.
          </p>
        </section>
      </div>

      <section className="hr-card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Scale size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#000435]">Default Mark Rules</h2>
              <p className="text-sm text-slate-500">
                Standard case types applied when registering discipline incidents. Used for all students.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" disabled={seeding || loading} onClick={() => void seedDefaults()}>
              <Sparkles size={16} /> {seeding ? 'Seeding…' : 'Load default rules'}
            </button>
            <Link href="/discipline/marks" className="btn-secondary inline-flex items-center gap-2">
              Manage all rules <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <DisciplineDataTable
          columns={markColumns}
          data={defaultMarks.slice(0, 8)}
          rowKey={(r) => r.id}
          page={1}
          totalPages={1}
          total={defaultMarks.length}
          pageSize={8}
          onPageChange={() => {}}
          loading={loading}
          emptyMessage="No default rules yet — click Load default rules"
        />

        {defaultMarks.length > 8 ? (
          <p className="border-t border-slate-200 px-5 py-3 text-center text-xs text-slate-500">
            Showing 8 of {defaultMarks.length} rules.{' '}
            <Link href="/discipline/marks" className="font-semibold text-[#000435] underline">
              View all
            </Link>
          </p>
        ) : null}
      </section>
      {dialog}
    </DisciplinePageLayout>
  );
}
