import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { timesOverlap, timeToMinutes } from '../utils/time.utils';
import { scheduleService } from './schedule.service';
import { generateTimeSlots, teachingSlotsOnly, type BreakWindow, type TimeSlot } from '../utils/time.utils';

export interface ExtraConflictLesson {
  subjectName: string;
  teacherName: string;
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface ExtraPlacementConflict {
  dayOfWeek: string;
  className: string;
  startTime: string;
  endTime: string;
  reason: 'lesson_overlap' | 'break' | 'outside_day' | 'invalid_range';
  message: string;
  advice: string;
  conflictingLessons: ExtraConflictLesson[];
}

type PlacementInput = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  className?: string | null;
  term: string;
  academicYear: string;
  capacity?: number;
  excludeId?: string;
};

function adviceForOverlap(lessons: ExtraConflictLesson[], startTime: string, endTime: string): string {
  if (!lessons.length) {
    return 'Choose a different day or time that does not overlap existing lessons.';
  }
  const sample = lessons.slice(0, 2)
    .map((l) => `${l.subjectName} (${l.startTime}–${l.endTime})`)
    .join('; ');
  const lastEnd = lessons
    .map((l) => l.endTime)
    .sort((a, b) => timeToMinutes(b) - timeToMinutes(a))[0];
  return `This slot overlaps ${sample}. Move the activity to start at ${lastEnd} or later, pick another day, or free that lesson first. Current choice: ${startTime}–${endTime}.`;
}

