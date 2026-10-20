import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class MealProductionService {
  async list(organizationId: string, query?: { status?: string; mealType?: string; date?: string }) {
    const where: any = { organizationId };
    if (query?.status) where.status = query.status;
    if (query?.mealType) where.mealType = query.mealType;
    if (query?.date) {
      const d = new Date(query.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.productionDate = { gte: d, lt: next };
    }

    return prisma.mealProduction.findMany({
      where,
      include: { items: true, servings: true },
      orderBy: { productionDate: 'desc' },
    });
  }

  async getById(organizationId: string, id: string) {
    const production = await prisma.mealProduction.findFirst({
      where: { id, organizationId },
      include: { items: true, servings: true },
    });
    if (!production) throw new AppError(404, 'Meal production not found');
    return production;
  }

  async create(organizationId: string, userId: string, data: any) {
    const { items, ...productionData } = data;
    const production = await prisma.mealProduction.create({
      data: {
        organizationId,
        preparedBy: userId,
        ...productionData,
        items: items ? { create: items.map((i: any) => ({ ...i })) } : undefined,
      },
      include: { items: true },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action: 'MEAL_PRODUCTION_CREATED',
        metadata: { productionId: production.id },
      },
    });

    return production;
  }

  async update(organizationId: string, id: string, data: any) {
    const existing = await prisma.mealProduction.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Meal production not found');

    return prisma.mealProduction.update({ where: { id }, data });
  }

  async complete(organizationId: string, id: string, userId: string, actualServings: number) {
    const existing = await prisma.mealProduction.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Meal production not found');
    if (existing.status === 'COMPLETED') throw new AppError(400, 'Production already completed');

    return prisma.mealProduction.update({
      where: { id },
      data: { status: 'COMPLETED', actualServings },
    });
  }

  async cancel(organizationId: string, id: string) {
    const existing = await prisma.mealProduction.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Meal production not found');
    if (existing.status === 'COMPLETED') throw new AppError(400, 'Cannot cancel completed production');

    return prisma.mealProduction.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.mealProduction.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Meal production not found');
    if (existing.status === 'COMPLETED') throw new AppError(400, 'Cannot delete completed production');
    await prisma.mealProduction.delete({ where: { id } });
  }
}

export const mealProductionService = new MealProductionService();
