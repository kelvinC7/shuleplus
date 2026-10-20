import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class StoreService {
  async list(organizationId: string) {
    const stores = await prisma.store.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { shelves: true, batches: true } } },
    });

    const productCounts = await prisma.inventoryBatch.groupBy({
      by: ['storeId'],
      where: { organizationId, storeId: { not: null } },
      _count: { productId: true },
    });

    const countMap = new Map<string, number>();
    productCounts.forEach(pc => {
      if (pc.storeId) countMap.set(pc.storeId, pc._count.productId);
    });

    return stores.map(s => ({
      ...s,
      _count: {
        ...s._count,
        products: countMap.get(s.id) || 0,
      },
    }));
  }

  async getById(organizationId: string, id: string) {
    const store = await prisma.store.findFirst({
      where: { id, organizationId },
      include: {
        shelves: { where: { isActive: true }, orderBy: { name: 'asc' } },
        _count: { select: { batches: true } },
      },
    });
    if (!store) throw new AppError(404, 'Store not found');
    return store;
  }

  async create(organizationId: string, data: {
    name: string; code: string; type?: string; location?: string;
    managerName?: string; managerContact?: string;
  }) {
    const existing = await prisma.store.findUnique({
      where: { organizationId_code: { organizationId, code: data.code } },
    });
    if (existing) throw new AppError(409, 'Store with this code already exists');
    return prisma.store.create({
      data: { organizationId, ...data, type: (data.type as any) || 'BRANCH' },
    });
  }

  async update(organizationId: string, id: string, data: Partial<{
    name: string; code: string; type: string; location: string;
    managerName: string; managerContact: string; isActive: boolean;
  }>) {
    await this.getById(organizationId, id);
    if (data.code) {
      const existing = await prisma.store.findFirst({
        where: { organizationId, code: data.code, id: { not: id } },
      });
      if (existing) throw new AppError(409, 'Code already in use');
    }
    return prisma.store.update({ where: { id }, data: data as any });
  }

  async remove(organizationId: string, id: string) {
    await this.getById(organizationId, id);
    const batchCount = await prisma.inventoryBatch.count({ where: { storeId: id } });
    if (batchCount > 0) throw new AppError(400, 'Cannot delete store with inventory. Archive it instead.');
    return prisma.store.update({ where: { id }, data: { isActive: false } });
  }

  async listShelves(organizationId: string, storeId: string) {
    await this.getById(organizationId, storeId);
    return prisma.storeShelf.findMany({
      where: { organizationId, storeId },
      orderBy: { name: 'asc' },
    });
  }

  async createShelf(organizationId: string, storeId: string, data: { name: string; code: string; description?: string }) {
    await this.getById(organizationId, storeId);
    const existing = await prisma.storeShelf.findUnique({
      where: { storeId_code: { storeId, code: data.code } },
    });
    if (existing) throw new AppError(409, 'Shelf with this code already exists in this store');
    return prisma.storeShelf.create({
      data: { organizationId, storeId, ...data },
    });
  }
}

export const storeService = new StoreService();
