import { prisma } from '../config/database';
import { resolveParentContext } from './parent-context.service';
import type { StudentSelector } from '../utils/student-param';

export class CommunicationService {
  async getInbox(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId);
    const [messages, teacherContacts, announcements] = await Promise.all([
      prisma.message.findMany({
        where: {
          organizationId,
          OR: [{ parentId }, { studentId }],
        },
        orderBy: { date: 'desc' },
      }),
      prisma.teacherContact.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' },
      }),
      prisma.announcement.findMany({
        where: { organizationId },
        orderBy: { date: 'desc' },
        take: 10,
      }),
    ]);

    return {
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        date: a.date.toISOString(),
        priority: a.priority,
        author: a.author ?? 'School Administration',
      })),
      messages: messages.map((m) => ({
        id: m.id,
        from: m.fromName,
        fromRole: m.fromRole,
        subject: m.subject,
        body: m.body,
        date: m.date.toISOString(),
        isRead: m.isRead,
        attachments: m.attachments,
        direction: m.direction,
      })),
      teacherContacts: teacherContacts.map((t) => ({
        id: t.id,
        name: t.name,
        subject: t.subject ?? '',
        role: t.role ?? 'Teacher',
        phone: t.phone ?? '',
        email: t.email ?? '',
      })),
    };
  }

  async sendMessage(
    organizationId: string,
    parentId: string,
    input: { subject: string; body: string; to?: string },
    requestedStudentId?: StudentSelector
  ) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId);
    const parent = await prisma.parentAccount.findUnique({ where: { id: parentId } });
    const student = await prisma.student.findUnique({ where: { id: studentId } });

    const message = await prisma.message.create({
      data: {
        organizationId,
        parentId,
        studentId,
        fromName: parent ? `${parent.firstName} ${parent.lastName}` : 'Parent',
        fromRole: 'Parent',
        subject: input.subject,
        body: input.body,
        date: new Date(),
        direction: 'OUTBOUND',
      },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId: parentId,
        action: 'MESSAGE_SENT',
        description: `Message "${input.subject}" sent to the school${student ? ` for ${student.firstName} ${student.lastName}` : ''}`,
      },
    });

    return {
      id: message.id,
      from: message.fromName,
      fromRole: message.fromRole,
      subject: message.subject,
      body: message.body,
      date: message.date.toISOString(),
      isRead: message.isRead,
      attachments: message.attachments,
      direction: message.direction,
    };
  }

  async markRead(organizationId: string, parentId: string, messageId: string, requestedStudentId?: StudentSelector) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId);
    return prisma.message.updateMany({
      where: {
        id: messageId,
        organizationId,
        OR: [{ parentId }, { studentId }],
      },
      data: { isRead: true },
    });
  }
}

export const communicationService = new CommunicationService();
