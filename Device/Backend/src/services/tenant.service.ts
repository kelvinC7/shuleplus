import { TenantStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { seedOrganizationDemo } from './seed.service';

export class TenantService {
  async createTenant(input: {
    organizationId: string;
    organizationName: string;
    organizationCode?: string;
    province?: string;
    district?: string;
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
      return existing;
    }

    const tenant = await prisma.tenant.create({
      data: {
        organizationId: input.organizationId,
        organizationCode: input.organizationCode,
        organizationName: input.organizationName,
        province: input.province,
        district: input.district,
        status: TenantStatus.ACTIVE,
      },
    });

    await seedOrganizationDemo(tenant.organizationId, tenant.organizationName);
    return tenant;
  }

  async getTenant(organizationRef: string) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ organizationId: organizationRef }, { organizationCode: organizationRef }],
      },
    });
    if (!tenant) throw new AppError(404, 'Tenant not found');
    return tenant;
  }
}

export const tenantService = new TenantService();
