import { prisma } from '../config/database';

export class AnalyticsService {
  async getCostAnalytics(organizationId: string, startDate?: string, endDate?: string) {
    const where: any = { organizationId };
    if (startDate && endDate) {
      where.productionDate = { gte: new Date(startDate), lt: new Date(endDate) };
    }

    const productions = await prisma.mealProduction.findMany({
      where,
      include: { waste: true },
    });

    const totalServings = productions.reduce((sum, p) => sum + p.actualServings, 0);
    const totalWasteCost = productions.reduce(
      (sum, p) => sum + p.waste.reduce((ws, w) => ws + (w.cost ? Number(w.cost) : 0), 0),
      0
    );

    return { totalServings, totalWasteCost, productionCount: productions.length };
  }

  async getConsumptionAnalytics(organizationId: string) {
    const servings = await prisma.mealServing.groupBy({
      by: ['beneficiaryType'],
      _count: { _all: true },
      _sum: { quantity: true },
      where: { production: { organizationId } },
    });

    const byMealType = await prisma.mealProduction.groupBy({
      by: ['mealType'],
      _sum: { actualServings: true },
      where: { organizationId },
    });

    return { byBeneficiaryType: servings, byMealType };
  }

  async getWasteAnalytics(organizationId: string) {
    const wasteByType = await prisma.foodWaste.groupBy({
      by: ['wasteType'],
      _count: true,
      _sum: { quantity: true, cost: true },
      where: { organizationId },
    });

    return { wasteByType };
  }

  async getPopularMeals(organizationId: string) {
    const productions = await prisma.mealProduction.findMany({
      where: { organizationId },
      include: { items: true },
    });

    const mealCount: Record<string, number> = {};
    for (const prod of productions) {
      for (const item of prod.items) {
        mealCount[item.menuItemId] = (mealCount[item.menuItemId] || 0) + prod.actualServings;
      }
    }

    const sorted = Object.entries(mealCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const menuItems = await prisma.menuItem.findMany({
      where: { organizationId },
    });

    return sorted.map(([menuItemId, servings]) => ({
      menuItem: menuItems.find((m) => m.id === menuItemId),
      totalServings: servings,
    }));
  }
}

export const analyticsService = new AnalyticsService();
