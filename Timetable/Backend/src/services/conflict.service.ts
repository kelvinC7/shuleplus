import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { timesOverlap } from '../utils/time.utils';
import {
  parseSchedulingRules,
  collectLabRooms,
  isLabRoomName,
} from '../utils/course-scheduling.utils';

export type ConflictType = 'teacher_clash' | 'lesson_overlap' | 'rule_violation' | 'extra_overlap';

export interface TimetableConflict {
  type: ConflictType;
  message: string;
  rowId?: string;
  details: Record<string, unknown>;
}

export class ConflictService {
  async checkRowConflicts(
    organizationId: string,
    row: {
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
    },
    excludeIds?: string | string[]
  ): Promise<TimetableConflict[]> {
    const conflicts: TimetableConflict[] = [];
    const excluded = excludeIds
      ? Array.isArray(excludeIds)
        ? excludeIds
        : [excludeIds]
      : [];
    const peers = await prisma.academicTimetable.findMany({
      where: {
        organizationId,
        term: row.term,
        academicYear: row.academicYear,
        dayOfWeek: row.dayOfWeek,
        ...(excluded.length ? { id: { notIn: excluded } } : {}),
      },
    });

    for (const peer of peers) {
      if (!timesOverlap(row.startTime, row.endTime, peer.startTime, peer.endTime)) continue;

      if (peer.teacherUserId === row.teacherUserId && peer.className !== row.className) {
        conflicts.push({
          type: 'teacher_clash',
          message: `${row.teacherName} is already teaching ${peer.className} at this time`,
          rowId: peer.id,
          details: { teacherUserId: row.teacherUserId, peerClass: peer.className },
        });
      }

      if (peer.className === row.className) {
        conflicts.push({
          type: 'lesson_overlap',
          message: `${row.className} already has ${peer.subjectName} at this time`,
          rowId: peer.id,
          details: { className: row.className, peerSubject: peer.subjectName },
        });
      }
    }

    const courseConfig = await prisma.timetableCourseConfig.findFirst({
      where: { organizationId, subjectName: row.subjectName },
      orderBy: { createdAt: 'asc' },
    });

    if (courseConfig) {
      const schedule = await prisma.timetableSchoolSchedule.findUnique({
        where: {
          organizationId_term_academicYear: {
            organizationId,
            term: row.term,
            academicYear: row.academicYear,
          },
        },
      });

      if (schedule && courseConfig.timePreference === 'MORNING') {
        const midpoint =
          (parseInt(schedule.dayStart.split(':')[0]) * 60 +
            parseInt(schedule.dayStart.split(':')[1]) +
            parseInt(schedule.dayEnd.split(':')[0]) * 60 +
            parseInt(schedule.dayEnd.split(':')[1])) /
          2;
        const startMins =
          parseInt(row.startTime.split(':')[0]) * 60 + parseInt(row.startTime.split(':')[1]);
        if (startMins >= midpoint) {
          conflicts.push({
            type: 'rule_violation',
            message: `${row.subjectName} should be scheduled in the morning`,
            details: { subjectName: row.subjectName, preference: 'MORNING' },
          });
        }
      }

      if (schedule && courseConfig.timePreference === 'AFTERNOON') {
        const midpoint =
          (parseInt(schedule.dayStart.split(':')[0]) * 60 +
            parseInt(schedule.dayStart.split(':')[1]) +
            parseInt(schedule.dayEnd.split(':')[0]) * 60 +
            parseInt(schedule.dayEnd.split(':')[1])) /
          2;
        const startMins =
          parseInt(row.startTime.split(':')[0]) * 60 + parseInt(row.startTime.split(':')[1]);
        if (startMins < midpoint) {
          conflicts.push({
            type: 'rule_violation',
            message: `${row.subjectName} should be scheduled in the afternoon`,
            details: { subjectName: row.subjectName, preference: 'AFTERNOON' },
          });
        }
      }

      if (courseConfig.customWindowStart && courseConfig.customWindowEnd) {
        if (
          !timesOverlap(
            row.startTime,
            row.endTime,
            courseConfig.customWindowStart,
            courseConfig.customWindowEnd
          )
        ) {
          conflicts.push({
            type: 'rule_violation',
            message: `${row.subjectName} is outside its custom scheduling window`,
            details: {
              subjectName: row.subjectName,
              windowStart: courseConfig.customWindowStart,
              windowEnd: courseConfig.customWindowEnd,
            },
          });
        }
      }

      const rules = parseSchedulingRules(courseConfig.schedulingRules);
      if (rules.preferredDays?.length && !rules.preferredDays.includes(row.dayOfWeek)) {
        conflicts.push({
          type: 'rule_violation',
          message: `${row.subjectName} is scheduled on ${row.dayOfWeek} but preferred days are ${rules.preferredDays.join(', ')}`,
          details: { subjectName: row.subjectName, preferredDays: rules.preferredDays },
        });
      }

      if (rules.roomRequirement === 'REQUIRE_LAB' && row.room) {
        const classrooms = await prisma.classroom.findMany({
          where: { organizationId, active: true },
        });
        const labRooms = new Set(collectLabRooms(classrooms));
        if (rules.preferredLabRoom) labRooms.add(rules.preferredLabRoom);
        const inLab = labRooms.has(row.room) || isLabRoomName(row.room);
        if (!inLab) {
          conflicts.push({
            type: 'rule_violation',
            message: `${row.subjectName} requires a laboratory but is assigned to ${row.room}`,
            details: { subjectName: row.subjectName, room: row.room },
          });
        }
      }
    }

    return conflicts;
  }

