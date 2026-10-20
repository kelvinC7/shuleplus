import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';
import { minutesToTime, normalizeTime, timeToMinutes, type BreakWindow } from '../utils/time.utils';
import type { Prisma } from '../generated/prisma';
import {
  buildDaySlots,
  defaultBreaks,
  legacyBreaksToDefinitions,
  normalizeBreakDef,
  rippleSlotTimes,
  validatePeriodSchedule,
  type BreakDefinition,
  type PeriodSlotDefinition,
} from '../utils/schedule-builder.utils';

const DEFAULT_SCHEDULE = {
  dayStart: '08:00',
  dayEnd: '17:00',
  periodDurationMinutes: 40,
  periodCount: 8,
  transitionMinutes: 5,
  durationMode: 'UNIFORM' as const,
  activeDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  breakDefs: defaultBreaks(),
};

function parseBreakDefs(
  raw: unknown,
  ctx?: { dayStart?: string; periodDurationMinutes?: number; transitionMinutes?: number }
): BreakDefinition[] {
  if (!Array.isArray(raw) || !raw.length) return DEFAULT_SCHEDULE.breakDefs;
  const first = raw[0] as Record<string, unknown>;

  if (typeof first.startTime === 'string' || typeof first.endTime === 'string') {
    return (raw as BreakDefinition[]).map(normalizeBreakDef);
  }

  if (typeof first.afterPeriod === 'number') {
    const dayStart = ctx?.dayStart ?? DEFAULT_SCHEDULE.dayStart;
    const periodDurationMinutes = ctx?.periodDurationMinutes ?? DEFAULT_SCHEDULE.periodDurationMinutes;
    const transitionMinutes = ctx?.transitionMinutes ?? DEFAULT_SCHEDULE.transitionMinutes;
    return (raw as BreakDefinition[]).map((b) => {
      if (b.startTime && b.endTime) return normalizeBreakDef(b);
      const n = Math.max(1, b.afterPeriod ?? 1);
      const startMin =
        timeToMinutes(normalizeTime(dayStart)) +
        n * Math.max(15, periodDurationMinutes) +
        (n - 1) * Math.max(0, transitionMinutes);
      const duration = Math.max(1, b.durationMinutes || 20);
      return normalizeBreakDef({
        ...b,
        startTime: minutesToTime(startMin),
        endTime: minutesToTime(startMin + duration),
        durationMinutes: duration,
      });
    });
  }

  return legacyBreaksToDefinitions(raw as BreakWindow[]);
}

function parsePeriodSlots(raw: unknown): PeriodSlotDefinition[] {
  if (!Array.isArray(raw)) return [];
  return raw as PeriodSlotDefinition[];
}

function rebuildSlots(input: {
  dayStart: string;
  dayEnd: string;
  periodDurationMinutes: number;
  transitionMinutes: number;
  breakDefs: BreakDefinition[];
}): PeriodSlotDefinition[] {
  return buildDaySlots(input);
}

function normalizeScheduleRow(row: Record<string, unknown>) {
  const activeDays = Array.isArray(row.activeDays)
    ? (row.activeDays as string[])
    : DEFAULT_SCHEDULE.activeDays;
  const dayStart = String(row.dayStart ?? DEFAULT_SCHEDULE.dayStart);
  const dayEnd = String(row.dayEnd ?? DEFAULT_SCHEDULE.dayEnd);
  const periodDurationMinutes =
    typeof row.periodDurationMinutes === 'number'
      ? row.periodDurationMinutes
      : DEFAULT_SCHEDULE.periodDurationMinutes;
  const transitionMinutes =
    typeof row.transitionMinutes === 'number' ? row.transitionMinutes : DEFAULT_SCHEDULE.transitionMinutes;
  const durationMode =
    typeof row.durationMode === 'string' ? row.durationMode : DEFAULT_SCHEDULE.durationMode;

  const breakDefs = parseBreakDefs(row.breaks, {
    dayStart,
    periodDurationMinutes,
    transitionMinutes,
  });

  let periodSlots = parsePeriodSlots(row.periodSlots);

  if (!periodSlots.length || durationMode !== 'CUSTOM') {
    periodSlots = rebuildSlots({
      dayStart,
      dayEnd,
      periodDurationMinutes,
      transitionMinutes,
      breakDefs,
    });
  } else {
    periodSlots = rippleSlotTimes(periodSlots, dayStart, transitionMinutes);
  }

  const periodCount = periodSlots.filter((s) => !s.isBreak).length;

  return {
    ...row,
    dayStart,
    dayEnd,
    periodDurationMinutes,
    periodCount,
    transitionMinutes,
    durationMode: 'UNIFORM',
    activeDays,
    breakDefs,
    periodSlots,
    breaks: breakDefs,
  };
}

