import { RollCallStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  fetchSmClasses,
  fetchSmStudentsForClass,
  type SmStudent,
} from '../clients/student-management.client';
import { defaultAcademicSettings, fetchIamAcademicSettings } from '../clients/iam.client';

const DEFAULT_TEMPLATES = [
  { name: 'Morning Roll Call', defaultTime: '07:30', attendanceType: 'daily', sortOrder: 1 },
  { name: 'Evening Prep', defaultTime: '19:00', attendanceType: 'daily', sortOrder: 2 },
  { name: 'Assembly', defaultTime: '08:00', attendanceType: 'event', sortOrder: 3 },
  { name: 'Dormitory Check', defaultTime: '21:00', attendanceType: 'boarding', sortOrder: 4 },
  { name: 'Weekend Roll Call', defaultTime: '09:00', attendanceType: 'weekend', sortOrder: 5 },
];

function dateOnly(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function generateReference(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const suffix = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `RRC-${y}${m}${day}-${suffix}`;
}

function countRows(rows: { status: string }[]) {
  const counts = {
    total: rows.length,
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    unmarked: 0,
  };
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

function mapStudentsToRows(organizationId: string, sessionId: string, students: SmStudent[]) {
  return students.map((s, i) => ({
    organizationId,
    sessionId,
    studentCode: s.studentCode,
    fullName: s.fullName,
    rollNumber: s.rollNumber ?? String(i + 1).padStart(2, '0'),
    photoUrl: s.photoUrl ?? null,
    gender: s.gender ?? null,
    status: 'UNMARKED',
  }));
}

type RollCallDraftRow = {
  studentCode: string;
  status: string;
  reason?: string | null;
  arrivalTime?: string | null;
  notes?: string | null;
};

type RollCallDraftBody = {
  rows?: RollCallDraftRow[];
  sessionNotes?: string;
};

async function ensureTemplates(organizationId: string) {
  const count = await prisma.rollCallTemplate.count({ where: { organizationId } });
  if (count > 0) return;
  await prisma.rollCallTemplate.createMany({
    data: DEFAULT_TEMPLATES.map((t) => ({ organizationId, ...t })),
  });
}

export const rollCallService = {
  async academicContext(organizationId: string) {
    return (await fetchIamAcademicSettings(organizationId)) ?? defaultAcademicSettings();
  },

  async listClasses(organizationId: string) {
    const classes = await fetchSmClasses(organizationId);
    const withCounts = await Promise.all(
      classes.map(async (c) => {
        try {
          const { students } = await fetchSmStudentsForClass(organizationId, c.id, c.label);
          return { ...c, studentCount: students.length };
        } catch {
          return { ...c, studentCount: 0 };
        }
      })
    );
    return withCounts.sort((a, b) => a.label.localeCompare(b.label));
  },

  async listTemplates(organizationId: string) {
    await ensureTemplates(organizationId);
    return prisma.rollCallTemplate.findMany({
      where: { organizationId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  },

  async saveTemplate(
    organizationId: string,
    data: { name: string; defaultTime?: string; attendanceType?: string; sortOrder?: number }
  ) {
    return prisma.rollCallTemplate.upsert({
      where: { organizationId_name: { organizationId, name: data.name } },
      update: {
        defaultTime: data.defaultTime,
        attendanceType: data.attendanceType ?? 'general',
        sortOrder: data.sortOrder ?? 0,
        isActive: true,
      },
      create: {
        organizationId,
        name: data.name,
        defaultTime: data.defaultTime,
        attendanceType: data.attendanceType ?? 'general',
        sortOrder: data.sortOrder ?? 0,
      },
    });
  },

  async dashboard(organizationId: string, teacherUserId: string, opts?: { date?: string }) {
    const day = opts?.date ? new Date(`${opts.date}T12:00:00`) : new Date();
    const sessionDate = dateOnly(day);

    const sessions = await prisma.rollCallSession.findMany({
      where: { organizationId, teacherUserId, sessionDate },
      include: { rows: true },
      orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
    });

    const allTodayRows = sessions.flatMap((s) => s.rows);
    const todayCounts = countRows(allTodayRows);

    const history = await prisma.rollCallSession.findMany({
      where: { organizationId, teacherUserId, status: RollCallStatus.COMPLETED },
      include: { rows: true },
      orderBy: [{ sessionDate: 'desc' }, { completedAt: 'desc' }],
      take: 20,
    });

    return {
      date: sessionDate.toISOString().slice(0, 10),
      kpis: {
        todayCalls: sessions.length,
        students: todayCounts.total,
        present: todayCounts.present + todayCounts.late,
        rate: todayCounts.rate,
      },
      todaySessions: sessions.map((s) => ({
        id: s.id,
        name: s.name,
        className: s.className,
        classLabel: s.classLabel,
        startTime: s.startTime,
        status: s.status,
        studentCount: s.rows.length,
        ...countRows(s.rows),
      })),
      history: history.map((s) => ({
        id: s.id,
        date: s.sessionDate.toISOString().slice(0, 10),
        name: s.name,
        className: s.className,
        attendanceType: s.attendanceType,
        status: s.status,
        reference: s.reference,
        completedAt: s.completedAt,
        ...countRows(s.rows),
      })),
    };
  },

  async listSessions(
    organizationId: string,
    teacherUserId: string,
    query?: {
      className?: string;
      attendanceType?: string;
      status?: string;
      from?: string;
      to?: string;
      search?: string;
    }
  ) {
    const where: Record<string, unknown> = { organizationId, teacherUserId };
    if (query?.className) where.className = query.className;
    if (query?.attendanceType) where.attendanceType = query.attendanceType;
    if (query?.status) where.status = query.status as RollCallStatus;
    if (query?.from || query?.to) {
      where.sessionDate = {
        ...(query.from ? { gte: new Date(`${query.from}T00:00:00`) } : {}),
        ...(query.to ? { lte: new Date(`${query.to}T23:59:59`) } : {}),
      };
    }
    if (query?.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const sessions = await prisma.rollCallSession.findMany({
      where: where as never,
      include: { rows: true },
      orderBy: [{ sessionDate: 'desc' }, { startTime: 'desc' }],
      take: 50,
    });

    return sessions.map((s) => ({
      id: s.id,
      date: s.sessionDate.toISOString().slice(0, 10),
      name: s.name,
      className: s.className,
      classLabel: s.classLabel,
      startTime: s.startTime,
      attendanceType: s.attendanceType,
      academicYear: s.academicYear,
      term: s.term,
      status: s.status,
      reference: s.reference,
      completedAt: s.completedAt,
      sessionNotes: s.sessionNotes,
      ...countRows(s.rows),
    }));
  },

  async getSession(organizationId: string, sessionId: string, teacherUserId: string) {
    const session = await prisma.rollCallSession.findFirst({
      where: { id: sessionId, organizationId, teacherUserId },
      include: { rows: { orderBy: [{ rollNumber: 'asc' }, { fullName: 'asc' }] } },
    });
    if (!session) throw new AppError(404, 'Roll call session not found');
    return {
      ...session,
      sessionDate: session.sessionDate.toISOString().slice(0, 10),
      counts: countRows(session.rows),
    };
  },

  async createSession(
    organizationId: string,
    teacherUserId: string,
    teacherName: string,
    input: {
      name: string;
      classId: string;
      className: string;
      classLabel?: string;
      sessionDate: string;
      startTime?: string;
      attendanceType?: string;
      academicYear?: string;
      term?: string;
      repeatRule?: string;
      sessionNotes?: string;
    }
  ) {
    const { students } = await fetchSmStudentsForClass(
      organizationId,
      input.classId,
      input.className,
      input.academicYear
    );
    if (students.length === 0) {
      throw new AppError(
        400,
        `No active students found for ${input.className} in Student Management`
      );
    }

    const session = await prisma.rollCallSession.create({
      data: {
        organizationId,
        teacherUserId,
        teacherName,
        name: input.name.trim(),
        classId: input.classId,
        className: input.className,
        classLabel: input.classLabel ?? input.className,
        sessionDate: new Date(`${input.sessionDate}T12:00:00`),
        startTime: input.startTime,
        attendanceType: input.attendanceType ?? 'general',
        academicYear: input.academicYear,
        term: input.term,
        repeatRule: (input.repeatRule as never) ?? 'ONCE',
        sessionNotes: input.sessionNotes,
        status: RollCallStatus.DRAFT,
      },
    });

    await prisma.rollCallAttendanceRow.createMany({
      data: mapStudentsToRows(organizationId, session.id, students),
    });

    return this.getSession(organizationId, session.id, teacherUserId);
  },

  async saveDraft(
    organizationId: string,
    sessionId: string,
    teacherUserId: string,
    body: RollCallDraftBody
  ) {
    const session = await prisma.rollCallSession.findFirst({
      where: { id: sessionId, organizationId, teacherUserId, status: RollCallStatus.DRAFT },
    });
    if (!session) throw new AppError(404, 'Draft roll call not found');

    if (body.sessionNotes !== undefined) {
      await prisma.rollCallSession.update({
        where: { id: sessionId },
        data: { sessionNotes: body.sessionNotes },
      });
    }

    if (body.rows?.length) {
      const now = new Date();
      await prisma.$transaction(
        body.rows.map((r) =>
          prisma.rollCallAttendanceRow.updateMany({
            where: { sessionId, studentCode: r.studentCode },
            data: {
              status: r.status,
              reason: r.reason ?? null,
              arrivalTime: r.arrivalTime ?? null,
              notes: r.notes ?? null,
              markedAt: r.status !== 'UNMARKED' ? now : null,
            },
          })
        )
      );
    }

    return this.getSession(organizationId, sessionId, teacherUserId);
  },

  async complete(
    organizationId: string,
    sessionId: string,
    teacherUserId: string,
    opts?: { allowIncomplete?: boolean; rows?: RollCallDraftRow[] }
  ) {
    if (opts?.rows?.length) {
      await this.saveDraft(organizationId, sessionId, teacherUserId, { rows: opts.rows });
    }

    const session = await prisma.rollCallSession.findFirst({
      where: { id: sessionId, organizationId, teacherUserId },
      include: { rows: true },
    });
    if (!session) throw new AppError(404, 'Roll call session not found');
    if (session.status === RollCallStatus.COMPLETED) {
      throw new AppError(400, 'Roll call already completed');
    }

    const counts = countRows(session.rows);
    if (counts.unmarked > 0 && !opts?.allowIncomplete) {
      throw new AppError(409, 'Attendance not complete', { counts });
    }

    const reference = session.reference ?? generateReference();
    await prisma.rollCallSession.update({
      where: { id: sessionId },
      data: {
        status: RollCallStatus.COMPLETED,
        completedAt: new Date(),
        reference,
      },
    });

    return this.getSession(organizationId, sessionId, teacherUserId);
  },
};
