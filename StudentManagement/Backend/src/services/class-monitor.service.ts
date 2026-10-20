import { Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

const MAX_MONITORS_PER_CLASS = 2;

function classDisplayName(name: string, stream?: string | null): string {
  const st = stream?.trim();
  return st ? `${name.trim()} ${st}`.trim() : name.trim();
}

async function nextMonitorQrCode(organizationId: string, schoolCode: string | null): Promise<string> {
  const prefix = schoolCode?.trim() || 'SCH';
  const rows = await prisma.classMonitor.findMany({
    where: { organizationId, qrCode: { contains: 'QR-MON-' } },
    select: { qrCode: true },
  });
  let max = 0;
  for (const row of rows) {
    const m = String(row.qrCode).match(/QR-MON-(\d+)/i);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const bare = `QR-MON-${String(max + 1).padStart(5, '0')}`;
  return `${prefix}-${bare}`.toUpperCase();
}

function normalizeQrInput(raw: string): string {
  const trimmed = raw.trim();
  const prefixed =
    trimmed.match(/\b(\d{3,})-QR-MON-(\d+)\b/i) ??
    trimmed.match(/\b([A-Z0-9]{3,})-QR-MON-(\d+)\b/i);
  if (prefixed) return `${prefixed[1]}-QR-MON-${prefixed[2]}`.toUpperCase();
  const bare = trimmed.match(/QR-MON-\d+/i);
  if (bare) return bare[0].toUpperCase();
  return trimmed.toUpperCase();
}

/** Student ID cards (PrintCard) encode profile URLs like /v/{studentCode}. */
function extractStudentProfileCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed);
      const m = u.pathname.match(/\/v\/([^/]+)/i);
      if (m?.[1]) return decodeURIComponent(m[1]).trim();
    }
  } catch {
    /* ignore malformed URL */
  }
  const pathMatch = trimmed.match(/\/v\/([^/?#\s]+)/i);
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]).trim();
  return null;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

async function findStudentByProfileCode(organizationId: string, profileCode: string) {
  const trimmed = profileCode.trim();
  if (!trimmed) return null;
  const compact = digitsOnly(trimmed);
  const or: Prisma.StudentWhereInput[] = [
    { studentCode: { equals: trimmed, mode: 'insensitive' } },
    { studentUid: { equals: trimmed, mode: 'insensitive' } },
  ];
  if (compact.length >= 8) {
    or.push({ nationalId: { equals: trimmed, mode: 'insensitive' } });
    or.push({ nationalId: compact });
    or.push({ studentCode: compact });
  }
  return prisma.student.findFirst({
    where: { organizationId, OR: or },
  });
}

async function assertStudentInClass(organizationId: string, classId: string, studentId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      organizationId,
      classId,
      studentId,
      status: 'ACTIVE',
      isCurrent: true,
    },
  });
  if (!enrollment) {
    throw new AppError(400, 'Student must be enrolled in this class');
  }
}

async function assertStudentNotMonitorElsewhere(
  organizationId: string,
  studentId: string,
  excludeMonitorId?: string
) {
  const existing = await prisma.classMonitor.findFirst({
    where: {
      organizationId,
      studentId,
      ...(excludeMonitorId ? { NOT: { id: excludeMonitorId } } : {}),
    },
    include: { class: true },
  });
  if (existing) {
    throw new AppError(
      409,
      `This student is already a class monitor for ${classDisplayName(existing.class.name, existing.class.stream)}`
    );
  }
}

function mapRow(row: {
  id: string;
  slot: number;
  qrCode: string;
  class: { id: string; name: string; stream: string | null };
  student: {
    id: string;
    firstName: string;
    lastName: string;
    studentCode: string | null;
    studentUid: string;
  };
}) {
  return {
    id: row.id,
    slot: row.slot,
    qrCode: row.qrCode,
    classId: row.class.id,
    className: classDisplayName(row.class.name, row.class.stream),
    studentId: row.student.id,
    studentUid: row.student.studentUid,
    studentCode: row.student.studentCode,
    studentName: `${row.student.firstName} ${row.student.lastName}`.trim(),
  };
}

export class ClassMonitorService {
  async list(organizationId: string, classId?: string) {
    const rows = await prisma.classMonitor.findMany({
      where: {
        organizationId,
        ...(classId ? { classId } : {}),
      },
      include: {
        class: true,
        student: true,
      },
      orderBy: [{ class: { sortOrder: 'asc' } }, { slot: 'asc' }],
    });
    return rows.map(mapRow);
  }