export class ScheduleService {
  async get(organizationId: string, term: string, academicYear: string) {
    const schedule = await prisma.timetableSchoolSchedule.findUnique({
      where: {
        organizationId_term_academicYear: { organizationId, term, academicYear },
      },
    });

    if (!schedule) {
      const periodSlots = rebuildSlots({
        dayStart: DEFAULT_SCHEDULE.dayStart,
        dayEnd: DEFAULT_SCHEDULE.dayEnd,
        periodDurationMinutes: DEFAULT_SCHEDULE.periodDurationMinutes,
        transitionMinutes: DEFAULT_SCHEDULE.transitionMinutes,
        breakDefs: DEFAULT_SCHEDULE.breakDefs,
      });
      return prisma.timetableSchoolSchedule.create({
        data: {
          organizationId,
          term,
          academicYear,
          dayStart: DEFAULT_SCHEDULE.dayStart,
          dayEnd: DEFAULT_SCHEDULE.dayEnd,
          periodDurationMinutes: DEFAULT_SCHEDULE.periodDurationMinutes,
          periodCount: periodSlots.filter((s) => !s.isBreak).length,
          transitionMinutes: DEFAULT_SCHEDULE.transitionMinutes,
          durationMode: DEFAULT_SCHEDULE.durationMode,
          activeDays: DEFAULT_SCHEDULE.activeDays,
          breaks: DEFAULT_SCHEDULE.breakDefs as unknown as Prisma.InputJsonValue,
          periodSlots: periodSlots as unknown as Prisma.InputJsonValue,
        } as Prisma.TimetableSchoolScheduleUncheckedCreateInput,
      });
    }

    return normalizeScheduleRow(schedule as unknown as Record<string, unknown>);
  }

  async upsert(
    organizationId: string,
    term: string,
    academicYear: string,
    data: {
      dayStart?: string;
      dayEnd?: string;
      periodDurationMinutes?: number;
      periodCount?: number;
      transitionMinutes?: number;
      durationMode?: string;
      periodSlots?: PeriodSlotDefinition[];
      activeDays?: string[];
      breaks?: BreakDefinition[] | BreakWindow[];
    }
  ) {
    const existing = await prisma.timetableSchoolSchedule.findUnique({
      where: {
        organizationId_term_academicYear: { organizationId, term, academicYear },
      },
    });
    const base = existing ?? (await this.get(organizationId, term, academicYear));
    const dayStart = data.dayStart ?? base.dayStart;
    const dayEnd = data.dayEnd ?? base.dayEnd;
    const periodDurationMinutes = data.periodDurationMinutes ?? base.periodDurationMinutes;
    const transitionMinutes =
      data.transitionMinutes ??
      (base as { transitionMinutes?: number }).transitionMinutes ??
      DEFAULT_SCHEDULE.transitionMinutes;
    const activeDays = data.activeDays ?? (base.activeDays as string[]);
    const breakDefs = data.breaks
      ? parseBreakDefs(data.breaks, { dayStart, periodDurationMinutes, transitionMinutes })
      : parseBreakDefs(base.breaks, { dayStart, periodDurationMinutes, transitionMinutes });

    const periodSlots = rebuildSlots({
      dayStart,
      dayEnd,
      periodDurationMinutes,
      transitionMinutes,
      breakDefs,
    });
    const periodCount = periodSlots.filter((s) => !s.isBreak).length;

    const validation = validatePeriodSchedule({
      dayStart,
      dayEnd,
      activeDays,
      periodSlots,
      transitionMinutes,
    });

    if (!validation.valid) {
      const message = validation.issues.find((i) => i.severity === 'error')?.message ?? 'Invalid schedule';
      throw new AppError(400, message);
    }

    const row = await prisma.timetableSchoolSchedule.upsert({
      where: {
        organizationId_term_academicYear: { organizationId, term, academicYear },
      },
      create: {
        organizationId,
        term,
        academicYear,
        dayStart,
        dayEnd,
        periodDurationMinutes,
        periodCount,
        transitionMinutes,
        durationMode: 'UNIFORM',
        activeDays,
        breaks: breakDefs as unknown as Prisma.InputJsonValue,
        periodSlots: periodSlots as unknown as Prisma.InputJsonValue,
      } as Prisma.TimetableSchoolScheduleUncheckedCreateInput,
      update: {
        dayStart,
        dayEnd,
        periodDurationMinutes,
        periodCount,
        transitionMinutes,
        durationMode: 'UNIFORM',
        activeDays,
        breaks: breakDefs as unknown as Prisma.InputJsonValue,
        periodSlots: periodSlots as unknown as Prisma.InputJsonValue,
      } as Prisma.TimetableSchoolScheduleUncheckedUpdateInput,
    });

    return normalizeScheduleRow(row as unknown as Record<string, unknown>);
  }
}

export const scheduleService = new ScheduleService();
