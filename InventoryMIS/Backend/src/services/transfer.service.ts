import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { generateNumber } from '../utils/number-gen';

export class TransferService {
  async list(organizationId: string) {
    return prisma.stockTransfer.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        fromStore: { select: { id: true, name: true } },
        toStore: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async getById(organizationId: string, id: string) {
    const transfer = await prisma.stockTransfer.findFirst({
      where: { id, organizationId },
      include: {
        fromStore: true,
        toStore: true,
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
        },
      },
    });
    if (!transfer) throw new AppError(404, 'Stock transfer not found');
    return transfer;
  }

  async create(organizationId: string, userId: string, data: {
    fromStoreId: string; toStoreId: string; notes?: string;
    items: Array<{ productId: string; quantity: number; batchId?: string; unitCost?: number }>;
  }) {
    if (data.fromStoreId === data.toStoreId) throw new AppError(400, 'Cannot transfer to the same store');
    const transferNumber = await generateNumber(organizationId, 'TRF');
    const transfer = await prisma.stockTransfer.create({
      data: {
        organizationId,
        transferNumber,
        fromStoreId: data.fromStoreId,
        toStoreId: data.toStoreId,
        requestedBy: userId,
        status: 'PENDING',
        notes: data.notes,
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

    await prisma.activityLog.create({
      data: {
        organizationId, userId,
        action: 'TRANSFER_CREATED',
        metadata: { transferNumber, fromStore: data.fromStoreId, toStore: data.toStoreId },
      },
    });

    return transfer;
  }

  async approve(organizationId: string, id: string, userId: string) {
    const transfer = await this.getById(organizationId, id);
    if (transfer.status !== 'PENDING') throw new AppError(400, 'Only pending transfers can be approved');

    for (const item of transfer.items) {
      let remaining = Number(item.quantity);
      const batches = await prisma.inventoryBatch.findMany({
        where: {
          organizationId, productId: item.productId, storeId: transfer.fromStoreId,
          isActive: true, quantity: { gt: 0 },
        },
        orderBy: { expiryDate: 'asc' },
      });
      for (const batch of batches) {
        if (remaining <= 0) break;
        const deduct = Math.min(remaining, Number(batch.quantity));
        await prisma.inventoryBatch.update({
          where: { id: batch.id },
          data: { quantity: batch.quantity.minus(deduct) },
        });
        remaining -= deduct;
      }
    }

    return prisma.stockTransfer.update({
      where: { id },
      data: { status: 'IN_TRANSIT', approvedBy: userId, transferredAt: new Date() },
    });
  }

  async receive(organizationId: string, id: string, userId: string) {
    const transfer = await this.getById(organizationId, id);
    if (transfer.status !== 'IN_TRANSIT') throw new AppError(400, 'Only in-transit transfers can be received');

    for (const item of transfer.items) {
      const batch = transfer.items.find(i => i.id === item.id);
      await prisma.inventoryBatch.create({
        data: {
          organizationId,
          productId: item.productId,
          storeId: transfer.toStoreId,
          batchNumber: item.batchId ? (await prisma.inventoryBatch.findUnique({ where: { id: item.batchId! } }))?.batchNumber : undefined,
          quantity: item.quantity,
          unitCost: item.unitCost,
          receivedDate: new Date(),
        },
      });
    }

    return prisma.stockTransfer.update({
      where: { id },
      data: { status: 'RECEIVED', receivedBy: userId, receivedAt: new Date() },
    });
  }

  async reject(organizationId: string, id: string, reason?: string) {
    const transfer = await this.getById(organizationId, id);
    if (transfer.status !== 'PENDING') throw new AppError(400, 'Only pending transfers can be rejected');
    return prisma.stockTransfer.update({
      where: { id },
      data: { status: 'REJECTED', notes: reason || 'Rejected' },
    });
  }
}

export const transferService = new TransferService();
