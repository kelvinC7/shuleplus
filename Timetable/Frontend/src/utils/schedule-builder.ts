import { minutesToTime, normalizeTime, timeToMinutes } from '@/utils/time-math';

export type ScheduleSlotType =
  | 'LESSON'
  | 'BREAK'
  | 'LUNCH'
  | 'ASSEMBLY'
  | 'ACTIVITY'
  | 'EXAMINATION'
  | 'MEETING'
  | 'CLUB';

export interface BreakDefinition {
  id: string;
  label: string;
  durationMinutes: number;
  /** @deprecated Prefer startTime/endTime. Kept for older saved schedules. */
  afterPeriod?: number;
  startTime?: string;
  endTime?: string;
  slotType: ScheduleSlotType;
  appliesEveryDay?: boolean;
}

export interface PeriodSlotDefinition {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  slotType: ScheduleSlotType;
  isBreak: boolean;
}

export interface ScheduleValidation {
  valid: boolean;
  issues: Array<{ severity: 'error' | 'warning'; message: string }>;
  summary: {
    lessonCount: number;
    lessonMinutes: number;
    breakMinutes: number;
    transitionMinutes: number;
    remainingMinutes: number;
    dayMinutes: number;
    weeklyPeriods: number;
    activeDays: number;
  };
}

export const SLOT_TYPE_OPTIONS: Array<{ id: ScheduleSlotType; label: string }> = [
  { id: 'LESSON', label: 'Lesson' },
  { id: 'BREAK', label: 'Break' },
  { id: 'LUNCH', label: 'Lunch' },
  { id: 'ASSEMBLY', label: 'Assembly' },
  { id: 'ACTIVITY', label: 'Activity' },
  { id: 'EXAMINATION', label: 'Examination' },
  { id: 'MEETING', label: 'Staff Meeting' },
  { id: 'CLUB', label: 'Club' },
];

function slotId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isBreakType(type: ScheduleSlotType): boolean {
  return type !== 'LESSON';
}

export function normalizeBreakDef(b: BreakDefinition): BreakDefinition {
  if (b.startTime && b.endTime) {
    const duration = Math.max(1, timeToMinutes(b.endTime) - timeToMinutes(b.startTime));
    return { ...b, durationMinutes: duration, startTime: normalizeTime(b.startTime), endTime: normalizeTime(b.endTime) };
  }
  if (b.startTime && b.durationMinutes) {
    const start = normalizeTime(b.startTime);
    const end = minutesToTime(timeToMinutes(start) + Math.max(1, b.durationMinutes));
    return { ...b, startTime: start, endTime: end, durationMinutes: Math.max(1, b.durationMinutes) };
  }
  return b;
}

/** Default breaks with explicit clock times (modern model). */
export function defaultBreaks(): BreakDefinition[] {
  return [
    {
      id: 'break-morning',
      label: 'Morning Break',
      durationMinutes: 20,
      startTime: '10:00',
      endTime: '10:20',
      slotType: 'BREAK',
      appliesEveryDay: true,
    },
    {
      id: 'break-lunch',
      label: 'Lunch',
      durationMinutes: 50,
      startTime: '12:30',
      endTime: '13:20',
      slotType: 'LUNCH',
      appliesEveryDay: true,
    },
  ];
}

function migrateAfterPeriodBreaks(
  breaks: BreakDefinition[],
  ctx: { dayStart: string; periodDurationMinutes: number; transitionMinutes: number }
): BreakDefinition[] {
  return breaks.map((b) => {
    if (b.startTime && b.endTime) return normalizeBreakDef(b);
    const n = Math.max(1, b.afterPeriod ?? 1);
    const pd = Math.max(15, ctx.periodDurationMinutes);
    const tr = Math.max(0, ctx.transitionMinutes);
    // Approximate: break starts right after period N (no earlier breaks considered).
    const startMin = timeToMinutes(normalizeTime(ctx.dayStart)) + n * pd + (n - 1) * tr;
    const duration = Math.max(1, b.durationMinutes || 20);
    return normalizeBreakDef({
      ...b,
      startTime: minutesToTime(startMin),
      endTime: minutesToTime(startMin + duration),
      durationMinutes: duration,
    });
  });
}

export function parseBreakDefs(
  raw: unknown,
  ctx?: { dayStart?: string; periodDurationMinutes?: number; transitionMinutes?: number }
): BreakDefinition[] {
  if (!Array.isArray(raw) || !raw.length) return defaultBreaks();
  const first = raw[0] as Record<string, unknown>;

  // Modern: startTime / endTime on definition
  if (typeof first.startTime === 'string' || typeof first.endTime === 'string') {
    return (raw as BreakDefinition[]).map(normalizeBreakDef);
  }

  // Legacy afterPeriod model → convert to clock times for the UI
  if (typeof first.afterPeriod === 'number') {
    return migrateAfterPeriodBreaks(raw as BreakDefinition[], {
      dayStart: ctx?.dayStart ?? '08:00',
      periodDurationMinutes: ctx?.periodDurationMinutes ?? 40,
      transitionMinutes: ctx?.transitionMinutes ?? 5,
    });
  }

  // Legacy { start, end, label? } windows
  if (typeof (first as { start?: string }).start === 'string') {
    return (raw as Array<{ start: string; end: string; label?: string }>).map((b, i) =>
      normalizeBreakDef({
        id: `legacy-${i}`,
        label: b.label ?? 'Break',
        durationMinutes: Math.max(1, timeToMinutes(b.end) - timeToMinutes(b.start)),
        startTime: b.start,
        endTime: b.end,
        slotType: (b.label ?? '').toLowerCase().includes('lunch') ? 'LUNCH' : 'BREAK',
        appliesEveryDay: true,
      })
    );
  }

  return defaultBreaks();
}

