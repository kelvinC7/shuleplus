import { ClassAttendanceStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { fetchSmStudentsForClass, type SmStudent } from '../clients/student-management.client';

function dateOnly(iso: string) {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function countRows(rows: { status: string }[]) {
  const counts = { total: rows.length, present: 0, late: 0, absent: 0, excused: 0, unmarked: 0 };
  for (const r of rows) {
    switch (r.status) {
      case 'PRESENT':
        counts.present++;
        break;
      case 'LATE':
        counts.late++;
        break;
      case 'ABSENT':
        counts.absent++;
        break;
      case 'EXCUSED':
      case 'SICK':
      case 'SCHOOL_ACTIVITY':
        counts.excused++;
        break;
      default:
        counts.unmarked++;
    }
  }
  const marked = counts.present + counts.late + counts.absent + counts.excused;
  counts.unmarked = Math.max(0, counts.total - marked);
  return { ...counts, marked, rate: counts.total ? Math.round((marked / counts.total) * 100) : 0 };
}

function mapStudentsToRows(organizationId: string, students: SmStudent[]) {
  return students.map((s, i) => ({
    organizationId,
    studentId: s.id,
    studentCode: s.studentCode,
    fullName: s.fullName,
    rollNumber: s.rollNumber ?? String(i + 1).padStart(2, '0'),
    status: 'UNMARKED',
  }));
}

type AttendanceDraftRow = {
  studentCode: string;
  status: string;
  notes?: string | null;
};

export const classAttendanceService = {
  async getOrCreateSession(
    organizationId: string,
    teacherUserId: string,
    teacherName: string,
    input: {
      classId: string;
      className: string;
      classLabel?: string;
      sessionDate: string;
      academicYear: string;
      term: string;
    }
  ) {
    const sessionDate = dateOnly(input.sessionDate);
    let session = await prisma.classAttendanceSession.findFirst({
      where: {
        organizationId,
        classId: input.classId,
        sessionDate,
        academicYear: input.academicYear,
        term: input.term,
      },
      include: { rows: { orderBy: [{ rollNumber: 'asc' }, { fullName: 'asc' }] } },
    });

    if (!session) {
      const { students } = await fetchSmStudentsForClass(
        organizationId,
        input.classId,
        input.classLabel ?? input.className,
        input.academicYear
      );
      session = await prisma.classAttendanceSession.create({
        data: {
          organizationId,
          teacherUserId,
          teacherName,
          classId: input.classId,
          className: input.className,
          classLabel: input.classLabel ?? input.className,
          sessionDate,
          academicYear: input.academicYear,
          term: input.term,
          rows: { create: mapStudentsToRows(organizationId, students) },
        },
        include: { rows: { orderBy: [{ rollNumber: 'asc' }, { fullName: 'asc' }] } },
      });
    }

    return {
      ...session,
      sessionDate: session.sessionDate.toISOString().slice(0, 10),
      counts: countRows(session.rows),
    };
  },

  async saveDraft(
    organizationId: string,
    sessionId: string,
    teacherUserId: string,
    body: { rows?: AttendanceDraftRow[]; sessionNotes?: string }
  ) {
    const session = await prisma.classAttendanceSession.findFirst({
      where: { id: sessionId, organizationId, teacherUserId },
    });
    if (!session) throw new AppError(404, 'Attendance session not found');
    if (session.status === ClassAttendanceStatus.COMPLETED) {
      throw new AppError(400, 'Completed attendance cannot be edited');
    }

    if (body.sessionNotes !== undefined) {
      await prisma.classAttendanceSession.update({
        where: { id: sessionId },
        data: { sessionNotes: body.sessionNotes },
      });
    }

    if (body.rows?.length) {
      for (const row of body.rows) {
        await prisma.classAttendanceRow.updateMany({
          where: { sessionId, studentCode: row.studentCode },
          data: {
            status: row.status,
            notes: row.notes ?? null,
            markedAt: row.status !== 'UNMARKED' ? new Date() : null,
          },
        });
      }
    }

    return this.getSession(organizationId, sessionId, teacherUserId);
  },

  async complete(organizationId: string, sessionId: string, teacherUserId: string) {
    const session = await prisma.classAttendanceSession.findFirst({
      where: { id: sessionId, organizationId, teacherUserId },
      include: { rows: true },
    });
    if (!session) throw new AppError(404, 'Attendance session not found');
    if (session.status === ClassAttendanceStatus.COMPLETED) {
      return this.getSession(organizationId, sessionId, teacherUserId);
    }

    const unmarked = session.rows.filter((r) => r.status === 'UNMARKED').length;
    if (unmarked > 0) {
      throw new AppError(400, `${unmarked} student(s) still unmarked`);
    }

    await prisma.classAttendanceSession.update({
      where: { id: sessionId },
      data: { status: ClassAttendanceStatus.COMPLETED, completedAt: new Date() },
    });

    return this.getSession(organizationId, sessionId, teacherUserId);
  },

  async getSession(organizationId: string, sessionId: string, teacherUserId: string) {
    const session = await prisma.classAttendanceSession.findFirst({
      where: { id: sessionId, organizationId, teacherUserId },
      include: { rows: { orderBy: [{ rollNumber: 'asc' }, { fullName: 'asc' }] } },
    });
    if (!session) throw new AppError(404, 'Attendance session not found');
    return {
      ...session,
      sessionDate: session.sessionDate.toISOString().slice(0, 10),
      counts: countRows(session.rows),
    };
  },

  async listHistory(
    organizationId: string,
    classId: string,
    teacherUserId: string,
    opts?: { term?: string; academicYear?: string }
  ) {
    const sessions = await prisma.classAttendanceSession.findMany({
      where: {
        organizationId,
        classId,
        teacherUserId,
        ...(opts?.term ? { term: opts.term } : {}),
        ...(opts?.academicYear ? { academicYear: opts.academicYear } : {}),
      },
      include: { rows: true },
      orderBy: [{ sessionDate: 'desc' }],
      take: 30,
    });

    return sessions.map((s) => ({
      id: s.id,
      sessionDate: s.sessionDate.toISOString().slice(0, 10),
      term: s.term,
      academicYear: s.academicYear,
      status: s.status,
      completedAt: s.completedAt,
      ...countRows(s.rows),
    }));
  },
};
