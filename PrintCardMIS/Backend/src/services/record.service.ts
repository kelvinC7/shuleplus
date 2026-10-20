import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

/** Legacy template stubs — Print Card uses CardRecord, not a generic Record model. */
export class RecordService {
  async list(organizationId: string) {
    return prisma.cardRecord.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async create(_organizationId: string, _userId: string, _title: string, _description?: string) {
    throw new AppError(501, 'Generic records are not supported; use card records');
  }

  async getById(organizationId: string, id: string) {
    const record = await prisma.cardRecord.findFirst({ where: { id, organizationId } });
    if (!record) throw new AppError(404, 'Record not found');
    return record;
  }
}

export const recordService = new RecordService();
