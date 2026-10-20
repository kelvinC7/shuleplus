import { prisma } from '../config/database';

export class SettingService {
  async list(organizationId: string) {
    return prisma.setting.findMany({
      where: { organizationId },
      orderBy: { key: 'asc' },
    });
  }

  async get(organizationId: string, key: string) {
    return prisma.setting.findUnique({
      where: { organizationId_key: { organizationId, key } },
    });
  }

  async set(organizationId: string, key: string, value: string) {
    return prisma.setting.upsert({
      where: { organizationId_key: { organizationId, key } },
      update: { value },
      create: { organizationId, key, value },
    });
  }

  async setBulk(organizationId: string, settings: Record<string, string>) {
    const operations = Object.entries(settings).map(([key, value]) =>
      prisma.setting.upsert({
        where: { organizationId_key: { organizationId, key } },
        update: { value },
        create: { organizationId, key, value },
      })
    );
    await prisma.$transaction(operations);
  }
}

export const settingService = new SettingService();
