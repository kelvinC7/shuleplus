import { randomBytes } from 'crypto';
import { prisma } from '../config/database';

function nextRef(existing: string[]) {
  const year = new Date().getFullYear();
  const prefix = `PR-${year}-`;
  const nums = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

async function nextScanCode(organizationId: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `PRC-${randomBytes(4).toString('hex').toUpperCase()}`;
    const exists = await prisma.permissionRequest.findFirst({
      where: { scanCode: code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  return `PRC-${randomBytes(6).toString('hex').toUpperCase()}`;
}

function parseDateTime(date: Date, time: string) {
  const [h, m] = time.split(':').map((x) => parseInt(x, 10));
  const d = new Date(date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function durationMinutes(depDate: Date, depTime: string, retDate: Date, retTime: string) {
  const start = parseDateTime(depDate, depTime);
  const end = parseDateTime(retDate, retTime);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
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

function isCurrentlyOut(row: {
  status: string;
  actualReturnAt: Date | null;
  actualDepartureAt: Date | null;
}) {
  if (row.actualReturnAt) return false;
  return row.status === 'Out' || (row.status === 'Approved' && Boolean(row.actualDepartureAt));
}

async function addEvent(
  organizationId: string,
  permissionId: string,
  event: { eventType: string; actorName?: string; actorRole?: string; notes?: string }
) {
  return prisma.permissionEvent.create({
    data: { organizationId, permissionId, ...event },
  });
}

export const permissionService = {
  async list(
    organizationId: string,
    filters?: {
      search?: string;
      academicYear?: string;
      term?: string;
      className?: string;
      permissionType?: string;
      status?: string;
      dateFilter?: string;
      from?: string;
      to?: string;
    }
  ) {
    const q = filters?.search?.trim();
    const now = new Date();
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;

    if (filters?.dateFilter === 'today') {
      dateFrom = startOfDay(now);
      dateTo = endOfDay(now);
    } else if (filters?.dateFilter === 'week') {
      dateFrom = new Date(now);
      dateFrom.setDate(now.getDate() - 7);
      dateTo = endOfDay(now);
    } else if (filters?.dateFilter === 'month') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      dateTo = endOfDay(now);
    } else if (filters?.from) {
      dateFrom = new Date(filters.from);
      dateTo = filters.to ? new Date(filters.to) : endOfDay(now);
    }

    const rows = await prisma.permissionRequest.findMany({
      where: {
        organizationId,
        ...(filters?.academicYear ? { academicYear: filters.academicYear } : {}),
        ...(filters?.term ? { term: filters.term } : {}),
        ...(filters?.className ? { className: { equals: filters.className, mode: 'insensitive' } } : {}),
        ...(filters?.permissionType ? { permissionType: filters.permissionType } : {}),
        ...(filters?.status === 'Overdue'
          ? { status: { in: ['Approved', 'Out'] }, actualReturnAt: null }
          : filters?.status
            ? { status: filters.status }
            : {}),
        ...(dateFrom ? { departureDate: { gte: dateFrom, lte: dateTo } } : {}),
        ...(q
          ? {
              OR: [
                { studentName: { contains: q, mode: 'insensitive' } },
                { studentCode: { contains: q, mode: 'insensitive' } },
                { referenceNumber: { contains: q, mode: 'insensitive' } },
                { scanCode: { equals: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { events: { orderBy: { createdAt: 'asc' } } },
      orderBy: [{ departureDate: 'desc' }, { createdAt: 'desc' }],
    });

    const enriched = rows.map((r) => ({
      ...r,
      isOverdue: isOverdue(r),
      isCurrentlyOut: isCurrentlyOut(r),
    }));

    if (filters?.status === 'Overdue') return enriched.filter((r) => r.isOverdue);
    return enriched;
  },

  /** Service-to-service lookup used by ParentMIS (filter strictly by student). */
  async serviceList(
    organizationId: string,
    filters?: { studentCode?: string; studentId?: string; status?: string }
  ) {
    const code = filters?.studentCode?.trim();
    const studentId = filters?.studentId?.trim();
    if (!code && !studentId) return [];

    const rows = await prisma.permissionRequest.findMany({
      where: {
        organizationId,
        ...(code && studentId
          ? { OR: [{ studentCode: code }, { studentId }] }
          : code
            ? { studentCode: code }
            : { studentId }),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: { events: { orderBy: { createdAt: 'asc' } } },
      orderBy: [{ departureDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((r) => ({
      ...r,
      isOverdue: isOverdue(r),
      isCurrentlyOut: isCurrentlyOut(r),
    }));
  },

  async stats(organizationId: string) {
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const rows = await prisma.permissionRequest.findMany({
      where: { organizationId },
      select: {
        status: true,
        expectedReturnDate: true,
        expectedReturnTime: true,
        actualDepartureAt: true,
        actualReturnAt: true,
        updatedAt: true,
      },
    });

    let pendingApproval = 0;
    let approvedToday = 0;
    let currentlyOut = 0;
    let returned = 0;
    let overdue = 0;

    for (const r of rows) {
      if (r.status === 'Pending') pendingApproval += 1;
      if (r.status === 'Approved' && r.updatedAt >= todayStart && r.updatedAt <= todayEnd) approvedToday += 1;
      if (r.actualReturnAt) returned += 1;
      if (isCurrentlyOut(r)) currentlyOut += 1;
      if (isOverdue(r)) overdue += 1;
    }

    return { total: rows.length, pendingApproval, approvedToday, currentlyOut, returned, overdue };
  },

  async getById(organizationId: string, id: string) {
    const row = await prisma.permissionRequest.findFirst({
      where: { id, organizationId },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
    if (!row) throw new Error('Permission request not found');
    return { ...row, isOverdue: isOverdue(row), isCurrentlyOut: isCurrentlyOut(row) };
  },

  async create(
    organizationId: string,
    userId: string,
    input: {
      studentId: string;
      studentCode?: string;
      studentName: string;
      className: string;
      classId?: string;
      academicYear?: string;
      term?: string;
      permissionType: string;
      customType?: string;
      reason: string;
      destination: string;
      destinationAddress?: string;
      departureDate: string;
      departureTime: string;
      expectedReturnDate: string;
      expectedReturnTime: string;
      leavingWith: string;
      guardianName?: string;
      guardianRelationship?: string;
      guardianPhone?: string;
      authorizedPersonName?: string;
      authorizedPersonRelationship?: string;
      authorizedPersonPhone?: string;
      authorizedPersonId?: string;
      requestedBy: string;
      requestedByName?: string;
      approvalChain?: string[];
    }
  ) {
    const existing = await prisma.permissionRequest.findMany({
      where: { organizationId },
      select: { referenceNumber: true },
    });
    const referenceNumber = nextRef(existing.map((e) => e.referenceNumber));
    const scanCode = await nextScanCode(organizationId);
    const depDate = new Date(input.departureDate);
    const retDate = new Date(input.expectedReturnDate);

    const row = await prisma.permissionRequest.create({
      data: {
        organizationId,
        referenceNumber,
        scanCode,
        createdBy: userId,
        studentId: input.studentId,
        studentCode: input.studentCode,
        studentName: input.studentName,
        className: input.className,
        classId: input.classId,
        academicYear: input.academicYear,
        term: input.term,
        permissionType: input.permissionType,
        customType: input.customType,
        reason: input.reason,
        destination: input.destination.trim(),
        destinationAddress: input.destinationAddress?.trim() || null,
        departureDate: depDate,
        departureTime: input.departureTime,
        expectedReturnDate: retDate,
        expectedReturnTime: input.expectedReturnTime,
        durationMinutes: durationMinutes(depDate, input.departureTime, retDate, input.expectedReturnTime),
        leavingWith: input.leavingWith,
        guardianName: input.guardianName,
        guardianRelationship: input.guardianRelationship,
        guardianPhone: input.guardianPhone,
        authorizedPersonName: input.authorizedPersonName,
        authorizedPersonRelationship: input.authorizedPersonRelationship,
        authorizedPersonPhone: input.authorizedPersonPhone,
        authorizedPersonId: input.authorizedPersonId,
        requestedBy: input.requestedBy,
        requestedByName: input.requestedByName,
        approvalChain: input.approvalChain ?? [],
        status: 'Pending',
      },
    });

    await addEvent(organizationId, row.id, {
      eventType: 'Permission Requested',
      actorName: input.requestedByName ?? input.requestedBy,
      actorRole: input.requestedBy,
      notes: input.reason,
    });

    return this.getById(organizationId, row.id);
  },

  async updateStatus(
    organizationId: string,
    id: string,
    action: 'approve' | 'reject' | 'cancel' | 'checkout' | 'return',
    actor: { name?: string; role?: string; notes?: string }
  ) {
    const row = await prisma.permissionRequest.findFirst({ where: { id, organizationId } });
    if (!row) throw new Error('Permission request not found');

    const statusMap = {
      approve: 'Approved',
      reject: 'Rejected',
      cancel: 'Cancelled',
      checkout: 'Out',
      return: 'Completed',
    } as const;

    const eventMap = {
      approve: 'Approved',
      reject: 'Rejected',
      cancel: 'Cancelled',
      checkout: 'Student Checked Out',
      return: 'Student Returned',
    } as const;

    const data: Record<string, unknown> = { status: statusMap[action] };
    if (action === 'checkout') data.actualDepartureAt = new Date();
    if (action === 'return') data.actualReturnAt = new Date();

    await prisma.permissionRequest.update({ where: { id }, data });
    await addEvent(organizationId, id, {
      eventType: eventMap[action],
      actorName: actor.name,
      actorRole: actor.role,
      notes: actor.notes,
    });

    return this.getById(organizationId, id);
  },
};
