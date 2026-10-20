import { prisma } from '../config/database';

export class AnalyticsService {
  async getDashboard(organizationId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      tenant,
      totalProducts,
      activeBatches,
      stores,
      stockRequests,
      recentReceivings,
      recentIssues,
      expiringBatches,
      expiredBatches,
      recentActivities,
      lowStockProducts,
    ] = await Promise.all([
      prisma.tenant.findFirst({
        where: { organizationId, status: 'ACTIVE' },
        select: { organizationName: true },
      }),
      prisma.product.count({ where: { organizationId, status: 'ACTIVE' } }),
      prisma.inventoryBatch.findMany({
        where: { organizationId, isActive: true, quantity: { gt: 0 } },
        select: { quantity: true, unitCost: true },
      }),
      prisma.store.count({ where: { organizationId, isActive: true } }),
      prisma.stockRequest.count({ where: { organizationId, status: 'PENDING' } }),
      prisma.stockReceiving.findMany({
        where: { organizationId, receivedDate: { gte: todayStart } },
        include: { _count: { select: { items: true } } },
      }),
      prisma.stockIssue.findMany({
        where: { organizationId, createdAt: { gte: todayStart } },
        include: { _count: { select: { items: true } } },
      }),
      prisma.inventoryBatch.count({
        where: {
          organizationId, isActive: true, quantity: { gt: 0 },
          expiryDate: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
      prisma.inventoryBatch.count({
        where: { organizationId, isActive: true, expiryDate: { lt: now } },
      }),
      prisma.activityLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.product.findMany({
        where: { organizationId, status: 'ACTIVE' },
        select: { id: true, name: true, reorderLevel: true },
      }),
    ]);

    const totalStock = activeBatches.reduce((sum, b) => sum + Number(b.quantity), 0);
    const inventoryValue = activeBatches.reduce((sum, b) => sum + Number(b.quantity) * Number(b.unitCost || 0), 0);

    const lowStockItems: Array<{ id: string; name: string; totalStock: number }> = [];
    for (const p of lowStockProducts) {
      const batchQty = await prisma.inventoryBatch.aggregate({
        where: { organizationId, productId: p.id, isActive: true },
        _sum: { quantity: true },
      });
      const totalQty = Number(batchQty._sum.quantity || 0);
      if (p.reorderLevel && totalQty <= Number(p.reorderLevel)) {
        lowStockItems.push({ id: p.id, name: p.name, totalStock: totalQty });
      }
    }

    const topConsumed = await this.getTopConsumed(organizationId, 5);
    const monthlyConsumption = await this.getMonthlyConsumption(organizationId);

    return {
      organizationName: tenant?.organizationName ?? 'Organization',
      totalProducts,
      totalStores: stores,
      totalStock,
      inventoryValue,
      lowStockItems: lowStockItems.length,
      outOfStockItems: lowStockItems.filter(i => i.totalStock === 0).length,
      expiringSoon: expiringBatches,
      expiredItems: expiredBatches,
      stockReceivedToday: recentReceivings.reduce((sum, r) => sum + r._count.items, 0),
      stockIssuedToday: recentIssues.reduce((sum, r) => sum + r._count.items, 0),
      pendingStockRequests: stockRequests,
      topConsumed,
      monthlyConsumption,
      recentActivities,
    };
  }

  private async getTopConsumed(organizationId: string, limit: number) {
    const items = await prisma.stockIssueItem.groupBy({
      by: ['productId'],
      where: {
        issue: { organizationId },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });

    return items.map(item => ({
      productId: item.productId,
      productName: products.find(p => p.id === item.productId)?.name || 'Unknown',
      sku: products.find(p => p.id === item.productId)?.sku || '',
      totalConsumed: Number(item._sum.quantity || 0),
    }));
  }

  private async getMonthlyConsumption(organizationId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const issues = await prisma.stockIssue.findMany({
      where: {
        organizationId,
        issuedAt: { gte: sixMonthsAgo },
        status: 'ISSUED',
      },
      select: { issuedAt: true, items: { select: { quantity: true } } },
      orderBy: { issuedAt: 'asc' },
    });

    const monthly: Record<string, number> = {};
    for (const issue of issues) {
      if (!issue.issuedAt) continue;
      const key = `${issue.issuedAt.getFullYear()}-${String(issue.issuedAt.getMonth() + 1).padStart(2, '0')}`;
      const total = issue.items.reduce((sum, i) => sum + Number(i.quantity), 0);
      monthly[key] = (monthly[key] || 0) + total;
    }

    return Object.entries(monthly).map(([month, total]) => ({ month, total }));
  }
}

export const analyticsService = new AnalyticsService();
