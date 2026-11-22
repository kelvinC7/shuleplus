import { prisma } from '../config/database';
import { disciplineCaseService } from './discipline-case.service';
import { disciplineMarkService } from './discipline-mark.service';
import {
  ATTENDANCE_MARK_NAMES,
  disciplineSettingsService,
} from './discipline-settings.service';
import { parseCalendarDateInput } from '../utils/calendar-date';

export type DisciplineAttendanceEvent = 'ABSENCE' | 'LATE';

export interface DisciplineAttendanceStudent {
  studentId?: string;
  studentCode?: string;
  studentName: string;
  className?: string;
}

export interface DisciplineAttendanceEventInput {
  event: DisciplineAttendanceEvent;
  /** School day in YYYY-MM-DD. */
  date: string;
  students: DisciplineAttendanceStudent[];
  recordedBy?: string;
}

const EVENT_CONFIG = {
  ABSENCE: {
    markName: ATTENDANCE_MARK_NAMES.absence,
    label: 'Absence without permission',
    marker: 'absence',
    description: 'Unauthorized absence recorded from Attendance.',
  },
  LATE: {
    markName: ATTENDANCE_MARK_NAMES.late,
    label: 'Late coming',
    marker: 'late',
    description: 'Late arrival recorded from Attendance.',
  },
} as const;

/**
 * Applies the configured attendance discipline deduction to a list of
 * students for one school day. Safe to re-run: existing auto-generated cases
 * are detected through a marker in the case description.
 */
export const attendanceDisciplineService = {
  async applyEvent(organizationId: string, input: DisciplineAttendanceEventInput) {
    const config = EVENT_CONFIG[input.event];
    if (!config) throw new Error('Unknown attendance event');

    const settings = await disciplineSettingsService.get(organizationId);
    const enabled =
      input.event === 'ABSENCE' ? settings.absenceDeductionEnabled : settings.lateDeductionEnabled;
    const points =
      input.event === 'ABSENCE' ? settings.absenceDeductionPoints : settings.lateDeductionPoints;
    const date = input.date.slice(0, 10);

    if (!enabled || points <= 0) {
      return {
        event: input.event,
        date,
        enabled: false,
        points,
        applied: 0,
        skipped: 0,
        total: input.students.length,
        markId: null as string | null,
        markName: config.markName,
      };
    }

    await disciplineMarkService.ensureDefaults(organizationId);

    let mark = await prisma.disciplineMark.findFirst({
      where: {
        organizationId,
        name: { equals: config.markName, mode: 'insensitive' },
        type: 'DEDUCTION',
      },
    });

    if (!mark) {
      mark = await prisma.disciplineMark.create({
        data: {
          organizationId,
          name: config.markName,
          description: config.description,
          category: 'Attendance',
          type: 'DEDUCTION',
          points: Math.abs(points),
          status: 'Active',
          isDefault: true,
        },
      });
    } else if (mark.points !== Math.abs(points)) {
      mark = await prisma.disciplineMark.update({
        where: { id: mark.id },
        data: { points: Math.abs(points) },
      });
    }

    const incidentDate = parseCalendarDateInput(date);
    const marker = `[auto:${config.marker}:${date}]`;
    const recordedBy = input.recordedBy?.trim() || 'attendance-service';

    let applied = 0;
    let skipped = 0;

    for (const student of input.students) {
      const studentName = student.studentName?.trim();
      if (!studentName) {
        skipped += 1;
        continue;
      }

      const identity = student.studentId
        ? { studentId: student.studentId }
        : student.studentCode
          ? { studentCode: student.studentCode }
          : { studentName };

      const existing = await prisma.disciplineCase.findFirst({
        where: {
          organizationId,
          ...identity,
          incidentDate,
          description: { contains: marker },
        },
        select: { id: true },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      await disciplineCaseService.create(organizationId, recordedBy, {
        studentId: student.studentId,
        studentName,
        studentCode: student.studentCode,
        className: student.className?.trim() || 'Unknown',
        markId: mark.id,
        incidentDate: date,
        description: `${config.label} on ${date}. ${marker}`,
        appliedPoints: -Math.abs(points),
        allowMarkOverride: true,
        status: 'Open',
        notifyParent: false,
      });
      applied += 1;
    }

    return {
      event: input.event,
      date,
      enabled: true,
      points,
      applied,
      skipped,
      total: input.students.length,
      markId: mark.id,
      markName: mark.name,
    };
  },
};
