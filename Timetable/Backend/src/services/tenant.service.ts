import { TenantStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { seedService } from './seed.service';

export class TenantService {
  async createTenant(input: {
    organizationId: string;
    organizationName: string;
    organizationCode?: string;
  }) {
    const existing = await prisma.tenant.findFirst({
      where: {
        OR: [
          { organizationId: input.organizationId },
          ...(input.organizationCode ? [{ organizationCode: input.organizationCode }] : []),
        ],
      },
    });

    if (existing) {
      if (process.env.TIMETABLE_SEED_DEMO === 'true') {
        await seedService.seedTenantData(existing.organizationId);
      }
      return existing;
    }

    const tenant = await prisma.tenant.create({
      data: {
        organizationId: input.organizationId,
        organizationCode: input.organizationCode,
        organizationName: input.organizationName,
        status: TenantStatus.ACTIVE,
      },
    });

    if (process.env.TIMETABLE_SEED_DEMO === 'true') {
      await seedService.seedTenantData(tenant.organizationId);
    }
    return tenant;
  }
}

export const tenantService = new TenantService();
