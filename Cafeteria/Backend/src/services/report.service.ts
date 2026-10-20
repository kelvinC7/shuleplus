import { prisma } from '../config/database';

export class ReportService {
  async getProductionReport(organizationId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const productions = await prisma.mealProduction.findMany({
      where: {
        organizationId,
        productionDate: { gte: start, lt: end },
      },
      include: { items: true, servings: true },
      orderBy: { productionDate: 'asc' },
    });

    return { startDate, endDate, productions };
  }

  async getWasteReport(organizationId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const waste = await prisma.foodWaste.findMany({
      where: {
        organizationId,
        wasteDate: { gte: start, lt: end },
      },
      orderBy: { wasteDate: 'asc' },
    });

    const totalCost = waste.reduce((sum, w) => sum + (w.cost ? Number(w.cost) : 0), 0);
    const totalQuantity = waste.reduce((sum, w) => sum + Number(w.quantity), 0);

    return { startDate, endDate, waste, totalCost, totalQuantity };
  }

  async getStaffReport(organizationId: string) {
    const staff = await prisma.kitchenStaff.findMany({
      where: { organizationId },
      include: { dutyRosters: true },
    });

    return staff;
  }

  async getBudgetReport(organizationId: string, month: number, year: number) {
    const budget = await prisma.mealBudget.findUnique({
      where: { organizationId_month_year: { organizationId, month, year } },
    });

    return budget;
  }
}

export const reportService = new ReportService();
