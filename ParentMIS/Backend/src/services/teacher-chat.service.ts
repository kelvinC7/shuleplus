import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { resolveActiveStudent, resolveParentContext } from './parent-context.service';
import { timetableApi } from './timetable-api';
import type { StudentSelector } from '../utils/student-param';
import { emitTeacherChatMessage } from '../realtime/teacher-chat.socket';

export class TeacherChatService {
  async listTeachersForChild(
    organizationId: string,
    parentId: string,
    requested?: StudentSelector
  ) {
    const student = await resolveActiveStudent(organizationId, parentId, requested);
    const className = (student.className ?? '').trim();
    if (!className) {
      return { className: '', teachers: [] as Array<Record<string, unknown>> };
    }

    try {
      const live = await timetableApi.listClassTeachers({
        organizationId: student.organizationId || organizationId,
        className,
      });
      return {
        className: live.className || className,
        term: live.term,
        academicYear: live.academicYear,
        teachers: live.teachers,
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`.trim(),
          shuleCode: student.shuleCode,
          className,
        },
      };
    } catch (err) {
      console.warn(
        '[teacher-chat] Timetable class teachers unavailable:',
        err instanceof Error ? err.message : err
      );
      const contacts = await prisma.teacherContact.findMany({
        where: { organizationId: student.organizationId || organizationId },
        orderBy: { name: 'asc' },
      });
      return {
        className,
        teachers: contacts.map((t) => ({
          teacherUserId: t.id,
          teacherName: t.name,
          subjects: t.subject ? [t.subject] : [],
          phone: t.phone,
          email: t.email,
        })),
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`.trim(),
          shuleCode: student.shuleCode,
          className,
        },
        warning: 'Showing school teacher directory (live class assignments unavailable).',
      };
    }
  }

  async listThreads(organizationId: string, parentId: string, requested?: StudentSelector) {
    const { studentId } = await resolveParentContext(organizationId, parentId, requested);
    const threads = await prisma.teacherChatThread.findMany({
      where: { parentId, studentId },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
    return threads.map((t) => ({
      id: t.id,
      teacherUserId: t.teacherUserId,
      teacherName: t.teacherName,
      teacherPhone: t.teacherPhone,
      teacherEmail: t.teacherEmail,
      subjects: t.subjects,
      className: t.className,
      studentName: t.studentName,
      lastMessageAt: t.lastMessageAt.toISOString(),
      lastMessage: t.messages[0]
        ? {
            body: t.messages[0].body,
            senderRole: t.messages[0].senderRole,
            createdAt: t.messages[0].createdAt.toISOString(),
          }
        : null,
    }));
  }

  async openOrCreateThread(
    organizationId: string,
    parentId: string,
    input: {
      teacherUserId: string;
      teacherName: string;
      teacherPhone?: string | null;
      teacherEmail?: string | null;
      subjects?: string[];
    },
    requested?: StudentSelector
  ) {
    const student = await resolveActiveStudent(organizationId, parentId, requested);
    const orgId = student.organizationId || organizationId;
    const studentName = `${student.firstName} ${student.lastName}`.trim();

    const thread = await prisma.teacherChatThread.upsert({
      where: {
        organizationId_parentId_studentId_teacherUserId: {
          organizationId: orgId,
          parentId,
          studentId: student.id,
          teacherUserId: input.teacherUserId,
        },
      },
      update: {
        teacherName: input.teacherName,
        teacherPhone: input.teacherPhone ?? undefined,
        teacherEmail: input.teacherEmail ?? undefined,
        subjects: input.subjects ?? [],
        className: student.className,
        studentName,
      },
      create: {
        organizationId: orgId,
        parentId,
        studentId: student.id,
        studentName,
        className: student.className,
        teacherUserId: input.teacherUserId,
        teacherName: input.teacherName,
        teacherPhone: input.teacherPhone,
        teacherEmail: input.teacherEmail,
        subjects: input.subjects ?? [],
      },
    });

    return this.getThread(orgId, parentId, thread.id, 'PARENT');
  }

  async getThread(
    organizationId: string,
    parentId: string | null,
    threadId: string,
    viewer: 'PARENT' | 'TEACHER'
  ) {
    const thread = await prisma.teacherChatThread.findFirst({
      where: {
        id: threadId,
        ...(parentId ? { parentId } : {}),
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!thread) throw new AppError(404, 'Conversation not found');

    if (viewer === 'PARENT') {
      await prisma.teacherChatMessage.updateMany({
        where: { threadId, senderRole: 'TEACHER', isRead: false },
        data: { isRead: true },
      });
    } else {
      await prisma.teacherChatMessage.updateMany({
        where: { threadId, senderRole: 'PARENT', isRead: false },
        data: { isRead: true },
      });
    }

    return {
      id: thread.id,
      teacherUserId: thread.teacherUserId,
      teacherName: thread.teacherName,
      teacherPhone: thread.teacherPhone,
      teacherEmail: thread.teacherEmail,
      subjects: thread.subjects,
      className: thread.className,
      studentId: thread.studentId,
      studentName: thread.studentName,
      messages: thread.messages.map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        senderName: m.senderName,
        body: m.body,
        isRead: m.isRead,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async sendFromParent(
    organizationId: string,
    parentId: string,
    threadId: string,
    body: string,
    parentName: string
  ) {
    const text = body.trim();
    if (!text) throw new AppError(400, 'Message body is required');
    const thread = await prisma.teacherChatThread.findFirst({
      where: { id: threadId, parentId, organizationId },
    });
    if (!thread) throw new AppError(404, 'Conversation not found');

    const message = await prisma.teacherChatMessage.create({
      data: {
        threadId,
        senderRole: 'PARENT',
        senderName: parentName || 'Parent',
        body: text,
      },
    });
    await prisma.teacherChatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: message.createdAt },
    });
    const payload = {
      id: message.id,
      senderRole: message.senderRole,
      senderName: message.senderName,
      body: message.body,
      isRead: message.isRead,
      createdAt: message.createdAt.toISOString(),
    };
    emitTeacherChatMessage(threadId, payload);
    return payload;
  }

  async listContactsForTeacher(organizationId: string, className?: string) {
    const classFilter = className?.trim();
    const students = await prisma.student.findMany({
      where: {
        organizationId,
        ...(classFilter
          ? { className: { contains: classFilter, mode: 'insensitive' } }
          : {}),
      },
      include: {
        parents: {
          include: {
            parent: {
              select: { id: true, firstName: true, lastName: true, phone: true, email: true },
            },
          },
        },
      },
      orderBy: [{ className: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      take: 500,
    });

    return students.map((s) => ({
      id: s.id,
      fullName: `${s.firstName} ${s.lastName}`.trim(),
      className: s.className,
      shuleCode: s.shuleCode,
      parents: s.parents.map((link) => ({
        id: link.parent.id,
        fullName: `${link.parent.firstName} ${link.parent.lastName}`.trim(),
        phone: link.parent.phone,
        email: link.parent.email,
        relationship: link.relationship,
        isPrimary: link.isPrimary,
      })),
    }));
  }

  async openThreadForTeacher(
    organizationId: string,
    teacherUserId: string,
    input: {
      studentId: string;
      parentId: string;
      teacherName: string;
      teacherPhone?: string | null;
      teacherEmail?: string | null;
      subjects?: string[];
    }
  ) {
    const student = await prisma.student.findFirst({
      where: { id: input.studentId, organizationId },
    });
    if (!student) throw new AppError(404, 'Student not found');

    const link = await prisma.parentStudentLink.findFirst({
      where: { studentId: student.id, parentId: input.parentId },
    });
    if (!link) throw new AppError(404, 'Parent is not linked to this student');

    const studentName = `${student.firstName} ${student.lastName}`.trim();
    const thread = await prisma.teacherChatThread.upsert({
      where: {
        organizationId_parentId_studentId_teacherUserId: {
          organizationId,
          parentId: input.parentId,
          studentId: student.id,
          teacherUserId,
        },
      },
      update: {
        teacherName: input.teacherName,
        teacherPhone: input.teacherPhone ?? undefined,
        teacherEmail: input.teacherEmail ?? undefined,
        subjects: input.subjects ?? [],
        className: student.className,
        studentName,
      },
      create: {
        organizationId,
        parentId: input.parentId,
        studentId: student.id,
        studentName,
        className: student.className,
        teacherUserId,
        teacherName: input.teacherName,
        teacherPhone: input.teacherPhone,
        teacherEmail: input.teacherEmail,
        subjects: input.subjects ?? [],
      },
    });

    return this.getThread(organizationId, null, thread.id, 'TEACHER');
  }

  private teacherIdFilter(teacherUserId: string, extraIds?: string[]) {
    const ids = [...new Set([teacherUserId, ...(extraIds ?? [])].filter(Boolean))];
    return ids.length <= 1 ? { teacherUserId: ids[0] } : { teacherUserId: { in: ids } };
  }

  /** Match threads for logged-in teacher (IAM id, timetable id, or email on thread). */
  private teacherInboxWhere(
    organizationId: string,
    teacherUserId: string,
    alternateTeacherUserIds: string[] = [],
    teacherEmail?: string | null,
    teacherName?: string | null
  ) {
    const identityOr: Array<Record<string, unknown>> = [this.teacherIdFilter(teacherUserId, alternateTeacherUserIds)];

    const email = teacherEmail?.trim();
    if (email) {
      identityOr.push({ teacherEmail: { equals: email, mode: 'insensitive' } });
    }

    const name = teacherName?.trim();
    if (name && name.length >= 4) {
      identityOr.push({ teacherName: { equals: name, mode: 'insensitive' } });
    }

    const orgScoped = {
      AND: [{ organizationId }, { OR: identityOr }],
    };

    // Parent threads often use the student org id; JWT org can differ in dev — email is IAM-verified.
    if (email) {
      return { OR: [orgScoped, { teacherEmail: { equals: email, mode: 'insensitive' } }] };
    }

    return orgScoped;
  }

  findThreadForTeacher(
    threadId: string,
    organizationId: string,
    teacherUserId: string,
    alternateTeacherUserIds: string[] = [],
    teacherEmail?: string | null,
    teacherName?: string | null
  ) {
    return prisma.teacherChatThread.findFirst({
      where: {
        id: threadId,
        ...this.teacherInboxWhere(
          organizationId,
          teacherUserId,
          alternateTeacherUserIds,
          teacherEmail,
          teacherName
        ),
      },
    });
  }

  /** Service-auth: teacher inbox */
  async listThreadsForTeacher(
    organizationId: string,
    teacherUserId: string,
    alternateTeacherUserIds: string[] = [],
    teacherEmail?: string | null,
    teacherName?: string | null
  ) {
    const inboxWhere = this.teacherInboxWhere(
      organizationId,
      teacherUserId,
      alternateTeacherUserIds,
      teacherEmail,
      teacherName
    );

    const threads = await prisma.teacherChatThread.findMany({
      where: inboxWhere,
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
    const unreadCounts = await prisma.teacherChatMessage.groupBy({
      by: ['threadId'],
      where: {
        senderRole: 'PARENT',
        isRead: false,
        thread: inboxWhere,
      },
      _count: { _all: true },
    });
    const unreadByThread = new Map(unreadCounts.map((r) => [r.threadId, r._count._all]));
    return threads.map((t) => ({
      id: t.id,
      studentId: t.studentId,
      studentName: t.studentName,
      className: t.className,
      parentId: t.parentId,
      lastMessageAt: t.lastMessageAt.toISOString(),
      unreadFromParent: unreadByThread.get(t.id) ?? 0,
      lastMessage: t.messages[0]
        ? {
            body: t.messages[0].body,
            senderRole: t.messages[0].senderRole,
            createdAt: t.messages[0].createdAt.toISOString(),
          }
        : null,
    }));
  }

  async sendFromTeacher(
    organizationId: string,
    teacherUserId: string,
    threadId: string,
    body: string,
    teacherName: string,
    alternateTeacherUserIds: string[] = [],
    teacherEmail?: string | null
  ) {
    const text = body.trim();
    if (!text) throw new AppError(400, 'Message body is required');
    const thread = await this.findThreadForTeacher(
      threadId,
      organizationId,
      teacherUserId,
      alternateTeacherUserIds,
      teacherEmail,
      teacherName
    );
    if (!thread) throw new AppError(404, 'Conversation not found');

    const message = await prisma.teacherChatMessage.create({
      data: {
        threadId,
        senderRole: 'TEACHER',
        senderName: teacherName || thread.teacherName,
        body: text,
      },
    });
    await prisma.teacherChatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: message.createdAt },
    });
    const payload = {
      id: message.id,
      senderRole: message.senderRole,
      senderName: message.senderName,
      body: message.body,
      isRead: message.isRead,
      createdAt: message.createdAt.toISOString(),
    };
    emitTeacherChatMessage(threadId, payload);
    return payload;
  }
}

export const teacherChatService = new TeacherChatService();
