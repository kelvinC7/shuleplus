import { AppError } from '../middleware/error.middleware';
import { parseStudentSelector, tryResolveActiveStudent } from './parent-context.service';
import { attendanceApi, type AttendanceRecordView, type StudentAttendance } from './attendance-api';
import { prisma } from '../config/database';
import type { StudentSelector } from '../utils/student-param';

function identityCodes(
  ...values: Array<string | null | undefined | Array<string | null | undefined>>
): string[] {
  const flat = values.flat();
  return [...new Set(flat.map((v) => String(v ?? '').trim()).filter(Boolean))];
}

function emptySummary() {
  return {
    students: [] as StudentAttendance['student'][],
    student: null as StudentAttendance['student'] | null,
    summary: { monthlyPresent: 0, monthlyAbsent: 0, monthlyLate: 0, monthlyExcused: 0, attendanceRate: 0 },
    records: [] as AttendanceRecordView[],
    todayStatus: 'NONE' as const,
    checkInTime: null as string | null,
    checkOutTime: null as string | null,
  };
}

function deriveToday(records: AttendanceRecordView[]) {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const today = records.find((r) => String(r.date).slice(0, 10) === todayKey);
  return {
    todayStatus: (today?.status ?? 'NONE') as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'NONE',
    checkInTime: today?.checkInTime ?? null,
    checkOutTime: today?.checkOutTime ?? null,
  };
}

function isoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * School days (Mon–Fri) with no RFID card tap are shown as ABSENT (red).
 * Does not invent future absences.
 */
function fillMissingSchoolDaysAsAbsent(records: AttendanceRecordView[]): AttendanceRecordView[] {
  const byDate = new Map<string, AttendanceRecordView>();
  for (const row of records) {
    const key = String(row.date).slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, { ...row, date: key });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  cursor.setDate(1);
  cursor.setMonth(cursor.getMonth() - 2); // cover current + previous months

  const end = new Date(today);

  for (let d = new Date(cursor); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 0 || day === 6) continue;
    const key = isoLocalDate(d);
    if (!byDate.has(key)) {
      byDate.set(key, {
        id: `absent-${key}`,
        date: key,
        checkInTime: null,
        checkOutTime: null,
        status: 'ABSENT',
        notes: 'No card tap recorded',
        source: 'INFERRED',
      });
    }
  }

  return [...byDate.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function summarizeMonth(records: AttendanceRecordView[]) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthRows = records.filter((r) => String(r.date).startsWith(monthKey));
  let monthlyPresent = 0;
  let monthlyAbsent = 0;
  let monthlyLate = 0;
  let monthlyExcused = 0;
  for (const row of monthRows) {
    const s = String(row.status).toUpperCase();
    if (s === 'PRESENT') monthlyPresent += 1;
    else if (s === 'LATE') monthlyLate += 1;
    else if (s === 'EXCUSED' || s === 'SICK') monthlyExcused += 1;
    else if (s === 'ABSENT') monthlyAbsent += 1;
  }
  const counted = monthlyPresent + monthlyAbsent + monthlyLate + monthlyExcused;
  const attendanceRate =
    counted === 0 ? 0 : Math.round(((monthlyPresent + monthlyLate) / counted) * 100);
  return { monthlyPresent, monthlyAbsent, monthlyLate, monthlyExcused, attendanceRate };
}

export class AttendanceService {
  async getSummary(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const requested = parseStudentSelector(requestedStudentId);
    const student = await tryResolveActiveStudent(organizationId, parentId, requestedStudentId);
    const codes = identityCodes(student?.id, student?.shuleCode, requested.id, requested.code);
    if (!codes.length) return emptySummary();

    try {
      const remote = await attendanceApi.getStudentAttendance(
        student?.organizationId || organizationId,
        codes
      );
      const records = fillMissingSchoolDaysAsAbsent(remote.records ?? []);
      const summary = summarizeMonth(records);
      const today = deriveToday(records);
      return {
        students: [remote.student],
        student: remote.student,
        summary,
        records,
        ...today,
      };
    } catch (error) {
      console.warn(
        `[attendance] RFID module unreachable (${(error as Error).message}); falling back to local records`
      );
      return student ? this.fallbackLocal(student.id) : emptySummary();
    }
  }

  async reportAbsence(
    organizationId: string,
    parentId: string,
    input: { date: string; reason: string },
    requestedStudentId?: StudentSelector
  ) {
    const date = new Date(input.date);
    if (Number.isNaN(date.getTime())) throw new AppError(400, 'Invalid date');

    const student = await tryResolveActiveStudent(organizationId, parentId, requestedStudentId);
    if (!student) throw new AppError(404, 'Requested student is not linked to this parent');

    try {
      return await attendanceApi.recordExcusedAbsence(organizationId, {
        studentCode: student.shuleCode,
        studentId: student.id,
        date: input.date,
        reason: input.reason,
        studentName: `${student.firstName} ${student.lastName}`,
        className: student.className,
      });
    } catch (error) {
      console.warn(`[attendance] RFID absence write failed (${(error as Error).message}); using local record`);
      const row = await prisma.attendanceRecord.upsert({
        where: { studentId_date: { studentId: student.id, date } },
        update: { status: 'EXCUSED', notes: input.reason },
        create: {
          organizationId,
          studentId: student.id,
          date,
          status: 'EXCUSED',
          notes: input.reason,
        },
      });
      return {
        id: row.id,
        date: row.date.toISOString(),
        checkInTime: row.checkInTime,
        checkOutTime: row.checkOutTime,
        status: row.status,
        notes: row.notes,
        source: 'MANUAL',
      };
    }
  }

  private async fallbackLocal(studentId: string) {
    const records = await prisma.attendanceRecord.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
    });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRecords = records.filter((r) => r.date >= monthStart);
    const monthlyPresent = monthRecords.filter((r) => r.status === 'PRESENT').length;
    const monthlyAbsent = monthRecords.filter((r) => r.status === 'ABSENT').length;
    const monthlyLate = monthRecords.filter((r) => r.status === 'LATE').length;
    const monthlyExcused = monthRecords.filter((r) => r.status === 'EXCUSED').length;
    const schoolDays = monthRecords.length;
    const mapped: AttendanceRecordView[] = records.map((r) => ({
      id: r.id,
      date: r.date.toISOString(),
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      status: r.status,
      notes: r.notes,
      source: 'LOCAL',
    }));
    return {
      students: [],
      student: null,
      summary: {
        monthlyPresent,
        monthlyAbsent,
        monthlyLate,
        monthlyExcused,
        attendanceRate:
          schoolDays > 0 ? Math.round(((monthlyPresent + monthlyLate) / schoolDays) * 100) : 0,
      },
      records: mapped,
      ...deriveToday(mapped),
    };
  }
}

export const attendanceService = new AttendanceService();
