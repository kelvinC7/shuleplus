import { prisma } from "../config/database";
import { LOW_STOCK_THRESHOLD } from "./inventory.service";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthsAgo(n: number) {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - (n - 1));
  return d;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export class DashboardService {
  async getSummary(organizationId: string) {
    const settings = await prisma.schoolUniformSettings.findUnique({
      where: { organizationId },
    });
    const since12 = monthsAgo(12);

    const [
      uniformsInStock,
      fabricRolls,
      tailorsCount,
      totalActiveStudents,
      studentsWithUniform,
      salesToday,
      lowStockItems,
      monthSaleLines,
      damagedThisMonth,
      salesLast12,
      distributions,
      fabricIssues,
    ] = await Promise.all([
      prisma.stockBalance.aggregate({
        where: { organizationId },
        _sum: { available: true },
      }),
      settings?.enableFabricManagement
        ? prisma.fabric.count({ where: { organizationId } })
        : Promise.resolve(null),
      settings?.enableTailoring
        ? prisma.tailor.count({ where: { organizationId, isActive: true } })
        : Promise.resolve(null),
      prisma.uniformStudent.count({
        where: { organizationId, isActive: true },
      }),
      prisma.uniformStudent.count({
        where: {
          organizationId,
          isActive: true,
          items: { some: { owned: true } },
        },
      }),
      prisma.uniformSale.aggregate({
        where: { organizationId, createdAt: { gte: startOfToday() } },
        _sum: { total: true },
      }),
      prisma.stockBalance.findMany({
        where: { organizationId, available: { lte: LOW_STOCK_THRESHOLD } },
        include: { variant: { include: { product: true } } },
        take: 20,
      }),
      prisma.saleLine.findMany({
        where: { organizationId, sale: { createdAt: { gte: startOfMonth() } } },
        include: { variant: true },
      }),
      prisma.stockMovement.aggregate({
        where: {
          organizationId,
          type: "DAMAGE",
          createdAt: { gte: startOfMonth() },
        },
        _sum: { quantity: true },
      }),
      prisma.uniformSale.findMany({
        where: { organizationId, createdAt: { gte: since12 } },
        select: { createdAt: true, total: true },
      }),
      prisma.uniformDistribution.findMany({
        where: { organizationId },
        include: { student: { select: { className: true } } },
        take: 2000,
      }),
      settings?.enableFabricManagement
        ? prisma.fabricIssue.findMany({
            where: { organizationId, issuedAt: { gte: since12 } },
            include: { fabric: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ]);

    let profitThisMonth = 0;
    for (const line of monthSaleLines) {
      const cost = Number(line.variant.costPrice ?? 0);
      profitThisMonth += (Number(line.unitPrice) - cost) * line.quantity;
    }

    const avgCost =
      monthSaleLines.length > 0
        ? monthSaleLines.reduce(
            (sum, l) => sum + Number(l.variant.costPrice ?? 0),
            0,
          ) / monthSaleLines.length
        : 0;
    const lossThisMonth = (damagedThisMonth._sum.quantity ?? 0) * avgCost;

    // Monthly sales (last 12 calendar months)
    const monthlyMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const d = new Date(since12);
      d.setMonth(since12.getMonth() + i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyMap.set(key, 0);
    }
    for (const sale of salesLast12) {
      const d = new Date(sale.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(sale.total));
      }
    }
    const monthlySales = Array.from(monthlyMap.entries()).map(
      ([key, total]) => {
        const [, monthIdx] = key.split("-").map(Number);
        return { month: MONTH_LABELS[monthIdx] ?? key, total };
      },
    );

    // Distribution by class
    const classMap = new Map<string, number>();
    for (const dist of distributions) {
      const cls = dist.student?.className?.trim() || "Unassigned";
      classMap.set(cls, (classMap.get(cls) ?? 0) + 1);
    }
    const distributionByClass = Array.from(classMap.entries())
      .map(([className, count]) => ({ className, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Fabric usage by fabric name
    const fabricMap = new Map<string, number>();
    for (const issue of fabricIssues) {
      const name = issue.fabric?.name || "Unknown";
      fabricMap.set(name, (fabricMap.get(name) ?? 0) + Number(issue.meters));
    }
    const fabricUsage = Array.from(fabricMap.entries())
      .map(([fabric, metersUsed]) => ({ fabric, metersUsed }))
      .sort((a, b) => b.metersUsed - a.metersUsed)
      .slice(0, 8);

    return {
      kpis: {
        uniformsInStock: uniformsInStock._sum.available ?? 0,
        fabricRolls,
        tailors: tailorsCount,
        studentsWithUniform,
        studentsMissing: Math.max(0, totalActiveStudents - studentsWithUniform),
        salesToday: Number(salesToday._sum.total ?? 0),
        profitThisMonth,
        lossThisMonth,
        lowStockCount: lowStockItems.length,
      },
      lowStockItems: lowStockItems.map((item) => ({
        variantId: item.variantId,
        productName: item.variant.product.name,
        size: item.variant.size,
        available: item.available,
      })),
      charts: {
        monthlySales,
        fabricUsage,
        distributionByClass,
      },
    };
  }
}

export const dashboardService = new DashboardService();
