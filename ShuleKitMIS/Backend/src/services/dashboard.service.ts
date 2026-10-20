import { prisma } from '../config/database';

export class DashboardService {
  async getSummary(organizationId: string) {
    const [kitCount, requestCount, pendingCount, approvedCount, paidCount, deliveredCount, collected, tenant] =
      await Promise.all([
        prisma.kit.count({ where: { organizationId } }),
        prisma.kitRequest.count({ where: { organizationId } }),
        prisma.kitRequest.count({ where: { organizationId, status: 'PENDING' } }),
        prisma.kitRequest.count({ where: { organizationId, status: 'APPROVED' } }),
        prisma.kitRequest.count({ where: { organizationId, status: 'PAID' } }),
        prisma.kitRequest.count({ where: { organizationId, status: 'DELIVERED' } }),
        prisma.kitRequestPayment.aggregate({
          where: { organizationId, status: 'COMPLETED' },
          _sum: { amount: true },
        }),
        prisma.tenant.findUnique({ where: { organizationId } }),
      ]);

    return {
      organizationId,
      organizationName: tenant?.organizationName ?? 'Unknown',
      kitCount,
      requestCount,
      pendingCount,
      approvedCount,
      paidCount,
      deliveredCount,
      collected: Number(collected._sum.amount ?? 0),
      status: tenant?.status ?? 'UNKNOWN',
    };
  }
}

export const dashboardService = new DashboardService();
