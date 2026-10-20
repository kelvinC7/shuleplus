import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class TenantService {
  async create(data: { organizationId: string; organizationCode?: string; organizationName: string }) {
    const existing = await prisma.tenant.findFirst({
      where: {
        OR: [
          { organizationId: data.organizationId },
          ...(data.organizationCode ? [{ organizationCode: data.organizationCode }] : []),
        ],
      },
    });
    if (existing) {
      if (existing.status !== 'ACTIVE') {
        return prisma.tenant.update({
          where: { id: existing.id },
          data: {
            status: 'ACTIVE',
            organizationName: data.organizationName,
            organizationCode: data.organizationCode ?? existing.organizationCode,
          },
        });
      }
      return existing;
    }

    return prisma.tenant.create({
      data: {
        organizationId: data.organizationId,
        organizationCode: data.organizationCode ?? data.organizationId,
        organizationName: data.organizationName,
        status: 'ACTIVE',
      },
    });
  }

  async ensure(data: { organizationId: string; organizationCode?: string; organizationName: string }) {
    return this.create(data);
  }

  async getByOrganizationId(organizationId: string) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ organizationId }, { organizationCode: organizationId }],
        status: 'ACTIVE',
      },
    });
    if (!tenant) throw new AppError(404, 'Tenant not found');
    return tenant;
  }
}

export const tenantService = new TenantService();
