import { EventEmitter } from 'node:events';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export interface DisciplineEventPayload {
  organizationId: string;
  studentCode: string;
  studentName?: string;
  eventType?: string;
  points?: number;
  description?: string;
  date?: string;
}

export interface FeeEventPayload {
  organizationId: string;
  studentCode: string;
  studentId?: string;
  studentName?: string;
  title: string;
  body: string;
  eventType: string;
  priority?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface AttendanceEventPayload {
  organizationId: string;
  studentCode?: string;
  studentId?: string;
  studentName?: string;
  title: string;
  body: string;
  eventType: string;
  priority?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

async function findStudentForEvent(organizationId: string, studentCode: string, studentId?: string, studentName?: string) {
  const codes = [...new Set([studentCode, studentId].map((v) => String(v ?? '').trim()).filter(Boolean))];
  if (codes.length) {
    const exact = await prisma.student.findFirst({
      where: {
        organizationId,
        OR: [{ shuleCode: { in: codes } }, { id: { in: codes } }],
      },
    });
    if (exact) return exact;
  }

  const name = String(studentName ?? '').trim();
  if (!name) return null;
  const parts = name.split(/\s+/).filter(Boolean);
  return prisma.student.findFirst({
    where: {
      organizationId,
      AND: [
        { firstName: { contains: parts[0], mode: 'insensitive' as const } },
        ...(parts.length > 1
          ? [{ lastName: { contains: parts.slice(1).join(' '), mode: 'insensitive' as const } }]
          : []),
      ],
    },
  });
}

export type NotificationPayload = {
  id: string;
  title: string;
  body: string;
  type: string;
  sourceModule: string;
  priority: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  studentCode: string | null;
  studentName?: string;
};

class NotificationHub extends EventEmitter {
  private clients = new Map<string, Set<(payload: NotificationPayload) => void>>();

  subscribe(parentId: string, listener: (payload: NotificationPayload) => void): () => void {
    if (!this.clients.has(parentId)) this.clients.set(parentId, new Set());
    this.clients.get(parentId)!.add(listener);
    return () => {
      this.clients.get(parentId)?.delete(listener);
    };
  }

  dispatch(parentId: string, payload: NotificationPayload) {
    this.clients.get(parentId)?.forEach((listener) => listener(payload));
    this.emit(parentId, payload);
  }
}

export const notificationHub = new NotificationHub();

function serializeNotification(
  n: {
    id: string;
    title: string;
    body: string;
    type: string;
    sourceModule: string;
    priority: string;
    link: string | null;
    isRead: boolean;
    createdAt: Date;
    studentCode: string | null;
  },
  studentName?: string
): NotificationPayload {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    sourceModule: n.sourceModule,
    priority: n.priority,
    link: n.link,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
    studentCode: n.studentCode,
    studentName,
  };
}

class NotificationService {
  async ingestDisciplineEvent(event: DisciplineEventPayload) {
    const student = await prisma.student.findFirst({
      where: {
        organizationId: event.organizationId,
        OR: [
          { shuleCode: event.studentCode },
          { id: event.studentCode },
        ],
      },
    });

    if (!student) {
      return { matched: 0, studentCode: event.studentCode, reason: 'student-not-found' };
    }

    const links = await prisma.parentStudentLink.findMany({
      where: { studentId: student.id },
      include: { parent: true },
    });

    if (links.length === 0) {
      return { matched: 0, studentCode: student.shuleCode, reason: 'no-parents-linked' };
    }

    const eventType = event.eventType || 'RECORD';
    const title =
      eventType === 'MERIT'
        ? `Merit recorded for ${event.studentName ?? student.firstName}`
        : eventType === 'ALERT'
          ? `Alert for ${event.studentName ?? student.firstName}`
          : `Discipline update for ${event.studentName ?? student.firstName}`;
    const points = event.points ?? 0;
    const body =
      event.description?.trim() ||
      `${eventType} recorded${points ? ` (${points} ${points > 0 ? 'points' : 'points'})` : ''} on ${event.studentName ?? student.shuleCode}.`;
    const priority =
      points < 0 || eventType === 'ALERT' ? 'URGENT' : eventType === 'MERIT' ? 'NORMAL' : 'IMPORTANT';

    const created: NotificationPayload[] = [];
    for (const { parent } of links) {
      const notification = await prisma.notification.create({
        data: {
          organizationId: event.organizationId,
          parentId: parent.id,
          studentId: student.id,
          studentCode: student.shuleCode,
          title,
          body,
          type: 'DISCIPLINE',
          sourceModule: 'student-discipline',
          priority,
          link: `/discipline?student=${student.id}`,
        },
      });

      await prisma.activityLog.create({
        data: {
          organizationId: event.organizationId,
          userId: parent.id,
          action: 'DISCIPLINE_NOTIFIED',
          description: `${parent.firstName} ${parent.lastName} notified about a discipline event for ${student.firstName} ${student.lastName}`,
        },
      });

      const payload = serializeNotification(notification, `${student.firstName} ${student.lastName}`);
      created.push(payload);
      notificationHub.dispatch(parent.id, payload);
    }

    return { matched: links.length, studentCode: student.shuleCode };
  }

