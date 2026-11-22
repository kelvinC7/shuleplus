import { prisma } from '../config/database';
import { fetchSmStudents, type SmStudent } from '../clients/student-management.client';
import { AppError } from '../middleware/error.middleware';

export type RollCallStatus = 'present' | 'absent' | 'excused';

export type RollCallRow = {
  id: string;
  studentId?: string;
  studentCode?: string;
  name: string;
  status: RollCallStatus;
  remarks?: string;
};

type SessionInput = {
  className: string;
  classId?: string;
  date: string;
  label?: string;
  subject?: string;
  period?: string;
};

function dateOnly(value: string): Date {
  const raw = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new AppError(400, 'A valid date is required');
  return new Date(`${raw}T00:00:00.000Z`);
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function countStatuses(roster: RollCallRow[]) {
  return {
    presentCount: roster.filter((r) => r.status === 'present').length,
    absentCount: roster.filter((r) => r.status === 'absent').length,
    excusedCount: roster.filter((r) => r.status === 'excused').length,
  };
}

function serialize(row: {
  id: string;
  className: string;
  classId: string | null;
  sessionDate: Date;
  label: string;
  subject: string | null;
  period: string | null;
  roster: unknown;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  createdByName: string | null;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    className: row.className,
    classId: row.classId,
    date: isoDate(row.sessionDate),
    label: row.label,
    subject: row.subject,
    period: row.period,
    roster: (row.roster as unknown as RollCallRow[]) ?? [],
    ...countStatuses((row.roster as unknown as RollCallRow[]) ?? []),
    savedCounts: {
      present: row.presentCount,
      absent: row.absentCount,
      excused: row.excusedCount,
    },
    createdByName: row.createdByName,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeStudents(students: SmStudent[]): RollCallRow[] {
  return [...students]
    .sort((a, b) =>
      String(a.fullName || '').localeCompare(String(b.fullName || ''), undefined, {
        sensitivity: 'base',
        numeric: true,
      })
    )
    .map((s) => ({
      id: s.id,
      studentId: s.id,
      studentCode: s.studentCode,
      name: s.fullName,
      status: 'present' as RollCallStatus,
      remarks: '',
    }));
}

export const rollCallService = {
  async loadRoster(organizationId: string, input: SessionInput) {
    if (!input.className?.trim()) throw new AppError(400, 'A class is required');
    const date = dateOnly(input.date);
    const label = (input.label || 'Class attendance').trim();

    const existing = await prisma.rollCallSession.findUnique({
      where: {
        organizationId_className_sessionDate_label: {
          organizationId,
          className: input.className.trim(),
          sessionDate: date,
          label,
        },
      },
    });

    if (existing) {
      return {
        logExists: true,
        session: serialize(existing),
        roster: (existing.roster as unknown as RollCallRow[]) ?? [],
      };
    }

    const students = await fetchSmStudents(organizationId, {
      className: input.className.trim(),
      classId: input.classId,
    });
    return {
      logExists: false,
      session: null,
      roster: normalizeStudents(students),
    };
  },

  async listSessions(organizationId: string, input: { className?: string; date?: string }) {
    const where = {
      organizationId,
      ...(input.className ? { className: input.className } : {}),
      ...(input.date ? { sessionDate: dateOnly(input.date) } : {}),
    };
    const rows = await prisma.rollCallSession.findMany({
      where,
      orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
      take: 30,
    });
    return rows.map(serialize);
  },

  async history(
    organizationId: string,
    filters: { q?: string; className?: string; from?: string; to?: string }
  ) {
    const q = filters.q?.trim();
    const rows = await prisma.rollCallSession.findMany({
      where: {
        organizationId,
        ...(filters.className ? { className: filters.className } : {}),
        ...(filters.from ? { sessionDate: { gte: dateOnly(filters.from) } } : {}),
        ...(filters.to ? { sessionDate: { lte: dateOnly(filters.to) } } : {}),
        ...(q
          ? {
              OR: [
                { className: { contains: q, mode: 'insensitive' as const } },
                { label: { contains: q, mode: 'insensitive' as const } },
                { subject: { contains: q, mode: 'insensitive' as const } },
                { createdByName: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    return rows.map(serialize);
  },

  async session(organizationId: string, sessionId: string) {
    const row = await prisma.rollCallSession.findFirst({
      where: { id: sessionId, organizationId },
    });
    if (!row) throw new AppError(404, 'Roll call not found');
    return serialize(row);
  },

  async save(
    organizationId: string,
    input: SessionInput & { records: RollCallRow[] },
    actor: { id: string; name?: string }
  ) {
    if (!input.className?.trim()) throw new AppError(400, 'A class is required');
    if (!Array.isArray(input.records)) throw new AppError(400, 'Roster records are required');

    const roster = input.records
      .map((r) => ({
        id: String(r.id || r.studentId || ''),
        studentId: r.studentId || r.id,
        studentCode: r.studentCode,
        name: String(r.name || ''),
        status: (['present', 'absent', 'excused'].includes(r.status) ? r.status : 'present') as RollCallStatus,
        remarks: String(r.remarks || '').slice(0, 500),
      }))
      .filter((r) => r.id && r.name);

    if (!roster.length) throw new AppError(400, 'No students to save');

    const sessionDate = dateOnly(input.date);
    const label = (input.label || 'Class attendance').trim();
    const data = {
      className: input.className.trim(),
      classId: input.classId || null,
      sessionDate,
      label,
      subject: input.subject || null,
      period: input.period || null,
      roster: JSON.parse(JSON.stringify(roster)),
      ...countStatuses(roster),
      createdBy: actor.id,
      createdByName: actor.name || null,
    };

    const row = await prisma.rollCallSession.upsert({
      where: {
        organizationId_className_sessionDate_label: {
          organizationId,
          className: data.className,
          sessionDate,
          label,
        },
      },
      create: { organizationId, ...data },
      update: {
        roster: data.roster,
        presentCount: data.presentCount,
        absentCount: data.absentCount,
        excusedCount: data.excusedCount,
        subject: data.subject,
        period: data.period,
        classId: data.classId,
      },
    });

    return serialize(row);
  },
};