  async scan(organizationId: string, term: string, academicYear: string) {
    const rows = await prisma.academicTimetable.findMany({
      where: { organizationId, term, academicYear },
    });

    const conflicts: TimetableConflict[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      const rowConflicts = await this.checkRowConflicts(
        organizationId,
        {
          className: row.className,
          subjectName: row.subjectName,
          teacherUserId: row.teacherUserId,
          teacherName: row.teacherName,
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
          room: row.room,
          term: row.term,
          academicYear: row.academicYear,
        },
        row.id
      );

      for (const c of rowConflicts) {
        const key = `${c.type}|${row.id}|${c.rowId ?? ''}|${c.message}`;
        if (!seen.has(key)) {
          seen.add(key);
          conflicts.push({ ...c, details: { ...c.details, sourceRowId: row.id } });
        }
      }
    }

    const extras = await prisma.timetableExtraActivity.findMany({
      where: { organizationId, term, academicYear },
    });

    for (const extra of extras) {
      const overlapping = rows.filter(
        (r) =>
          r.dayOfWeek === extra.dayOfWeek &&
          timesOverlap(extra.startTime, extra.endTime, r.startTime, r.endTime) &&
          (!extra.className || r.className === extra.className)
      );
      if (overlapping.length > extra.capacity) {
        conflicts.push({
          type: 'extra_overlap',
          message: `Extra activity "${extra.name}" exceeds capacity in slot`,
          details: { extraActivityId: extra.id, overlapping: overlapping.length },
        });
      }
    }

    return {
      total: conflicts.length,
      byType: {
        teacher_clash: conflicts.filter((c) => c.type === 'teacher_clash').length,
        lesson_overlap: conflicts.filter((c) => c.type === 'lesson_overlap').length,
        rule_violation: conflicts.filter((c) => c.type === 'rule_violation').length,
        extra_overlap: conflicts.filter((c) => c.type === 'extra_overlap').length,
      },
      conflicts,
    };
  }

  async autoFix(organizationId: string, term: string, academicYear: string) {
    const scan = await this.scan(organizationId, term, academicYear);
    let fixed = 0;
    const remaining: TimetableConflict[] = [];

    for (const conflict of scan.conflicts) {
      if (conflict.type === 'lesson_overlap' && conflict.details.sourceRowId) {
        const sourceId = conflict.details.sourceRowId as string;
        const row = await prisma.academicTimetable.findUnique({ where: { id: sourceId } });
        if (!row) continue;

        const schedule = await prisma.timetableSchoolSchedule.findUnique({
          where: { organizationId_term_academicYear: { organizationId, term, academicYear } },
        });
        if (!schedule) continue;

        const allRows = await prisma.academicTimetable.findMany({
          where: { organizationId, term, academicYear, className: row.className },
        });
        const busy = new Set(allRows.map((r) => `${r.dayOfWeek}|${r.startTime}`));

        const activeDays = schedule.activeDays as string[];
        let moved = false;
        for (const day of activeDays) {
          let cursor = parseInt(schedule.dayStart.split(':')[0]) * 60;
          const end = parseInt(schedule.dayEnd.split(':')[0]) * 60;
          while (cursor + schedule.periodDurationMinutes <= end) {
            const start = `${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`;
            const endTime = `${String(Math.floor((cursor + schedule.periodDurationMinutes) / 60)).padStart(2, '0')}:${String((cursor + schedule.periodDurationMinutes) % 60).padStart(2, '0')}`;
            const key = `${day}|${start}`;
            if (!busy.has(key)) {
              const testConflicts = await this.checkRowConflicts(
                organizationId,
                {
                  ...row,
                  dayOfWeek: day,
                  startTime: start,
                  endTime,
                },
                row.id
              );
              if (testConflicts.length === 0) {
                await prisma.academicTimetable.update({
                  where: { id: row.id },
                  data: { dayOfWeek: day, startTime: start, endTime },
                });
                fixed += 1;
                moved = true;
                break;
              }
            }
            cursor += schedule.periodDurationMinutes;
          }
          if (moved) break;
        }

        if (!moved) remaining.push(conflict);
      } else {
        remaining.push(conflict);
      }
    }

    return { fixed, remaining: remaining.length, conflicts: remaining };
  }

