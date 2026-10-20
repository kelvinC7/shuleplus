import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { prisma } from '../config/database';

export const logService = {
  async create(data: {
    sourceService: string;
    channel: NotificationChannel;
    recipient: string;
    subject?: string;
    body: string;
    templateSlug?: string;
    metadata?: Record<string, unknown>;
    status?: NotificationStatus;
    sentAt?: Date;
  }) {
    return prisma.notificationLog.create({
      data: {
        sourceService: data.sourceService,
        channel: data.channel,
        recipient: data.recipient,
        subject: data.subject,
        body: data.body,
        templateSlug: data.templateSlug,
        metadata: data.metadata ?? undefined,
        status: data.status ?? NotificationStatus.PENDING,
        sentAt: data.sentAt,
      },
    });
  },

  async markSent(id: string) {
    return prisma.notificationLog.update({
      where: { id },
      data: { status: NotificationStatus.SENT, sentAt: new Date() },
    });
  },

  async markFailed(id: string, errorMessage: string) {
    return prisma.notificationLog.update({
      where: { id },
      data: { status: NotificationStatus.FAILED, errorMessage },
    });
  },

  async list(filters?: {
    sourceService?: string;
    channel?: NotificationChannel;
    status?: NotificationStatus;
    limit?: number;
  }) {
    return prisma.notificationLog.findMany({
      where: {
        sourceService: filters?.sourceService,
        channel: filters?.channel,
        status: filters?.status,
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 100,
    });
  },
};
