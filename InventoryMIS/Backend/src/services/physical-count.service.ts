import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { generateNumber } from '../utils/number-gen';

export class PhysicalCountService {
  async list(organizationId: string) {
    return prisma.physicalStockCount.findMany({
      where: { organizationId },
      orderBy: { countDate: 'desc' },
      include: {
        store: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async getById(organizationId: string, id: string) {
    const count = await prisma.physicalStockCount.findFirst({
      where: { id, organizationId },
      include: {
        store: true,
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
        },
      },
    });
    if (!count) throw new AppError(404, 'Stock count not found');
    return count;
  }

  async create(organizationId: string, userId: string, data: {
    storeId: string; countType: string; notes?: string; countDate?: string;
    items: Array<{ productId: string; systemQty: number; actualQty: number; notes?: string }>;
  }) {
    const countNumber = await generateNumber(organizationId, 'CNT');
    const count = await prisma.physicalStockCount.create({
      data: {
        organizationId,
        countNumber,
        storeId: data.storeId,
        countType: data.countType,
        countedBy: userId,
        notes: data.notes,
        countDate: data.countDate ? new Date(data.countDate) : new Date(),
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            systemQty: item.systemQty,
            actualQty: item.actualQty,
            variance: item.actualQty - item.systemQty,
            notes: item.notes,
          })),
        },
      },
      include: { items: true },
    });

    await prisma.activityLog.create({
      data: {
        organizationId, userId,
        action: 'PHYSICAL_COUNT_CREATED',
        metadata: { countNumber, storeId: data.storeId, countType: data.countType },
      },
    });

    return count;
  }

  async complete(organizationId: string, id: string, userId: string) {
    const count = await this.getById(organizationId, id);
    if (count.status !== 'IN_PROGRESS') throw new AppError(400, 'Only in-progress counts can be completed');
    return prisma.physicalStockCount.update({
      where: { id },
      data: { status: 'COMPLETED', verifiedBy: userId },
    });
  }
}

export const physicalCountService = new PhysicalCountService();
