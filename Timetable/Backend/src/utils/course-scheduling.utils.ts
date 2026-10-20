import type { TimeSlot } from './time.utils';
import { isMorningSlot, isAfternoonSlot } from './time.utils';

export type LessonDuration = 'SINGLE' | 'DOUBLE' | 'FLEXIBLE';
export type DoublePeriodMode = 'PREFER' | 'REQUIRE';
export type DoublePeriodPattern = 'ANY' | 'ONCE' | 'TWICE';
export type RoomRequirement = 'ANY' | 'PREFER_LAB' | 'REQUIRE_LAB';
export type SchedulingImportance = 'NORMAL' | 'IMPORTANT' | 'CRITICAL';

export interface CourseSchedulingRules {
  lessonDuration: LessonDuration;
  doublePeriodMode: DoublePeriodMode;
  doublePeriodPattern: DoublePeriodPattern;
  roomRequirement: RoomRequirement;
  preferredLabRoom?: string | null;
  preferredRoom?: string | null;
  preferPreferredRoom?: boolean;
  preferredDays?: string[];
  preferredPeriods?: string[];
  schedulingImportance?: SchedulingImportance;
}

const DEFAULT_RULES: CourseSchedulingRules = {
  lessonDuration: 'SINGLE',
  doublePeriodMode: 'PREFER',
  doublePeriodPattern: 'ANY',
  roomRequirement: 'ANY',
  preferredLabRoom: null,
  preferredRoom: null,
  preferPreferredRoom: false,
  preferredDays: [],
  preferredPeriods: [],
  schedulingImportance: 'NORMAL',
};

export function parseSchedulingRules(raw: unknown): CourseSchedulingRules {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_RULES };
  const r = raw as Record<string, unknown>;
  return {
    lessonDuration: (r.lessonDuration as LessonDuration) ?? DEFAULT_RULES.lessonDuration,
    doublePeriodMode: (r.doublePeriodMode as DoublePeriodMode) ?? DEFAULT_RULES.doublePeriodMode,
    doublePeriodPattern: (r.doublePeriodPattern as DoublePeriodPattern) ?? DEFAULT_RULES.doublePeriodPattern,
    roomRequirement: (r.roomRequirement as RoomRequirement) ?? DEFAULT_RULES.roomRequirement,
    preferredLabRoom: typeof r.preferredLabRoom === 'string' ? r.preferredLabRoom : null,
    preferredRoom: typeof r.preferredRoom === 'string' ? r.preferredRoom : null,
    preferPreferredRoom: Boolean(r.preferPreferredRoom),
    preferredDays: Array.isArray(r.preferredDays) ? (r.preferredDays as string[]) : [],
    preferredPeriods: Array.isArray(r.preferredPeriods) ? (r.preferredPeriods as string[]) : [],
    schedulingImportance:
      (r.schedulingImportance as SchedulingImportance) ?? DEFAULT_RULES.schedulingImportance,
  };
}

export function mergeSchedulingRules(
  base: unknown,
  overrides: unknown
): CourseSchedulingRules {
  const rules = parseSchedulingRules(base);
  if (!overrides || typeof overrides !== 'object') return rules;
  const o = overrides as Record<string, unknown>;
  return {
    ...rules,
    ...(o.lessonDuration ? { lessonDuration: o.lessonDuration as CourseSchedulingRules['lessonDuration'] } : {}),
    ...(o.doublePeriodMode
      ? { doublePeriodMode: o.doublePeriodMode as CourseSchedulingRules['doublePeriodMode'] }
      : {}),
    ...(o.doublePeriodPattern
      ? { doublePeriodPattern: o.doublePeriodPattern as CourseSchedulingRules['doublePeriodPattern'] }
      : {}),
    ...(o.roomRequirement
      ? { roomRequirement: o.roomRequirement as CourseSchedulingRules['roomRequirement'] }
      : {}),
    ...(typeof o.preferredLabRoom === 'string' ? { preferredLabRoom: o.preferredLabRoom } : {}),
    ...(typeof o.preferredRoom === 'string' ? { preferredRoom: o.preferredRoom } : {}),
    ...(Array.isArray(o.preferredDays) ? { preferredDays: o.preferredDays as string[] } : {}),
    ...(Array.isArray(o.preferredPeriods) ? { preferredPeriods: o.preferredPeriods as string[] } : {}),
  };
}

export function isLabRoomName(name: string): boolean {
  return /lab(oratory)?/i.test(name);
}

export function collectLabRooms(
  classrooms: Array<{ name: string; building?: string | null; roomNumber: string }>
): string[] {
  const labs = new Set<string>();
  for (const c of classrooms) {
    if (
      isLabRoomName(c.name) ||
      isLabRoomName(c.building ?? '') ||
      isLabRoomName(c.roomNumber)
    ) {
      labs.add(c.name);
    }
  }
  return [...labs];
}

