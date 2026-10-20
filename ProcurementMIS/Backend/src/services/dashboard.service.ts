import { prisma } from '../config/database';

export class DashboardService {
  async getSummary(organizationId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalPRs,
      pendingApprovals,
      approvedOrders,
      poIssued,
      totalSuppliers,
      contractsExpiring,
      ordersInTransit,
      deliveredOrders,
      cancelledOrders,
      monthlyPRs,
      lastMonthPRs,
      monthlyCost,
      lastMonthCost,
      budgets,
      recentActivities,
      monthlySpending,
      spendingByDepartment,
      spendingByCategory,
      topPurchasedItems,
      statusDistribution,
    ] = await Promise.all([
      prisma.purchaseRequest.count({ where: { organizationId } }),
      prisma.purchaseRequest.count({ where: { organizationId, status: 'PENDING' } }),
      prisma.purchaseRequest.count({ where: { organizationId, status: { in: ['DEPARTMENT_HEAD_APPROVED', 'FINANCE_APPROVED', 'PROCUREMENT_APPROVED', 'MD_APPROVED'] } } }),
      prisma.purchaseOrder.count({ where: { organizationId } }),
      prisma.supplier.count({ where: { organizationId, isActive: true } }),
      prisma.contract.count({
        where: {
          organizationId,
          status: 'ACTIVE',
          endDate: { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.purchaseOrder.count({ where: { organizationId, status: 'IN_TRANSIT' } }),
      prisma.purchaseOrder.count({ where: { organizationId, status: { in: ['DELIVERED', 'COMPLETED'] } } }),
      prisma.purchaseOrder.count({ where: { organizationId, status: 'CANCELLED' } }),
      prisma.purchaseRequest.count({
        where: { organizationId, createdAt: { gte: startOfMonth } },
      }),
      prisma.purchaseRequest.count({
        where: { organizationId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      prisma.purchaseOrder.aggregate({
        where: { organizationId, createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.purchaseOrder.aggregate({
        where: { organizationId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.budget.aggregate({
        where: { organizationId, year: now.getFullYear() },
        _sum: { totalBudget: true, spent: true },
      }),
      prisma.activityLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.$queryRaw`
        SELECT
          TO_CHAR("created_at", 'YYYY-MM') as month,
          SUM("total_amount") as total
        FROM "purchase_orders"
        WHERE "organization_id" = ${organizationId}
          AND "created_at" >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR("created_at", 'YYYY-MM')
        ORDER BY month ASC
      `,
      prisma.$queryRaw`
        SELECT d.name as department, SUM(po.total_amount) as total
        FROM purchase_orders po
        JOIN purchase_requests pr ON po.pr_id = pr.id
        JOIN departments d ON pr.department_id = d.id
        WHERE po.organization_id = ${organizationId}
        GROUP BY d.name
        ORDER BY total DESC
        LIMIT 10
      `,
      prisma.$queryRaw`
        SELECT COALESCE(pc.name, 'Uncategorized') as category, SUM(pri.estimated_total) as total
        FROM purchase_request_items pri
        JOIN purchase_requests pr ON pri.pr_id = pr.id
        LEFT JOIN procurement_categories pc ON pri.category_id = pc.id
        WHERE pr.organization_id = ${organizationId}
        GROUP BY pc.name
        ORDER BY total DESC
        LIMIT 10
      `,
      prisma.$queryRaw`
        SELECT pri.item_name as "itemName", SUM(pri.quantity::numeric) as "totalQty", COUNT(*) as "orderCount"
        FROM purchase_request_items pri
        JOIN purchase_requests pr ON pri.pr_id = pr.id
        WHERE pr.organization_id = ${organizationId}
        GROUP BY pri.item_name
        ORDER BY "totalQty" DESC
        LIMIT 10
      `,
      prisma.$queryRaw`
        SELECT status, COUNT(*) as count
        FROM purchase_orders
        WHERE organization_id = ${organizationId}
        GROUP BY status
      `,
    ]);

    const totalBudget = Number((budgets._sum.totalBudget ?? 0));
    const totalSpent = Number((budgets._sum.spent ?? 0));
    const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    const currentMonthCost = Number((monthlyCost._sum.totalAmount ?? 0));
    const lastMonthCostVal = Number((lastMonthCost._sum.totalAmount ?? 0));
    const costChange = lastMonthCostVal > 0
      ? Math.round(((currentMonthCost - lastMonthCostVal) / lastMonthCostVal) * 100)
      : 0;

    const currentMonthPRs = monthlyPRs;
    const lastMonthPRsVal = lastMonthPRs;
    const prChange = lastMonthPRsVal > 0
      ? Math.round(((currentMonthPRs - lastMonthPRsVal) / lastMonthPRsVal) * 100)
      : 0;

    return {
      totalPRs,
      pendingApprovals,
      approvedOrders,
      poIssued,
      totalSuppliers,
      contractsExpiring,
      ordersInTransit,
      deliveredOrders,
      cancelledOrders,
      monthlyCost: currentMonthCost,
      costChange,
      budgetUtilization,
      totalBudget,
      totalSpent,
      prChange,
      monthlySpending: (monthlySpending as any[]).map((m: any) => ({
        month: m.month,
        total: Number(m.total),
      })),
      spendingByDepartment: (spendingByDepartment as any[]).map((d: any) => ({
        department: d.department,
        total: Number(d.total),
      })),
      spendingByCategory: (spendingByCategory as any[]).map((c: any) => ({
        category: c.category,
        total: Number(c.total),
      })),
      topPurchasedItems: (topPurchasedItems as any[]).map((i: any) => ({
        itemName: i.itemName,
        totalQty: Number(i.totalQty),
        orderCount: Number(i.orderCount),
      })),
      statusDistribution: (statusDistribution as any[]).map((s: any) => ({
        status: s.status,
        count: Number(s.count),
      })),
      recentActivities: recentActivities.map((a) => ({
        id: a.id,
        userId: a.userId,
        userName: a.userName,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        metadata: a.metadata,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }
}

export const dashboardService = new DashboardService();
