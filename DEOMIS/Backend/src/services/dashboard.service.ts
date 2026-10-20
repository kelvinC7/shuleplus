import { prisma } from '../config/database';
import { sectorService } from './sector.service';

export class DashboardService {
  async getSummary(userId: string, organizationRef: string) {
    const tenant = await prisma.tenant.findFirst({
      where: { organizationId: organizationRef, status: 'ACTIVE' },
    });

    const command = await sectorService.commandDashboard(userId, organizationRef);

    return {
      ...command,
      organizationName: tenant?.organizationName ?? command.organizationName,
      sector: command.sector,
    };
  }
}

export const dashboardService = new DashboardService();