  async ingestFeeEvent(event: FeeEventPayload) {
    const student = await findStudentForEvent(
      event.organizationId,
      event.studentCode,
      event.studentId,
      event.studentName
    );

    if (!student) {
      return { matched: 0, studentCode: event.studentCode, reason: 'student-not-found' };
    }

    const links = await prisma.parentStudentLink.findMany({
      where: { studentId: student.id },
      include: { parent: true },
    });

    if (links.length === 0) {
      return { matched: 0, studentCode: student.shuleCode, reason: 'no-parents-linked' };
    }

    const priority = event.priority ?? 'NORMAL';
    const created: NotificationPayload[] = [];

    for (const { parent } of links) {
      const prefs = await this.getPreferences(event.organizationId, parent.id);
      const category =
        event.eventType.startsWith('RECEIPT') || event.eventType.startsWith('PAYMENT')
          ? (prefs.receiptNotifications as Record<string, boolean>)
          : event.eventType.startsWith('SCHOLARSHIP')
            ? (prefs.scholarshipNotifications as Record<string, boolean>)
            : (prefs.paymentReminders as Record<string, boolean>);

      if (category.inApp === false) continue;

      if (event.eventType === 'PAYMENT_SUCCESSFUL' && event.metadata) {
        const amount = Number(event.metadata.amount ?? 0);
        await prisma.feePayment.create({
          data: {
            organizationId: event.organizationId,
            studentId: student.id,
            date: event.metadata.paidAt ? new Date(String(event.metadata.paidAt)) : new Date(),
            description: String(event.metadata.paymentType ?? 'School Fees'),
            amount: Number.isFinite(amount) ? amount : 0,
            method: String(event.metadata.method ?? 'Cash'),
            reference: String(event.metadata.transactionId ?? event.metadata.receiptNumber ?? ''),
            receiptUrl: event.metadata.receiptUrl ? String(event.metadata.receiptUrl) : null,
          },
        }).catch(() => undefined);
      }

      const notification = await prisma.notification.create({
        data: {
          organizationId: event.organizationId,
          parentId: parent.id,
          studentId: student.id,
          studentCode: student.shuleCode,
          title: event.title,
          body: event.body,
          type: 'FEE',
          sourceModule: 'school-fees',
          priority,
          link: event.link ?? '/fees',
        },
      });

      const payload = serializeNotification(notification, `${student.firstName} ${student.lastName}`);
      created.push(payload);
      notificationHub.dispatch(parent.id, payload);
    }

    return { matched: created.length, studentCode: student.shuleCode };
  }