  /** Free lesson slots where both class and teacher can take this course without clashes. */
  async suggestFreeSlots(
    organizationId: string,
    input: {
      className: string;
      subjectName: string;
      teacherUserId: string;
      teacherName: string;
      term: string;
      academicYear: string;
      room?: string | null;
      dayOfWeek?: string;
      startTime?: string;
      endTime?: string;
      limit?: number;
    }
  ) {
    const limit = Math.min(Math.max(input.limit ?? 12, 1), 24);
    const schedule = await prisma.timetableSchoolSchedule.findUnique({
      where: {
        organizationId_term_academicYear: {
          organizationId,
          term: input.term,
          academicYear: input.academicYear,
        },
      },
    });

    if (!schedule) {
      return {
        selectedSlot: {
          ok: false,
          conflicts: [
            {
              type: 'rule_violation' as ConflictType,
              message: 'Configure Time Settings before placing lessons.',
              details: {},
            },
          ],
        },
        suggestions: [] as Array<{
          dayOfWeek: string;
          startTime: string;
          endTime: string;
          periodLabel: string | null;
          score: number;
        }>,
      };
    }

    type SlotDef = { name?: string; startTime: string; endTime: string };
    const rawSlots = Array.isArray((schedule as { periodSlots?: unknown }).periodSlots)
      ? ((schedule as { periodSlots: Array<SlotDef & { isBreak?: boolean }> }).periodSlots)
      : [];
    let lessonSlots: SlotDef[] = rawSlots.filter((s) => !s.isBreak);

    if (!lessonSlots.length) {
      lessonSlots = [];
      let cursor =
        parseInt(schedule.dayStart.split(':')[0], 10) * 60 +
        parseInt(schedule.dayStart.split(':')[1] ?? '0', 10);
      const end =
        parseInt(schedule.dayEnd.split(':')[0], 10) * 60 +
        parseInt(schedule.dayEnd.split(':')[1] ?? '0', 10);
      let n = 1;
      while (cursor + schedule.periodDurationMinutes <= end) {
        const start = `${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`;
        const endM = cursor + schedule.periodDurationMinutes;
        const endTime = `${String(Math.floor(endM / 60)).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
        lessonSlots.push({ name: `P${n}`, startTime: start, endTime });
        cursor += schedule.periodDurationMinutes + (schedule.transitionMinutes ?? 0);
        n += 1;
      }
    }

    const activeDays = (schedule.activeDays as string[])?.length
      ? (schedule.activeDays as string[])
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const rowBase = {
      className: input.className,
      subjectName: input.subjectName,
      teacherUserId: input.teacherUserId,
      teacherName: input.teacherName,
      term: input.term,
      academicYear: input.academicYear,
      room: input.room ?? null,
    };

    let selectedSlot: { ok: boolean; conflicts: TimetableConflict[] } = { ok: true, conflicts: [] };
    if (input.dayOfWeek && input.startTime && input.endTime) {
      const conflicts = await this.checkRowConflicts(organizationId, {
        ...rowBase,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
      });
      selectedSlot = { ok: conflicts.length === 0, conflicts };
    }

    const dayOrder = new Map(activeDays.map((d, i) => [d, i]));
    const suggestions: Array<{
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      periodLabel: string | null;
      score: number;
    }> = [];

    for (const day of activeDays) {
      for (const slot of lessonSlots) {
        const isSelected =
          input.dayOfWeek === day &&
          input.startTime === slot.startTime &&
          input.endTime === slot.endTime;
        if (isSelected && selectedSlot.ok) continue;

        const conflicts = await this.checkRowConflicts(organizationId, {
          ...rowBase,
          dayOfWeek: day,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
        if (conflicts.length > 0) continue;

        let score = 0;
        if (input.dayOfWeek === day) score += 30;
        score += Math.max(0, 10 - (dayOrder.get(day) ?? 0));
        suggestions.push({
          dayOfWeek: day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          periodLabel: slot.name ?? null,
          score,
        });
      }
    }

    suggestions.sort(
      (a, b) =>
        b.score - a.score ||
        (dayOrder.get(a.dayOfWeek) ?? 0) - (dayOrder.get(b.dayOfWeek) ?? 0) ||
        a.startTime.localeCompare(b.startTime)
    );

    return { selectedSlot, suggestions: suggestions.slice(0, limit) };
  }
}

export const conflictService = new ConflictService();
