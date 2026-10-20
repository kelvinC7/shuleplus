import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { conflictService } from './conflict.service';

export class TimetableService {
  async list(
    organizationId: string,
    filters: {
      term?: string;
      academicYear?: string;
      className?: string;
      teacherUserId?: string;
      dayOfWeek?: string;
    }
  ) {
    return prisma.academicTimetable.findMany({
      where: {
        organizationId,
        ...(filters.term ? { term: filters.term } : {}),
        ...(filters.academicYear ? { academicYear: filters.academicYear } : {}),
        ...(filters.className ? { className: filters.className } : {}),
        ...(filters.teacherUserId ? { teacherUserId: filters.teacherUserId } : {}),
        ...(filters.dayOfWeek ? { dayOfWeek: filters.dayOfWeek } : {}),
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async create(
    organizationId: string,
    data: {
      className: string;
      subjectName: string;
      teacherUserId: string;
      teacherName: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      room?: string;
      term: string;
      academicYear: string;
      extraActivityId?: string;
      isExtraActivity?: boolean;
    }
  ) {
    const conflicts = await conflictService.checkRowConflicts(organizationId, data);
    if (conflicts.length > 0) {
      throw new AppError(409, conflicts[0].message, conflicts[0].type);
    }

    return prisma.academicTimetable.create({
      data: { organizationId, ...data },
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: Partial<{
      className: string;
      subjectName: string;
      teacherUserId: string;
      teacherName: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      room: string | null;
    }>
  ) {
    const existing = await prisma.academicTimetable.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Timetable row not found');

    const merged = { ...existing, ...data };
    const conflicts = await conflictService.checkRowConflicts(
      organizationId,
      {
        className: merged.className,
        subjectName: merged.subjectName,
        teacherUserId: merged.teacherUserId,
        teacherName: merged.teacherName,
        dayOfWeek: merged.dayOfWeek,
        startTime: merged.startTime,
        endTime: merged.endTime,
        term: merged.term,
        academicYear: merged.academicYear,
      },
      id
    );

    if (conflicts.length > 0) {
      throw new AppError(409, conflicts[0].message, 'TEACHER_PERIOD_CONFLICT');
    }

    return prisma.academicTimetable.update({ where: { id }, data });
  }

  /** Exchange two lesson slots atomically; validates teacher/class conflicts excluding both rows. */
  async swap(organizationId: string, sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      throw new AppError(400, 'Cannot swap a lesson with itself');
    }

    const [source, target] = await Promise.all([
      prisma.academicTimetable.findFirst({ where: { id: sourceId, organizationId } }),
      prisma.academicTimetable.findFirst({ where: { id: targetId, organizationId } }),
    ]);
    if (!source || !target) throw new AppError(404, 'Timetable row not found');
    if (source.isExtraActivity || target.isExtraActivity) {
      throw new AppError(400, 'Extra activities cannot be swapped with lessons');
    }
    if (source.term !== target.term || source.academicYear !== target.academicYear) {
      throw new AppError(400, 'Lessons must belong to the same term and academic year');
    }

    const exclude = [sourceId, targetId];
    const base = {
      term: source.term,
      academicYear: source.academicYear,
    };

    const sourceAtTarget = {
      className: source.className,
      subjectName: source.subjectName,
      teacherUserId: source.teacherUserId,
      teacherName: source.teacherName,
      dayOfWeek: target.dayOfWeek,
      startTime: target.startTime,
      endTime: target.endTime,
      room: source.room,
      ...base,
    };
    const targetAtSource = {
      className: target.className,
      subjectName: target.subjectName,
      teacherUserId: target.teacherUserId,
      teacherName: target.teacherName,
      dayOfWeek: source.dayOfWeek,
      startTime: source.startTime,
      endTime: source.endTime,
      room: target.room,
      ...base,
    };

    const [sourceConflicts, targetConflicts] = await Promise.all([
      conflictService.checkRowConflicts(organizationId, sourceAtTarget, exclude),
      conflictService.checkRowConflicts(organizationId, targetAtSource, exclude),
    ]);
    const conflicts = [...sourceConflicts, ...targetConflicts];
    if (conflicts.length > 0) {
      throw new AppError(409, conflicts[0].message, conflicts[0].type);
    }

    const [updatedSource, updatedTarget] = await prisma.$transaction([
      prisma.academicTimetable.update({
        where: { id: sourceId },
        data: {
          dayOfWeek: target.dayOfWeek,
          startTime: target.startTime,
          endTime: target.endTime,
        },
      }),
      prisma.academicTimetable.update({
        where: { id: targetId },
        data: {
          dayOfWeek: source.dayOfWeek,
          startTime: source.startTime,
          endTime: source.endTime,
        },
      }),
    ]);

    return { source: updatedSource, target: updatedTarget };
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.academicTimetable.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Timetable row not found');
    await prisma.academicTimetable.delete({ where: { id } });
    return { deleted: true };
  }

  async clear(organizationId: string, term: string, academicYear: string, classNames?: string[]) {
    const result = await prisma.academicTimetable.deleteMany({
      where: {
        organizationId,
        term,
        academicYear,
        isExtraActivity: false,
        ...(classNames?.length ? { className: { in: classNames } } : {}),
      },
    });
    await prisma.classTimetablePublish.deleteMany({
      where: {
        organizationId,
        term,
        academicYear,
        ...(classNames?.length ? { className: { in: classNames } } : {}),
      },
    });
    return { deleted: result.count };
  }

  async todaySummary(organizationId: string) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    const year = String(new Date().getFullYear());

    const rows = await prisma.academicTimetable.findMany({
      where: { organizationId, dayOfWeek: today, academicYear: year },
      orderBy: { startTime: 'asc' },
    });

    return { day: today, count: rows.length, lessons: rows };
  }
}

export const timetableService = new TimetableService();
