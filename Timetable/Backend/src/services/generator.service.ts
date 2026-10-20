import { AssignmentStatus, TimePreference } from '../generated/prisma';
import { prisma } from '../config/database';
import { scheduleService } from './schedule.service';
import { assignmentService } from './assignment.service';
import {
  parseSchedulingRules,
  mergeSchedulingRules,
  collectLabRooms,
  resolveRoomForSlot,
  roomBusyKey,
  wantsDoublePeriod,
  requiresDoublePeriod,
  sortSlotsForCourse,
  type CourseSchedulingRules,
} from '../utils/course-scheduling.utils';
import {
  generateTimeSlots,
  teachingSlotsOnly,
  isMorningSlot,
  isAfternoonSlot,
  slotKey,
  type BreakWindow,
  type TimeSlot,
} from '../utils/time.utils';

export interface ProposedPlacement {
  className: string;
  subjectName: string;
  teacherUserId: string;
  teacherName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  term: string;
  academicYear: string;
}

export interface CoverageItem {
  className: string;
  subjectName: string;
  teacherName: string;
  expected: number;
  placed: number;
  complete: boolean;
}

export type SchedulingIssueType =
  | 'incomplete_coverage'
  | 'lab_unavailable'
  | 'double_period_required'
  | 'rule_violation';

export interface SchedulingIssue {
  type: SchedulingIssueType;
  severity: 'error' | 'warning';
  className: string;
  subjectName: string;
  message: string;
  details: Record<string, unknown>;
}

const generationCache = new Map<
  string,
  { placements: ProposedPlacement[]; issues: SchedulingIssue[]; createdAt: number }
>();

function cacheKey(orgId: string, term: string, year: string, classes: string[]) {
  return `${orgId}|${term}|${year}|${classes.sort().join(',')}`;
}

type CourseConfigRow = {
  timePreference: TimePreference;
  customWindowStart: string | null;
  customWindowEnd: string | null;
  prefersDoublePeriod: boolean;
  periodsPerWeek: number;
  priority: number;
  schedulingRules: unknown;
};

/** Progressive soft→hard relaxation used by generate retry and fill-gaps. */
type PlacementRelax = {
  ignoreTimePreference?: boolean;
  ignorePreferredPeriods?: boolean;
  ignorePreferredDays?: boolean;
  ignoreCustomWindow?: boolean;
  allowSingleDespiteRequireDouble?: boolean;
  ignoreFixedRoom?: boolean;
};

