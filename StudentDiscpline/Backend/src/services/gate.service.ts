import { prisma } from '../config/database';
import { fetchSmStudentById, fetchSmStudents } from '../clients/student-management.client';
import { provisionGateOfficerAccount } from '../clients/iam.client';
import { AppError } from '../middleware/error.middleware';
import { notifyGateOfficerOverdue, notifyOverdueStudent } from './gate-notification.service';

const DEFAULT_GATES = [
  { name: 'Main Gate', code: 'MAIN', isDefault: true },
  { name: 'Student Gate', code: 'STUDENT' },
  { name: 'Boarding Gate', code: 'BOARDING' },
  { name: 'Staff Gate', code: 'STAFF' },
  { name: 'Emergency Gate', code: 'EMERGENCY' },
];

function normalizeScanInput(code: string) {
  const trimmed = code.trim();
  const permMatch = trimmed.match(/shuleplus:\/\/permission\/([^/?#]+)/i);
  if (permMatch) return decodeURIComponent(permMatch[1]);

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const vMatch = url.pathname.match(/^\/v\/([^/]+)/i);
      if (vMatch) return decodeURIComponent(vMatch[1]);
    }
  } catch {
    /* ignore */
  }

  const pathMatch = trimmed.match(/\/(?:v|staff)\/([^/?#]+)/i);
  if (pathMatch) return decodeURIComponent(pathMatch[1]);

  return trimmed;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseDateTime(date: Date, time: string) {
  const [h, m] = time.split(':').map((x) => parseInt(x, 10));
  const d = new Date(date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function formatTime12h(time: string) {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h)) return time;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}

function varianceLabel(kind: 'departure' | 'return', minutes: number) {
  const abs = Math.abs(minutes);
  if (minutes === 0) return kind === 'departure' ? 'On time' : 'Returned on time';
  if (kind === 'departure') {
    return minutes > 0 ? `Checked out ${abs} minute${abs === 1 ? '' : 's'} late` : `Checked out ${abs} minute${abs === 1 ? '' : 's'} early`;
  }
  return minutes < 0
    ? `Returned ${abs} minute${abs === 1 ? '' : 's'} early`
    : `Returned ${abs} minute${abs === 1 ? '' : 's'} late`;
}

function isOverdue(row: {
  status: string;
  expectedReturnDate: Date;
  expectedReturnTime: string;
  actualReturnAt: Date | null;
}) {
  if (row.actualReturnAt) return false;
  if (!['Approved', 'Out'].includes(row.status)) return false;
  return parseDateTime(row.expectedReturnDate, row.expectedReturnTime).getTime() < Date.now();
}

function overdueMinutes(row: {
  expectedReturnDate: Date;
  expectedReturnTime: string;
  actualReturnAt: Date | null;
}) {
  if (row.actualReturnAt) return 0;
  const expected = parseDateTime(row.expectedReturnDate, row.expectedReturnTime);
  const diff = Math.round((Date.now() - expected.getTime()) / 60000);
  return diff > 0 ? diff : 0;
}

function isCurrentlyOut(row: {
  status: string;
  actualReturnAt: Date | null;
  actualDepartureAt: Date | null;
}) {
  if (row.actualReturnAt) return false;
  return row.status === 'Out' || (row.status === 'Approved' && Boolean(row.actualDepartureAt));
}

async function ensureDefaultGates(organizationId: string) {
  const count = await prisma.gate.count({ where: { organizationId } });
  if (count > 0) return;
  await prisma.gate.createMany({
    data: DEFAULT_GATES.map((g) => ({ organizationId, ...g, status: 'Active' })),
  });
}

async function getGateOrThrow(organizationId: string, gateId: string) {
  const gate = await prisma.gate.findFirst({ where: { id: gateId, organizationId, status: 'Active' } });
  if (!gate) throw new Error('Gate not found');
  return gate;
}

async function addPermissionEvent(
  organizationId: string,
  permissionId: string,
  event: { eventType: string; actorName?: string; actorRole?: string; notes?: string }
) {
  return prisma.permissionEvent.create({ data: { organizationId, permissionId, ...event } });
}

async function createGateLog(input: {
  organizationId: string;
  gateId: string;
  permissionId?: string;
  studentId: string;
  studentCode?: string;
  studentName: string;
  className?: string;
  eventType: string;
  method: string;
  officerId?: string;
  officerName?: string;
  expectedTime?: string;
  actualTime: Date;
  varianceMinutes?: number;
  varianceLabel?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.gateLog.create({ data: input });
}

async function findPermissionByCode(organizationId: string, code: string) {
  const q = code.trim();
  return prisma.permissionRequest.findFirst({
    where: {
      organizationId,
      OR: [
        { scanCode: { equals: q, mode: 'insensitive' } },
        { referenceNumber: { equals: q, mode: 'insensitive' } },
        { studentCode: { equals: q, mode: 'insensitive' } },
        { studentId: q },
        { id: q },
      ],
    },
    include: { events: { orderBy: { createdAt: 'asc' } } },
  });
}

async function findActivePermissionForStudent(organizationId: string, studentId: string) {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  return prisma.permissionRequest.findFirst({
    where: {
      organizationId,
      studentId,
      departureDate: { gte: todayStart, lte: todayEnd },
      status: { in: ['Approved', 'Out'] },
    },
    orderBy: { createdAt: 'desc' },
    include: { events: { orderBy: { createdAt: 'asc' } } },
  });
}

type ExitCheck = { key: string; passed: boolean; message: string };

function buildExitChecks(
  permission: Awaited<ReturnType<typeof findPermissionByCode>>,
  studentActive: boolean
): { allowed: boolean; checks: ExitCheck[]; reason?: string } {
  if (!permission) {
    return {
      allowed: false,
      checks: [{ key: 'permission', passed: false, message: 'No valid permission found for this code.' }],
      reason: 'No valid permission found.',
    };
  }

  const checks: ExitCheck[] = [];
  const now = new Date();
  const depDate = new Date(permission.departureDate);
  const depStart = startOfDay(depDate);
  const depEnd = endOfDay(depDate);

  checks.push({
    key: 'enrollment',
    passed: studentActive,
    message: studentActive ? 'Active enrollment verified' : 'Student enrollment is not active',
  });

  checks.push({
    key: 'permission',
    passed: true,
    message: `Permission ${permission.referenceNumber} found`,
  });

  const approved = permission.status === 'Approved';
  checks.push({
    key: 'approved',
    passed: approved,
    message: approved ? 'Permission is approved' : `Permission status is ${permission.status}`,
  });

  if (permission.status === 'Rejected') {
    return { allowed: false, checks, reason: 'This permission has been rejected.' };
  }
  if (permission.status === 'Cancelled') {
    return { allowed: false, checks, reason: 'This permission has been cancelled.' };
  }
  if (permission.status === 'Completed') {
    return { allowed: false, checks, reason: 'This permission is already completed.' };
  }

  const dateValid = now >= depStart && now <= depEnd;
  checks.push({
    key: 'date',
    passed: dateValid,
    message: dateValid ? 'Permission date is valid for today' : 'This permission is not valid for today',
  });

  if (!dateValid) {
    return { allowed: false, checks, reason: 'This permission expired or is not valid for today.' };
  }

  const alreadyOut = isCurrentlyOut(permission);
  checks.push({
    key: 'checkout',
    passed: !alreadyOut,
    message: alreadyOut
      ? `Student already checked out at ${permission.actualDepartureAt?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) ?? '—'}`
      : 'Student has not checked out yet',
  });

  if (alreadyOut) {
    return {
      allowed: false,
      checks,
      reason: `Student already checked out at ${permission.actualDepartureAt?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) ?? '—'}.`,
    };
  }

  if (permission.status !== 'Approved') {
    return { allowed: false, checks, reason: checks.find((c) => !c.passed)?.message ?? 'Exit not allowed.' };
  }

  const allowed = checks.every((c) => c.passed);
  return { allowed, checks, reason: allowed ? undefined : 'Exit not allowed.' };
}

export const gateService = {
  async ensureSetup(organizationId: string) {
    await ensureDefaultGates(organizationId);
  },

  async listGates(organizationId: string) {
    await ensureDefaultGates(organizationId);
    return prisma.gate.findMany({ where: { organizationId }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
  },

  async createGate(organizationId: string, input: { name: string; code?: string; location?: string }) {
    return prisma.gate.create({
      data: { organizationId, name: input.name.trim(), code: input.code, location: input.location, status: 'Active' },
    });
  },

  async updateGate(organizationId: string, id: string, input: Partial<{ name: string; code: string; location: string; status: string; isDefault: boolean }>) {
    const existing = await prisma.gate.findFirst({ where: { id, organizationId } });
    if (!existing) throw new Error('Gate not found');
    if (input.isDefault) {
      await prisma.gate.updateMany({ where: { organizationId }, data: { isDefault: false } });
    }
    return prisma.gate.update({ where: { id }, data: input });
  },

  async listOfficers(organizationId: string) {
    return prisma.gateOfficer.findMany({
      where: { organizationId },
      include: { gate: true },
      orderBy: { fullName: 'asc' },
    });
  },

  async createOfficer(
    organizationId: string,
    actorId: string,
    input: {
      fullName: string;
      email?: string;
      password?: string;
      phone?: string;
      pin?: string;
      gateId?: string;
      userId?: string;
      role?: string;
    }
  ) {
    const email = input.email?.trim().toLowerCase();
    if (!email) throw new AppError(400, 'Login email is required');
    if (!input.password?.trim()) throw new AppError(400, 'Temporary password is required');

    const duplicate = await prisma.gateOfficer.findFirst({
      where: { organizationId, email, status: 'Active' },
    });
    if (duplicate) throw new AppError(409, 'A gate officer with this login email already exists');

    const account = await provisionGateOfficerAccount(organizationId, actorId, {
      fullName: input.fullName.trim(),
      email,
      password: input.password.trim(),
      existingUserId: input.userId,
    });

    if (!account?.userId) throw new AppError(502, 'Failed to create gate officer login account');

    return prisma.gateOfficer.create({
      data: {
        organizationId,
        fullName: input.fullName.trim(),
        email,
        phone: input.phone?.trim() || undefined,
        pin: input.pin,
        gateId: input.gateId,
        userId: account.userId,
        role: input.role ?? 'Gate Officer',
        status: 'Active',
      },
      include: { gate: true },
    });
  },

  async updateOfficer(
    organizationId: string,
    id: string,
    input: Partial<{ fullName: string; email: string; phone: string; pin: string; gateId: string; status: string; role: string }>
  ) {
    const row = await prisma.gateOfficer.findFirst({ where: { id, organizationId } });
    if (!row) throw new Error('Gate officer not found');
    return prisma.gateOfficer.update({ where: { id }, data: input, include: { gate: true } });
  },

  async deleteOfficer(organizationId: string, id: string) {
    const row = await prisma.gateOfficer.findFirst({ where: { id, organizationId } });
    if (!row) throw new Error('Gate officer not found');
    await prisma.gateOfficer.delete({ where: { id } });
    return { id };
  },

  async getOfficerForUser(organizationId: string, user: { sub: string; email: string }) {
    const email = user.email?.trim().toLowerCase();
    return prisma.gateOfficer.findFirst({
      where: {
        organizationId,
        status: 'Active',
        OR: [
          { userId: user.sub },
          ...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : []),
        ],
      },
      include: { gate: true },
    });
  },

  async linkOfficerUser(organizationId: string, officerId: string, userId: string) {
    const row = await prisma.gateOfficer.findFirst({ where: { id: officerId, organizationId } });
    if (!row) throw new Error('Gate officer not found');
    return prisma.gateOfficer.update({
      where: { id: officerId },
      data: { userId },
      include: { gate: true },
    });
  },

  async dashboard(organizationId: string, gateId?: string) {
    await ensureDefaultGates(organizationId);
    const todayStart = startOfDay();
    const todayEnd = endOfDay();

    const rows = await prisma.permissionRequest.findMany({
      where: { organizationId },
      select: {
        status: true,
        departureDate: true,
        expectedReturnDate: true,
        expectedReturnTime: true,
        actualDepartureAt: true,
        actualReturnAt: true,
        updatedAt: true,
      },
    });

    const logsToday = await prisma.gateLog.count({
      where: { organizationId, createdAt: { gte: todayStart, lte: todayEnd }, ...(gateId ? { gateId } : {}) },
    });

    let studentsOutside = 0;
    let expectedBackToday = 0;
    let overdue = 0;
    let checkedOutToday = 0;
    let returnedToday = 0;
    let pendingExit = 0;

    for (const r of rows) {
      if (r.status === 'Pending') pendingExit += 1;
      if (r.actualDepartureAt && r.actualDepartureAt >= todayStart && r.actualDepartureAt <= todayEnd) {
        checkedOutToday += 1;
      }
      if (r.actualReturnAt && r.actualReturnAt >= todayStart && r.actualReturnAt <= todayEnd) {
        returnedToday += 1;
      }
      if (isCurrentlyOut(r)) studentsOutside += 1;
      const retDate = new Date(r.expectedReturnDate);
      if (retDate >= todayStart && retDate <= todayEnd && isCurrentlyOut(r)) expectedBackToday += 1;
      if (isOverdue(r)) overdue += 1;
    }

    const gate = gateId
      ? await prisma.gate.findFirst({ where: { id: gateId, organizationId } })
      : await prisma.gate.findFirst({ where: { organizationId, isDefault: true } });

    return {
      gate: gate ?? null,
      stats: {
        studentsOutside,
        expectedBackToday,
        overdue,
        checkedOutToday,
        returnedToday,
        pendingExit,
        logsToday,
      },
    };
  },

  async scan(organizationId: string, code: string) {
    const trimmed = normalizeScanInput(code);
    if (!trimmed) throw new Error('Scan code is required');

    let permission = await findPermissionByCode(organizationId, trimmed);

    if (permission && !trimmed.toUpperCase().startsWith('PR-') && !trimmed.toUpperCase().startsWith('PRC-')) {
      const active = await findActivePermissionForStudent(organizationId, permission.studentId);
      if (active) permission = active;
    }

    if (!permission && !trimmed.toUpperCase().startsWith('PR-') && !trimmed.toUpperCase().startsWith('PRC-')) {
      const students = await fetchSmStudents(organizationId, { search: trimmed }).catch(() => []);
      const student = students.find(
        (s) => s.id === trimmed || s.studentCode?.toLowerCase() === trimmed.toLowerCase()
      );
      if (student) {
        permission = await findActivePermissionForStudent(organizationId, student.id);
      }
    }

    let studentActive = true;
    if (permission) {
      const smStudent = await fetchSmStudentById(organizationId, permission.studentId).catch(() => null);
      studentActive = smStudent ? (smStudent.status ?? 'Active').toLowerCase() !== 'inactive' : true;
    }

    const exitValidation = buildExitChecks(permission, studentActive);
    const currentlyOutside = permission ? isCurrentlyOut(permission) : false;
    const overdue = permission ? isOverdue(permission) : false;

    return {
      code: trimmed,
      permission: permission
        ? {
            ...permission,
            isOverdue: overdue,
            isCurrentlyOut: currentlyOutside,
            overdueMinutes: overdue ? overdueMinutes(permission) : 0,
          }
        : null,
      exitValidation,
      suggestedAction: currentlyOutside ? 'checkin' : exitValidation.allowed ? 'checkout' : 'denied',
    };
  },

  async verifyExit(organizationId: string, permissionId: string) {
    const permission = await prisma.permissionRequest.findFirst({
      where: { id: permissionId, organizationId },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!permission) throw new Error('Permission not found');

    const smStudent = await fetchSmStudentById(organizationId, permission.studentId).catch(() => null);
    const studentActive = smStudent ? (smStudent.status ?? 'Active').toLowerCase() !== 'inactive' : true;
    return buildExitChecks(permission, studentActive);
  },

  async checkout(
    organizationId: string,
    permissionId: string,
    input: { gateId: string; method: string; officerId?: string; officerName?: string }
  ) {
    const permission = await prisma.permissionRequest.findFirst({ where: { id: permissionId, organizationId } });
    if (!permission) throw new Error('Permission not found');

    const smStudent = await fetchSmStudentById(organizationId, permission.studentId).catch(() => null);
    const studentActive = smStudent ? (smStudent.status ?? 'Active').toLowerCase() !== 'inactive' : true;
    const validation = buildExitChecks(permission, studentActive);
    if (!validation.allowed) throw new Error(validation.reason ?? 'Exit not allowed');

    const gate = await getGateOrThrow(organizationId, input.gateId);
    const now = new Date();
    const expected = parseDateTime(permission.departureDate, permission.departureTime);
    const varianceMinutes = Math.round((now.getTime() - expected.getTime()) / 60000);
    const label = varianceLabel('departure', varianceMinutes);

    await prisma.permissionRequest.update({
      where: { id: permissionId },
      data: { status: 'Out', actualDepartureAt: now },
    });

    await addPermissionEvent(organizationId, permissionId, {
      eventType: 'Student Checked Out',
      actorName: input.officerName,
      actorRole: 'Gate Officer',
      notes: `${label} via ${gate.name}`,
    });

    const log = await createGateLog({
      organizationId,
      gateId: gate.id,
      permissionId,
      studentId: permission.studentId,
      studentCode: permission.studentCode ?? undefined,
      studentName: permission.studentName,
      className: permission.className,
      eventType: 'Check-Out',
      method: input.method,
      officerId: input.officerId,
      officerName: input.officerName,
      expectedTime: formatTime12h(permission.departureTime),
      actualTime: now,
      varianceMinutes,
      varianceLabel: label,
      notes: permission.referenceNumber,
    });

    const updated = await prisma.permissionRequest.findFirst({
      where: { id: permissionId },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });

    return { permission: updated, log, varianceMinutes, varianceLabel: label };
  },

  async checkin(
    organizationId: string,
    permissionId: string,
    input: { gateId: string; method: string; officerId?: string; officerName?: string }
  ) {
    const permission = await prisma.permissionRequest.findFirst({ where: { id: permissionId, organizationId } });
    if (!permission) throw new Error('Permission not found');

    if (!isCurrentlyOut(permission)) {
      throw new Error('Student is not currently outside campus.');
    }

    const gate = await getGateOrThrow(organizationId, input.gateId);
    const now = new Date();
    const expected = parseDateTime(permission.expectedReturnDate, permission.expectedReturnTime);
    const varianceMinutes = Math.round((now.getTime() - expected.getTime()) / 60000);
    const label = varianceLabel('return', varianceMinutes);

    await prisma.permissionRequest.update({
      where: { id: permissionId },
      data: { status: 'Completed', actualReturnAt: now },
    });

    await addPermissionEvent(organizationId, permissionId, {
      eventType: 'Student Returned',
      actorName: input.officerName,
      actorRole: 'Gate Officer',
      notes: label,
    });

    const log = await createGateLog({
      organizationId,
      gateId: gate.id,
      permissionId,
      studentId: permission.studentId,
      studentCode: permission.studentCode ?? undefined,
      studentName: permission.studentName,
      className: permission.className,
      eventType: 'Check-In',
      method: input.method,
      officerId: input.officerId,
      officerName: input.officerName,
      expectedTime: formatTime12h(permission.expectedReturnTime),
      actualTime: now,
      varianceMinutes,
      varianceLabel: label,
      notes: permission.referenceNumber,
    });

    const updated = await prisma.permissionRequest.findFirst({
      where: { id: permissionId },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });

    return { permission: updated, log, varianceMinutes, varianceLabel: label };
  },

  async emergencyExit(
    organizationId: string,
    input: {
      studentId: string;
      studentName: string;
      studentCode?: string;
      className?: string;
      gateId: string;
      reason: string;
      authorizedBy: string;
      method?: string;
      officerId?: string;
      officerName?: string;
      pin?: string;
    }
  ) {
    const gate = await getGateOrThrow(organizationId, input.gateId);

    if (input.officerId && input.pin) {
      const officer = await prisma.gateOfficer.findFirst({
        where: { id: input.officerId, organizationId, status: 'Active' },
      });
      if (officer?.pin && officer.pin !== input.pin) {
        throw new Error('Invalid override PIN');
      }
    }

    const now = new Date();
    const log = await createGateLog({
      organizationId,
      gateId: gate.id,
      studentId: input.studentId,
      studentCode: input.studentCode,
      studentName: input.studentName,
      className: input.className,
      eventType: 'Emergency Exit',
      method: input.method ?? 'Emergency Override',
      officerId: input.officerId,
      officerName: input.officerName,
      actualTime: now,
      notes: input.reason,
      metadata: { authorizedBy: input.authorizedBy, reason: input.reason },
    });

    return { log, message: 'Emergency exit recorded in gate audit log.' };
  },

  async listOutside(organizationId: string) {
    const rows = await prisma.permissionRequest.findMany({
      where: { organizationId, status: { in: ['Approved', 'Out'] }, actualReturnAt: null },
      orderBy: [{ actualDepartureAt: 'desc' }, { departureDate: 'desc' }],
    });

    return rows
      .filter((r) => isCurrentlyOut(r))
      .map((r) => ({
        ...r,
        isOverdue: isOverdue(r),
        overdueMinutes: overdueMinutes(r),
        displayStatus: isOverdue(r) ? 'Overdue' : 'Outside',
      }));
  },

  async listOverdue(organizationId: string) {
    const rows = await prisma.permissionRequest.findMany({
      where: { organizationId, status: { in: ['Approved', 'Out'] }, actualReturnAt: null },
      orderBy: [{ expectedReturnDate: 'asc' }, { expectedReturnTime: 'asc' }],
    });

    const overdueRows = rows.filter((r) => isOverdue(r)).map((r) => {
      const mins = overdueMinutes(r);
      return { ...r, overdueMinutes: mins, displayStatus: 'Overdue' };
    });

    for (const row of overdueRows) {
      void notifyOverdueStudent(organizationId, row, row.overdueMinutes);
    }

    return overdueRows;
  },

  async listLogs(
    organizationId: string,
    filters?: { gateId?: string; search?: string; eventType?: string; from?: string; to?: string; limit?: number }
  ) {
    const q = filters?.search?.trim();
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;
    if (filters?.from) dateFrom = new Date(filters.from);
    if (filters?.to) {
      dateTo = new Date(filters.to);
      dateTo.setHours(23, 59, 59, 999);
    }

    return prisma.gateLog.findMany({
      where: {
        organizationId,
        ...(filters?.gateId ? { gateId: filters.gateId } : {}),
        ...(filters?.eventType ? { eventType: filters.eventType } : {}),
        ...(dateFrom ? { createdAt: { gte: dateFrom, ...(dateTo ? { lte: dateTo } : {}) } } : {}),
        ...(q
          ? {
              OR: [
                { studentName: { contains: q, mode: 'insensitive' } },
                { studentCode: { contains: q, mode: 'insensitive' } },
                { officerName: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { gate: true, officer: true },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 200,
    });
  },

  async todayPermissions(organizationId: string) {
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    return prisma.permissionRequest.findMany({
      where: { organizationId, departureDate: { gte: todayStart, lte: todayEnd } },
      orderBy: [{ status: 'asc' }, { departureTime: 'asc' }],
    });
  },

  async processOverdueNotifications(organizationId: string, officerUserId?: string) {
    const overdue = await this.listOverdue(organizationId);
    for (const row of overdue) {
      void notifyGateOfficerOverdue(officerUserId, row.studentName, row.overdueMinutes);
    }
    return { count: overdue.length };
  },
};
