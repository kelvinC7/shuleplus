import { prisma } from '../config/database';

export const preferenceService = {
  async get(userId: string) {
    return prisma.userNotificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  },

  async update(
    userId: string,
    data: Partial<{
      emailEnabled: boolean;
      smsEnabled: boolean;
      pushEnabled: boolean;
      inAppEnabled: boolean;
      marketingEnabled: boolean;
      quietHoursStart: string | null;
      quietHoursEnd: string | null;
    }>
  ) {
    return prisma.userNotificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },
};