function dedupeIssues(issues: SchedulingIssue[]) {
  return issues.filter(
    (issue, index, arr) =>
      arr.findIndex(
        (x) =>
          x.type === issue.type &&
          x.message === issue.message &&
          x.className === issue.className &&
          x.subjectName === issue.subjectName
      ) === index
  );
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildSchedulingAdvice(input: {
  blocker: string;
  blockerBreakdown: Array<{ label: string; n: number }>;
  className: string;
  subjectName: string;
  teacherName: string;
  expected: number;
  placed: number;
  freeClassSlots: number;
  teacherFreeSlots: number;
  eligibleSlots: number;
  timePreference: string;
}): string[] {
  const advice: string[] = [];
  const top = input.blockerBreakdown[0]?.label ?? input.blocker;

  if (top.includes('teacher already teaching') || input.blocker.includes('teacher already teaching')) {
    advice.push(
      `${input.teacherName} overlaps other classes at most teaching times — open the Timetable tab and move one of their lessons, or use Conflict Center → Re-scan.`,
      'Generate and Apply one or two classes at a time so shared teachers settle before adding more classes.',
      'In Teacher Assignments, split classes between two teachers or reduce periods/week where possible.',
    );
  }
  if (
    top.includes('time preference') ||
    input.timePreference === 'MORNING' ||
    input.timePreference === 'AFTERNOON'
  ) {
    advice.push(
      'Click Fill missing periods — it relaxes morning/afternoon and preferred-period rules while keeping hard teacher/class clashes.',
      'In Courses & rules, set this subject to Any time if a strict window is not required.',
    );
  }
  if (top.includes('preferred period')) {
    advice.push('Fill missing periods ignores preferred period numbers after the first pass; or widen allowed periods in course scheduling rules.');
  }
  if (top.includes('room/lab')) {
    advice.push('Add or free a lab room in Classrooms, or change the course rule from Require lab to Prefer lab.');
  }
  if (input.freeClassSlots === 0) {
    advice.push(
      `${input.className} has no empty slots — lower periods/week for some subjects or extend the day in Time Settings.`,
    );
  }
  if (input.placed === 0 && input.teacherFreeSlots === 0 && !top.includes('teacher already teaching')) {
    advice.push(`${input.teacherName} has no free periods this week — redistribute assignments before retrying.`);
  }
  if (input.eligibleSlots > 0 && input.placed < input.expected) {
    advice.push('Soft rules or double-period pairing blocked placement — use Fill missing periods or Retry generate.');
  }
  if (advice.length === 0) {
    advice.push('Retry generate (reorders placement). If issues remain, fix the top blocker above then run Fill missing periods.');
  }
  return [...new Set(advice)].slice(0, 5);
}

function constraintScore(
  courseConfig: CourseConfigRow | null,
  rules: CourseSchedulingRules,
  remaining: number
): number {
  let score = remaining * 12 + (courseConfig?.priority ?? 5) * 3;
  const pref = courseConfig?.timePreference ?? 'ANY';
  if (pref === 'MORNING' || pref === 'AFTERNOON') score += 80;
  if (rules.preferredPeriods?.length) score += 40;
  if (rules.preferredDays?.length) score += 25;
  if (requiresDoublePeriod(rules)) score += 35;
  if (rules.roomRequirement === 'REQUIRE_LAB') score += 30;
  return score;
}

export class GeneratorService {
  async workload(organizationId: string, term: string, academicYear: string) {
    const assignments = await assignmentService.list(organizationId, { term, academicYear });
    const placed = await prisma.academicTimetable.findMany({
      where: { organizationId, term, academicYear, isExtraActivity: false },
    });

    const byTeacher = new Map<string, { teacherName: string; expected: number; placed: number }>();

    for (const a of assignments) {
      const current = byTeacher.get(a.teacherUserId) ?? {
        teacherName: a.teacherName,
        expected: 0,
        placed: 0,
      };
      current.expected += a.periodsPerWeek;
      byTeacher.set(a.teacherUserId, current);
    }

    for (const row of placed) {
      const current = byTeacher.get(row.teacherUserId);
      if (current) current.placed += 1;
    }

    return [...byTeacher.entries()].map(([teacherUserId, stats]) => ({
      teacherUserId,
      ...stats,
      balance: stats.expected - stats.placed,
    }));
  }

  async classCoverage(organizationId: string, term: string, academicYear: string, className?: string) {
    const assignments = await assignmentService.list(organizationId, {
      term,
      academicYear,
      ...(className ? { className } : {}),
    });
    const courseConfigs = await prisma.timetableCourseConfig.findMany({ where: { organizationId } });
    const courseMap = new Map(courseConfigs.map((c) => [c.subjectName, c]));

    const placed = await prisma.academicTimetable.findMany({
      where: {
        organizationId,
        term,
        academicYear,
        isExtraActivity: false,
        ...(className ? { className } : {}),
      },
    });

    const coverage: CoverageItem[] = assignments.map((a) => {
      const expected = a.periodsPerWeek ?? courseMap.get(a.subjectName)?.periodsPerWeek ?? 1;
      const count = placed.filter(
        (p) =>
          p.className === a.className &&
          p.subjectName === a.subjectName &&
          p.teacherUserId === a.teacherUserId
      ).length;
      return {
        className: a.className,
        subjectName: a.subjectName,
        teacherName: a.teacherName,
        expected,
        placed: count,
        complete: count >= expected,
      };
    });

    const totalExpected = coverage.reduce((s, c) => s + c.expected, 0);
    const totalPlaced = coverage.reduce((s, c) => s + c.placed, 0);

    return {
      coverage,
      summary: {
        totalExpected,
        totalPlaced,
        percent: totalExpected ? Math.round((totalPlaced / totalExpected) * 100) : 0,
      },
    };
  }

  private slotAllowed(
    slot: TimeSlot,
    assignment: { teacherUserId: string },
    profile: { availableDays: unknown } | null,
    courseConfig: CourseConfigRow | null,
    schedule: { dayStart: string; dayEnd: string },
    teacherDayCount: Map<string, number>,
    rules: CourseSchedulingRules,
    strictPreferredDays: boolean,
    relax: PlacementRelax = {}
  ): boolean {
    if (slot.isBreak) return false;

    const availableDays = (profile?.availableDays as string[]) ?? [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
    ];
    if (!availableDays.includes(slot.dayOfWeek)) return false;

    const timePreference = relax.ignoreTimePreference
      ? 'ANY'
      : (courseConfig?.timePreference ?? 'ANY');
    if (timePreference === 'MORNING' && !isMorningSlot(slot.startTime, schedule.dayStart, schedule.dayEnd)) {
      return false;
    }
    if (timePreference === 'AFTERNOON' && !isAfternoonSlot(slot.startTime, schedule.dayStart, schedule.dayEnd)) {
      return false;
    }

    if (
      !relax.ignoreCustomWindow &&
      courseConfig?.customWindowStart &&
      courseConfig?.customWindowEnd
    ) {
      const startMins =
        parseInt(slot.startTime.split(':')[0]) * 60 + parseInt(slot.startTime.split(':')[1]);
      const winStart =
        parseInt(courseConfig.customWindowStart.split(':')[0]) * 60 +
        parseInt(courseConfig.customWindowStart.split(':')[1]);
      const winEnd =
        parseInt(courseConfig.customWindowEnd.split(':')[0]) * 60 +
        parseInt(courseConfig.customWindowEnd.split(':')[1]);
      if (startMins < winStart || startMins >= winEnd) return false;
    }

    if (strictPreferredDays && !relax.ignorePreferredDays && rules.preferredDays?.length) {
      if (!rules.preferredDays.includes(slot.dayOfWeek)) return false;
    }

    if (!relax.ignorePreferredPeriods && rules.preferredPeriods?.length) {
      const periodLabel = `P${slot.slotIndex + 1}`;
      if (!rules.preferredPeriods.includes(periodLabel)) return false;
    }

    return true;
  }

  private findNextSlot(slots: TimeSlot[], slot: TimeSlot): TimeSlot | null {
    return (
      slots.find(
        (s) => !s.isBreak && s.dayOfWeek === slot.dayOfWeek && s.slotIndex === slot.slotIndex + 1
      ) ?? null
    );
  }

  private canPlaceSlot(
    slot: TimeSlot,
    className: string,
    teacherUserId: string,
    classBusy: Set<string>,
    teacherBusy: Set<string>
  ): boolean {
    const cKey = slotKey(slot.dayOfWeek, slot.startTime, slot.endTime) + `|${className}`;
    const tKey = slotKey(slot.dayOfWeek, slot.startTime, slot.endTime) + `|${teacherUserId}`;
    return !classBusy.has(cKey) && !teacherBusy.has(tKey);
  }

  private markSlotBusy(
    slot: TimeSlot,
    className: string,
    teacherUserId: string,
    room: string | null,
    classBusy: Set<string>,
    teacherBusy: Set<string>,
    roomBusy: Set<string>,
    teacherDayCount: Map<string, number>
  ) {
    classBusy.add(slotKey(slot.dayOfWeek, slot.startTime, slot.endTime) + `|${className}`);
    teacherBusy.add(slotKey(slot.dayOfWeek, slot.startTime, slot.endTime) + `|${teacherUserId}`);
    if (room) roomBusy.add(roomBusyKey(slot.dayOfWeek, slot.startTime, slot.endTime, room));
    const dayKey = `${teacherUserId}|${slot.dayOfWeek}`;
    teacherDayCount.set(dayKey, (teacherDayCount.get(dayKey) ?? 0) + 1);
  }

  private maxDoubleBlocks(rules: CourseSchedulingRules): number {
    if (rules.doublePeriodPattern === 'ONCE') return 1;
    if (rules.doublePeriodPattern === 'TWICE') return 2;
    return Number.POSITIVE_INFINITY;
  }

  private tryPlace(
    slot: TimeSlot,
    slots: TimeSlot[],
    input: {
      className: string;
      assignment: {
        subjectName: string;
        teacherUserId: string;
        teacherName: string;
        room?: string | null;
        periodsPerWeek: number;
        schedulingOverrides?: unknown;
      };
      courseConfig: CourseConfigRow | null;
      profile: { availableDays: unknown } | null;
      schedule: { dayStart: string; dayEnd: string };
      term: string;
      academicYear: string;
      preferDouble: boolean;
      strictPreferredDays: boolean;
      relax?: PlacementRelax;
    },
    classBusy: Set<string>,
    teacherBusy: Set<string>,
    roomBusy: Set<string>,
    labRooms: string[],
    teacherDayCount: Map<string, number>,
    doubleBlocksUsed: number,
    placed: number,
    pendingIssues: SchedulingIssue[]
  ): { placements: ProposedPlacement[]; periodsUsed: number; doubleBlocksUsed: number } | null {
    const {
      className,
      assignment,
      courseConfig,
      profile,
      schedule,
      term,
      academicYear,
      preferDouble,
      strictPreferredDays,
      relax = {},
    } = input;

    const rules = mergeSchedulingRules(courseConfig?.schedulingRules, assignment.schedulingOverrides);
    const targetPeriods = assignment.periodsPerWeek ?? courseConfig?.periodsPerWeek ?? 1;
    const mustDouble = requiresDoublePeriod(rules) && !relax.allowSingleDespiteRequireDouble;

    if (
      !this.slotAllowed(
        slot,
        assignment,
        profile,
        courseConfig,
        schedule,
        teacherDayCount,
        rules,
        strictPreferredDays,
        relax
      ) ||
      !this.canPlaceSlot(slot, className, assignment.teacherUserId, classBusy, teacherBusy)
    ) {
      return null;
    }

    let roomResult = resolveRoomForSlot(
      rules,
      assignment.room,
      slot.dayOfWeek,
      slot.startTime,
      slot.endTime,
      roomBusy,
      labRooms
    );

    if (!roomResult.ok && relax.ignoreFixedRoom && roomResult.reason === 'room_busy') {
      roomResult = resolveRoomForSlot(
        rules,
        null,
        slot.dayOfWeek,
        slot.startTime,
        slot.endTime,
        roomBusy,
        labRooms
      );
    }

    if (!roomResult.ok) {
      if (roomResult.reason === 'lab_required_unavailable') {
        pendingIssues.push({
          type: 'lab_unavailable',
          severity: 'error',
          className,
          subjectName: assignment.subjectName,
          message: `${assignment.subjectName} requires a laboratory on ${slot.dayOfWeek} P${slot.slotIndex + 1} but no lab is available — will not use a normal classroom`,
          details: {
            dayOfWeek: slot.dayOfWeek,
            period: `P${slot.slotIndex + 1}`,
            startTime: slot.startTime,
            preferredLab: rules.preferredLabRoom,
          },
        });
      }
      return null;
    }

    const nextSlot = preferDouble ? this.findNextSlot(slots, slot) : null;
    let canDouble =
      Boolean(preferDouble && nextSlot) &&
      placed + 2 <= targetPeriods &&
      doubleBlocksUsed < this.maxDoubleBlocks(rules) &&
      this.slotAllowed(
        nextSlot!,
        assignment,
        profile,
        courseConfig,
        schedule,
        teacherDayCount,
        rules,
        strictPreferredDays,
        relax
      ) &&
      this.canPlaceSlot(nextSlot!, className, assignment.teacherUserId, classBusy, teacherBusy);

    if (canDouble && nextSlot) {
      let nextRoom = resolveRoomForSlot(
        rules,
        assignment.room,
        nextSlot.dayOfWeek,
        nextSlot.startTime,
        nextSlot.endTime,
        roomBusy,
        labRooms
      );
      if (!nextRoom.ok && relax.ignoreFixedRoom && nextRoom.reason === 'room_busy') {
        nextRoom = resolveRoomForSlot(
          rules,
          null,
          nextSlot.dayOfWeek,
          nextSlot.startTime,
          nextSlot.endTime,
          roomBusy,
          labRooms
        );
      }
      if (!nextRoom.ok || nextRoom.room !== roomResult.room) {
        canDouble = false;
        if (mustDouble) return null;
      }
    }

    if (mustDouble && !canDouble) return null;

    const useDouble = Boolean(canDouble);
    if (placed + (useDouble ? 2 : 1) > targetPeriods) return null;
    if (mustDouble && !useDouble) return null;

    const room = roomResult.room;
    const placements: ProposedPlacement[] = [
      {
        className,
        subjectName: assignment.subjectName,
        teacherUserId: assignment.teacherUserId,
        teacherName: assignment.teacherName,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room,
        term,
        academicYear,
      },
    ];

    this.markSlotBusy(
      slot,
      className,
      assignment.teacherUserId,
      room,
      classBusy,
      teacherBusy,
      roomBusy,
      teacherDayCount
    );

    let periodsUsed = 1;
    let blocksUsed = doubleBlocksUsed;

    if (useDouble && nextSlot) {
      placements.push({
        className,
        subjectName: assignment.subjectName,
        teacherUserId: assignment.teacherUserId,
        teacherName: assignment.teacherName,
        dayOfWeek: nextSlot.dayOfWeek,
        startTime: nextSlot.startTime,
        endTime: nextSlot.endTime,
        room,
        term,
        academicYear,
      });
      this.markSlotBusy(
        nextSlot,
        className,
        assignment.teacherUserId,
        room,
        classBusy,
        teacherBusy,
        roomBusy,
        teacherDayCount
      );
      periodsUsed = 2;
      blocksUsed += 1;
    }

    return { placements, periodsUsed, doubleBlocksUsed: blocksUsed };
  }

  private diagnoseBlockers(
    className: string,
    assignment: { subjectName: string; teacherUserId: string; room?: string | null; schedulingOverrides?: unknown },
    courseConfig: CourseConfigRow | null,
    profile: { availableDays: unknown } | null,
    slots: TimeSlot[],
    schedule: { dayStart: string; dayEnd: string },
    classBusy: Set<string>,
    teacherBusy: Set<string>,
    roomBusy: Set<string>,
    labRooms: string[],
    teacherDayCount: Map<string, number>
  ): {
    blocker: string;
    blockerBreakdown: Array<{ label: string; n: number }>;
    freeClassSlots: number;
    teacherFreeSlots: number;
    eligibleSlots: number;
  } {
    const rules = mergeSchedulingRules(courseConfig?.schedulingRules, assignment.schedulingOverrides);
    let freeClassSlots = 0;
    let teacherFreeSlots = 0;
    let eligibleSlots = 0;
    let blockedByTimePref = 0;
    let blockedByPeriods = 0;
    let blockedByRoom = 0;
    let blockedByTeacherBusy = 0;

    for (const slot of slots) {
      if (slot.isBreak) continue;
      const cKey = slotKey(slot.dayOfWeek, slot.startTime, slot.endTime) + `|${className}`;
      const tKey = slotKey(slot.dayOfWeek, slot.startTime, slot.endTime) + `|${assignment.teacherUserId}`;
      if (!classBusy.has(cKey)) freeClassSlots += 1;
      if (!teacherBusy.has(tKey)) teacherFreeSlots += 1;
      if (classBusy.has(cKey)) continue;
      if (teacherBusy.has(tKey)) {
        blockedByTeacherBusy += 1;
        continue;
      }
      const pref = courseConfig?.timePreference ?? 'ANY';
      if (pref === 'MORNING' && !isMorningSlot(slot.startTime, schedule.dayStart, schedule.dayEnd)) {
        blockedByTimePref += 1;
        continue;
      }
      if (pref === 'AFTERNOON' && !isAfternoonSlot(slot.startTime, schedule.dayStart, schedule.dayEnd)) {
        blockedByTimePref += 1;
        continue;
      }
      if (rules.preferredPeriods?.length) {
        const periodLabel = `P${slot.slotIndex + 1}`;
        if (!rules.preferredPeriods.includes(periodLabel)) {
          blockedByPeriods += 1;
          continue;
        }
      }
      const room = resolveRoomForSlot(
        rules,
        assignment.room,
        slot.dayOfWeek,
        slot.startTime,
        slot.endTime,
        roomBusy,
        labRooms
      );
      if (!room.ok) {
        blockedByRoom += 1;
        continue;
      }
      if (
        this.slotAllowed(
          slot,
          assignment,
          profile,
          courseConfig,
          schedule,
          teacherDayCount,
          rules,
          false,
          {}
        )
      ) {
        eligibleSlots += 1;
      }
    }

    const reasons: Array<{ label: string; n: number }> = [
      { label: 'teacher already teaching another class', n: blockedByTeacherBusy },
      {
        label: `${(courseConfig?.timePreference ?? 'ANY').toLowerCase()} time preference`,
        n: blockedByTimePref,
      },
      { label: 'preferred period restriction', n: blockedByPeriods },
      { label: 'room/lab unavailable', n: blockedByRoom },
    ].filter((r) => r.n > 0);
    reasons.sort((a, b) => b.n - a.n);
    const blocker =
      eligibleSlots > 0
        ? 'remaining soft constraints or double-period pairing'
        : reasons[0]?.label ??
          (freeClassSlots === 0 ? 'class timetable is full' : 'no compatible free slots');

    return { blocker, blockerBreakdown: reasons, freeClassSlots, teacherFreeSlots, eligibleSlots };
  }

  private runPlacementPass(
    orderedSlots: TimeSlot[],
    slots: TimeSlot[],
    input: {
      className: string;
      assignment: {
        subjectName: string;
        teacherUserId: string;
        teacherName: string;
        room?: string | null;
        periodsPerWeek: number;
        schedulingOverrides?: unknown;
      };
      courseConfig: CourseConfigRow | null;
      profile: { availableDays: unknown } | null;
      schedule: { dayStart: string; dayEnd: string };
      term: string;
      academicYear: string;
      preferDouble: boolean;
      strictPreferredDays: boolean;
      relax?: PlacementRelax;
    },
    classBusy: Set<string>,
    teacherBusy: Set<string>,
    roomBusy: Set<string>,
    labRooms: string[],
    teacherDayCount: Map<string, number>,
    state: { placed: number; doubleBlocksUsed: number; placements: ProposedPlacement[]; usedDays: Set<string> },
    targetPeriods: number,
    pendingIssues: SchedulingIssue[]
  ) {
    for (const slot of orderedSlots) {
      if (state.placed >= targetPeriods) break;
      const result = this.tryPlace(
        slot,
        slots,
        input,
        classBusy,
        teacherBusy,
        roomBusy,
        labRooms,
        teacherDayCount,
        state.doubleBlocksUsed,
        state.placed,
        pendingIssues
      );
      if (!result) continue;
      state.placements.push(...result.placements);
      state.placed += result.periodsUsed;
      state.doubleBlocksUsed = result.doubleBlocksUsed;
      for (const p of result.placements) state.usedDays.add(p.dayOfWeek);
    }
  }

  private scheduleAssignment(
    className: string,
    assignment: {
      subjectName: string;
      teacherUserId: string;
      teacherName: string;
      room?: string | null;
      periodsPerWeek: number;
      schedulingOverrides?: unknown;
    },
    courseConfig: CourseConfigRow | null,
    profile: { availableDays: unknown } | null,
    slots: TimeSlot[],
    schedule: { dayStart: string; dayEnd: string },
    term: string,
    academicYear: string,
    classBusy: Set<string>,
    teacherBusy: Set<string>,
    roomBusy: Set<string>,
    labRooms: string[],
    teacherDayCount: Map<string, number>,
    options: { mode?: 'generate' | 'fill' } = {}
  ): { placements: ProposedPlacement[]; issues: SchedulingIssue[] } {
    const mode = options.mode ?? 'generate';
    const rules = mergeSchedulingRules(courseConfig?.schedulingRules, assignment.schedulingOverrides);
    const targetPeriods = assignment.periodsPerWeek ?? courseConfig?.periodsPerWeek ?? 1;
    const timePreference = courseConfig?.timePreference ?? 'ANY';
    const pendingIssues: SchedulingIssue[] = [];
    const state = {
      placements: [] as ProposedPlacement[],
      placed: 0,
      doubleBlocksUsed: 0,
      usedDays: new Set<string>(),
    };
    const orderedSlots = sortSlotsForCourse(slots, timePreference, rules, schedule, {
      usedDays: state.usedDays,
      rotationKey: `${className}|${assignment.subjectName}`,
    });

    const wantDouble = courseConfig
      ? wantsDoublePeriod(rules, courseConfig.prefersDoublePeriod)
      : false;
    const mustDouble = requiresDoublePeriod(rules);

    if (mustDouble && targetPeriods % 2 !== 0) {
      pendingIssues.push({
        type: 'double_period_required',
        severity: 'warning',
        className,
        subjectName: assignment.subjectName,
        message: `${assignment.subjectName} prefers double periods but ${targetPeriods} remaining is odd — will allow singles to fill gaps`,
        details: { targetPeriods },
      });
    }

    const hasPreferredDays = Boolean(rules.preferredDays?.length);
    const baseInput = {
      className,
      assignment,
      courseConfig,
      profile,
      schedule,
      term,
      academicYear,
    };

    // Pass 1: preferred doubles + preferred days
    this.runPlacementPass(
      orderedSlots,
      slots,
      { ...baseInput, preferDouble: wantDouble, strictPreferredDays: hasPreferredDays },
      classBusy,
      teacherBusy,
      roomBusy,
      labRooms,
      teacherDayCount,
      state,
      targetPeriods,
      pendingIssues
    );

    // Pass 2: singles if doubles preferred but not required
    if (state.placed < targetPeriods && wantDouble && !mustDouble) {
      this.runPlacementPass(
        orderedSlots,
        slots,
        { ...baseInput, preferDouble: false, strictPreferredDays: hasPreferredDays },
        classBusy,
        teacherBusy,
        roomBusy,
        labRooms,
        teacherDayCount,
        state,
        targetPeriods,
        pendingIssues
      );
    }

    // Pass 3: drop preferred-day strictness
    if (state.placed < targetPeriods && hasPreferredDays) {
      this.runPlacementPass(
        orderedSlots,
        slots,
        { ...baseInput, preferDouble: false, strictPreferredDays: false },
        classBusy,
        teacherBusy,
        roomBusy,
        labRooms,
        teacherDayCount,
        state,
        targetPeriods,
        pendingIssues
      );
    }

    // Progressive relaxation ladder (stronger for fill-gaps).
    const ladder: PlacementRelax[] =
      mode === 'fill'
        ? [
            { ignorePreferredPeriods: true },
            { ignorePreferredPeriods: true, ignoreTimePreference: true },
            {
              ignorePreferredPeriods: true,
              ignoreTimePreference: true,
              allowSingleDespiteRequireDouble: true,
            },
            {
              ignorePreferredPeriods: true,
              ignoreTimePreference: true,
              allowSingleDespiteRequireDouble: true,
              ignoreFixedRoom: true,
            },
            {
              ignorePreferredPeriods: true,
              ignoreTimePreference: true,
              allowSingleDespiteRequireDouble: true,
              ignoreFixedRoom: true,
              ignoreCustomWindow: true,
            },
          ]
        : [
            { ignorePreferredPeriods: true },
            { ignorePreferredPeriods: true, ignoreTimePreference: true },
            {
              ignorePreferredPeriods: true,
              ignoreTimePreference: true,
              allowSingleDespiteRequireDouble: true,
            },
            {
              ignorePreferredPeriods: true,
              ignoreTimePreference: true,
              allowSingleDespiteRequireDouble: true,
              ignoreFixedRoom: true,
            },
            {
              ignorePreferredPeriods: true,
              ignoreTimePreference: true,
              allowSingleDespiteRequireDouble: true,
              ignoreFixedRoom: true,
              ignoreCustomWindow: true,
            },
          ];

    for (const relax of ladder) {
      if (state.placed >= targetPeriods) break;
      const retrySlots = sortSlotsForCourse(
        slots,
        relax.ignoreTimePreference ? 'ANY' : timePreference,
        { ...rules, preferredDays: [], preferredPeriods: relax.ignorePreferredPeriods ? [] : rules.preferredPeriods },
        schedule,
        {
          usedDays: state.usedDays,
          rotationKey: `${className}|${assignment.subjectName}|relax`,
        }
      );
      this.runPlacementPass(
        retrySlots,
        slots,
        {
          ...baseInput,
          preferDouble: false,
          strictPreferredDays: false,
          relax,
        },
        classBusy,
        teacherBusy,
        roomBusy,
        labRooms,
        teacherDayCount,
        state,
        targetPeriods,
        pendingIssues
      );
    }

    const issues = [...pendingIssues];
    const { placed, placements } = state;

    if (placed < targetPeriods) {
      const diagnosis = this.diagnoseBlockers(
        className,
        assignment,
        courseConfig,
        profile,
        slots,
        schedule,
        classBusy,
        teacherBusy,
        roomBusy,
        labRooms,
        teacherDayCount
      );
      const timePreference = courseConfig?.timePreference ?? 'ANY';
      const advice = buildSchedulingAdvice({
        blocker: diagnosis.blocker,
        blockerBreakdown: diagnosis.blockerBreakdown,
        className,
        subjectName: assignment.subjectName,
        teacherName: assignment.teacherName,
        expected: targetPeriods,
        placed,
        freeClassSlots: diagnosis.freeClassSlots,
        teacherFreeSlots: diagnosis.teacherFreeSlots,
        eligibleSlots: diagnosis.eligibleSlots,
        timePreference,
      });
      issues.push({
        type: 'incomplete_coverage',
        severity: 'error',
        className,
        subjectName: assignment.subjectName,
        message: `${assignment.subjectName} for ${className}: only ${placed} of ${targetPeriods} required periods could be scheduled — blocked by ${diagnosis.blocker}`,
        details: {
          expected: targetPeriods,
          placed,
          blocker: diagnosis.blocker,
          blockerBreakdown: diagnosis.blockerBreakdown,
          advice,
          teacherUserId: assignment.teacherUserId,
          teacherName: assignment.teacherName,
          freeClassSlots: diagnosis.freeClassSlots,
          teacherFreeSlots: diagnosis.teacherFreeSlots,
          eligibleSlots: diagnosis.eligibleSlots,
        },
      });
    }

    if (mustDouble && placed > 0 && placed % 2 !== 0 && mode !== 'fill') {
      issues.push({
        type: 'double_period_required',
        severity: 'warning',
        className,
        subjectName: assignment.subjectName,
        message: `${assignment.subjectName} prefers double periods but ended with an odd count (${placed})`,
        details: { placed, targetPeriods },
      });
    }

    return { placements, issues: dedupeIssues(issues) };
  }

  private seedBusyFromExisting(
    existing: Array<{
      className: string;
      teacherUserId: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      room: string | null;
      isExtraActivity: boolean;
    }>,
    selectedSet: Set<string>
  ) {
    const classBusy = new Set<string>();
    const teacherBusy = new Set<string>();
    const roomBusy = new Set<string>();
    const teacherDayCount = new Map<string, number>();

    for (const row of existing) {
      if (selectedSet.has(row.className) && !row.isExtraActivity) continue;
      classBusy.add(slotKey(row.dayOfWeek, row.startTime, row.endTime) + `|${row.className}`);
      teacherBusy.add(slotKey(row.dayOfWeek, row.startTime, row.endTime) + `|${row.teacherUserId}`);
      if (row.room) roomBusy.add(roomBusyKey(row.dayOfWeek, row.startTime, row.endTime, row.room));
      const dayKey = `${row.teacherUserId}|${row.dayOfWeek}`;
      teacherDayCount.set(dayKey, (teacherDayCount.get(dayKey) ?? 0) + 1);
    }

    return { classBusy, teacherBusy, roomBusy, teacherDayCount };
  }

  private runGenerateAttempt(
    tasks: Array<{
      className: string;
      assignment: {
        subjectName: string;
        teacherUserId: string;
        teacherName: string;
        room?: string | null;
        periodsPerWeek: number;
        schedulingOverrides?: unknown;
      };
      courseConfig: CourseConfigRow | null;
      score: number;
    }>,
    ctx: {
      profileMap: Map<string, { availableDays: unknown }>;
      slots: TimeSlot[];
      schedule: { dayStart: string; dayEnd: string };
      term: string;
      academicYear: string;
      labRooms: string[];
      classBusy: Set<string>;
      teacherBusy: Set<string>;
      roomBusy: Set<string>;
      teacherDayCount: Map<string, number>;
    }
  ) {
    const placements: ProposedPlacement[] = [];
    const issues: SchedulingIssue[] = [];

    for (const task of tasks) {
      const result = this.scheduleAssignment(
        task.className,
        task.assignment,
        task.courseConfig,
        ctx.profileMap.get(task.assignment.teacherUserId) ?? null,
        ctx.slots,
        ctx.schedule,
        ctx.term,
        ctx.academicYear,
        ctx.classBusy,
        ctx.teacherBusy,
        ctx.roomBusy,
        ctx.labRooms,
        ctx.teacherDayCount
      );
      placements.push(...result.placements);
      issues.push(...result.issues);
    }

    return { placements, issues: dedupeIssues(issues) };
  }

  async generate(
    organizationId: string,
    input: { classes: string[]; term: string; academicYear: string }
  ) {
    const schedule = await scheduleService.get(organizationId, input.term, input.academicYear);
    const periodSlots = (schedule as { periodSlots?: unknown }).periodSlots as
      | Array<{ name: string; startTime: string; endTime: string; isBreak: boolean }>
      | undefined;
    const slots = teachingSlotsOnly(
      generateTimeSlots({
        dayStart: schedule.dayStart,
        dayEnd: schedule.dayEnd,
        periodDurationMinutes: schedule.periodDurationMinutes,
        activeDays: schedule.activeDays as string[],
        breaks: schedule.breaks as unknown as BreakWindow[],
        periodSlots: Array.isArray(periodSlots) && periodSlots.length ? periodSlots : undefined,
      })
    );

    const profiles = await prisma.timetableTeacherProfile.findMany({ where: { organizationId } });
    const profileMap = new Map(profiles.map((p) => [p.teacherUserId, p]));

    const courseConfigs = await prisma.timetableCourseConfig.findMany({ where: { organizationId } });
    const courseMap = new Map(courseConfigs.map((c) => [c.subjectName, c]));

    const classrooms = await prisma.classroom.findMany({
      where: { organizationId, active: true },
    });
    const labRoomSet = new Set(collectLabRooms(classrooms));
    for (const cfg of courseConfigs) {
      const rules = parseSchedulingRules(cfg.schedulingRules);
      if (rules.preferredLabRoom) labRoomSet.add(rules.preferredLabRoom);
    }
    const labRooms = [...labRoomSet];

    const existing = await prisma.academicTimetable.findMany({
      where: { organizationId, term: input.term, academicYear: input.academicYear },
    });

    const selectedSet = new Set(input.classes);

    type GenTask = {
      className: string;
      assignment: {
        subjectName: string;
        teacherUserId: string;
        teacherName: string;
        room?: string | null;
        periodsPerWeek: number;
        schedulingOverrides?: unknown;
      };
      courseConfig: CourseConfigRow | null;
      score: number;
      teacherLoad: number;
    };

    const baseTasks: GenTask[] = [];
    const teacherLoad = new Map<string, number>();

    for (const className of input.classes) {
      const assignments = await prisma.teacherAssignment.findMany({
        where: {
          organizationId,
          className,
          term: input.term,
          academicYear: input.academicYear,
          status: AssignmentStatus.ACTIVE,
        },
      });

      for (const assignment of assignments) {
        const courseConfig = courseMap.get(assignment.subjectName) ?? null;
        const periods = assignment.periodsPerWeek ?? courseConfig?.periodsPerWeek ?? 1;
        teacherLoad.set(
          assignment.teacherUserId,
          (teacherLoad.get(assignment.teacherUserId) ?? 0) + periods
        );
        const rules = mergeSchedulingRules(courseConfig?.schedulingRules, assignment.schedulingOverrides);
        baseTasks.push({
          className,
          assignment,
          courseConfig,
          score: constraintScore(courseConfig, rules, periods),
          teacherLoad: 0,
        });
      }
    }

    for (const task of baseTasks) {
      task.teacherLoad = teacherLoad.get(task.assignment.teacherUserId) ?? 0;
      task.score += task.teacherLoad * 4;
    }

    const strategies: Array<(tasks: GenTask[]) => GenTask[]> = [
      (tasks) => [...tasks].sort((a, b) => b.score - a.score || b.teacherLoad - a.teacherLoad),
      (tasks) =>
        [...tasks].sort(
          (a, b) =>
            b.teacherLoad - a.teacherLoad ||
            b.score - a.score ||
            a.className.localeCompare(b.className)
        ),
      (tasks) => shuffleInPlace([...tasks]),
    ];

    let best: { placements: ProposedPlacement[]; issues: SchedulingIssue[] } | null = null;

    for (const strategy of strategies) {
      const ordered = strategy(baseTasks);
      const busy = this.seedBusyFromExisting(existing, selectedSet);
      const attempt = this.runGenerateAttempt(ordered, {
        profileMap,
        slots,
        schedule,
        term: input.term,
        academicYear: input.academicYear,
        labRooms,
        ...busy,
      });
      if (
        !best ||
        attempt.placements.length > best.placements.length ||
        (attempt.placements.length === best.placements.length && attempt.issues.length < best.issues.length)
      ) {
        best = attempt;
      }
    }

    const placements = best?.placements ?? [];
    const dedupedIssues = best?.issues ?? [];

    const key = cacheKey(organizationId, input.term, input.academicYear, input.classes);
    generationCache.set(key, { placements, issues: dedupedIssues, createdAt: Date.now() });

    const coverage = await this.buildCoverageFromPlacements(
      organizationId,
      input.term,
      input.academicYear,
      placements,
      courseMap
    );

    const issueSummary = this.summarizeIssues(dedupedIssues);

    return {
      placements,
      coverage,
      issues: dedupedIssues,
      issueSummary,
      slotCount: slots.length,
      classes: input.classes,
    };
  }

  private summarizeIssues(issues: SchedulingIssue[]) {
    const byBlocker = new Map<string, number>();
    for (const issue of issues) {
      if (issue.type !== 'incomplete_coverage') continue;
      const blocker = String(issue.details?.blocker ?? 'other');
      byBlocker.set(blocker, (byBlocker.get(blocker) ?? 0) + 1);
    }
    const topBlockers = [...byBlocker.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([blocker, count]) => ({ blocker, count }));

    return {
      total: issues.length,
      incomplete: issues.filter((i) => i.type === 'incomplete_coverage').length,
      topBlockers,
    };
  }

  private async buildCoverageFromPlacements(
    organizationId: string,
    term: string,
    academicYear: string,
    placements: ProposedPlacement[],
    courseMap: Map<string, { periodsPerWeek: number }>
  ) {
    const assignments = await assignmentService.list(organizationId, { term, academicYear });
    return assignments.map((a) => {
      const expected = a.periodsPerWeek ?? courseMap.get(a.subjectName)?.periodsPerWeek ?? 1;
      const count = placements.filter(
        (p) =>
          p.className === a.className &&
          p.subjectName === a.subjectName &&
          p.teacherUserId === a.teacherUserId
      ).length;
      return {
        className: a.className,
        subjectName: a.subjectName,
        teacherName: a.teacherName,
        expected,
        placed: count,
        complete: count >= expected,
      };
    });
  }

  async apply(
    organizationId: string,
    input: {
      term: string;
      academicYear: string;
      classes: string[];
      placements?: ProposedPlacement[];
    }
  ) {
    let placements = input.placements;
    if (!placements) {
      const key = cacheKey(organizationId, input.term, input.academicYear, input.classes);
      const cached = generationCache.get(key);
      if (!cached) throw new Error('No generation preview found. Run generate first.');
      placements = cached.placements;
    }

    await prisma.academicTimetable.deleteMany({
      where: {
        organizationId,
        term: input.term,
        academicYear: input.academicYear,
        className: { in: input.classes },
        isExtraActivity: false,
      },
    });

    const created = await prisma.$transaction(
      placements.map((p) =>
        prisma.academicTimetable.create({
          data: {
            organizationId,
            className: p.className,
            subjectName: p.subjectName,
            teacherUserId: p.teacherUserId,
            teacherName: p.teacherName,
            dayOfWeek: p.dayOfWeek,
            startTime: p.startTime,
            endTime: p.endTime,
            room: p.room,
            term: p.term,
            academicYear: p.academicYear,
          },
        })
      )
    );

    return { applied: created.length, rows: created };
  }

  async regenerate(
    organizationId: string,
    input: { classes: string[]; term: string; academicYear: string }
  ) {
    await prisma.academicTimetable.deleteMany({
      where: {
        organizationId,
        term: input.term,
        academicYear: input.academicYear,
        className: { in: input.classes },
      },
    });

    const result = await this.generate(organizationId, input);
    const applied = await this.apply(organizationId, {
      term: input.term,
      academicYear: input.academicYear,
      classes: input.classes,
      placements: result.placements,
    });
    return { ...result, applied: applied.applied };
  }

  /**
   * Find free slots for underfilled subjects and place the missing periods.
   * - If a generate preview exists for these classes, extends the preview (then Apply).
   * - Otherwise appends lessons into the live timetable without wiping existing ones.
   */
  async fillGaps(
    organizationId: string,
    input: { classes: string[]; term: string; academicYear: string }
  ) {
    const schedule = await scheduleService.get(organizationId, input.term, input.academicYear);
    const periodSlots = (schedule as { periodSlots?: unknown }).periodSlots as
      | Array<{ name: string; startTime: string; endTime: string; isBreak: boolean }>
      | undefined;
    const slots = teachingSlotsOnly(
      generateTimeSlots({
        dayStart: schedule.dayStart,
        dayEnd: schedule.dayEnd,
        periodDurationMinutes: schedule.periodDurationMinutes,
        activeDays: schedule.activeDays as string[],
        breaks: schedule.breaks as unknown as BreakWindow[],
        periodSlots: Array.isArray(periodSlots) && periodSlots.length ? periodSlots : undefined,
      })
    );

    const profiles = await prisma.timetableTeacherProfile.findMany({ where: { organizationId } });
    const profileMap = new Map(profiles.map((p) => [p.teacherUserId, p]));
    const courseConfigs = await prisma.timetableCourseConfig.findMany({ where: { organizationId } });
    const courseMap = new Map(courseConfigs.map((c) => [c.subjectName, c]));

    const classrooms = await prisma.classroom.findMany({
      where: { organizationId, active: true },
    });
    const labRoomSet = new Set(collectLabRooms(classrooms));
    for (const cfg of courseConfigs) {
      const rules = parseSchedulingRules(cfg.schedulingRules);
      if (rules.preferredLabRoom) labRoomSet.add(rules.preferredLabRoom);
    }
    const labRooms = [...labRoomSet];

    const cacheKeyValue = cacheKey(organizationId, input.term, input.academicYear, input.classes);
    const cached = generationCache.get(cacheKeyValue);
    const usePreview = Boolean(cached?.placements?.length);
    const selectedSet = new Set(input.classes);

    const existing = await prisma.academicTimetable.findMany({
      where: { organizationId, term: input.term, academicYear: input.academicYear },
    });

    const classBusy = new Set<string>();
    const teacherBusy = new Set<string>();
    const roomBusy = new Set<string>();
    const teacherDayCount = new Map<string, number>();

    const markBusy = (row: {
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      className: string;
      teacherUserId: string;
      room?: string | null;
    }) => {
      classBusy.add(slotKey(row.dayOfWeek, row.startTime, row.endTime) + `|${row.className}`);
      teacherBusy.add(slotKey(row.dayOfWeek, row.startTime, row.endTime) + `|${row.teacherUserId}`);
      if (row.room) roomBusy.add(roomBusyKey(row.dayOfWeek, row.startTime, row.endTime, row.room));
      const dayKey = `${row.teacherUserId}|${row.dayOfWeek}`;
      teacherDayCount.set(dayKey, (teacherDayCount.get(dayKey) ?? 0) + 1);
    };

    // Baseline: preview placements for selected classes, or live DB rows.
    let baseline: ProposedPlacement[] = [];
    if (usePreview && cached) {
      baseline = [...cached.placements];
      for (const row of existing) {
        if (selectedSet.has(row.className) && !row.isExtraActivity) continue;
        markBusy(row);
      }
      for (const p of baseline) markBusy(p);
    } else {
      for (const row of existing) markBusy(row);
      baseline = existing
        .filter((r) => selectedSet.has(r.className) && !r.isExtraActivity)
        .map((r) => ({
          className: r.className,
          subjectName: r.subjectName,
          teacherUserId: r.teacherUserId,
          teacherName: r.teacherName,
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          room: r.room,
          term: r.term,
          academicYear: r.academicYear,
        }));
    }

    const countPlaced = (className: string, subjectName: string, teacherUserId: string) =>
      baseline.filter(
        (p) =>
          p.className === className &&
          p.subjectName === subjectName &&
          p.teacherUserId === teacherUserId
      ).length;

    const newPlacements: ProposedPlacement[] = [];
    const issues: SchedulingIssue[] = [];

    type GapTask = {
      className: string;
      assignment: {
        id: string;
        subjectName: string;
        teacherUserId: string;
        teacherName: string;
        room: string | null;
        periodsPerWeek: number;
        schedulingOverrides: unknown;
      };
      courseCfg: CourseConfigRow | null;
      expected: number;
      already: number;
      remaining: number;
      score: number;
    };

    const tasks: GapTask[] = [];

    for (const className of input.classes) {
      const assignments = await prisma.teacherAssignment.findMany({
        where: {
          organizationId,
          className,
          term: input.term,
          academicYear: input.academicYear,
          status: AssignmentStatus.ACTIVE,
        },
      });

      for (const assignment of assignments) {
        const courseCfg = courseMap.get(assignment.subjectName) ?? null;
        const expected = assignment.periodsPerWeek ?? courseCfg?.periodsPerWeek ?? 1;
        const already = countPlaced(className, assignment.subjectName, assignment.teacherUserId);
        const remaining = expected - already;
        if (remaining <= 0) continue;
        const rules = mergeSchedulingRules(courseCfg?.schedulingRules, assignment.schedulingOverrides);
        tasks.push({
          className,
          assignment: {
            id: assignment.id,
            subjectName: assignment.subjectName,
            teacherUserId: assignment.teacherUserId,
            teacherName: assignment.teacherName,
            room: assignment.room,
            periodsPerWeek: assignment.periodsPerWeek,
            schedulingOverrides: assignment.schedulingOverrides,
          },
          courseCfg,
          expected,
          already,
          remaining,
          score: constraintScore(courseCfg, rules, remaining),
        });
      }
    }

    // Most constrained / most underfilled first so languages and morning-only subjects get a fair shot.
    tasks.sort((a, b) => b.score - a.score || b.remaining - a.remaining);

    for (const task of tasks) {
      const { className, assignment, courseCfg, expected, already, remaining } = task;
      const result = this.scheduleAssignment(
        className,
        { ...assignment, periodsPerWeek: remaining },
        courseCfg,
        profileMap.get(assignment.teacherUserId) ?? null,
        slots,
        schedule,
        input.term,
        input.academicYear,
        classBusy,
        teacherBusy,
        roomBusy,
        labRooms,
        teacherDayCount,
        { mode: 'fill' }
      );

      newPlacements.push(...result.placements);
      const totalPlaced = already + result.placements.length;

      for (const issue of result.issues) {
        if (issue.type === 'incomplete_coverage') {
          issues.push({
            ...issue,
            message: `${assignment.subjectName} for ${className}: only ${totalPlaced} of ${expected} required periods could be scheduled${
              typeof issue.details?.blocker === 'string' ? ` — blocked by ${issue.details.blocker}` : ''
            }`,
            details: {
              ...issue.details,
              expected,
              placed: totalPlaced,
              filledNow: result.placements.length,
            },
          });
        } else {
          issues.push(issue);
        }
      }

      if (
        result.placements.length === 0 &&
        remaining > 0 &&
        !result.issues.some((i) => i.type === 'incomplete_coverage')
      ) {
        issues.push({
          type: 'incomplete_coverage',
          severity: 'error',
          className,
          subjectName: assignment.subjectName,
          message: `${assignment.subjectName} for ${className}: no free slots found for ${remaining} missing period(s)`,
          details: { expected, placed: already, remaining },
        });
      }
    }

    const allPlacements = [...baseline, ...newPlacements];
    const dedupedIssues = dedupeIssues(issues);

    if (usePreview) {
      generationCache.set(cacheKeyValue, {
        placements: allPlacements,
        issues: dedupedIssues,
        createdAt: Date.now(),
      });
    } else if (newPlacements.length) {
      await prisma.$transaction(
        newPlacements.map((p) =>
          prisma.academicTimetable.create({
            data: {
              organizationId,
              className: p.className,
              subjectName: p.subjectName,
              teacherUserId: p.teacherUserId,
              teacherName: p.teacherName,
              dayOfWeek: p.dayOfWeek,
              startTime: p.startTime,
              endTime: p.endTime,
              room: p.room,
              term: p.term,
              academicYear: p.academicYear,
            },
          })
        )
      );
    }

    const coverage = await this.buildCoverageFromPlacements(
      organizationId,
      input.term,
      input.academicYear,
      allPlacements,
      courseMap
    );

    return {
      mode: usePreview ? ('preview' as const) : ('persisted' as const),
      filled: newPlacements.length,
      placements: allPlacements,
      newPlacements,
      coverage,
      issues: dedupedIssues,
      issueSummary: this.summarizeIssues(dedupedIssues),
      classes: input.classes,
      message:
        newPlacements.length > 0
          ? `Placed ${newPlacements.length} missing period(s)${usePreview ? ' in preview — click Apply to save' : ''}.`
          : dedupedIssues.length > 0
            ? 'Could not place remaining periods. See blockers below (teacher conflicts or time rules).'
            : 'All selected classes already have full coverage.',
    };
  }

  async analyzeTeacherLoad(
    organizationId: string,
    input: { classes: string[]; term: string; academicYear: string }
  ) {
    const schedule = await scheduleService.get(organizationId, input.term, input.academicYear);
    const periodSlots = (schedule as { periodSlots?: unknown }).periodSlots as
      | Array<{ name: string; startTime: string; endTime: string; isBreak: boolean }>
      | undefined;
    const slots = teachingSlotsOnly(
      generateTimeSlots({
        dayStart: schedule.dayStart,
        dayEnd: schedule.dayEnd,
        periodDurationMinutes: schedule.periodDurationMinutes,
        activeDays: schedule.activeDays as string[],
        breaks: schedule.breaks as unknown as BreakWindow[],
        periodSlots: Array.isArray(periodSlots) && periodSlots.length ? periodSlots : undefined,
      })
    );
    const slotsPerWeek = slots.length;
    const perDayCounts = new Map<string, number>();
    for (const s of slots) {
      perDayCounts.set(s.dayOfWeek, (perDayCounts.get(s.dayOfWeek) ?? 0) + 1);
    }
    const lessonPeriodsPerDay = perDayCounts.size ? Math.max(...perDayCounts.values()) : 1;
    const profiles = await prisma.timetableTeacherProfile.findMany({ where: { organizationId } });
    const profileMap = new Map(profiles.map((p) => [p.teacherUserId, p]));
    const courseConfigs = await prisma.timetableCourseConfig.findMany({ where: { organizationId } });
    const courseMap = new Map(courseConfigs.map((c) => [c.subjectName, c]));

    const selectedSet = new Set(input.classes);
    const byTeacher = new Map<string, { teacherName: string; expected: number; maxWeekly: number }>();

    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        organizationId,
        term: input.term,
        academicYear: input.academicYear,
        status: AssignmentStatus.ACTIVE,
        className: { in: input.classes },
      },
    });

    for (const a of assignments) {
      const courseCfg = courseMap.get(a.subjectName);
      const periods = a.periodsPerWeek ?? courseCfg?.periodsPerWeek ?? 1;
      const profile = profileMap.get(a.teacherUserId);
      const days = ((profile?.availableDays as string[]) ?? schedule.activeDays).filter((d) =>
        (schedule.activeDays as string[]).includes(d)
      );
      const maxWeekly = lessonPeriodsPerDay * Math.max(1, days.length);
      const cur = byTeacher.get(a.teacherUserId) ?? {
        teacherName: a.teacherName,
        expected: 0,
        maxWeekly,
      };
      cur.expected += periods;
      byTeacher.set(a.teacherUserId, cur);
    }

    const overloaded = [...byTeacher.entries()]
      .filter(([, t]) => t.expected > t.maxWeekly)
      .map(([teacherUserId, t]) => ({
        teacherUserId,
        teacherName: t.teacherName,
        expectedPeriods: t.expected,
        maxWeeklyPeriods: t.maxWeekly,
        surplus: t.expected - t.maxWeekly,
      }))
      .sort((a, b) => b.surplus - a.surplus);

    return {
      slotsPerWeek,
      teachersChecked: byTeacher.size,
      overloaded,
      canFullySchedule: overloaded.length === 0,
    };
  }

  private rebuildBusyFromPlacements(
    placements: ProposedPlacement[],
    existing: Array<{
      className: string;
      teacherUserId: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      room: string | null;
      isExtraActivity: boolean;
    }>,
    selectedSet: Set<string>
  ) {
    const busy = this.seedBusyFromExisting(existing, selectedSet);
    for (const p of placements) {
      const slot: TimeSlot = {
        dayOfWeek: p.dayOfWeek,
        startTime: p.startTime,
        endTime: p.endTime,
        slotIndex: 0,
        isBreak: false,
      };
      this.markSlotBusy(
        slot,
        p.className,
        p.teacherUserId,
        p.room ?? null,
        busy.classBusy,
        busy.teacherBusy,
        busy.roomBusy,
        busy.teacherDayCount
      );
    }
    return busy;
  }

  private countPlaced(
    placements: ProposedPlacement[],
    className: string,
    subjectName: string,
    teacherUserId: string
  ) {
    return placements.filter(
      (p) =>
        p.className === className &&
        p.subjectName === subjectName &&
        p.teacherUserId === teacherUserId
    ).length;
  }

  private async auditIncompletePlacements(
    organizationId: string,
    input: { classes: string[]; term: string; academicYear: string },
    placements: ProposedPlacement[],
    ctx: {
      slots: TimeSlot[];
      schedule: { dayStart: string; dayEnd: string };
      profileMap: Map<string, { availableDays: unknown }>;
      courseMap: Map<string, CourseConfigRow>;
      labRooms: string[];
      existing: Array<{
        className: string;
        teacherUserId: string;
        dayOfWeek: string;
        startTime: string;
        endTime: string;
        room: string | null;
        isExtraActivity: boolean;
      }>;
    }
  ) {
    const selectedSet = new Set(input.classes);
    const busy = this.rebuildBusyFromPlacements(placements, ctx.existing, selectedSet);
    const issues: SchedulingIssue[] = [];

    for (const className of input.classes) {
      const assignments = await prisma.teacherAssignment.findMany({
        where: {
          organizationId,
          className,
          term: input.term,
          academicYear: input.academicYear,
          status: AssignmentStatus.ACTIVE,
        },
      });

      for (const assignment of assignments) {
        const courseConfig = ctx.courseMap.get(assignment.subjectName) ?? null;
        const targetPeriods = assignment.periodsPerWeek ?? courseConfig?.periodsPerWeek ?? 1;
        const placed = this.countPlaced(
          placements,
          className,
          assignment.subjectName,
          assignment.teacherUserId
        );
        if (placed >= targetPeriods) continue;

        const profile = ctx.profileMap.get(assignment.teacherUserId) ?? null;
        const diagnosis = this.diagnoseBlockers(
          className,
          assignment,
          courseConfig,
          profile,
          ctx.slots,
          ctx.schedule,
          busy.classBusy,
          busy.teacherBusy,
          busy.roomBusy,
          ctx.labRooms,
          busy.teacherDayCount
        );
        const timePreference = courseConfig?.timePreference ?? 'ANY';
        const advice = buildSchedulingAdvice({
          blocker: diagnosis.blocker,
          blockerBreakdown: diagnosis.blockerBreakdown,
          className,
          subjectName: assignment.subjectName,
          teacherName: assignment.teacherName,
          expected: targetPeriods,
          placed,
          freeClassSlots: diagnosis.freeClassSlots,
          teacherFreeSlots: diagnosis.teacherFreeSlots,
          eligibleSlots: diagnosis.eligibleSlots,
          timePreference,
        });
        issues.push({
          type: 'incomplete_coverage',
          severity: 'error',
          className,
          subjectName: assignment.subjectName,
          message: `${assignment.subjectName} for ${className}: only ${placed} of ${targetPeriods} required periods could be scheduled — blocked by ${diagnosis.blocker}`,
          details: {
            expected: targetPeriods,
            placed,
            blocker: diagnosis.blocker,
            blockerBreakdown: diagnosis.blockerBreakdown,
            advice,
            teacherUserId: assignment.teacherUserId,
            teacherName: assignment.teacherName,
            freeClassSlots: diagnosis.freeClassSlots,
            teacherFreeSlots: diagnosis.teacherFreeSlots,
            eligibleSlots: diagnosis.eligibleSlots,
          },
        });
      }
    }

    return dedupeIssues(issues);
  }

  private async loadGenerationContext(
    organizationId: string,
    input: { classes: string[]; term: string; academicYear: string }
  ) {
    const schedule = await scheduleService.get(organizationId, input.term, input.academicYear);
    const periodSlots = (schedule as { periodSlots?: unknown }).periodSlots as
      | Array<{ name: string; startTime: string; endTime: string; isBreak: boolean }>
      | undefined;
    const slots = teachingSlotsOnly(
      generateTimeSlots({
        dayStart: schedule.dayStart,
        dayEnd: schedule.dayEnd,
        periodDurationMinutes: schedule.periodDurationMinutes,
        activeDays: schedule.activeDays as string[],
        breaks: schedule.breaks as unknown as BreakWindow[],
        periodSlots: Array.isArray(periodSlots) && periodSlots.length ? periodSlots : undefined,
      })
    );
    const profiles = await prisma.timetableTeacherProfile.findMany({ where: { organizationId } });
    const profileMap = new Map(profiles.map((p) => [p.teacherUserId, p]));
    const courseConfigs = await prisma.timetableCourseConfig.findMany({ where: { organizationId } });
    const courseMap = new Map(courseConfigs.map((c) => [c.subjectName, c]));
    const classrooms = await prisma.classroom.findMany({
      where: { organizationId, active: true },
    });
    const labRoomSet = new Set(collectLabRooms(classrooms));
    for (const cfg of courseConfigs) {
      const rules = parseSchedulingRules(cfg.schedulingRules);
      if (rules.preferredLabRoom) labRoomSet.add(rules.preferredLabRoom);
    }
    const existing = await prisma.academicTimetable.findMany({
      where: { organizationId, term: input.term, academicYear: input.academicYear },
    });
    return { schedule, slots, profileMap, courseMap, labRooms: [...labRoomSet], existing };
  }

  /** Move blocking lessons and re-place missing periods on the preview (no DB writes). */
  private async optimizePreviewByDisplacement(
    organizationId: string,
    input: { classes: string[]; term: string; academicYear: string },
    placements: ProposedPlacement[],
    ctx: Awaited<ReturnType<GeneratorService['loadGenerationContext']>>
  ) {
    const selectedSet = new Set(input.classes);
    let list = [...placements];
    let improved = 0;

    type Task = {
      className: string;
      assignment: {
        subjectName: string;
        teacherUserId: string;
        teacherName: string;
        room?: string | null;
        periodsPerWeek: number;
        schedulingOverrides?: unknown;
      };
      courseConfig: CourseConfigRow | null;
      remaining: number;
      score: number;
    };

    for (let round = 0; round < 350; round += 1) {
      const tasks: Task[] = [];
      for (const className of input.classes) {
        const assignments = await prisma.teacherAssignment.findMany({
          where: {
            organizationId,
            className,
            term: input.term,
            academicYear: input.academicYear,
            status: AssignmentStatus.ACTIVE,
          },
        });
        for (const assignment of assignments) {
          const courseConfig = ctx.courseMap.get(assignment.subjectName) ?? null;
          const expected = assignment.periodsPerWeek ?? courseConfig?.periodsPerWeek ?? 1;
          const placed = this.countPlaced(
            list,
            className,
            assignment.subjectName,
            assignment.teacherUserId
          );
          const remaining = expected - placed;
          if (remaining <= 0) continue;
          const rules = mergeSchedulingRules(courseConfig?.schedulingRules, assignment.schedulingOverrides);
          tasks.push({
            className,
            assignment,
            courseConfig,
            remaining,
            score: constraintScore(courseConfig, rules, remaining),
          });
        }
      }
      if (tasks.length === 0) break;
      tasks.sort((a, b) => b.score - a.score);

      let progress = false;
      const busy = this.rebuildBusyFromPlacements(list, ctx.existing, selectedSet);

      for (const task of tasks) {
        const result = this.scheduleAssignment(
          task.className,
          { ...task.assignment, periodsPerWeek: task.remaining },
          task.courseConfig,
          ctx.profileMap.get(task.assignment.teacherUserId) ?? null,
          ctx.slots,
          ctx.schedule,
          input.term,
          input.academicYear,
          busy.classBusy,
          busy.teacherBusy,
          busy.roomBusy,
          ctx.labRooms,
          busy.teacherDayCount,
          { mode: 'fill' }
        );
        if (result.placements.length > 0) {
          list.push(...result.placements);
          improved += result.placements.length;
          progress = true;
          break;
        }
      }

      if (progress) continue;

      const task = tasks[0];
      const teacherId = task.assignment.teacherUserId;
      let displaced = false;

      for (const slot of ctx.slots) {
        if (slot.isBreak) continue;
        const cKey = slotKey(slot.dayOfWeek, slot.startTime, slot.endTime) + `|${task.className}`;
        const tKey = slotKey(slot.dayOfWeek, slot.startTime, slot.endTime) + `|${teacherId}`;
        if (busy.classBusy.has(cKey) || !busy.teacherBusy.has(tKey)) continue;

        const blockerIdx = list.findIndex(
          (p) =>
            p.teacherUserId === teacherId &&
            p.dayOfWeek === slot.dayOfWeek &&
            p.startTime === slot.startTime &&
            p.endTime === slot.endTime
        );
        if (blockerIdx < 0) continue;
        const blocker = list[blockerIdx];

        for (const alt of ctx.slots) {
          if (alt.isBreak) continue;
          if (
            alt.dayOfWeek === slot.dayOfWeek &&
            alt.startTime === slot.startTime &&
            alt.endTime === slot.endTime
          ) {
            continue;
          }
          const altClassKey =
            slotKey(alt.dayOfWeek, alt.startTime, alt.endTime) + `|${blocker.className}`;
          const altTeacherKey =
            slotKey(alt.dayOfWeek, alt.startTime, alt.endTime) + `|${blocker.teacherUserId}`;
          if (busy.classBusy.has(altClassKey) || busy.teacherBusy.has(altTeacherKey)) continue;

          const trial = [...list];
          trial[blockerIdx] = {
            ...blocker,
            dayOfWeek: alt.dayOfWeek,
            startTime: alt.startTime,
            endTime: alt.endTime,
          };
          const trialBusy = this.rebuildBusyFromPlacements(trial, ctx.existing, selectedSet);
          const tryPlace = this.scheduleAssignment(
            task.className,
            { ...task.assignment, periodsPerWeek: 1 },
            task.courseConfig,
            ctx.profileMap.get(task.assignment.teacherUserId) ?? null,
            ctx.slots,
            ctx.schedule,
            input.term,
            input.academicYear,
            trialBusy.classBusy,
            trialBusy.teacherBusy,
            trialBusy.roomBusy,
            ctx.labRooms,
            trialBusy.teacherDayCount,
            { mode: 'fill' }
          );
          if (tryPlace.placements.length === 0) continue;

          list = [...trial, ...tryPlace.placements];
          improved += 1 + tryPlace.placements.length;
          displaced = true;
          break;
        }
        if (displaced) break;
      }

      if (!displaced) break;
    }

    return { placements: list, displaced: improved };
  }

  /**
   * One-click: generate → fill (loop) → shuffle blocking lessons → fill again.
   * Updates the preview cache; use Apply to persist.
   */
  async autoComplete(
    organizationId: string,
    input: { classes: string[]; term: string; academicYear: string }
  ) {
    const teacherLoad = await this.analyzeTeacherLoad(organizationId, input);
    const ctx = await this.loadGenerationContext(organizationId, input);

    await this.generate(organizationId, input);

    let fillTotal = 0;
    for (let i = 0; i < 8; i += 1) {
      const fill = await this.fillGaps(organizationId, input);
      fillTotal += fill.filled;
      if (fill.filled === 0) break;
    }

    const key = cacheKey(organizationId, input.term, input.academicYear, input.classes);
    const cached = generationCache.get(key);
    if (!cached) {
      throw new Error('Auto-complete failed to build a preview');
    }

    const optimized = await this.optimizePreviewByDisplacement(
      organizationId,
      input,
      cached.placements,
      ctx
    );
    generationCache.set(key, {
      ...cached,
      placements: optimized.placements,
      createdAt: Date.now(),
    });

    for (let i = 0; i < 6; i += 1) {
      const fill = await this.fillGaps(organizationId, input);
      fillTotal += fill.filled;
      if (fill.filled === 0) break;
    }

    const finalCached = generationCache.get(key)!;
    const issues = await this.auditIncompletePlacements(
      organizationId,
      input,
      finalCached.placements,
      ctx
    );
    generationCache.set(key, {
      placements: finalCached.placements,
      issues,
      createdAt: Date.now(),
    });

    const coverage = await this.buildCoverageFromPlacements(
      organizationId,
      input.term,
      input.academicYear,
      finalCached.placements,
      ctx.courseMap
    );

    const placed = finalCached.placements.length;
    const expected = coverage
      .filter((c) => input.classes.includes(c.className))
      .reduce((s, c) => s + c.expected, 0);
    const missing = Math.max(0, expected - placed);

    return {
      placements: finalCached.placements,
      coverage,
      issues,
      issueSummary: this.summarizeIssues(issues),
      slotCount: ctx.slots.length,
      classes: input.classes,
      autoComplete: {
        fillTotal,
        displaced: optimized.displaced,
        teacherLoad,
      },
      message:
        missing === 0
          ? `Auto-complete placed all ${placed} periods in preview — click Apply to save.`
          : teacherLoad.overloaded.length > 0
            ? `Auto-complete placed ${placed}/${expected} periods. ${teacherLoad.overloaded.length} teacher(s) have more assigned periods than the week allows — split classes or add teachers.`
            : `Auto-complete placed ${placed}/${expected} periods (${missing} still missing). Review blockers below or generate fewer classes per batch.`,
    };
  }
}

export const generatorService = new GeneratorService();
