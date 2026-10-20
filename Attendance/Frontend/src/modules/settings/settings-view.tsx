'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, Save } from 'lucide-react';
import { attendanceApi, type AttendanceSettings } from '@/services/attendance-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';
import { ScheduleRulesPanel, type ScheduleTab } from './schedule-rules-panel';

const KIGALI_TZ = 'Africa/Kigali';

function useKigaliClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString('en-GB', {
    timeZone: KIGALI_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return { time };
}

function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 px-3.5 py-3 transition hover:bg-slate-50/80">
      <span className="text-sm font-medium text-navy">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-primary' : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white">
      <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-navy">{title}</h2>
      <div className="space-y-2 p-4">{children}</div>
    </section>
  );
}

type SettingsMainTab = 'general' | ScheduleTab;

const SETTINGS_TABS: { id: SettingsMainTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'class', label: 'Classes' },
  { id: 'weekday', label: 'Days' },
  { id: 'date', label: 'Dates' },
];

export function SettingsView() {
  const toast = useToast();
  const clock = useKigaliClock();
  const [mainTab, setMainTab] = useState<SettingsMainTab>('general');
  const [form, setForm] = useState<Partial<AttendanceSettings> | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data }, academicRes] = await Promise.all([
        attendanceApi.settingsGet(),
        attendanceApi.academicContext().catch(() => null),
      ]);
      const settings = data.data;
      const academic = academicRes?.data?.data;
      setForm({
        ...settings,
        academicYear: academic?.currentAcademicYear || settings.academicYear,
        term: academic?.currentTerm || settings.term,
        schoolName: (settings.schoolName || '').replace(/\\+/g, '').trim() || settings.schoolName,
      });
      setDirty(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load settings'));
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function patch(updates: Partial<AttendanceSettings>) {
    setForm((f) => ({ ...f, ...updates }));
    setDirty(true);
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      await attendanceApi.settingsPut(form);
      toast.success('Saved. New taps use these times now.');
      setDirty(false);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  if (!form && mainTab === 'general') {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted">
        <Loader2 size={18} className="animate-spin" /> Loading settings…
      </div>
    );
  }

  const policyToggles: Array<[keyof AttendanceSettings, string]> = [
    ['enableEntry', 'Entry taps'],
    ['enableExit', 'Exit taps'],
    ['enableLateDetection', 'Late detection'],
    ['enableWeekend', 'Weekends'],
    ['enableHoliday', 'Holidays'],
  ];

  const notifyToggles: Array<[keyof AttendanceSettings, string]> = [
    ['enableParentNotify', 'Parent app'],
    ['enableSms', 'SMS to parents'],
  ];

  const times: Array<[keyof AttendanceSettings, string]> = [
    ['schoolStarts', 'School starts'],
    ['lateStarts', 'Late after'],
    ['schoolEnds', 'School ends'],
    ['maxExitTime', 'Latest exit'],
    ['attendanceClosingTime', 'Entry closes'],
    ['weekendStart', 'Weekend start'],
  ];

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-navy sm:text-2xl">Settings</h1>
        <p className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm tabular-nums text-navy">
          <MapPin size={14} className="text-muted" />
          {clock.time}
          <span className="text-muted">Kigali</span>
        </p>
      </div>

      <div className="flex gap-0.5 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {SETTINGS_TABS.map((tab) => {
          const active = mainTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMainTab(tab.id)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                active ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {mainTab !== 'general' ? <ScheduleRulesPanel tab={mainTab} /> : null}

      {mainTab === 'general' && form ? (
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Default times">
          <div className="grid gap-3 sm:grid-cols-2">
            {times.map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-1 block text-xs font-medium text-navy/70">{label}</span>
                <input
                  className="input font-mono tabular-nums"
                  type="time"
                  value={String(form[key] ?? '')}
                  onChange={(e) => patch({ [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Policies">
          {policyToggles.map(([key, label]) => (
            <SettingToggle
              key={key}
              label={label}
              checked={Boolean(form[key])}
              onChange={(v) => patch({ [key]: v })}
            />
          ))}
        </SectionCard>

        <SectionCard title="Notifications">
          {notifyToggles.map(([key, label]) => (
            <SettingToggle
              key={key}
              label={label}
              checked={Boolean(form[key])}
              onChange={(v) => patch({ [key]: v })}
            />
          ))}
        </SectionCard>

        <SectionCard title="School">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-navy/70">Name</span>
            <input
              className="input"
              value={form.schoolName ?? ''}
              onChange={(e) => patch({ schoolName: e.target.value })}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-navy/70">Year</span>
              <input className="input bg-slate-50" value={form.academicYear ?? ''} readOnly />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-navy/70">Term</span>
              <input className="input bg-slate-50" value={form.term ?? ''} readOnly />
            </label>
          </div>
        </SectionCard>
      </div>
      ) : null}

      {mainTab === 'general' ? (
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 px-4 py-2.5 backdrop-blur sm:px-6 lg:pl-[calc(272px+1.5rem)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <span className="text-sm text-muted">{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
            disabled={saving || !dirty}
            onClick={() => void save()}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save
          </button>
        </div>
      </div>
      ) : null}
    </div>
  );
}