export interface RoomResolution {
  room: string | null;
  ok: boolean;
  reason?: 'lab_required_unavailable' | 'room_busy';
}

export function roomBusyKey(dayOfWeek: string, startTime: string, endTime: string, room: string) {
  return `${dayOfWeek}|${startTime}|${endTime}|${room}`;
}

export function resolveRoomForSlot(
  rules: CourseSchedulingRules,
  assignmentRoom: string | null | undefined,
  dayOfWeek: string,
  startTime: string,
  endTime: string,
  roomBusy: Set<string>,
  labRooms: string[]
): RoomResolution {
  const isBusy = (room: string) => roomBusy.has(roomBusyKey(dayOfWeek, startTime, endTime, room));

  if (rules.roomRequirement === 'REQUIRE_LAB') {
    const candidates = [
      ...(rules.preferredLabRoom ? [rules.preferredLabRoom] : []),
      ...labRooms.filter((r) => r !== rules.preferredLabRoom),
    ];
    for (const room of [...new Set(candidates)]) {
      if (!isBusy(room)) return { room, ok: true };
    }
    return { room: null, ok: false, reason: 'lab_required_unavailable' };
  }

  if (rules.roomRequirement === 'PREFER_LAB') {
    const labCandidates = [
      ...(rules.preferredLabRoom ? [rules.preferredLabRoom] : []),
      ...labRooms,
    ];
    for (const room of [...new Set(labCandidates)]) {
      if (!isBusy(room)) return { room, ok: true };
    }
  }

  if (rules.preferPreferredRoom && rules.preferredRoom && !isBusy(rules.preferredRoom)) {
    return { room: rules.preferredRoom, ok: true };
  }

  const fallback = assignmentRoom ?? rules.preferredRoom ?? null;
  if (fallback) {
    if (isBusy(fallback)) return { room: null, ok: false, reason: 'room_busy' };
    return { room: fallback, ok: true };
  }

  return { room: null, ok: true };
}

export function wantsDoublePeriod(rules: CourseSchedulingRules, prefersDoublePeriod: boolean): boolean {
  return (
    rules.lessonDuration === 'DOUBLE' ||
    rules.lessonDuration === 'FLEXIBLE' ||
    prefersDoublePeriod
  );
}

export function requiresDoublePeriod(rules: CourseSchedulingRules): boolean {
  return (
    rules.doublePeriodMode === 'REQUIRE' &&
    (rules.lessonDuration === 'DOUBLE' || rules.lessonDuration === 'FLEXIBLE')
  );
}

export function scoreSlotForCourse(
  slot: TimeSlot,
  timePreference: string,
  rules: CourseSchedulingRules,
  schedule: { dayStart: string; dayEnd: string },
  usedDays?: Set<string>
): number {
  // Prefer earlier periods so free time lands mid-day / afternoon, not empty mornings.
  let score = Math.max(0, 24 - slot.slotIndex) * 14;

  if (rules.preferredDays?.length) {
    score += rules.preferredDays.includes(slot.dayOfWeek) ? 1000 : -500;
  }

  const morning = isMorningSlot(slot.startTime, schedule.dayStart, schedule.dayEnd);
  const afternoon = isAfternoonSlot(slot.startTime, schedule.dayStart, schedule.dayEnd);

  if (timePreference === 'MORNING') {
    score += morning ? 280 : -180;
  } else if (timePreference === 'AFTERNOON') {
    score += afternoon ? 280 : -180;
  } else {
    // ANY: fill mornings first; keep free slots for later in the day when possible.
    if (morning) score += 180;
    if (afternoon) score -= 70;
  }

  if (rules.preferredPeriods?.length) {
    const label = `P${slot.slotIndex + 1}`;
    score += rules.preferredPeriods.includes(label) ? 100 : -20;
  }
  // Spread the same subject across different weekdays instead of stacking on one day.
  if (usedDays?.size) {
    score += usedDays.has(slot.dayOfWeek) ? -350 : 120;
  }
  return score;
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function sortSlotsForCourse(
  slots: TimeSlot[],
  timePreference: string,
  rules: CourseSchedulingRules,
  schedule: { dayStart: string; dayEnd: string },
  options?: { usedDays?: Set<string>; rotationKey?: string }
): TimeSlot[] {
  const seed = options?.rotationKey ? hashSeed(options.rotationKey) : 0;
  return [...slots]
    .map((slot, index) => ({
      slot,
      score: scoreSlotForCourse(slot, timePreference, rules, schedule, options?.usedDays),
      tie: (index + seed) % Math.max(slots.length, 1),
    }))
    .sort((a, b) => b.score - a.score || a.tie - b.tie)
    .map((entry) => entry.slot);
}
