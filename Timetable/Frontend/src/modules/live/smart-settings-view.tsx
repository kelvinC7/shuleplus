'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { HrPageLayout } from '@/components/hr-page-layout';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import {
  timetableApi,
  type AcademicSettingsData,
  type SmartClassroom,
  type SmartSettings,
} from '@/services/timetable-api';

export function SmartSettingsView() {
  const {
    settings: academic,
    save: saveAcademic,
    reload: reloadAcademic,
    source: academicSource,
    warning: academicWarning,
  } = useAcademicSettings();
  const [settings, setSettings] = useState<SmartSettings | null>(null);
  const [classrooms, setClassrooms] = useState<SmartClassroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newRoom, setNewRoom] = useState({
    name: '',
    roomNumber: '',
    building: '',
    floor: '',
    capacity: '',
  });

  const [savingAcademic, setSavingAcademic] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [newTerm, setNewTerm] = useState('');
  const [academicDraft, setAcademicDraft] = useState<AcademicSettingsData | null>(null);

  useEffect(() => {
    if (academic) setAcademicDraft(structuredClone(academic));
  }, [academic]);

  const YEAR_PATTERN = /^\d{4}-\d{4}$/;
  function validateYear(value: string) {
    if (!YEAR_PATTERN.test(value)) return false;
    const [a, b] = value.split('-').map(Number);
    return b === a + 1;
  }
  function suggestNextYear(years: string[]) {
    if (!years.length) {
      const start = new Date().getFullYear();
      return `${start}-${start + 1}`;
    }
    const sorted = [...years].sort();
    const end = Number(sorted[sorted.length - 1]!.split('-')[1]);
    return `${end}-${end + 1}`;
  }

  function addYear() {
    if (!academicDraft) return;
    const value = newYear.trim() || suggestNextYear(academicDraft.academicYears);
    if (!validateYear(value)) {
      toast.error('Use format 2026-2027');
      return;
    }
    if (academicDraft.academicYears.includes(value)) {
      toast.error('Academic year already exists');
      return;
    }
    setAcademicDraft({
      ...academicDraft,
      academicYears: [...academicDraft.academicYears, value].sort(),
      currentAcademicYear: academicDraft.currentAcademicYear ?? value,
    });
    setNewYear('');
  }

  function removeYear(year: string) {
    if (!academicDraft || academicDraft.academicYears.length <= 1) return;
    const academicYears = academicDraft.academicYears.filter((y) => y !== year);
    setAcademicDraft({
      ...academicDraft,
      academicYears,
      currentAcademicYear:
        academicDraft.currentAcademicYear === year
          ? academicYears[0] ?? null
          : academicDraft.currentAcademicYear,
    });
  }

  function addTerm() {
    if (!academicDraft) return;
    const value = newTerm.trim();
    if (!value) return;
    if (academicDraft.terms.includes(value)) {
      toast.error('Term already exists');
      return;
    }
    setAcademicDraft({ ...academicDraft, terms: [...academicDraft.terms, value] });
    setNewTerm('');
  }

  function removeTerm(term: string) {
    if (!academicDraft || academicDraft.terms.length <= 1) return;
    const terms = academicDraft.terms.filter((t) => t !== term);
    const termDates = { ...(academicDraft.termDates ?? {}) };
    delete termDates[term];
    setAcademicDraft({
      ...academicDraft,
      terms,
      currentTerm: academicDraft.currentTerm === term ? terms[0] ?? null : academicDraft.currentTerm,
      termDates,
    });
  }

  function updateTermDate(term: string, field: 'start' | 'end', value: string) {
    if (!academicDraft) return;
    const termDates = { ...(academicDraft.termDates ?? {}) };
    const current = termDates[term] ?? { start: '', end: '' };
    termDates[term] = { ...current, [field]: value };
    setAcademicDraft({ ...academicDraft, termDates });
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        timetableApi.smartSettingsGet(),
        timetableApi.smartClassrooms(),
      ]);
      setSettings({
        ...s.data.data,
        notifyDepartmentHead: s.data.data.notifyDepartmentHead ?? false,
        alertLateEnabled: s.data.data.alertLateEnabled ?? true,
        alertMissingCheckInEnabled: s.data.data.alertMissingCheckInEnabled ?? true,
        alertMissingCheckOutEnabled: s.data.data.alertMissingCheckOutEnabled ?? true,
        alertEarlyDepartureEnabled: s.data.data.alertEarlyDepartureEnabled ?? true,
        missingCheckInAfterMinutes: s.data.data.missingCheckInAfterMinutes ?? 10,
      });
      setClassrooms(c.data.data);
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not load smart settings'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveAcademicSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!academicDraft) return;
    setSavingAcademic(true);
    try {
      await saveAcademic(academicDraft);
      toast.success('Saved to Organization Admin. All Timetable filters use this calendar.');
      await reloadAcademic();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not save academic settings'
      );
    } finally {
      setSavingAcademic(false);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await timetableApi.smartSettingsPut({
        graceMinutesOnTime: settings.graceMinutesOnTime,
        lateThresholdMinutes: settings.lateThresholdMinutes,
        veryLateThresholdMinutes: settings.veryLateThresholdMinutes,
        qrRequired: settings.qrRequired,
        gpsRequired: settings.gpsRequired,
        autoCloseAfterEnd: settings.autoCloseAfterEnd,
        reminderEnabled: settings.reminderEnabled,
        liveRefreshSeconds: settings.liveRefreshSeconds,
        notifyHeadOfStudies: settings.notifyHeadOfStudies,
        notifyDeputyHead: settings.notifyDeputyHead,
        notifyDepartmentHead: settings.notifyDepartmentHead,
        alertLateEnabled: settings.alertLateEnabled,
        alertMissingCheckInEnabled: settings.alertMissingCheckInEnabled,
        alertMissingCheckOutEnabled: settings.alertMissingCheckOutEnabled,
        alertEarlyDepartureEnabled: settings.alertEarlyDepartureEnabled,
        missingCheckInAfterMinutes: settings.missingCheckInAfterMinutes,
      });
      setSettings(res.data.data);
      toast.success('Settings saved');
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not save settings'
      );
    } finally {
      setSaving(false);
    }
  }

  async function addClassroom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoom.name.trim() || !newRoom.roomNumber.trim()) {
      toast.error('Classroom name and room number are required');
      return;
    }
    setSaving(true);
    try {
      await timetableApi.smartClassroomUpsert({
        name: newRoom.name.trim(),
        roomNumber: newRoom.roomNumber.trim(),
        building: newRoom.building.trim() || undefined,
        floor: newRoom.floor.trim() || undefined,
        capacity: newRoom.capacity ? Number(newRoom.capacity) : undefined,
      });
      setNewRoom({ name: '', roomNumber: '', building: '', floor: '', capacity: '' });
      toast.success('Classroom created');
      await load();
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not create classroom'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <Loader2 size={16} className="animate-spin" /> Loading settings…
      </div>
    );
  }

  return (
    <HrPageLayout>
      {academicDraft ? (
        <form onSubmit={saveAcademicSettings} className="hr-card space-y-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-navy">Academic calendar</h3>
              <p className="mt-1 text-sm text-muted">
                Same source as Organization Admin settings. Used on Timetable, Live Monitor, Config Class, and exports.
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                academicSource === 'organization-admin'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              {academicSource === 'organization-admin' ? 'Synced from Org Admin' : 'Local fallback'}
            </span>
          </div>

          {academicWarning ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {academicWarning}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                Current academic year
              </span>
              <select
                className="input py-2.5 text-sm"
                value={academicDraft.currentAcademicYear ?? ''}
                onChange={(e) =>
                  setAcademicDraft({
                    ...academicDraft,
                    currentAcademicYear: e.target.value || null,
                  })
                }
              >
                {academicDraft.academicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
                Current term
              </span>
              <select
                className="input py-2.5 text-sm"
                value={academicDraft.currentTerm ?? ''}
                onChange={(e) =>
                  setAcademicDraft({ ...academicDraft, currentTerm: e.target.value || null })
                }
              >
                {academicDraft.terms.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Academic years
            </p>
            <div className="flex flex-wrap gap-2">
              {academicDraft.academicYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() =>
                    setAcademicDraft({ ...academicDraft, currentAcademicYear: year })
                  }
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    academicDraft.currentAcademicYear === year
                      ? 'bg-primary text-navy'
                      : 'bg-navy/5 text-navy hover:bg-navy/10'
                  }`}
                >
                  {year}
                  {academicDraft.currentAcademicYear === year ? (
                    <span className="opacity-70">current</span>
                  ) : null}
                  {academicDraft.academicYears.length > 1 ? (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeYear(year);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          removeYear(year);
                        }
                      }}
                      className="rounded-full px-1 hover:bg-black/10"
                      aria-label={`Remove ${year}`}
                    >
                      x
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className="input min-w-[160px] flex-1 py-2.5 text-sm"
                placeholder={suggestNextYear(academicDraft.academicYears)}
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
              />
              <button type="button" className="btn-secondary py-2.5" onClick={addYear}>
                <Plus size={14} /> Add year
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Terms</p>
            <div className="space-y-3">
              {academicDraft.terms.map((term) => (
                <div
                  key={term}
                  className="grid gap-3 rounded-xl border border-border/80 bg-slate-50/80 p-3 sm:grid-cols-[minmax(0,1.1fr)_1fr_1fr_auto]"
                >
                  <button
                    type="button"
                    className={`self-center rounded-lg px-2 py-1.5 text-left text-sm font-semibold ${
                      academicDraft.currentTerm === term
                        ? 'bg-primary/20 text-navy'
                        : 'text-navy hover:bg-white'
                    }`}
                    onClick={() => setAcademicDraft({ ...academicDraft, currentTerm: term })}
                  >
                    {term}
                    {academicDraft.currentTerm === term ? (
                      <span className="ml-2 text-[10px] uppercase text-muted">current</span>
                    ) : null}
                  </button>
                  <label className="block text-xs">
                    <span className="mb-1 block font-semibold uppercase tracking-wide text-muted">
                      Start
                    </span>
                    <input
                      type="date"
                      value={academicDraft.termDates?.[term]?.start ?? ''}
                      onChange={(e) => updateTermDate(term, 'start', e.target.value)}
                      className="input w-full py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1 block font-semibold uppercase tracking-wide text-muted">
                      End
                    </span>
                    <input
                      type="date"
                      value={academicDraft.termDates?.[term]?.end ?? ''}
                      onChange={(e) => updateTermDate(term, 'end', e.target.value)}
                      className="input w-full py-2 text-sm"
                    />
                  </label>
                  {academicDraft.terms.length > 1 ? (
                    <button
                      type="button"
                      className="self-end rounded-lg px-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                      onClick={() => removeTerm(term)}
                    >
                      Remove
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className="input min-w-[160px] flex-1 py-2.5 text-sm"
                placeholder="e.g. Term 1"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
              />
              <button type="button" className="btn-secondary py-2.5" onClick={addTerm}>
                <Plus size={14} /> Add term
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingAcademic}
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-primary disabled:opacity-50"
          >
            {savingAcademic ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save academic settings
          </button>
        </form>
      ) : null}

      {settings ? (
        <form onSubmit={saveSettings} className="hr-card space-y-5 p-5 sm:p-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-navy">
              Punctuality and live board
            </h3>
            <p className="text-xs text-muted">DOS rules for QR start and live refresh</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label="Grace (on time) minutes"
              value={settings.graceMinutesOnTime}
              onChange={(v) => setSettings({ ...settings, graceMinutesOnTime: v })}
            />
            <NumberField
              label="Late threshold"
              value={settings.lateThresholdMinutes}
              onChange={(v) => setSettings({ ...settings, lateThresholdMinutes: v })}
            />
            <NumberField
              label="Very late threshold"
              value={settings.veryLateThresholdMinutes}
              onChange={(v) => setSettings({ ...settings, veryLateThresholdMinutes: v })}
            />
            <NumberField
              label="Live refresh seconds"
              value={settings.liveRefreshSeconds}
              onChange={(v) => setSettings({ ...settings, liveRefreshSeconds: v })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Toggle
              label="QR required to start"
              checked={settings.qrRequired}
              onChange={(v) => setSettings({ ...settings, qrRequired: v })}
            />
            <Toggle
              label="GPS required"
              checked={settings.gpsRequired}
              onChange={(v) => setSettings({ ...settings, gpsRequired: v })}
            />
            <Toggle
              label="Auto-close after end"
              checked={settings.autoCloseAfterEnd}
              onChange={(v) => setSettings({ ...settings, autoCloseAfterEnd: v })}
            />
            <Toggle
              label="Reminders enabled"
              checked={settings.reminderEnabled}
              onChange={(v) => setSettings({ ...settings, reminderEnabled: v })}
            />
            <Toggle
              label="Notify Head of Studies"
              checked={settings.notifyHeadOfStudies}
              onChange={(v) => setSettings({ ...settings, notifyHeadOfStudies: v })}
            />
            <Toggle
              label="Notify Deputy Head"
              checked={settings.notifyDeputyHead}
              onChange={(v) => setSettings({ ...settings, notifyDeputyHead: v })}
            />
            <Toggle
              label="Notify Department Head"
              checked={settings.notifyDepartmentHead}
              onChange={(v) => setSettings({ ...settings, notifyDepartmentHead: v })}
            />
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-navy">Live monitor alerts</h3>
            <p className="text-xs text-muted">
              Configure when alerts appear on the live board and who gets notified
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              label="Late alert after (minutes)"
              value={settings.lateThresholdMinutes}
              onChange={(v) => setSettings({ ...settings, lateThresholdMinutes: v })}
            />
            <NumberField
              label="Missing check-in after (minutes)"
              value={settings.missingCheckInAfterMinutes}
              onChange={(v) => setSettings({ ...settings, missingCheckInAfterMinutes: v })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Toggle
              label="Alert when teacher is late"
              checked={settings.alertLateEnabled}
              onChange={(v) => setSettings({ ...settings, alertLateEnabled: v })}
            />
            <Toggle
              label="Alert when teacher hasn't checked in"
              checked={settings.alertMissingCheckInEnabled}
              onChange={(v) => setSettings({ ...settings, alertMissingCheckInEnabled: v })}
            />
            <Toggle
              label="Alert when check-out is missing"
              checked={settings.alertMissingCheckOutEnabled}
              onChange={(v) => setSettings({ ...settings, alertMissingCheckOutEnabled: v })}
            />
            <Toggle
              label="Alert when teacher leaves early"
              checked={settings.alertEarlyDepartureEnabled}
              onChange={(v) => setSettings({ ...settings, alertEarlyDepartureEnabled: v })}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-navy hover:brightness-105 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save settings
          </button>
        </form>
      ) : null}

      <section className="hr-card p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy">Classrooms & QR</h3>
          <p className="text-xs text-muted">Codes teachers scan from the Teacher Portal</p>
        </div>

        <form onSubmit={addClassroom} className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            className="rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            placeholder="Name"
            value={newRoom.name}
            onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
          />
          <input
            className="rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            placeholder="Room number"
            value={newRoom.roomNumber}
            onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
          />
          <input
            className="rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            placeholder="Building"
            value={newRoom.building}
            onChange={(e) => setNewRoom({ ...newRoom, building: e.target.value })}
          />
          <input
            className="rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
            placeholder="Capacity"
            value={newRoom.capacity}
            onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-primary"
          >
            <Plus size={16} /> Add room
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-slate-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold text-navy">Name</th>
                <th className="px-4 py-3 font-semibold text-navy">Room</th>
                <th className="px-4 py-3 font-semibold text-navy">Building</th>
                <th className="px-4 py-3 font-semibold text-navy">QR code</th>
              </tr>
            </thead>
            <tbody>
              {classrooms.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    No classrooms yet. Add one above or start lessons to auto-create rooms.
                  </td>
                </tr>
              ) : (
                classrooms.map((room) => (
                  <tr key={room.id} className="border-t border-border/70">
                    <td className="px-4 py-3 font-semibold text-navy">{room.name}</td>
                    <td className="px-4 py-3">{room.roomNumber}</td>
                    <td className="px-4 py-3 text-muted">{room.building ?? '—'}</td>
                    <td className="px-4 py-3">
                      <code className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-navy">
                        {room.qrCode}
                      </code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </HrPageLayout>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        type="number"
        min={0}
        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-slate-50/70 px-4 py-3 text-sm">
      <span className="font-medium text-navy">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
    </label>
  );
}
