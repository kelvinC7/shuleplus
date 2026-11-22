'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarX,
  Clock,
  Info,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Scale,
  Settings2,
  Sparkles,
  Users,
  type LucideIcon,
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

function DeductionCard({
  title,
  description,
  enabled,
  points,
  tone,
  icon: Icon,
  onToggle,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  points: number;
  tone: 'rose' | 'amber';
  icon: LucideIcon;
  onToggle: () => void;
  onChange: (points: number) => void;
}) {
  const palette =
    tone === 'rose'
      ? {
          card: 'border-rose-200 bg-rose-50/50',
          idle: 'border-slate-200 bg-slate-50/60',
          icon: 'bg-rose-100 text-rose-700',
          accent: 'text-rose-700',
          preset: 'border-rose-200 bg-white text-rose-700 hover:bg-rose-100',
        }
      : {
          card: 'border-amber-200 bg-amber-50/50',
          idle: 'border-slate-200 bg-slate-50/60',
          icon: 'bg-amber-100 text-amber-700',
          accent: 'text-amber-700',
          preset: 'border-amber-200 bg-white text-amber-700 hover:bg-amber-100',
        };

  return (
    <div className={`rounded-2xl border p-4 transition ${enabled ? palette.card : palette.idle}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${palette.icon}`}>
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#000435]">{title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`${enabled ? 'Disable' : 'Enable'} ${title}`}
          onClick={onToggle}
          className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
            enabled ? 'bg-[#000435]' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          disabled={!enabled || points <= 0}
          onClick={() => onChange(Math.max(0, points - 1))}
          aria-label={`Decrease ${title} points`}
        >
          <Minus size={15} />
        </button>
        <input
          type="number"
          min={0}
          max={100}
          inputMode="numeric"
          className="discipline-input w-20 !py-2 text-center text-base font-bold"
          disabled={!enabled}
          value={points}
          onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
        />
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          disabled={!enabled || points >= 100}
          onClick={() => onChange(Math.min(100, points + 1))}
          aria-label={`Increase ${title} points`}
        >
          <Plus size={15} />
        </button>
        <span className="text-xs font-medium text-slate-500">points per event</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5].map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={!enabled}
            onClick={() => onChange(preset)}
            className={`rounded-full border px-3 py-1 text-xs font-bold transition disabled:opacity-40 ${
              points === preset ? `border-transparent bg-[#000435] text-white` : palette.preset
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      <p className={`mt-3 text-xs font-semibold ${enabled ? palette.accent : 'text-slate-500'}`}>
        {enabled
          ? `Deducts ${points} point${points === 1 ? '' : 's'} automatically for each event`
          : 'Automation is off — no marks will be created'}
      </p>
    </div>
  );
}

export function SettingsView({
  title = 'Settings',
  subtitle = 'Configure default discipline scores and mark rules for all students',
}: {
  title?: string;
  subtitle?: string;
} = {}) {
  const { confirm, dialog } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [settings, setSettings] = useState<DisciplineOrgSettings>({
    defaultMaxScore: 100,
    defaultStartingScore: 100,
    autoInitializeStudents: true,
    absenceDeductionEnabled: true,
    absenceDeductionPoints: 4,
    autoAbsenceDeductionEnabled: false,
    autoAbsenceLastRunDate: null,
    lateDeductionEnabled: true,
    lateDeductionPoints: 2,
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
        absenceDeductionEnabled: settings.absenceDeductionEnabled,
        absenceDeductionPoints: settings.absenceDeductionPoints,
        autoAbsenceDeductionEnabled: settings.autoAbsenceDeductionEnabled ?? false,
        lateDeductionEnabled: settings.lateDeductionEnabled,
        lateDeductionPoints: settings.lateDeductionPoints,
      });
      setSettings((prev) => ({ ...prev, ...data.data }));
      setDefaultMarks((prev) =>
        prev.map((mark) => {
          if (mark.name === 'Absence Without Permission') {
            return { ...mark, points: data.data.absenceDeductionPoints };
          }
          if (mark.name === 'Late Coming') {
            return { ...mark, points: data.data.lateDeductionPoints };
          }
          return mark;
        })
      );
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
      title={title}
      subtitle={subtitle}
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
        {
          label: 'Absence Deduction',
          value: settings.absenceDeductionEnabled ? `-${settings.absenceDeductionPoints}` : 'Off',
        },
        {
          label: 'Late Deduction',
          value: settings.lateDeductionEnabled ? `-${settings.lateDeductionPoints}` : 'Off',
        },
        {
          label: 'Auto Daily',
          value: settings.autoAbsenceDeductionEnabled ? 'On' : 'Off',
        },
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

      <section className="hr-card mt-6 p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#000435] text-[#FCB038]">
              <CalendarX size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#000435]">Attendance Deductions</h2>
              <p className="mt-1 text-sm text-slate-500">
                Configure discipline points removed for absence or late coming. You can apply manually from Attendance
                Records or let the system run automatically every day.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            <Info size={13} /> Safe to re-run
          </span>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  settings.autoAbsenceDeductionEnabled
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                <Clock size={20} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-[#000435] sm:text-base">Automatic daily absence marks</p>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                      settings.autoAbsenceDeductionEnabled
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {settings.autoAbsenceDeductionEnabled ? 'On' : 'Off'}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                  When turned on, the system automatically applies absence deductions every school day for students marked
                  absent (using the Student absence points above). When turned off, it stops running — existing marks are
                  never removed.
                </p>
                {settings.autoAbsenceLastRunDate ? (
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    Last automatic run: <span className="text-[#000435]">{settings.autoAbsenceLastRunDate}</span>
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(settings.autoAbsenceDeductionEnabled)}
              aria-label="Toggle automatic daily absence marks"
              onClick={() =>
                setSettings((s) => ({ ...s, autoAbsenceDeductionEnabled: !s.autoAbsenceDeductionEnabled }))
              }
              className={`relative inline-flex h-7 w-14 shrink-0 items-center self-start rounded-full transition sm:self-auto ${
                settings.autoAbsenceDeductionEnabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  settings.autoAbsenceDeductionEnabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {!settings.absenceDeductionEnabled && settings.autoAbsenceDeductionEnabled ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              “Student absence” deduction is off, so automatic runs won’t create marks until you enable it and save.
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <DeductionCard
            title="Student absence"
            description="Removes points when a student has no attendance tap for a school day."
            enabled={settings.absenceDeductionEnabled}
            points={settings.absenceDeductionPoints}
            tone="rose"
            icon={CalendarX}
            onToggle={() =>
              setSettings((s) => ({
                ...s,
                absenceDeductionEnabled: !s.absenceDeductionEnabled,
              }))
            }
            onChange={(points) =>
              setSettings((s) => ({ ...s, absenceDeductionPoints: points }))
            }
          />
          <DeductionCard
            title="Late coming"
            description="Removes points when a student is flagged as arriving after the start time."
            enabled={settings.lateDeductionEnabled}
            points={settings.lateDeductionPoints}
            tone="amber"
            icon={Clock}
            onToggle={() =>
              setSettings((s) => ({
                ...s,
                lateDeductionEnabled: !s.lateDeductionEnabled,
              }))
            }
            onChange={(points) => setSettings((s) => ({ ...s, lateDeductionPoints: points }))}
          />
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-[#FCB038]/50 bg-[#FCB038]/5 p-4 text-xs leading-relaxed text-slate-600 sm:text-sm">
          Saving these values also updates the default <strong>Absence Without Permission</strong> and{' '}
          <strong>Late Coming</strong> mark rules. Re-applying marks for the same day never duplicates a case.
        </div>
      </section>

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

        <div className="divide-y divide-slate-100 md:hidden">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#000435]" />
              Loading rules…
            </p>
          ) : defaultMarks.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No default rules yet — click Load default rules
            </p>
          ) : (
            defaultMarks.slice(0, 8).map((rule) => (
              <div key={rule.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#000435]">{rule.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{rule.description ?? '—'}</p>
                  <div className="mt-1.5">
                    <PillBadge tone="blue">{rule.category}</PillBadge>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    rule.type === 'REWARD'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {formatSigned(rule.type, rule.points)}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block">
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
        </div>

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
