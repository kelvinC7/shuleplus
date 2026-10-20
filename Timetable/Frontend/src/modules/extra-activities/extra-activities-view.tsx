'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckSquare,
  Clock,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { TermYearBar } from '@/components/term-year-bar';
import { HrPageLayout } from '@/components/hr-page-layout';
import { timetableApi } from '@/services/timetable-api';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import type {
  ExtraActivity,
  ExtraPlacementConflict,
  PeriodSlotDefinition,
  SchoolSchedule,
} from '@/types';
import { WEEK_DAYS } from '@/types';
import { resolveSchedulePeriodSlots, uniqueClasses } from '@/utils/timetable';
import { minutesToTime, timeToMinutes } from '@/utils/time-math';

const DAYS = [...WEEK_DAYS].slice(0, 5);

function buildTimeOptions(schedule: SchoolSchedule | null, periodSlots: PeriodSlotDefinition[]): string[] {
  const set = new Set<string>();
  for (const slot of periodSlots) {
    if (!slot.isBreak) {
      set.add(slot.startTime);
      set.add(slot.endTime);
    }
  }
  const start = schedule ? timeToMinutes(schedule.dayStart) : 8 * 60;
  const end = schedule ? timeToMinutes(schedule.dayEnd) + 120 : 18 * 60;
  for (let m = start; m <= end; m += 5) {
    set.add(minutesToTime(m));
  }
  return [...set].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

type ClassMode = 'all' | 'specific';

export function ExtraActivitiesView() {
  const { term, academicYear, setTerm, setAcademicYear, settings: academicSettings } =
    useAcademicSettings();
  const [activities, setActivities] = useState<ExtraActivity[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<SchoolSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [conflicts, setConflicts] = useState<ExtraPlacementConflict[]>([]);
  const [advice, setAdvice] = useState<string | null>(null);
  const [editing, setEditing] = useState<ExtraActivity | null>(null);

  const [name, setName] = useState('');
  const [days, setDays] = useState<string[]>(['Monday']);
  const [classMode, setClassMode] = useState<ClassMode>('all');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('15:40');
  const [endTime, setEndTime] = useState('16:30');

  const periodSlots = useMemo(
    () => (schedule ? resolveSchedulePeriodSlots(schedule) : []),
    [schedule]
  );
  const timeOptions = useMemo(
    () => buildTimeOptions(schedule, periodSlots),
    [schedule, periodSlots]
  );
  const teachingPeriods = useMemo(
    () => periodSlots.filter((s) => !s.isBreak),
    [periodSlots]
  );

  async function load() {
    setLoading(true);
    try {
      const [extraRes, ttRes, scheduleRes] = await Promise.all([
        timetableApi.listExtraActivities(term, academicYear),
        timetableApi.listTimetable({ term, academic_year: academicYear }),
        timetableApi.getSchedule(term, academicYear),
      ]);
      setActivities(extraRes.data.data);
      setClasses(uniqueClasses(ttRes.data.data));
      setSchedule(scheduleRes.data.data);
      const slots = resolveSchedulePeriodSlots(scheduleRes.data.data).filter((s) => !s.isBreak);
      if (slots.length) {
        const last = slots[slots.length - 1];
        setStartTime((prev) => prev || last.endTime);
        const endMins = timeToMinutes(last.endTime) + (scheduleRes.data.data.periodDurationMinutes || 40);
        setEndTime((prev) => prev || minutesToTime(endMins));
      }
    } catch {
      toast.error('Could not load extra activities');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, academicYear]);

  function resetForm() {
    setName('');
    setDays(['Monday']);
    setClassMode('all');
    setSelectedClasses([]);
    setEditing(null);
    setConflicts([]);
    setAdvice(null);
  }

  function toggleDay(day: string) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...DAYS.filter((d) => prev.includes(d) || d === day)]
    );
  }

  function selectAllDays() {
    setDays([...DAYS]);
  }

  function toggleClass(className: string) {
    setSelectedClasses((prev) =>
      prev.includes(className) ? prev.filter((c) => c !== className) : [...prev, className].sort()
    );
  }

  function applyPeriodPreset(slot: PeriodSlotDefinition) {
    setStartTime(slot.startTime);
    setEndTime(slot.endTime);
  }

  function startEdit(activity: ExtraActivity) {
    setEditing(activity);
    setName(activity.name);
    setDays([activity.dayOfWeek]);
    setStartTime(activity.startTime);
    setEndTime(activity.endTime);
    if (activity.className) {
      setClassMode('specific');
      setSelectedClasses([activity.className]);
    } else {
      setClassMode('all');
      setSelectedClasses([]);
    }
    setConflicts([]);
    setAdvice(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Enter an activity name');
      return;
    }
    if (!days.length) {
      toast.error('Select at least one day');
      return;
    }
    if (classMode === 'specific' && !selectedClasses.length) {
      toast.error('Select at least one class, or choose All classes');
      return;
    }
    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      toast.error('End time must be after start time');
      return;
    }

    setBusy(true);
    setConflicts([]);
    setAdvice(null);
    try {
      if (editing) {
        await timetableApi.updateExtraActivity(editing.id, {
          name: name.trim(),
          dayOfWeek: days[0],
          startTime,
          endTime,
          className: classMode === 'all' ? null : selectedClasses[0] ?? null,
          sync: true,
        });
        toast.success('Extra activity updated and synced to the timetable');
      } else {
        const { data } = await timetableApi.createExtraActivity({
          name: name.trim(),
          days,
          classNames: classMode === 'all' ? null : selectedClasses,
          startTime,
          endTime,
          term,
          academicYear,
          sync: true,
        });
        const payload = data.data as { message?: string; created?: number };
        toast.success(
          payload.message ||
            `Saved${payload.created ? ` ${payload.created}` : ''} extra activity and synced to the timetable`
        );
      }
      resetForm();
      await load();
    } catch (err: unknown) {
      const res = err as {
        response?: {
          data?: {
            message?: string;
            details?: { conflicts?: ExtraPlacementConflict[]; advice?: string };
          };
        };
      };
      const details = res.response?.data?.details;
      const list = details?.conflicts ?? [];
      setConflicts(list);
      setAdvice(details?.advice ?? list[0]?.advice ?? null);
      toast.error(res.response?.data?.message || 'Could not save — timetable conflict');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    try {
      await timetableApi.deleteExtraActivity(id);
      toast.success('Extra activity removed from timetable');
      if (editing?.id === id) resetForm();
      await load();
    } catch {
      toast.error('Could not delete activity');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <TermYearBar
        term={term}
        academicYear={academicYear}
        onTermChange={setTerm}
        onYearChange={setAcademicYear}
        terms={academicSettings?.terms}
        academicYears={academicSettings?.academicYears}
      />

      <HrPageLayout
        title="Extra Activities"
        description="Clubs, CPD, assemblies and after-school programmes. The system checks the live timetable for conflicts before saving."
        kpis={[
          { label: 'Activities', value: activities.length },
          { label: 'Synced', value: activities.filter((a) => a.synced).length },
          { label: 'Classes', value: classes.length || '—' },
          { label: 'Term', value: term },
        ]}
        actions={
          <Link href="/timetable?tab=timetable" className="btn-secondary py-2.5 text-sm">
            Open timetable grid
          </Link>
        }
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-muted" size={22} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-extrabold text-navy">
                    {editing ? 'Edit activity' : 'Create activity'}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Choose classes and days, pick a time, then save. Conflicts are blocked with clear guidance.
                  </p>
                </div>
                {editing ? (
                  <button type="button" className="btn-secondary py-1.5 text-xs" onClick={resetForm}>
                    <X size={14} /> Cancel edit
                  </button>
                ) : null}
              </div>

              <div className="mt-5 space-y-5">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    Activity name
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Debate Club, CPD & Group Discussion"
                    className="mt-1.5 w-full rounded-xl border border-border bg-slate-50/80 px-3 py-2.5 text-sm outline-none focus:border-navy/40"
                  />
                </label>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Days</p>
                    <div className="flex gap-2">
                      <button type="button" className="text-xs font-semibold text-navy" onClick={selectAllDays}>
                        All days
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-muted"
                        onClick={() => setDays([])}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DAYS.map((day) => {
                      const on = days.includes(day);
                      const disabled = Boolean(editing) && !on && days.length >= 1;
                      return (
                        <button
                          key={day}
                          type="button"
                          disabled={Boolean(editing) && days[0] !== day}
                          onClick={() => {
                            if (editing) setDays([day]);
                            else toggleDay(day);
                          }}
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                            on
                              ? 'border-navy bg-navy text-white'
                              : 'border-border bg-slate-50 text-navy hover:border-navy/40'
                          } ${disabled ? 'opacity-40' : ''}`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                  {editing ? (
                    <p className="mt-1.5 text-[11px] text-muted">
                      Editing updates one activity at a time. To add more days, create a new activity.
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Classes</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setClassMode('all');
                        setSelectedClasses([]);
                      }}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                        classMode === 'all'
                          ? 'border-navy bg-navy text-white'
                          : 'border-border bg-slate-50 text-navy'
                      }`}
                    >
                      All classes
                    </button>
                    <button
                      type="button"
                      onClick={() => setClassMode('specific')}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                        classMode === 'specific'
                          ? 'border-navy bg-navy text-white'
                          : 'border-border bg-slate-50 text-navy'
                      }`}
                    >
                      Select classes
                    </button>
                  </div>
                  {classMode === 'specific' ? (
                    <div className="mt-3 rounded-xl border border-border bg-slate-50/60 p-3">
                      <div className="mb-2 flex gap-2">
                        <button
                          type="button"
                          className="text-xs font-semibold text-navy"
                          onClick={() => setSelectedClasses([...classes])}
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          className="text-xs font-semibold text-muted"
                          onClick={() => setSelectedClasses([])}
                        >
                          Clear
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {classes.map((c) => {
                          const on = selectedClasses.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                if (editing) setSelectedClasses([c]);
                                else toggleClass(c);
                              }}
                              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold ${
                                on
                                  ? 'border-navy bg-navy text-white'
                                  : 'border-border bg-white text-navy'
                              }`}
                            >
                              {on ? <CheckSquare size={14} /> : <Square size={14} />}
                              {c}
                            </button>
                          );
                        })}
                        {!classes.length ? (
                          <p className="text-xs text-muted">No classes in the timetable yet.</p>
                        ) : null}
                      </div>
                      {editing ? (
                        <p className="mt-2 text-[11px] text-muted">
                          Edit applies to a single class (or all classes).
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                    Time
                  </p>
                  {teachingPeriods.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {teachingPeriods.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => applyPeriodPreset(slot)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                            startTime === slot.startTime && endTime === slot.endTime
                              ? 'border-primary bg-primary/15 text-navy'
                              : 'border-border bg-white text-muted hover:border-navy/30'
                          }`}
                        >
                          {slot.name} · {slot.startTime}–{slot.endTime}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[11px] font-semibold text-muted">Start</span>
                      <div className="relative mt-1">
                        <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <select
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full appearance-none rounded-xl border border-border bg-slate-50/80 py-2.5 pl-9 pr-3 text-sm font-semibold text-navy outline-none focus:border-navy/40"
                        >
                          {timeOptions.map((t) => (
                            <option key={`s-${t}`} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-semibold text-muted">End</span>
                      <div className="relative mt-1">
                        <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <select
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full appearance-none rounded-xl border border-border bg-slate-50/80 py-2.5 pl-9 pr-3 text-sm font-semibold text-navy outline-none focus:border-navy/40"
                        >
                          {timeOptions.map((t) => (
                            <option key={`e-${t}`} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                  </div>
                </div>

                {conflicts.length > 0 ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={18} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-red-900">Cannot save — timetable conflict</p>
                        {advice ? <p className="mt-1 text-xs text-red-800">{advice}</p> : null}
                        <ul className="mt-3 space-y-2">
                          {conflicts.slice(0, 8).map((c, i) => (
                            <li
                              key={`${c.className}-${c.dayOfWeek}-${i}`}
                              className="rounded-xl border border-red-100 bg-white px-3 py-2 text-xs text-red-900"
                            >
                              <p className="font-semibold">
                                {c.className} · {c.dayOfWeek} · {c.startTime}–{c.endTime}
                              </p>
                              <p className="mt-0.5 text-red-800/90">{c.message}</p>
                              <p className="mt-1 text-muted">{c.advice}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="btn-primary py-2.5"
                  disabled={busy}
                  onClick={() => void handleSave()}
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {editing ? 'Update & sync' : 'Save & sync to timetable'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-base font-extrabold text-navy">All extra activities</p>
                  <p className="mt-1 text-xs text-muted">
                    Name, day, time and class. Edit or delete anytime.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary py-1.5 text-xs"
                  disabled={busy}
                  onClick={() => void load()}
                >
                  <RefreshCcw size={13} /> Refresh
                </button>
              </div>

              {activities.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-border bg-slate-50/80 px-4 py-12 text-center text-sm text-muted">
                  No extra activities for this term yet.
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3 font-bold">Name</th>
                        <th className="px-4 py-3 font-bold">Day</th>
                        <th className="px-4 py-3 font-bold">Time</th>
                        <th className="px-4 py-3 font-bold">Class</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-4 py-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((a) => (
                        <tr key={a.id} className="border-t border-border/80">
                          <td className="px-4 py-3 font-semibold text-navy">{a.name}</td>
                          <td className="px-4 py-3 text-muted">{a.dayOfWeek}</td>
                          <td className="px-4 py-3 tabular-nums text-navy">
                            {a.startTime}–{a.endTime}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-navy">
                              {a.className || 'All classes'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {a.synced ? (
                              <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                                Synced
                              </span>
                            ) : (
                              <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
                                Not synced
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="btn-secondary py-1.5 text-xs"
                                disabled={busy}
                                onClick={() => startEdit(a)}
                              >
                                <Pencil size={13} /> Edit
                              </button>
                              {!a.synced ? (
                                <button
                                  type="button"
                                  className="btn-secondary py-1.5 text-xs"
                                  disabled={busy}
                                  onClick={async () => {
                                    await timetableApi.syncExtraActivity(a.id);
                                    toast.success('Synced to timetable');
                                    await load();
                                  }}
                                >
                                  <RefreshCcw size={13} /> Sync
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="btn-danger py-1.5 text-xs"
                                disabled={busy}
                                onClick={() => void handleDelete(a.id)}
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </HrPageLayout>
    </div>
  );
}
