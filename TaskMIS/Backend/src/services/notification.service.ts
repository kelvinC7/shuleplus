import { Prisma, NotificationType } from '@prisma/client';
import { prisma } from '../config/database';

export class NotificationService {
  async create(orgId: string, userId: string, type: NotificationType, title: string, message: string, metadata?: Record<string, unknown>) {
    return prisma.notification.create({
      data: {
        organizationId: orgId,
        userId,
        type,
        title,
        message,
        taskId: metadata?.taskId as string ?? null,
        workflowId: metadata?.workflowId as string ?? null,
        metadata: (metadata as Prisma.InputJsonValue) ?? {},
      },
    });
  }

  async list(orgId: string, userId: string, filters: Record<string, string | undefined>) {
    const where: Prisma.NotificationWhereInput = {
      organizationId: orgId,
      userId,
    };
    if (filters.isRead !== undefined) where.isRead = filters.isRead === 'true';
    if (filters.type) where.type = filters.type as NotificationType;

    const page = Math.max(1, parseInt(filters.page ?? '1', 10));
    const limit = Math.min(50, parseInt(filters.limit ?? '20', 10));

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { organizationId: orgId, userId, isRead: false },
      }),
    ]);

    return {
      data: items,
      unreadCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async markRead(orgId: string, id: string, userId: string) {
    await prisma.notification.updateMany({
      where: { id, organizationId: orgId, userId },
      data: { isRead: true },
    });
    return { success: true };
  }

  async markAllRead(orgId: string, userId: string) {
    await prisma.notification.updateMany({
      where: { organizationId: orgId, userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async unreadCount(orgId: string, userId: string) {
    const count = await prisma.notification.count({
      where: { organizationId: orgId, userId, isRead: false },
    });
    return { count };
  }
}

export const notificationService = new NotificationService();
