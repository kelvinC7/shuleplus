import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { notifyParentMis } from '../clients/parentmis.client';

export interface CreateRecordInput {
  title: string;
  description?: string;
  studentCode?: string;
  eventType?: string;
  points?: number;
}

export class RecordService {
  async list(organizationId: string) {
    return prisma.record.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, input: CreateRecordInput) {
    const record = await prisma.record.create({
      data: {
        organizationId,
        title: input.title,
        description: input.description,
        createdBy: userId,
        studentCode: input.studentCode,
        eventType: input.eventType,
        points: input.points,
      },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action: 'RECORD_CREATED',
        metadata: { recordId: record.id, title: input.title, studentCode: input.studentCode },
      },
    });

    if (input.studentCode) {
      void notifyParentMis({
        organizationId,
        studentCode: input.studentCode,
        eventType: input.eventType,
        points: input.points,
        description: input.description ?? input.title,
      });
    }

    return record;
  }

  async getById(organizationId: string, id: string) {
    const record = await prisma.record.findFirst({ where: { id, organizationId } });
    if (!record) throw new AppError(404, 'Record not found');
    return record;
  }
}

export const recordService = new RecordService();
