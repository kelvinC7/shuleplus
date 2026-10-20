import { prisma } from '../config/database';

export class NotificationService {
  async list(organizationId: string, userId: string) {
    return prisma.notification.findMany({
      where: { organizationId, userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(organizationId: string, id: string) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(organizationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { organizationId, userId, isRead: false },
      data: { isRead: true },
    });
  }

  async create(organizationId: string, data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    referenceType?: string;
    referenceId?: string;
  }) {
    return prisma.notification.create({
      data: { organizationId, ...data },
    });
  }

  async unreadCount(organizationId: string, userId: string) {
    return prisma.notification.count({
      where: { organizationId, userId, isRead: false },
    });
  }
}

export const notificationService = new NotificationService();
