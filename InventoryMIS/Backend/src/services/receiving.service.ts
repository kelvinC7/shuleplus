import { prisma } from '../config/database';
import type { Prisma } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { generateNumber } from '../utils/number-gen';

export interface ReceivingListFilters {
  search?: string;
  supplierId?: string;
  storeId?: string;
  dateFrom?: string;
  dateTo?: string;
}

function formatStockQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : parseFloat(value.toFixed(2)).toString();
}

export class ReceivingService {
  async list(organizationId: string, filters: ReceivingListFilters = {}) {
    const where: Prisma.StockReceivingWhereInput = {
      organizationId,
    };

    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.storeId) where.storeId = filters.storeId;

    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { grnNumber: { contains: q, mode: 'insensitive' } },
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { deliveryNoteNumber: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.receivedDate = {};
      if (filters.dateFrom) where.receivedDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.receivedDate.lte = end;
      }
    }

    return prisma.stockReceiving.findMany({
      where,
      orderBy: { receivedDate: 'desc' },
      include: {
        store: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async getById(organizationId: string, id: string) {
    const receiving = await prisma.stockReceiving.findFirst({
      where: { id, organizationId },
      include: {
        store: true,
        supplier: true,
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
        },
      },
    });
    if (!receiving) throw new AppError(404, 'Goods Received Note not found');
    return receiving;
  }

  async create(organizationId: string, userId: string, data: {
    storeId: string; supplierId?: string; invoiceNumber?: string;
    deliveryNoteNumber?: string; notes?: string; receivedDate?: string;
    stockRequestId?: string;
    items: Array<{ productId: string; quantity: number; unitCost?: number; batchNumber?: string; expiryDate?: string; manufacturingDate?: string }>;
  }) {
    const grnNumber = await generateNumber(organizationId, 'GRN');

    const receiving = await prisma.$transaction(async (tx) => {
      const rec = await tx.stockReceiving.create({
        data: {
          organizationId,
          grnNumber,
          storeId: data.storeId,
          supplierId: data.supplierId,
          stockRequestId: data.stockRequestId,
          invoiceNumber: data.invoiceNumber,
          deliveryNoteNumber: data.deliveryNoteNumber,
          receivedBy: userId,
          notes: data.notes,
          receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
              manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : undefined,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of data.items) {
        await tx.inventoryBatch.create({
          data: {
            organizationId,
            productId: item.productId,
            storeId: data.storeId,
            batchNumber: item.batchNumber,
            quantity: item.quantity,
            unitCost: item.unitCost,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
            manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : undefined,
          },
        });
      }

      // If linked to a stock request, mark it as ISSUED
      if (data.stockRequestId) {
        await tx.stockRequest.update({
          where: { id: data.stockRequestId },
          data: { status: 'ISSUED', issuedAsIssueId: rec.id },
        });
      }

      return rec;
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action: 'STOCK_RECEIVED',
        metadata: { grnNumber, storeId: data.storeId, itemCount: data.items.length, stockRequestId: data.stockRequestId },
      },
    });

    return receiving;
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      supplierId?: string | null;
      invoiceNumber?: string | null;
      deliveryNoteNumber?: string | null;
      notes?: string | null;
      receivedDate?: string;
    }
  ) {
    await this.getById(organizationId, id);

    return prisma.stockReceiving.update({
      where: { id },
      data: {
        supplierId: data.supplierId === undefined ? undefined : data.supplierId || null,
        invoiceNumber: data.invoiceNumber === undefined ? undefined : data.invoiceNumber || null,
        deliveryNoteNumber:
          data.deliveryNoteNumber === undefined ? undefined : data.deliveryNoteNumber || null,
        notes: data.notes === undefined ? undefined : data.notes || null,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : undefined,
      },
      include: {
        store: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const receiving = await this.getById(organizationId, id);

    await prisma.$transaction(async (tx) => {
      const blockers: string[] = [];

      for (const item of receiving.items ?? []) {
        const qty = Number(item.quantity);
        const batchWhere = {
          organizationId,
          productId: item.productId,
          storeId: receiving.storeId,
          isActive: true,
          ...(item.batchNumber ? { batchNumber: item.batchNumber } : { batchNumber: null }),
        };

        const batch = await tx.inventoryBatch.findFirst({
          where: { ...batchWhere, quantity: { gte: qty } },
          orderBy: { createdAt: 'desc' },
        });

        if (!batch) {
          const matchingBatches = await tx.inventoryBatch.findMany({ where: batchWhere });
          const availableQty = matchingBatches.reduce((sum, b) => sum + Number(b.quantity), 0);
          const productName = item.product?.name ?? 'Unknown product';
          const unit = item.product?.unitOfMeasure?.trim();
          const unitSuffix = unit ? ` ${unit}` : '';
          blockers.push(
            `${productName}: only ${formatStockQuantity(availableQty)}${unitSuffix} in stock, GRN had ${formatStockQuantity(qty)}${unitSuffix}`
          );
        }
      }

      if (blockers.length > 0) {
        throw new AppError(
          400,
          `Cannot delete this GRN — ${blockers.join('; ')}. Received stock may already have been issued or adjusted.`
        );
      }

      for (const item of receiving.items ?? []) {
        const qty = Number(item.quantity);
        const batch = await tx.inventoryBatch.findFirst({
          where: {
            organizationId,
            productId: item.productId,
            storeId: receiving.storeId,
            isActive: true,
            quantity: { gte: qty },
            ...(item.batchNumber ? { batchNumber: item.batchNumber } : { batchNumber: null }),
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!batch) {
          throw new AppError(400, 'Cannot delete this GRN — stock changed while deleting. Please try again.');
        }

        const batchQty = Number(batch.quantity);
        if (batchQty === qty) {
          await tx.inventoryBatch.delete({ where: { id: batch.id } });
        } else {
          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: { quantity: batchQty - qty },
          });
        }
      }

      await tx.stockReceiving.delete({ where: { id: receiving.id } });
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        action: 'STOCK_RECEIVED_DELETED',
        metadata: { grnNumber: receiving.grnNumber, itemCount: receiving.items?.length ?? 0 },
      },
    });
  }

  async createFromStockRequest(organizationId: string, stockRequestId: string, userId: string, data: {
    notes?: string;
    receivedDate?: string;
    items: Array<{ stockRequestItemId?: string; productId: string; quantity: number; unitCost?: number; batchNumber?: string; expiryDate?: string; manufacturingDate?: string }>;
  }) {
    // Look up the stock request
    const stockRequest = await prisma.stockRequest.findFirst({
      where: { id: stockRequestId, organizationId },
      include: { items: true, store: true },
    });
    if (!stockRequest) throw new AppError(404, 'Stock request not found');
    if (stockRequest.status !== 'APPROVED') throw new AppError(400, 'Only approved requests can receive goods');

    const grnNumber = await generateNumber(organizationId, 'GRN');

    const receiving = await prisma.$transaction(async (tx) => {
      // Create the GRN
      const rec = await tx.stockReceiving.create({
        data: {
          organizationId,
          grnNumber,
          storeId: stockRequest.storeId,
          stockRequestId: stockRequest.id,
          receivedBy: userId,
          notes: data.notes || `GRN for ${stockRequest.requestNumber}`,
          receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
              manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : undefined,
            })),
          },
        },
        include: { items: true },
      });

      // Create inventory batches (stock goes up)
      for (const item of data.items) {
        await tx.inventoryBatch.create({
          data: {
            organizationId,
            productId: item.productId,
            storeId: stockRequest.storeId,
            batchNumber: item.batchNumber,
            quantity: item.quantity,
            unitCost: item.unitCost,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
            manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : undefined,
          },
        });
      }

      // Mark stock request as ISSUED
      await tx.stockRequest.update({
        where: { id: stockRequestId },
        data: { status: 'ISSUED', issuedAsIssueId: rec.id },
      });

      return rec;
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action: 'STOCK_RECEIVED',
        metadata: { grnNumber, stockRequestNumber: stockRequest.requestNumber, itemCount: data.items.length },
      },
    });

    return receiving;
  }
}

export const receivingService = new ReceivingService();
