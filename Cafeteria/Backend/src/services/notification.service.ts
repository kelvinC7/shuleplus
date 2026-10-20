import { prisma } from '../config/database';

export class NotificationService {
  async list(organizationId: string, query?: { isRead?: string }) {
    const where: any = { organizationId };
    if (query?.isRead !== undefined) where.isRead = query.isRead === 'true';

    return prisma.cafeteriaNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(organizationId: string, id: string) {
    return prisma.cafeteriaNotification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllRead(organizationId: string) {
    await prisma.cafeteriaNotification.updateMany({
      where: { organizationId, isRead: false },
      data: { isRead: true },
    });
  }

  async create(data: { organizationId: string; title: string; message: string; type: string }) {
    return prisma.cafeteriaNotification.create({ data });
  }
}

export const notificationService = new NotificationService();
