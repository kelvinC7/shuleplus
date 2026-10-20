import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { generateNumber } from '../utils/number-gen';

export class AdjustmentService {
  async list(organizationId: string) {
    return prisma.stockAdjustment.findMany({
      where: { organizationId },
      orderBy: { adjustmentDate: 'desc' },
      include: {
        store: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async getById(organizationId: string, id: string) {
    const adjustment = await prisma.stockAdjustment.findFirst({
      where: { id, organizationId },
      include: {
        store: true,
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
        },
      },
    });
    if (!adjustment) throw new AppError(404, 'Stock adjustment not found');
    return adjustment;
  }

  async create(organizationId: string, userId: string, data: {
    storeId: string; reason: string; reasonDescription?: string; notes?: string; adjustmentDate?: string;
    items: Array<{
      productId: string; batchId?: string; expectedQty: number; actualQty: number; unitCost?: number;
    }>;
  }) {
    const adjustmentNumber = await generateNumber(organizationId, 'ADJ');
    const adjustment = await prisma.stockAdjustment.create({
      data: {
        organizationId,
        adjustmentNumber,
        storeId: data.storeId,
        reason: data.reason as any,
        reasonDescription: data.reasonDescription,
        adjustedBy: userId,
        notes: data.notes,
        adjustmentDate: data.adjustmentDate ? new Date(data.adjustmentDate) : new Date(),
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            batchId: item.batchId,
            expectedQty: item.expectedQty,
            actualQty: item.actualQty,
            difference: item.actualQty - item.expectedQty,
            unitCost: item.unitCost,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of data.items) {
      const diff = item.actualQty - item.expectedQty;
      if (diff !== 0 && item.batchId) {
        await prisma.inventoryBatch.update({
          where: { id: item.batchId },
          data: { quantity: { increment: diff } },
        });
      }
    }

    await prisma.activityLog.create({
      data: {
        organizationId, userId,
        action: 'STOCK_ADJUSTED',
        metadata: { adjustmentNumber, reason: data.reason, storeId: data.storeId },
      },
    });

    return adjustment;
  }
}

export const adjustmentService = new AdjustmentService();