/**
 * Build the school day: fill lessons of fixed period minutes between dayStart and dayEnd,
 * inserting breaks by their start/end times. Period count is derived automatically.
 */
export function buildDaySlots(input: {
  dayStart: string;
  dayEnd: string;
  periodDurationMinutes: number;
  transitionMinutes?: number;
  breakDefs: BreakDefinition[];
}): PeriodSlotDefinition[] {
  const dayStart = timeToMinutes(normalizeTime(input.dayStart));
  const dayEnd = timeToMinutes(normalizeTime(input.dayEnd));
  const periodMin = Math.max(15, input.periodDurationMinutes || 40);
  const transition = Math.max(0, input.transitionMinutes ?? 0);

  if (dayEnd <= dayStart) return [];

  const breaks = input.breakDefs
    .map(normalizeBreakDef)
    .filter((b) => b.startTime && b.endTime)
    .map((b) => ({
      ...b,
      start: timeToMinutes(b.startTime!),
      end: timeToMinutes(b.endTime!),
    }))
    .filter((b) => b.end > b.start && b.start < dayEnd && b.end > dayStart)
    .sort((a, b) => a.start - b.start);

  const slots: PeriodSlotDefinition[] = [];
  let cursor = dayStart;
  let lessonNum = 0;
  let bi = 0;

  while (cursor + periodMin <= dayEnd) {
    while (bi < breaks.length && breaks[bi].start <= cursor) {
      const b = breaks[bi];
      if (b.end > cursor) {
        const s = Math.max(cursor, b.start);
        slots.push({
          id: b.id || slotId('break'),
          name: b.label,
          startTime: minutesToTime(s),
          endTime: minutesToTime(b.end),
          durationMinutes: b.end - s,
          slotType: b.slotType,
          isBreak: true,
        });
        cursor = b.end;
      }
      bi += 1;
    }

    const nextBreak = bi < breaks.length ? breaks[bi] : null;
    if (nextBreak && nextBreak.start < cursor + periodMin) {
      if (nextBreak.start <= cursor) continue;
      cursor = nextBreak.start;
      continue;
    }

    lessonNum += 1;
    const end = cursor + periodMin;
    slots.push({
      id: slotId('lesson'),
      name: `P${lessonNum}`,
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(end),
      durationMinutes: periodMin,
      slotType: 'LESSON',
      isBreak: false,
    });
    cursor = end;

    if (nextBreak) {
      const gap = nextBreak.start - cursor;
      if (gap <= 0) continue;
      if (gap <= transition || gap < periodMin) {
        cursor = nextBreak.start;
        continue;
      }
      cursor += transition;
      continue;
    }

    if (cursor + transition + periodMin <= dayEnd) {
      cursor += transition;
    } else {
      break;
    }
  }

  while (bi < breaks.length) {
    const b = breaks[bi];
    bi += 1;
    if (b.start >= dayEnd) break;
    const s = Math.max(cursor, b.start);
    const e = Math.min(b.end, dayEnd);
    if (e > s) {
      slots.push({
        id: b.id || slotId('break'),
        name: b.label,
        startTime: minutesToTime(s),
        endTime: minutesToTime(e),
        durationMinutes: e - s,
        slotType: b.slotType,
        isBreak: true,
      });
      cursor = e;
    }
  }

  return slots;
}

/** @deprecated Prefer buildDaySlots. Kept for callers that still pass periodCount. */
export function buildUniformPeriodSlots(input: {
  dayStart: string;
  dayEnd?: string;
  periodCount?: number;
  defaultDurationMinutes: number;
  transitionMinutes: number;
  breakDefs: BreakDefinition[];
}): PeriodSlotDefinition[] {
  const timed = input.breakDefs.some((b) => Boolean(b.startTime && b.endTime));
  if (timed && input.dayEnd) {
    return buildDaySlots({
      dayStart: input.dayStart,
      dayEnd: input.dayEnd,
      periodDurationMinutes: input.defaultDurationMinutes,
      transitionMinutes: input.transitionMinutes,
      breakDefs: input.breakDefs,
    });
  }

  // Legacy afterPeriod fill
  const periodCount = Math.max(1, input.periodCount ?? 8);
  const slots: PeriodSlotDefinition[] = [];
  let cursor = timeToMinutes(normalizeTime(input.dayStart));
  let lessonNum = 0;

  for (let i = 1; i <= periodCount; i += 1) {
    lessonNum += 1;
    const start = cursor;
    const end = start + input.defaultDurationMinutes;
    slots.push({
      id: slotId('lesson'),
      name: `P${lessonNum}`,
      startTime: minutesToTime(start),
      endTime: minutesToTime(end),
      durationMinutes: input.defaultDurationMinutes,
      slotType: 'LESSON',
      isBreak: false,
    });
    cursor = end;

    const breakDef = input.breakDefs.find((b) => b.afterPeriod === lessonNum);
    if (breakDef) {
      const normalized = normalizeBreakDef(breakDef);
      const bStart = cursor;
      const bEnd = bStart + normalized.durationMinutes;
      slots.push({
        id: breakDef.id || slotId('break'),
        name: breakDef.label,
        startTime: minutesToTime(bStart),
        endTime: minutesToTime(bEnd),
        durationMinutes: normalized.durationMinutes,
        slotType: breakDef.slotType,
        isBreak: true,
      });
      cursor = bEnd;
    } else if (i < periodCount) {
      cursor += input.transitionMinutes;
    }
  }

  return slots;
}

