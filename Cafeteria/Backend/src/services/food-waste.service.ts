import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class FoodWasteService {
  async list(organizationId: string, query?: { wasteType?: string; date?: string }) {
    const where: any = { organizationId };
    if (query?.wasteType) where.wasteType = query.wasteType;
    if (query?.date) {
      const d = new Date(query.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.wasteDate = { gte: d, lt: next };
    }

    return prisma.foodWaste.findMany({
      where,
      orderBy: { wasteDate: 'desc' },
    });
  }

  async getById(organizationId: string, id: string) {
    const waste = await prisma.foodWaste.findFirst({ where: { id, organizationId } });
    if (!waste) throw new AppError(404, 'Food waste record not found');
    return waste;
  }

  async create(organizationId: string, userId: string, data: any) {
    const waste = await prisma.foodWaste.create({
      data: { organizationId, reportedBy: userId, ...data },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action: 'FOOD_WASTE_RECORDED',
        metadata: { wasteId: waste.id, wasteType: waste.wasteType },
      },
    });

    return waste;
  }

  async update(organizationId: string, id: string, data: any) {
    const existing = await prisma.foodWaste.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Food waste record not found');
    return prisma.foodWaste.update({ where: { id }, data });
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.foodWaste.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Food waste record not found');
    await prisma.foodWaste.delete({ where: { id } });
  }
}

export const foodWasteService = new FoodWasteService();
