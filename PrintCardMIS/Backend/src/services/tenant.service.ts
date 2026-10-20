import { TenantStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

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
      return existing;
    }

    return prisma.tenant.create({
      data: {
        organizationId: input.organizationId,
        organizationCode: input.organizationCode,
        organizationName: input.organizationName,
        status: TenantStatus.ACTIVE,
      },
    });
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
