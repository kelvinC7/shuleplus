import { prisma } from '../config/database';
import { resolveParentContext, resolveActiveStudent } from './parent-context.service';
import { timetableApi } from './timetable-api';
import type { StudentSelector } from '../utils/student-param';

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeekMonday(d = new Date()): Date {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc;
}

function endOfWeekFriday(monday: Date): Date {
  const friday = new Date(monday);
  friday.setUTCDate(friday.getUTCDate() + 4);
  return friday;
}

export class TimetableService {
  async get(
    organizationId: string,
    parentId: string,
    requestedStudentId?: StudentSelector,
    range?: { from?: string; to?: string; term?: string; academicYear?: string }
  ) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId);
    const student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);
    const liveOrgId = student.organizationId || organizationId;

    const monday = startOfWeekMonday(range?.from ? new Date(range.from) : new Date());
    const from = (range?.from || toIsoDate(monday)).slice(0, 10);
    const to = (range?.to || toIsoDate(endOfWeekFriday(parseIsoOrMonday(from)))).slice(0, 10);

    const className = (student.className ?? '').trim();
    const studentCode = (student.shuleCode ?? '').trim();

    if (className && studentCode) {
      try {
        const live = await timetableApi.getStudentWeek({
          organizationId: liveOrgId,
          studentCode,
          className,
          from,
          to,
          term: range?.term,
          academicYear: range?.academicYear,
        });

        return {
          ...live,
          student: {
            id: student.id,
            name: `${student.firstName} ${student.lastName}`.trim(),
            shuleCode: student.shuleCode,
            className: student.className,
          },
        };
      } catch (err) {
        console.warn(
          '[ParentMIS] Timetable live schedule unavailable, falling back to local slots:',
          err instanceof Error ? err.message : err
        );
      }
    }

    return this.getLocalFallback(studentId, student, from, to);
  }

  private async getLocalFallback(
    studentId: string,
    student: {
      id: string;
      firstName: string;
      lastName: string;
      shuleCode: string;
      className: string | null;
    },
    from: string,
    to: string
  ) {
    const slots = await prisma.timetableSlot.findMany({
      where: { studentId },
      orderBy: [{ day: 'asc' }, { period: 'asc' }],
    });

    const daysNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const fromDate = parseIsoOrMonday(from);
    const toDate = parseIsoOrMonday(to);
    const span =
      Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    const days = [];
    for (let i = 0; i < Math.max(1, span); i += 1) {
      const date = new Date(fromDate);
      date.setUTCDate(date.getUTCDate() + i);
      const dayIndex = date.getUTCDay();
      const daySlots = slots
        .filter((s) => s.day === dayIndex)
        .map((slot) => ({
          id: slot.id,
          timetableId: slot.id,
          period: slot.period,
          periodLabel: `Period ${slot.period}`,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subject: slot.subject,
          teacher: slot.teacher,
          room: slot.room,
          attendanceStatus: null as null,
          attendanceDone: false,
          sessionId: null as null,
          sessionStatus: null as null,
          lessonStarted: false,
        }));

      days.push({
        date: toIsoDate(date),
        day: daysNames[dayIndex]!,
        dayIndex,
        slots: daySlots,
      });
    }

    const total = days.reduce((n, d) => n + d.slots.length, 0);
    return {
      source: 'local' as const,
      term: null as string | null,
      academicYear: null as string | null,
      className: student.className,
      studentCode: student.shuleCode,
      weekStart: from,
      weekEnd: to,
      days,
      summary: {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        unmarked: total,
        total,
      },
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`.trim(),
        shuleCode: student.shuleCode,
        className: student.className,
      },
      warning:
        slots.length === 0
          ? 'No live timetable found for this class yet. Ask the school to publish the Timetable.'
          : 'Showing saved schedule. Period attendance will appear once Timetable sync is available.',
    };
  }
}

function parseIsoOrMonday(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return startOfWeekMonday(new Date());
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export const timetableService = new TimetableService();
