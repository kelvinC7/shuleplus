'use client';

import { useMemo, type ReactNode } from 'react';
import { Plus, Save, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { FormField, SelectField, TextField } from '@/components/form-fields';
import { DayToggleGroup } from '@/components/setup-form-ui';
import { SCHEDULE_SLOT_TYPE_LABELS } from '@/components/schedule-slot-type-icon';
import type { BreakDefinition, SchoolSchedule, ScheduleSlotType } from '@/types';
import { WEEK_DAYS } from '@/types';
import {
  SLOT_TYPE_OPTIONS,
  buildDaySlots,
  normalizeBreakDef,
  parseBreakDefs,
  validatePeriodSchedule,
} from '@/utils/schedule-builder';

function slotId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
      <h3 className="text-sm font-semibold text-navy">{title}</h3>
      {action}
    </div>
  );
}

export function TimeSettingsView({
  schedule,
  setSchedule,
  onSave,
  busy,
}: {
  schedule: SchoolSchedule;
  setSchedule: (s: SchoolSchedule) => void;
  onSave: () => Promise<void>;
  busy: boolean;
}) {
  const transitionMinutes = schedule.transitionMinutes ?? 5;
  const activeDays = schedule.activeDays as string[];

  const breakDefs = useMemo(
    () =>
      parseBreakDefs(schedule.breaks, {
        dayStart: schedule.dayStart,
        periodDurationMinutes: schedule.periodDurationMinutes,
        transitionMinutes,
      }),
    [schedule.breaks, schedule.dayStart, schedule.periodDurationMinutes, transitionMinutes]
  );

  const periodSlots = useMemo(
    () =>
      buildDaySlots({
        dayStart: schedule.dayStart,
        dayEnd: schedule.dayEnd,
        periodDurationMinutes: schedule.periodDurationMinutes,
        transitionMinutes,
        breakDefs,
      }),
    [
      schedule.dayStart,
      schedule.dayEnd,
      schedule.periodDurationMinutes,
      transitionMinutes,
      breakDefs,
    ]
  );

  const periodCount = periodSlots.filter((s) => !s.isBreak).length;

  const validation = useMemo(
    () =>
      validatePeriodSchedule({
        dayStart: schedule.dayStart,
        dayEnd: schedule.dayEnd,
        activeDays,
        periodSlots,
        transitionMinutes,
      }),
    [schedule.dayStart, schedule.dayEnd, activeDays, periodSlots, transitionMinutes]
  );

  function patch(partial: Partial<SchoolSchedule>) {
    setSchedule({ ...schedule, ...partial, durationMode: 'UNIFORM' });
  }

  function setBreakDefs(next: BreakDefinition[]) {
    patch({ breaks: next.map(normalizeBreakDef) });
  }

  function updateBreak(index: number, partial: Partial<BreakDefinition>) {
    const next = [...breakDefs];
    next[index] = normalizeBreakDef({ ...next[index], ...partial });
    setBreakDefs(next);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border/70 bg-white p-5">
        <SectionTitle title="Active days" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextField
            compact
            label="Day starts"
            type="time"
            value={schedule.dayStart}
            onChange={(v) => patch({ dayStart: v })}
          />
          <TextField
            compact
            label="Day ends"
            type="time"
            value={schedule.dayEnd}
            onChange={(v) => patch({ dayEnd: v })}
          />
          <TextField
            compact
            label="Period minutes"
            type="number"
            min={15}
            max={120}
            value={schedule.periodDurationMinutes}
            onChange={(v) => patch({ periodDurationMinutes: Number(v) || 40 })}
          />
          <TextField
            compact
            label="Transition (min)"
            type="number"
            min={0}
            max={30}
            value={transitionMinutes}
            onChange={(v) => patch({ transitionMinutes: Number(v) || 0 })}
          />
        </div>
        <div className="mt-4">
          <FormField label="Weekdays" compact>
            <DayToggleGroup
              days={WEEK_DAYS.slice(0, 5)}
              selected={activeDays}
              onChange={(days) => patch({ activeDays: days })}
            />
          </FormField>
          <p className="mt-3 text-sm text-muted">
            {periodCount} periods fit each day from {schedule.dayStart} to {schedule.dayEnd}
            {schedule.periodDurationMinutes ? ` (${schedule.periodDurationMinutes} min each)` : ''}.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-white p-5">
        <SectionTitle
          title="Breaks & activities"
          action={
            <button
              type="button"
              className="btn-secondary py-2 text-xs"
              onClick={() =>
                setBreakDefs([
                  ...breakDefs,
                  normalizeBreakDef({
                    id: slotId('break'),
                    label: 'Break',
                    durationMinutes: 20,
                    startTime: '10:00',
                    endTime: '10:20',
                    slotType: 'BREAK',
                    appliesEveryDay: true,
                  }),
                ])
              }
            >
              <Plus size={14} /> Add break
            </button>
          }
        />
        <div className="mt-4 space-y-3">
          {breakDefs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              No breaks yet. Add start and end times for morning break, lunch, or activities.
            </p>
          ) : (
            breakDefs.map((b, i) => (
              <div key={b.id} className="rounded-xl border border-border/70 bg-slate-50/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-navy">{b.label || 'Break'}</p>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600"
                    onClick={() => setBreakDefs(breakDefs.filter((_, j) => j !== i))}
                    aria-label="Remove break"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <TextField
                    compact
                    label="Name"
                    value={b.label}
                    onChange={(v) => updateBreak(i, { label: v })}
                  />
                  <TextField
                    compact
                    label="Start time"
                    type="time"
                    value={b.startTime ?? '10:00'}
                    onChange={(v) => updateBreak(i, { startTime: v })}
                  />
                  <TextField
                    compact
                    label="End time"
                    type="time"
                    value={b.endTime ?? '10:20'}
                    onChange={(v) => updateBreak(i, { endTime: v })}
                  />
                  <SelectField
                    compact
                    label="Type"
                    value={b.slotType}
                    onChange={(v) => updateBreak(i, { slotType: v as ScheduleSlotType })}
                    options={SLOT_TYPE_OPTIONS.filter((o) => o.id !== 'LESSON').map((o) => ({
                      value: o.id,
                      label: SCHEDULE_SLOT_TYPE_LABELS[o.id] ?? o.label,
                    }))}
                  />
                </div>
                <p className="mt-2 text-xs text-muted">
                  {b.durationMinutes} minutes
                  {b.appliesEveryDay !== false ? ' · every active school day' : ''}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-white p-5">
        <SectionTitle title="Daily schedule" />
        <div className="mt-4 overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wide text-muted">
                <th className="px-3 py-2.5">Slot</th>
                <th className="px-3 py-2.5">Start</th>
                <th className="px-3 py-2.5">End</th>
                <th className="px-3 py-2.5">Minutes</th>
                <th className="px-3 py-2.5">Type</th>
              </tr>
            </thead>
            <tbody>
              {periodSlots.map((slot) => (
                <tr key={slot.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2.5 font-medium text-navy">{slot.name}</td>
                  <td className="px-3 py-2.5 tabular-nums">{slot.startTime}</td>
                  <td className="px-3 py-2.5 tabular-nums">{slot.endTime}</td>
                  <td className="px-3 py-2.5 tabular-nums">{slot.durationMinutes}</td>
                  <td className="px-3 py-2.5 capitalize text-muted">
                    {slot.slotType.toLowerCase().replace(/_/g, ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[10px] uppercase text-muted">Periods</p>
            <p className="font-bold text-navy">{validation.summary.lessonCount}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[10px] uppercase text-muted">Lesson time</p>
            <p className="font-bold text-navy">{validation.summary.lessonMinutes} min</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[10px] uppercase text-muted">Breaks</p>
            <p className="font-bold text-navy">{validation.summary.breakMinutes} min</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[10px] uppercase text-muted">Weekly periods</p>
            <p className="font-bold text-navy">{validation.summary.weeklyPeriods}</p>
          </div>
        </div>
      </section>

      <section
        className={`rounded-xl border p-4 ${
          validation.valid ? 'border-emerald-200/80 bg-emerald-50/50' : 'border-red-200/80 bg-red-50/50'
        }`}
      >
        <p className="flex items-center gap-2 text-sm font-bold text-navy">
          {validation.valid ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : (
            <AlertTriangle size={16} className="text-red-600" />
          )}
          {validation.valid ? 'Schedule ready' : 'Fix schedule issues'}
        </p>
        <ul className="mt-2 space-y-1 text-xs">
          {validation.issues.map((issue) => (
            <li
              key={issue.message}
              className={issue.severity === 'error' ? 'text-red-700' : 'text-amber-800'}
            >
              {issue.message}
            </li>
          ))}
          {validation.valid ? (
            <>
              <li className="text-emerald-700">
                {schedule.dayStart} to {schedule.dayEnd}
              </li>
              <li className="text-emerald-700">
                {validation.summary.lessonCount} periods · {validation.summary.activeDays} active days
              </li>
            </>
          ) : null}
        </ul>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          className="btn-primary py-2.5"
          disabled={busy || !validation.valid}
          onClick={() => void onSave()}
        >
          <Save size={16} /> Save settings
        </button>
      </div>
    </div>
  );
}
