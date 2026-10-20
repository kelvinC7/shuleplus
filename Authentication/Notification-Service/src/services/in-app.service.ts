import { NotificationChannel, NotificationPriority, NotificationStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { logService } from './log.service';

export const inAppService = {
  async send(params: {
    sourceService: string;
    userId: string;
    title: string;
    body: string;
    priority?: NotificationPriority;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }) {
    const notification = await prisma.inAppNotification.create({
      data: {
        userId: params.userId,
        title: params.title,
        body: params.body,
        priority: params.priority ?? NotificationPriority.NORMAL,
        actionUrl: params.actionUrl,
        metadata: params.metadata ?? undefined,
      },
    });

    await logService.create({
      sourceService: params.sourceService,
      channel: NotificationChannel.IN_APP,
      recipient: params.userId,
      subject: params.title,
      body: params.body,
      status: NotificationStatus.SENT,
      metadata: { inAppId: notification.id, ...params.metadata },
      sentAt: new Date(),
    });

    return notification;
  },

  async list(userId: string, filter: 'all' | 'unread' | 'archived' = 'all') {
    const where =
      filter === 'unread'
        ? { userId, isRead: false, isArchived: false }
        : filter === 'archived'
          ? { userId, isArchived: true }
          : { userId, isArchived: false };

    return prisma.inAppNotification.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
  },

  async markRead(id: string, userId: string) {
    return prisma.inAppNotification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async markAllRead(userId: string) {
    return prisma.inAppNotification.updateMany({
      where: { userId, isRead: false, isArchived: false },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async archive(id: string, userId: string) {
    return prisma.inAppNotification.updateMany({
      where: { id, userId },
      data: { isArchived: true },
    });
  },

  async unreadCount(userId: string) {
    return prisma.inAppNotification.count({
      where: { userId, isRead: false, isArchived: false },
    });
  },
};
