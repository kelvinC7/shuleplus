import { TenantStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { departmentService } from './department.service';

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
      await departmentService.seedDefaults(existing.organizationId);
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

    await departmentService.seedDefaults(tenant.organizationId);
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
