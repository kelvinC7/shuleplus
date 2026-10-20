import { prisma } from '../config/database';

export class DashboardService {
  async getSummary(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });

    const [
      totalMenuItems,
      activeMenuItems,
      totalRecipes,
      activeMealPlans,
      totalKitchenStaff,
      todayProductions,
      pendingRequests,
      totalBeneficiaries,
      todayServings,
      totalFoodWaste,
    ] = await Promise.all([
      prisma.menuItem.count({ where: { organizationId } }),
      prisma.menuItem.count({ where: { organizationId, isActive: true } }),
      prisma.recipe.count({ where: { organizationId } }),
      prisma.mealPlan.count({ where: { organizationId, status: 'ACTIVE' } }),
      prisma.kitchenStaff.count({ where: { organizationId, isActive: true } }),
      prisma.mealProduction.count({
        where: { organizationId, productionDate: { gte: today, lt: tomorrow } },
      }),
      prisma.kitchenRequest.count({ where: { organizationId, status: 'PENDING' } }),
      prisma.mealServing.groupBy({
        by: ['beneficiaryType'],
        _count: { _all: true },
        where: { production: { organizationId } },
      }),
      prisma.mealServing.count({
        where: {
          production: { organizationId },
          servedAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.foodWaste.count({ where: { organizationId } }),
    ]);

    return {
      organizationId,
      organizationName: tenant?.organizationName ?? 'Unknown',
      totalMenuItems,
      activeMenuItems,
      totalRecipes,
      activeMealPlans,
      totalKitchenStaff,
      todayProductions,
      pendingRequests,
      totalBeneficiaries: totalBeneficiaries.reduce((sum, b) => sum + (b._count?._all ?? 0), 0),
      todayServings,
      totalFoodWaste,
    };
  }
}

export const dashboardService = new DashboardService();