export function rippleSlotTimes(
  slots: PeriodSlotDefinition[],
  dayStart: string,
  transitionMinutes: number
): PeriodSlotDefinition[] {
  if (!slots.length) return slots;
  const next = slots.map((s) => ({ ...s }));
  let cursor = timeToMinutes(normalizeTime(dayStart));

  for (let i = 0; i < next.length; i += 1) {
    const slot = next[i];
    slot.startTime = minutesToTime(cursor);
    slot.durationMinutes = Math.max(1, slot.durationMinutes);
    cursor += slot.durationMinutes;
    slot.endTime = minutesToTime(cursor);
    const following = next[i + 1];
    if (!following) break;
    cursor += !slot.isBreak && !following.isBreak ? transitionMinutes : 0;
  }

  return next;
}

export function validatePeriodSchedule(input: {
  dayStart: string;
  dayEnd: string;
  activeDays: string[];
  periodSlots: PeriodSlotDefinition[];
  transitionMinutes: number;
}): ScheduleValidation {
  const issues: ScheduleValidation['issues'] = [];
  const dayStartMin = timeToMinutes(input.dayStart);
  const dayEndMin = timeToMinutes(input.dayEnd);

  if (dayStartMin >= dayEndMin) {
    issues.push({ severity: 'error', message: 'Day start must be before day end.' });
  }
  if (!input.activeDays.length) {
    issues.push({ severity: 'error', message: 'Select at least one active school day.' });
  }
  if (!input.periodSlots.length) {
    issues.push({ severity: 'error', message: 'No periods fit in this day. Check times and period minutes.' });
  }

  const lessonSlots = input.periodSlots.filter((s) => !s.isBreak);
  if (!lessonSlots.length) {
    issues.push({ severity: 'error', message: 'At least one lesson period is required.' });
  }

  for (let i = 0; i < input.periodSlots.length; i += 1) {
    const s = input.periodSlots[i];
    const start = timeToMinutes(s.startTime);
    const end = timeToMinutes(s.endTime);
    if (end <= start) {
      issues.push({ severity: 'error', message: `${s.name} has invalid duration.` });
    }
    if (end > dayEndMin) {
      issues.push({
        severity: 'error',
        message: `${s.name} ends at ${s.endTime}, after school day ends at ${input.dayEnd}.`,
      });
    }
    for (let j = i + 1; j < input.periodSlots.length; j += 1) {
      const other = input.periodSlots[j];
      const oStart = timeToMinutes(other.startTime);
      const oEnd = timeToMinutes(other.endTime);
      if (start < oEnd && oStart < end) {
        issues.push({ severity: 'error', message: `${s.name} overlaps with ${other.name}.` });
        break;
      }
    }
  }

  const lessonMinutes = lessonSlots.reduce((sum, s) => sum + s.durationMinutes, 0);
  const breakMinutes = input.periodSlots.filter((s) => s.isBreak).reduce((sum, s) => sum + s.durationMinutes, 0);
  const transitionMinutes = Math.max(0, lessonSlots.length - 1) * input.transitionMinutes;
  const lastEnd = input.periodSlots.length
    ? timeToMinutes(input.periodSlots[input.periodSlots.length - 1].endTime)
    : dayStartMin;
  const dayMinutes = dayEndMin - dayStartMin;
  const remaining = Math.max(0, dayEndMin - lastEnd);

  if (remaining > 0 && !issues.some((i) => i.severity === 'error')) {
    issues.push({
      severity: 'warning',
      message: `${remaining} minutes remain after the last slot.`,
    });
  }

  return {
    valid: !issues.some((i) => i.severity === 'error'),
    issues,
    summary: {
      lessonCount: lessonSlots.length,
      lessonMinutes,
      breakMinutes,
      transitionMinutes,
      remainingMinutes: remaining,
      dayMinutes,
      weeklyPeriods: lessonSlots.length * input.activeDays.length,
      activeDays: input.activeDays.length,
    },
  };
}

export function slotTypeIcon(_type: ScheduleSlotType): string {
  return '';
}
