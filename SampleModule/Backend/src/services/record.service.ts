import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class RecordService {
  async list(organizationId: string) {
    return prisma.record.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, title: string, description?: string) {
    const record = await prisma.record.create({
      data: { organizationId, title, description, createdBy: userId },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action: 'RECORD_CREATED',
        metadata: { recordId: record.id, title },
      },
    });

    return record;
  }

  async getById(organizationId: string, id: string) {
    const record = await prisma.record.findFirst({ where: { id, organizationId } });
    if (!record) throw new AppError(404, 'Record not found');
    return record;
  }
}

export const recordService = new RecordService();
