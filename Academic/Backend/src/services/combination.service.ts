import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class CombinationService {
  async list(organizationId: string) {
    return prisma.combination.findMany({
      where: { organizationId },
      include: {
        combinationSubjects: {
          include: { subject: true },
          orderBy: { subject: { name: 'asc' } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getById(id: string, organizationId: string) {
    const combo = await prisma.combination.findFirst({
      where: { id, organizationId },
      include: {
        combinationSubjects: {
          include: { subject: true },
          orderBy: { subject: { name: 'asc' } },
        },
        classes: {
          orderBy: [{ sortOrder: 'asc' }, { stream: 'asc' }],
        },
      },
    });
    if (!combo) throw new AppError(404, 'Combination not found');
    return combo;
  }
}

export const combinationService = new CombinationService();
