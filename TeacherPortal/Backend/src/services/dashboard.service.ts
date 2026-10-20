import { prisma } from '../config/database';
import { PENDING_STATUSES } from '../constants/shule-avance.constants';

export class DashboardService {
  async getSummary(organizationId: string, userId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
    let pendingAdvances = 0;
    let approvedAdvances = 0;
    let totalRequests = 0;
    try {
      [pendingAdvances, approvedAdvances, totalRequests] = await Promise.all([
        prisma.shuleAvanceRequest.count({
          where: {
            organizationId,
            userId,
            status: { in: [...PENDING_STATUSES] },
          },
        }),
        prisma.shuleAvanceRequest.count({
          where: { organizationId, userId, status: 'approved' },
        }),
        prisma.shuleAvanceRequest.count({
          where: { organizationId, userId },
        }),
      ]);
    } catch (err) {
      console.warn('[dashboard] salary-advance counts skipped', err);
    }

    return {
      organizationId,
      organizationName: tenant?.organizationName ?? 'Unknown',
      status: tenant?.status ?? 'UNKNOWN',
      pendingAdvanceRequests: pendingAdvances,
      approvedAdvanceRequests: approvedAdvances,
      totalAdvanceRequests: totalRequests,
      todayLessons: 0,
      studentsCount: 0,
    };
  }
}

export const dashboardService = new DashboardService();
