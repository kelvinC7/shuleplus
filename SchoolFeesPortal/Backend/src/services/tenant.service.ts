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
      await seedService.ensureFeeCategories(existing.organizationId);
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

    await seedService.ensureFeeCategories(tenant.organizationId);
    return tenant;
  }

  async ensureTenant(input: {
    organizationId: string;
    organizationName: string;
    organizationCode?: string;
  }) {
    return this.createTenant(input);
  }
}

export const tenantService = new TenantService();
