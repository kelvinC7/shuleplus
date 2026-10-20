import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class MealPlanService {
  async list(organizationId: string, query?: { status?: string; mealType?: string; date?: string }) {
    const where: any = { organizationId };
    if (query?.status) where.status = query.status;
    if (query?.mealType) where.mealType = query.mealType;
    if (query?.date) {
      const d = new Date(query.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.planDate = { gte: d, lt: next };
    }

    return prisma.mealPlan.findMany({
      where,
      include: { items: { include: { menuItem: true } } },
      orderBy: { planDate: 'desc' },
    });
  }

  async getById(organizationId: string, id: string) {
    const plan = await prisma.mealPlan.findFirst({
      where: { id, organizationId },
      include: { items: { include: { menuItem: true } } },
    });
    if (!plan) throw new AppError(404, 'Meal plan not found');
    return plan;
  }

  async create(organizationId: string, userId: string, data: any) {
    const { items, ...planData } = data;
    const plan = await prisma.mealPlan.create({
      data: {
        organizationId,
        createdBy: userId,
        ...planData,
        items: items ? { create: items.map((i: any) => ({ ...i })) } : undefined,
      },
      include: { items: { include: { menuItem: true } } },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action: 'MEAL_PLAN_CREATED',
        metadata: { mealPlanId: plan.id, planDate: plan.planDate },
      },
    });

    return plan;
  }

  async update(organizationId: string, id: string, data: any) {
    const existing = await prisma.mealPlan.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Meal plan not found');

    const { items, ...planData } = data;

    return prisma.$transaction(async (tx) => {
      if (items) {
        await tx.mealPlanItem.deleteMany({ where: { mealPlanId: id } });
      }
      return tx.mealPlan.update({
        where: { id },
        data: {
          ...planData,
          ...(items && { items: { create: items.map((i: any) => ({ ...i })) } }),
        },
        include: { items: { include: { menuItem: true } } },
      });
    });
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.mealPlan.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Meal plan not found');
    if (existing.status === 'ACTIVE') throw new AppError(400, 'Cannot delete an active meal plan');
    await prisma.mealPlan.delete({ where: { id } });
  }
}

export const mealPlanService = new MealPlanService();
