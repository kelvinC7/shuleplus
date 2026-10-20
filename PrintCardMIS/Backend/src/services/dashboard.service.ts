import { prisma } from '../config/database';

export class DashboardService {
  async getSummary(organizationId: string) {
    const [cardCount, batchCount, tenant] = await Promise.all([
      prisma.cardRecord.count({ where: { organizationId } }),
      prisma.printBatch.count({ where: { organizationId } }),
      prisma.tenant.findUnique({ where: { organizationId } }),
    ]);

    return {
      organizationId,
      organizationName: tenant?.organizationName ?? 'Unknown',
      recordCount: cardCount,
      reportCount: batchCount,
      status: tenant?.status ?? 'UNKNOWN',
    };
  }
}

export const dashboardService = new DashboardService();
