import { prisma } from '../config/database';
import { DEFAULT_CATALOG_ITEMS } from '../constants/shule-avance.constants';
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
      include: { catalogItems: true },
    });

    if (existing) {
      if (existing.catalogItems.length === 0) {
        await this.seedCatalog(existing.organizationId);
      }
      return existing;
    }

    const tenant = await prisma.tenant.create({
      data: {
        organizationId: input.organizationId,
        organizationCode: input.organizationCode,
        organizationName: input.organizationName,
        status: 'ACTIVE',
      },
    });

    await this.seedCatalog(tenant.organizationId);
    return tenant;
  }

  async seedCatalog(organizationId: string) {
    for (const item of DEFAULT_CATALOG_ITEMS) {
      await prisma.shuleAvanceCatalogItem.upsert({
        where: {
          organizationId_slug: { organizationId, slug: item.slug },
        },
        update: {
          name: item.name,
          type: item.type,
          description: item.description,
          icon: item.icon,
          sortOrder: item.sortOrder,
          isActive: true,
        },
        create: {
          organizationId,
          slug: item.slug,
          name: item.name,
          type: item.type,
          description: item.description,
          icon: item.icon,
          sortOrder: item.sortOrder,
        },
      });
    }
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
