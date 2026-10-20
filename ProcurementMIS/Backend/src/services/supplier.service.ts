import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class SupplierService {
  async list(organizationId: string) {
    return prisma.supplier.findMany({
      where: { organizationId },
      orderBy: { companyName: 'asc' },
      include: {
        _count: { select: { purchaseOrders: true, contracts: true } },
        performanceRecords: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async getById(organizationId: string, id: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, organizationId },
      include: {
        contracts: { orderBy: { endDate: 'desc' } },
        purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 10 },
        performanceRecords: { orderBy: { createdAt: 'desc' }, take: 4 },
        _count: { select: { purchaseOrders: true, contracts: true } },
      },
    });
    if (!supplier) throw new AppError(404, 'Supplier not found');
    return supplier;
  }

  async create(organizationId: string, data: any) {
    const existing = await prisma.supplier.findFirst({
      where: { organizationId, companyName: data.companyName },
    });
    if (existing) throw new AppError(409, 'Supplier with this company name already exists');

    return prisma.supplier.create({
      data: { organizationId, ...data },
    });
  }

  async update(organizationId: string, id: string, data: any) {
    await this.getById(organizationId, id);
    if (data.companyName) {
      const existing = await prisma.supplier.findFirst({
        where: { organizationId, companyName: data.companyName, id: { not: id } },
      });
      if (existing) throw new AppError(409, 'Company name already in use');
    }
    return prisma.supplier.update({ where: { id }, data });
  }

  async getPerformance(organizationId: string, supplierId: string) {
    await this.getById(organizationId, supplierId);
    return prisma.supplierPerformance.findMany({
      where: { supplierId, organizationId },
      orderBy: { period: 'desc' },
    });
  }

  async addPerformance(organizationId: string, supplierId: string, data: any) {
    await this.getById(organizationId, supplierId);
    return prisma.supplierPerformance.create({
      data: { supplierId, organizationId, ...data },
    });
  }

  async summary(organizationId: string) {
    const [active, preferred, blacklisted, total, expiringContracts] = await Promise.all([
      prisma.supplier.count({ where: { organizationId, status: 'ACTIVE' } }),
      prisma.supplier.count({ where: { organizationId, status: 'PREFERRED' } }),
      prisma.supplier.count({ where: { organizationId, status: 'BLACKLISTED' } }),
      prisma.supplier.count({ where: { organizationId } }),
      prisma.contract.count({
        where: {
          organizationId,
          status: 'ACTIVE',
          endDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const avgRating = await prisma.supplier.aggregate({
      where: { organizationId, rating: { not: null } },
      _avg: { rating: true },
    });

    return {
      activeSuppliers: active,
      preferredSuppliers: preferred,
      blacklistedSuppliers: blacklisted,
      totalSuppliers: total,
      contractsExpiring: expiringContracts,
      averageRating: Number(avgRating._avg.rating ?? 0),
    };
  }
}

export const supplierService = new SupplierService();
