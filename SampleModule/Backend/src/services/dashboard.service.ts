import { prisma } from '../config/database';

export class DashboardService {
  async getSummary(organizationId: string) {
    const [recordCount, reportCount, tenant] = await Promise.all([
      prisma.record.count({ where: { organizationId } }),
      prisma.report.count({ where: { organizationId } }),
      prisma.tenant.findUnique({ where: { organizationId } }),
    ]);

    return {
      organizationId,
      organizationName: tenant?.organizationName ?? 'Unknown',
      recordCount,
      reportCount,
      status: tenant?.status ?? 'UNKNOWN',
    };
  }
}

export const dashboardService = new DashboardService();
