import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class ColdStorageService {
  async list(organizationId: string, query?: { date?: string }) {
    const where: any = { organizationId };
    if (query?.date) {
      const d = new Date(query.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.logDate = { gte: d, lt: next };
    }

    return prisma.coldStorageLog.findMany({
      where,
      orderBy: { logDate: 'desc' },
    });
  }

  async getById(organizationId: string, id: string) {
    const log = await prisma.coldStorageLog.findFirst({ where: { id, organizationId } });
    if (!log) throw new AppError(404, 'Cold storage log not found');
    return log;
  }

  async create(organizationId: string, userId: string, data: any) {
    const alertsTriggered =
      data.freezerTemperature > -15 || data.refrigeratorTemperature > 8;

    return prisma.coldStorageLog.create({
      data: {
        organizationId,
        loggedBy: userId,
        alertsTriggered,
        ...data,
      },
    });
  }

  async update(organizationId: string, id: string, data: any) {
    const existing = await prisma.coldStorageLog.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Cold storage log not found');
    return prisma.coldStorageLog.update({ where: { id }, data });
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.coldStorageLog.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Cold storage log not found');
    await prisma.coldStorageLog.delete({ where: { id } });
  }
}

export const coldStorageService = new ColdStorageService();
