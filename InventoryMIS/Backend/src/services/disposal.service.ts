import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { generateNumber } from '../utils/number-gen';

export class DisposalService {
  async list(organizationId: string) {
    return prisma.disposal.findMany({
      where: { organizationId },
      orderBy: { disposalDate: 'desc' },
      include: {
        store: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async getById(organizationId: string, id: string) {
    const disposal = await prisma.disposal.findFirst({
      where: { id, organizationId },
      include: {
        store: true,
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
        },
      },
    });
    if (!disposal) throw new AppError(404, 'Disposal record not found');
    return disposal;
  }

  async create(organizationId: string, userId: string, data: {
    storeId: string; reason: string; disposalMethod?: string; notes?: string; disposalDate?: string;
    items: Array<{ productId: string; batchId?: string; quantity: number; unitCost?: number }>;
  }) {
    const disposalNumber = await generateNumber(organizationId, 'DSP');
    const disposal = await prisma.disposal.create({
      data: {
        organizationId,
        disposalNumber,
        storeId: data.storeId,
        disposedBy: userId,
        reason: data.reason,
        disposalMethod: data.disposalMethod,
        notes: data.notes,
        disposalDate: data.disposalDate ? new Date(data.disposalDate) : new Date(),
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            batchId: item.batchId,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of data.items) {
      if (item.batchId) {
        await prisma.inventoryBatch.update({
          where: { id: item.batchId },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    }

    await prisma.activityLog.create({
      data: {
        organizationId, userId,
        action: 'STOCK_DISPOSED',
        metadata: { disposalNumber, reason: data.reason, storeId: data.storeId },
      },
    });

    return disposal;
  }
}

export const disposalService = new DisposalService();