export class ExtraActivityService {
  async list(organizationId: string, term: string, academicYear: string) {
    return prisma.timetableExtraActivity.findMany({
      where: { organizationId, term, academicYear },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }, { name: 'asc' }],
    });
  }

  private async loadSlots(organizationId: string, term: string, academicYear: string) {
    const schedule = await scheduleService.get(organizationId, term, academicYear);
    const periodSlots = (schedule as { periodSlots?: unknown }).periodSlots as
      | Array<{ name: string; startTime: string; endTime: string; isBreak: boolean }>
      | undefined;
    const allSlots = generateTimeSlots({
      dayStart: schedule.dayStart,
      dayEnd: schedule.dayEnd,
      periodDurationMinutes: schedule.periodDurationMinutes,
      activeDays: schedule.activeDays as string[],
      breaks: schedule.breaks as unknown as BreakWindow[],
      periodSlots: Array.isArray(periodSlots) && periodSlots.length ? periodSlots : undefined,
    });
    return {
      schedule,
      allSlots,
      teachingSlots: teachingSlotsOnly(allSlots),
    };
  }

  private async resolveTargetClasses(
    organizationId: string,
    term: string,
    academicYear: string,
    classNames?: string[] | null
  ): Promise<{ mode: 'all' | 'specific'; classes: string[] }> {
    if (!classNames || classNames.length === 0) {
      const fromAssignments = [
        ...new Set(
          (
            await prisma.teacherAssignment.findMany({
              where: { organizationId, term, academicYear },
              select: { className: true },
            })
          ).map((c) => c.className)
        ),
      ].sort();
      const fromTimetable = [
        ...new Set(
          (
            await prisma.academicTimetable.findMany({
              where: { organizationId, term, academicYear, isExtraActivity: false },
              select: { className: true },
            })
          ).map((c) => c.className)
        ),
      ];
      const classes = [...new Set([...fromAssignments, ...fromTimetable])].sort();
      return { mode: 'all', classes };
    }
    return { mode: 'specific', classes: [...new Set(classNames)].sort() };
  }

  async validatePlacement(
    organizationId: string,
    data: PlacementInput,
    slotsCtx?: { schedule: { dayStart: string; dayEnd: string }; allSlots: TimeSlot[]; teachingSlots: TimeSlot[] }
  ): Promise<{ valid: boolean; conflict: ExtraPlacementConflict | null }> {
    if (timeToMinutes(data.startTime) >= timeToMinutes(data.endTime)) {
      return {
        valid: false,
        conflict: {
          dayOfWeek: data.dayOfWeek,
          className: data.className || 'All classes',
          startTime: data.startTime,
          endTime: data.endTime,
          reason: 'invalid_range',
          message: 'End time must be after start time',
          advice: 'Pick a later end time, or an earlier start time.',
          conflictingLessons: [],
        },
      };
    }

    const ctx = slotsCtx ?? (await this.loadSlots(organizationId, data.term, data.academicYear));
    const dayStart = timeToMinutes(ctx.schedule.dayStart);
    // Allow activities slightly after the official day end (clubs / CPD).
    const dayEnd = timeToMinutes(ctx.schedule.dayEnd) + 120;

    if (timeToMinutes(data.startTime) < dayStart || timeToMinutes(data.endTime) > dayEnd) {
      return {
        valid: false,
        conflict: {
          dayOfWeek: data.dayOfWeek,
          className: data.className || 'All classes',
          startTime: data.startTime,
          endTime: data.endTime,
          reason: 'outside_day',
          message: `Time is outside the school day window (${ctx.schedule.dayStart}–${ctx.schedule.dayEnd})`,
          advice: `Choose a time between ${ctx.schedule.dayStart} and about two hours after ${ctx.schedule.dayEnd}.`,
          conflictingLessons: [],
        },
      };
    }

    const breakHit = ctx.allSlots.find(
      (s) =>
        s.isBreak &&
        s.dayOfWeek === data.dayOfWeek &&
        timesOverlap(data.startTime, data.endTime, s.startTime, s.endTime)
    );
    if (breakHit) {
      return {
        valid: false,
        conflict: {
          dayOfWeek: data.dayOfWeek,
          className: data.className || 'All classes',
          startTime: data.startTime,
          endTime: data.endTime,
          reason: 'break',
          message: `Overlaps ${breakHit.label || 'a break'} (${breakHit.startTime}–${breakHit.endTime})`,
          advice: 'Pick a teaching period or a time after lessons, not during a break.',
          conflictingLessons: [],
        },
      };
    }

    const rows = await prisma.academicTimetable.findMany({
      where: {
        organizationId,
        term: data.term,
        academicYear: data.academicYear,
        dayOfWeek: data.dayOfWeek,
        ...(data.className ? { className: data.className } : {}),
        ...(data.excludeId
          ? { NOT: { extraActivityId: data.excludeId } }
          : {}),
      },
    });

    const overlapping = rows.filter((r) =>
      timesOverlap(data.startTime, data.endTime, r.startTime, r.endTime)
    );

    const capacity = data.capacity ?? 1;
    if (overlapping.length >= capacity) {
      const conflictingLessons: ExtraConflictLesson[] = overlapping.map((r) => ({
        subjectName: r.subjectName,
        teacherName: r.teacherName,
        className: r.className,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
      }));
      const classLabel = data.className || conflictingLessons[0]?.className || 'a class';
      return {
        valid: false,
        conflict: {
          dayOfWeek: data.dayOfWeek,
          className: classLabel,
          startTime: data.startTime,
          endTime: data.endTime,
          reason: 'lesson_overlap',
          message: `${classLabel} already has ${overlapping.length} lesson(s) at ${data.startTime}–${data.endTime} on ${data.dayOfWeek}`,
          advice: adviceForOverlap(conflictingLessons, data.startTime, data.endTime),
          conflictingLessons,
        },
      };
    }

    return { valid: true, conflict: null };
  }

  async validate(
    organizationId: string,
    data: PlacementInput
  ) {
    const result = await this.validatePlacement(organizationId, data);
    return {
      valid: result.valid,
      teachingSlotFound: true,
      overlappingLessons: result.conflict?.conflictingLessons.length ?? 0,
      capacity: data.capacity ?? 1,
      message: result.valid ? 'Placement is valid' : result.conflict?.message,
      conflict: result.conflict,
      advice: result.conflict?.advice,
    };
  }

  async validateBatch(
    organizationId: string,
    data: {
      days: string[];
      classNames?: string[] | null;
      startTime: string;
      endTime: string;
      term: string;
      academicYear: string;
      capacity?: number;
      excludeId?: string;
    }
  ) {
    if (!data.days?.length) {
      throw new AppError(400, 'Select at least one day');
    }

    const slotsCtx = await this.loadSlots(organizationId, data.term, data.academicYear);
    const target = await this.resolveTargetClasses(
      organizationId,
      data.term,
      data.academicYear,
      data.classNames
    );

    if (target.mode === 'specific' && !target.classes.length) {
      throw new AppError(400, 'Select at least one class');
    }

    const conflicts: ExtraPlacementConflict[] = [];
    const placements: Array<{ dayOfWeek: string; className: string | null }> = [];

    if (target.mode === 'all') {
      for (const dayOfWeek of data.days) {
        // School-wide: check every known class; store as null className
        for (const className of target.classes.length ? target.classes : [null]) {
          const result = await this.validatePlacement(
            organizationId,
            {
              dayOfWeek,
              startTime: data.startTime,
              endTime: data.endTime,
              className,
              term: data.term,
              academicYear: data.academicYear,
              capacity: data.capacity,
              excludeId: data.excludeId,
            },
            slotsCtx
          );
          if (!result.valid && result.conflict) conflicts.push(result.conflict);
        }
        placements.push({ dayOfWeek, className: null });
      }
    } else {
      for (const dayOfWeek of data.days) {
        for (const className of target.classes) {
          const result = await this.validatePlacement(
            organizationId,
            {
              dayOfWeek,
              startTime: data.startTime,
              endTime: data.endTime,
              className,
              term: data.term,
              academicYear: data.academicYear,
              capacity: data.capacity,
              excludeId: data.excludeId,
            },
            slotsCtx
          );
          if (!result.valid && result.conflict) conflicts.push(result.conflict);
          else placements.push({ dayOfWeek, className });
        }
      }
    }

    const uniqueConflicts = conflicts.filter(
      (c, i, arr) =>
        arr.findIndex(
          (x) =>
            x.dayOfWeek === c.dayOfWeek &&
            x.className === c.className &&
            x.startTime === c.startTime &&
            x.message === c.message
        ) === i
    );

    return {
      valid: uniqueConflicts.length === 0,
      conflicts: uniqueConflicts,
      placementCount: target.mode === 'all' ? data.days.length : placements.length,
      classesChecked: target.classes.length || 'all',
      days: data.days,
      advice:
        uniqueConflicts.length === 0
          ? 'No conflicts found. Safe to save.'
          : uniqueConflicts[0]?.advice ??
            'Resolve the conflicts below, then try again.',
    };
  }

  async create(
    organizationId: string,
    data: {
      name: string;
      className?: string | null;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      capacity?: number;
      term: string;
      academicYear: string;
      sync?: boolean;
    }
  ) {
    const validation = await this.validatePlacement(organizationId, data);
    if (!validation.valid) {
      throw new AppError(
        409,
        validation.conflict?.message ?? 'Cannot place extra activity',
        'extra_overlap',
        {
          conflicts: validation.conflict ? [validation.conflict] : [],
          advice: validation.conflict?.advice,
        }
      );
    }

    const activity = await prisma.timetableExtraActivity.create({
      data: {
        organizationId,
        name: data.name.trim(),
        className: data.className ?? null,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        capacity: data.capacity ?? 1,
        term: data.term,
        academicYear: data.academicYear,
      },
    });

    if (data.sync) {
      await this.syncToTimetable(organizationId, activity.id);
    }

    return activity;
  }

  async createBatch(
    organizationId: string,
    data: {
      name: string;
      days: string[];
      classNames?: string[] | null;
      startTime: string;
      endTime: string;
      capacity?: number;
      term: string;
      academicYear: string;
      sync?: boolean;
    }
  ) {
    const name = data.name?.trim();
    if (!name) throw new AppError(400, 'Activity name is required');
    if (!data.days?.length) throw new AppError(400, 'Select at least one day');

    const batch = await this.validateBatch(organizationId, data);
    if (!batch.valid) {
      throw new AppError(
        409,
        `Cannot save: ${batch.conflicts.length} conflict(s) with the current timetable`,
        'extra_overlap',
        {
          conflicts: batch.conflicts,
          advice: batch.advice,
        }
      );
    }

    const target = await this.resolveTargetClasses(
      organizationId,
      data.term,
      data.academicYear,
      data.classNames
    );

    const created = [];
    for (const dayOfWeek of data.days) {
      if (target.mode === 'all') {
        const activity = await prisma.timetableExtraActivity.create({
          data: {
            organizationId,
            name,
            className: null,
            dayOfWeek,
            startTime: data.startTime,
            endTime: data.endTime,
            capacity: data.capacity ?? 1,
            term: data.term,
            academicYear: data.academicYear,
          },
        });
        if (data.sync !== false) {
          await this.syncToTimetable(organizationId, activity.id);
        }
        created.push(activity);
      } else {
        for (const className of target.classes) {
          const activity = await prisma.timetableExtraActivity.create({
            data: {
              organizationId,
              name,
              className,
              dayOfWeek,
              startTime: data.startTime,
              endTime: data.endTime,
              capacity: data.capacity ?? 1,
              term: data.term,
              academicYear: data.academicYear,
            },
          });
          if (data.sync !== false) {
            await this.syncToTimetable(organizationId, activity.id);
          }
          created.push(activity);
        }
      }
    }

    return {
      created: created.length,
      activities: created,
      message: `Saved ${created.length} extra activit${created.length === 1 ? 'y' : 'ies'} and synced to the timetable`,
    };
  }

  async update(
    organizationId: string,
    id: string,
    data: Partial<{
      name: string;
      className: string | null;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      capacity: number;
      sync: boolean;
    }>
  ) {
    const existing = await prisma.timetableExtraActivity.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Extra activity not found');

    const next = {
      dayOfWeek: data.dayOfWeek ?? existing.dayOfWeek,
      startTime: data.startTime ?? existing.startTime,
      endTime: data.endTime ?? existing.endTime,
      className: data.className !== undefined ? data.className : existing.className,
      capacity: data.capacity ?? existing.capacity,
      term: existing.term,
      academicYear: existing.academicYear,
      excludeId: id,
    };

    const validation = await this.validatePlacement(organizationId, next);
    if (!validation.valid) {
      throw new AppError(
        409,
        validation.conflict?.message ?? 'Cannot update extra activity',
        'extra_overlap',
        {
          conflicts: validation.conflict ? [validation.conflict] : [],
          advice: validation.conflict?.advice,
        }
      );
    }

    const activity = await prisma.timetableExtraActivity.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.className !== undefined ? { className: data.className } : {}),
        ...(data.dayOfWeek ? { dayOfWeek: data.dayOfWeek } : {}),
        ...(data.startTime ? { startTime: data.startTime } : {}),
        ...(data.endTime ? { endTime: data.endTime } : {}),
        ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
      },
    });

    if (data.sync !== false) {
      await this.syncToTimetable(organizationId, id);
    }

    return activity;
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.timetableExtraActivity.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Extra activity not found');

    await prisma.academicTimetable.deleteMany({ where: { extraActivityId: id } });
    await prisma.timetableExtraActivity.delete({ where: { id } });
    return { deleted: true };
  }

  async syncToTimetable(organizationId: string, activityId: string) {
    const activity = await prisma.timetableExtraActivity.findFirst({
      where: { id: activityId, organizationId },
    });
    if (!activity) throw new AppError(404, 'Extra activity not found');

    await prisma.academicTimetable.deleteMany({ where: { extraActivityId: activityId } });

    let classes = activity.className
      ? [activity.className]
      : [...new Set(
          (
            await prisma.teacherAssignment.findMany({
              where: {
                organizationId,
                term: activity.term,
                academicYear: activity.academicYear,
              },
              select: { className: true },
            })
          ).map((c) => c.className)
        )];

    if (!classes.length) {
      const fromTt = await prisma.academicTimetable.findMany({
        where: {
          organizationId,
          term: activity.term,
          academicYear: activity.academicYear,
          isExtraActivity: false,
        },
        select: { className: true },
      });
      classes = [...new Set(fromTt.map((c) => c.className))];
    }

    const rows = await prisma.$transaction(
      classes.map((className) =>
        prisma.academicTimetable.create({
          data: {
            organizationId,
            className,
            subjectName: activity.name,
            teacherUserId: 'extra-activity',
            teacherName: 'Extra Activity',
            dayOfWeek: activity.dayOfWeek,
            startTime: activity.startTime,
            endTime: activity.endTime,
            term: activity.term,
            academicYear: activity.academicYear,
            extraActivityId: activity.id,
            isExtraActivity: true,
          },
        })
      )
    );

    await prisma.timetableExtraActivity.update({
      where: { id: activityId },
      data: { synced: true },
    });

    return { synced: rows.length };
  }
}

export const extraActivityService = new ExtraActivityService();
