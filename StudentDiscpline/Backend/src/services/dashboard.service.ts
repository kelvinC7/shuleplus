import { prisma } from '../config/database';
import { countDisciplineCases } from '../lib/prisma-discipline';

export class DashboardService {
  async getSummary(organizationId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [tenant, totalCases, openCases, closedCases, highSeverityCases, casesThisMonth, markStats] =
      await Promise.all([
        prisma.tenant.findUnique({ where: { organizationId } }),
        countDisciplineCases({ organizationId }),
        countDisciplineCases({ organizationId, status: 'Open' }),
        countDisciplineCases({ organizationId, status: 'Closed' }),
        countDisciplineCases({ organizationId, severity: 'High' }),
        countDisciplineCases({ organizationId, since: startOfMonth }),
        prisma.disciplineMark
          .groupBy({
            by: ['status'],
            where: { organizationId },
            _count: true,
          })
          .catch(() => []),
      ]);

    const activeMarks = markStats.find((m) => m.status === 'Active')?._count ?? 0;

    return {
      organizationId,
      organizationName: tenant?.organizationName ?? 'Unknown',
      status: tenant?.status ?? 'UNKNOWN',
      totalCases,
      openCases,
      closedCases,
      highSeverityCases,
      casesThisMonth,
      totalMarks: markStats.reduce((s, m) => s + m._count, 0),
      activeMarks,
    };
  }
}

export const dashboardService = new DashboardService();
