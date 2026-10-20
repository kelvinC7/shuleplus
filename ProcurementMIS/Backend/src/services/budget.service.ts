import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class BudgetService {
  async list(organizationId: string, year?: number) {
    const where: any = { organizationId };
    if (year) where.year = year;
    return prisma.budget.findMany({
      where,
      orderBy: [{ year: 'desc' }, { name: 'asc' }],
    });
  }

  async getById(organizationId: string, id: string) {
    const budget = await prisma.budget.findFirst({ where: { id, organizationId } });
    if (!budget) throw new AppError(404, 'Budget not found');
    return budget;
  }

  async create(organizationId: string, data: any) {
    const existing = await prisma.budget.findFirst({
      where: { organizationId, name: data.name, year: Number(data.year) },
    });
    if (existing) throw new AppError(409, 'Budget with this name already exists for this year');

    return prisma.budget.create({
      data: {
        organizationId,
        name: data.name,
        year: Number(data.year),
        period: data.period || 'YEARLY',
        totalBudget: Number(data.totalBudget),
        departmentId: data.departmentId || null,
      },
    });
  }

  async update(organizationId: string, id: string, data: any) {
    await this.getById(organizationId, id);
    const updateData: any = { ...data };
    if (data.totalBudget) updateData.totalBudget = Number(data.totalBudget);
    return prisma.budget.update({ where: { id }, data: updateData });
  }

  async getSummary(organizationId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const budgets = await prisma.budget.findMany({
      where: { organizationId, year: currentYear },
    });

    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.totalBudget), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spent), 0);
    const totalReserved = budgets.reduce((sum, b) => sum + Number(b.reserved), 0);
    const utilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    const alerts = budgets
      .filter((b) => {
        const pct = Number(b.totalBudget) > 0 ? (Number(b.spent) / Number(b.totalBudget)) * 100 : 0;
        return pct >= 80;
      })
      .map((b) => ({
        budgetId: b.id,
        name: b.name,
        utilization: Math.round((Number(b.spent) / Number(b.totalBudget)) * 100),
        status: Number(b.spent) >= Number(b.totalBudget) ? 'EXCEEDED' : 'WARNING',
      }));

    return {
      year: currentYear,
      totalBudget,
      totalSpent,
      totalReserved,
      remaining: totalBudget - totalSpent,
      utilization,
      alerts,
      budgets,
    };
  }
}

export const budgetService = new BudgetService();
