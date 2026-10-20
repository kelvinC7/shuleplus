import { TenantStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export interface ProvisionInput {
  organizationId: string;
  organizationCode?: string;
  organizationName: string;
}

export class TenantService {
  /** Idempotent upsert used by IAM when a module license is granted (service-to-service). */
  async provision(input: ProvisionInput): Promise<{ id: string; organizationId: string }> {
    if (!input.organizationId?.trim() || !input.organizationName?.trim()) {
      throw new AppError(400, 'organizationId and organizationName are required');
    }
    const tenant = await prisma.tenant.upsert({
      where: { organizationId: input.organizationId },
      update: {
        organizationCode: input.organizationCode?.trim() || null,
        organizationName: input.organizationName.trim(),
      },
      create: {
        organizationId: input.organizationId,
        organizationCode: input.organizationCode?.trim() || null,
        organizationName: input.organizationName.trim(),
      },
    });
    return { id: tenant.id, organizationId: tenant.organizationId };
  }

  async setStatus(organizationId: string, status: TenantStatus): Promise<void> {
    const result = await prisma.tenant.updateMany({
      where: { organizationId },
      data: { status },
    });
    if (result.count === 0) throw new AppError(404, 'Tenant not found');
  }

  async getByOrganization(organizationId: string) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ organizationId }, { organizationCode: organizationId }],
      },
    });
    if (!tenant) throw new AppError(404, 'Tenant not provisioned for this organization');
    return tenant;
  }
}

export const tenantService = new TenantService();