  async create(
    organizationId: string,
    data: { classId: string; studentId: string; slot?: number }
  ) {
    const klass = await prisma.class.findFirst({
      where: { id: data.classId, organizationId },
    });
    if (!klass) throw new AppError(404, 'Class not found');

    const student = await prisma.student.findFirst({
      where: { id: data.studentId, organizationId },
    });
    if (!student) throw new AppError(404, 'Student not found');

    await assertStudentInClass(organizationId, data.classId, data.studentId);
    await assertStudentNotMonitorElsewhere(organizationId, data.studentId);

    const usedSlots = await prisma.classMonitor.findMany({
      where: { organizationId, classId: data.classId },
      select: { slot: true },
    });
    if (usedSlots.length >= MAX_MONITORS_PER_CLASS) {
      throw new AppError(400, 'This class already has two class monitors. Remove one first.');
    }

    let slot = data.slot;
    if (slot == null) {
      const taken = new Set(usedSlots.map((s) => s.slot));
      slot = taken.has(1) ? 2 : 1;
    }
    if (slot !== 1 && slot !== 2) throw new AppError(400, 'Monitor slot must be 1 or 2');
    if (takenHas(usedSlots, slot)) {
      throw new AppError(400, `Monitor slot ${slot} is already assigned for this class`);
    }

    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
    const qrCode = await nextMonitorQrCode(organizationId, tenant?.organizationCode ?? null);

    const row = await prisma.classMonitor.create({
      data: {
        organizationId,
        classId: data.classId,
        studentId: data.studentId,
        slot,
        qrCode,
      },
      include: { class: true, student: true },
    });
    return mapRow(row);
  }

  async update(organizationId: string, id: string, data: { studentId?: string; slot?: number }) {
    const existing = await prisma.classMonitor.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new AppError(404, 'Class monitor not found');

    const studentId = data.studentId ?? existing.studentId;
    if (data.studentId) {
      await assertStudentInClass(organizationId, existing.classId, studentId);
      await assertStudentNotMonitorElsewhere(organizationId, studentId, id);
    }

    let slot = data.slot ?? existing.slot;
    if (slot !== 1 && slot !== 2) throw new AppError(400, 'Monitor slot must be 1 or 2');
    if (slot !== existing.slot) {
      const clash = await prisma.classMonitor.findFirst({
        where: {
          organizationId,
          classId: existing.classId,
          slot,
          NOT: { id },
        },
      });
      if (clash) throw new AppError(400, `Monitor slot ${slot} is already assigned for this class`);
    }

    const row = await prisma.classMonitor.update({
      where: { id },
      data: { studentId, slot },
      include: { class: true, student: true },
    });
    return mapRow(row);
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.classMonitor.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Class monitor not found');
    await prisma.classMonitor.delete({ where: { id } });
    return { deleted: true };
  }

  async lookupByQr(organizationId: string, rawQr: string) {
    const primary = normalizeQrInput(rawQr);
    const candidates = new Set<string>([primary]);
    const bare = primary.match(/QR-MON-\d+/i)?.[0];
    if (bare) candidates.add(bare.toUpperCase());

    for (const qrCode of candidates) {
      const row = await prisma.classMonitor.findFirst({
        where: { organizationId, qrCode },
        include: { class: true, student: true },
      });
      if (row) {
        return {
          monitor: {
            ...mapRow(row),
            monitorSlot: row.slot,
          },
        };
      }
    }

    let profileCode = extractStudentProfileCode(rawQr);
    if (!profileCode && !/QR-/i.test(rawQr) && rawQr.trim().length >= 6) {
      profileCode = rawQr.trim();
    }

    if (profileCode) {
      const student = await findStudentByProfileCode(organizationId, profileCode);
      if (student) {
        const row = await prisma.classMonitor.findFirst({
          where: { organizationId, studentId: student.id },
          include: { class: true, student: true },
        });
        if (row) {
          return {
            monitor: {
              ...mapRow(row),
              monitorSlot: row.slot,
            },
          };
        }
        const name = `${student.firstName} ${student.lastName}`.trim();
        return {
          monitor: null,
          meta: {
            hint: 'STUDENT_NOT_MONITOR',
            message: `${name} is not a class monitor for this school. Assign a monitor in Student Management → Class monitors, or scan the classroom QR poster (schoolCode-QR-CLS-…).`,
          },
        };
      }
      return {
        monitor: null,
        meta: {
          hint: 'UNKNOWN_STUDENT',
          message:
            'This ShuleCard QR is not linked to a student in your school roster. Re-print the card from Smart Access or verify the student code.',
        },
      };
    }

    return { monitor: null };
  }
}

function takenHas(usedSlots: { slot: number }[], slot: number) {
  return usedSlots.some((s) => s.slot === slot);
}

export const classMonitorService = new ClassMonitorService();