  async ingestAttendanceEvent(event: AttendanceEventPayload) {
    const student = await findStudentForEvent(
      event.organizationId,
      event.studentCode ?? '',
      event.studentId,
      event.studentName
    );

    if (!student) {
      return { matched: 0, studentCode: event.studentCode, reason: 'student-not-found' };
    }

    const links = await prisma.parentStudentLink.findMany({
      where: { studentId: student.id },
      include: { parent: true },
    });

    if (links.length === 0) {
      return { matched: 0, studentCode: student.shuleCode, reason: 'no-parents-linked' };
    }

    const meta = event.metadata ?? {};
    const tapAt = meta.at ? new Date(String(meta.at)) : new Date();
    const day = new Date(Date.UTC(tapAt.getFullYear(), tapAt.getMonth(), tapAt.getDate()));
    const rawStatus = String(meta.status ?? '').toUpperCase();
    const status =
      event.eventType === 'ABSENT'
        ? 'ABSENT'
        : rawStatus === 'LATE'
          ? 'LATE'
          : rawStatus === 'EXCUSED'
            ? 'EXCUSED'
            : 'PRESENT';
    const hm = `${String(tapAt.getHours()).padStart(2, '0')}:${String(tapAt.getMinutes()).padStart(2, '0')}`;
    const notes = [
      event.eventType === 'RFID_EXIT' ? 'RFID check-out' : event.eventType === 'ABSENT' ? 'Marked absent' : 'RFID check-in',
      meta.gateName ? String(meta.gateName) : null,
      meta.cardNumber ? `Card ${meta.cardNumber}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    await prisma.attendanceRecord
      .upsert({
        where: { studentId_date: { studentId: student.id, date: day } },
        update: {
          status,
          notes,
          ...(event.eventType === 'RFID_EXIT' ? { checkOutTime: hm } : { checkInTime: hm }),
        },
        create: {
          organizationId: event.organizationId,
          studentId: student.id,
          date: day,
          status,
          notes,
          checkInTime: event.eventType === 'RFID_EXIT' ? null : hm,
          checkOutTime: event.eventType === 'RFID_EXIT' ? hm : null,
        },
      })
      .catch(() => undefined);

    const priority = event.priority ?? (event.eventType === 'ABSENT' ? 'IMPORTANT' : 'NORMAL');
    const created: NotificationPayload[] = [];

    for (const { parent } of links) {
      const notification = await prisma.notification.create({
        data: {
          organizationId: event.organizationId,
          parentId: parent.id,
          studentId: student.id,
          studentCode: student.shuleCode,
          title: event.title,
          body: event.body,
          type: 'ATTENDANCE',
          sourceModule: 'attendance',
          priority,
          link: event.link ?? '/attendance',
        },
      });

      const payload = serializeNotification(notification, `${student.firstName} ${student.lastName}`);
      created.push(payload);
      notificationHub.dispatch(parent.id, payload);
    }

    return { matched: created.length, studentCode: student.shuleCode };
  }

  async ingestExamEvent(event: FeeEventPayload) {
    const student = await findStudentForEvent(
      event.organizationId,
      event.studentCode,
      event.studentId,
      event.studentName
    );

    if (!student) {
      return { matched: 0, studentCode: event.studentCode, reason: 'student-not-found' };
    }

    const links = await prisma.parentStudentLink.findMany({
      where: { studentId: student.id },
      include: { parent: true },
    });

    if (links.length === 0) {
      return { matched: 0, studentCode: student.shuleCode, reason: 'no-parents-linked' };
    }

    const priority = event.priority ?? 'IMPORTANT';
    const created: NotificationPayload[] = [];

    for (const { parent } of links) {
      const notification = await prisma.notification.create({
        data: {
          organizationId: event.organizationId,
          parentId: parent.id,
          studentId: student.id,
          studentCode: student.shuleCode,
          title: event.title,
          body: event.body,
          type: 'EXAM',
          sourceModule: 'school-fees',
          priority,
          link: event.link ?? '/exams',
        },
      });

      const payload = serializeNotification(notification, `${student.firstName} ${student.lastName}`);
      created.push(payload);
      notificationHub.dispatch(parent.id, payload);
    }

    return { matched: created.length, studentCode: student.shuleCode };
  }

  async getPreferences(organizationId: string, parentId: string) {
    const row = await prisma.parentCommunicationPreference.findUnique({ where: { parentId } });
    if (row) return row;
    return {
      paymentReminders: { sms: true, email: true, push: true, inApp: true },
      receiptNotifications: { sms: false, email: true, push: true, inApp: true },
      scholarshipNotifications: { sms: false, email: true, push: true, inApp: true },
      pushEnabled: true,
      webPushToken: null as string | null,
    };
  }

  async updatePreferences(
    organizationId: string,
    parentId: string,
    body: Record<string, unknown>
  ) {
    return prisma.parentCommunicationPreference.upsert({
      where: { parentId },
      create: {
        organizationId,
        parentId,
        paymentReminders: (body.paymentReminders as object) ?? { sms: true, email: true, push: true, inApp: true },
        receiptNotifications:
          (body.receiptNotifications as object) ?? { sms: false, email: true, push: true, inApp: true },
        scholarshipNotifications:
          (body.scholarshipNotifications as object) ?? { sms: false, email: true, push: true, inApp: true },
        pushEnabled: body.pushEnabled !== false,
        webPushToken: body.webPushToken ? String(body.webPushToken) : null,
      },
      update: {
        paymentReminders: body.paymentReminders != null ? (body.paymentReminders as object) : undefined,
        receiptNotifications:
          body.receiptNotifications != null ? (body.receiptNotifications as object) : undefined,
        scholarshipNotifications:
          body.scholarshipNotifications != null ? (body.scholarshipNotifications as object) : undefined,
        pushEnabled: body.pushEnabled != null ? Boolean(body.pushEnabled) : undefined,
        webPushToken: body.webPushToken !== undefined ? (body.webPushToken ? String(body.webPushToken) : null) : undefined,
      },
    });
  }

  async listForParent(organizationId: string, parentId: string) {
    const linked = await prisma.parentStudentLink.findMany({
      where: { parentId, student: { organizationId } },
      include: { student: true },
    });

    const notifications = await prisma.notification.findMany({
      where: { parentId, organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const nameByStudent = new Map(
      linked.map((l) => [l.studentId, `${l.student.firstName} ${l.student.lastName}`])
    );

    const unread = notifications.filter((n) => !n.isRead).length;

    return {
      unread,
      total: notifications.length,
      items: notifications.map((n) =>
        serializeNotification(n, nameByStudent.get(n.studentId))
      ),
    };
  }

  async markRead(organizationId: string, parentId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, parentId, organizationId },
    });
    if (!notification) throw new AppError(404, 'Notification not found');
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllRead(organizationId: string, parentId: string) {
    await prisma.notification.updateMany({
      where: { parentId, organizationId, isRead: false },
      data: { isRead: true },
    });
    return { ok: true };
  }

  async unreadCount(organizationId: string, parentId: string) {
    return prisma.notification.count({
      where: { parentId, organizationId, isRead: false },
    });
  }
}

export const notificationService = new NotificationService();
