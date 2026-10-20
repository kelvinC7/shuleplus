import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { Prisma } from '@prisma/client';

function generateGRNNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `GRN-${year}${month}-${random}`;
}

const grnInclude = {
  items: true,
  purchaseOrder: {
    include: {
      supplier: true,
      items: true,
      purchaseRequest: { include: { department: true } },
    },
  },
} satisfies Prisma.GoodsReceivingInclude;

export interface GrnListFilters {
  status?: string;
  supplierId?: string;
  poId?: string;
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
  receivedBy?: string;
  academicYear?: string;
  term?: string;
}

export class GoodsReceivingService {
  private buildWhere(organizationId: string, filters?: GrnListFilters): Prisma.GoodsReceivingWhereInput {
    const where: Prisma.GoodsReceivingWhereInput = { organizationId };

    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }
    if (filters?.poId) where.poId = filters.poId;
    if (filters?.receivedBy) where.receivedBy = filters.receivedBy;

    if (filters?.dateFrom || filters?.dateTo) {
      where.receivedDate = {};
      if (filters.dateFrom) where.receivedDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.receivedDate.lte = end;
      }
    }

    if (filters?.supplierId || filters?.departmentId || filters?.academicYear || filters?.term) {
      where.purchaseOrder = {};
      if (filters.supplierId) {
        where.purchaseOrder.supplierId = filters.supplierId;
      }
      if (filters.departmentId || filters.academicYear || filters.term) {
        where.purchaseOrder.purchaseRequest = {};
        if (filters.departmentId) {
          where.purchaseOrder.purchaseRequest.departmentId = filters.departmentId;
        }
        if (filters.academicYear) {
          where.purchaseOrder.purchaseRequest.academicYear = filters.academicYear;
        }
        if (filters.term) {
          where.purchaseOrder.purchaseRequest.term = filters.term;
        }
      }
    }

    return where;
  }

  async list(organizationId: string, filters?: GrnListFilters) {
    return prisma.goodsReceiving.findMany({
      where: this.buildWhere(organizationId, filters),
      orderBy: { createdAt: 'desc' },
      include: grnInclude,
    });
  }

  async getSummary(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const all = await prisma.goodsReceiving.findMany({
      where: { organizationId },
      include: {
        items: true,
        purchaseOrder: { include: { items: true } },
      },
    });

    let totalValue = 0;
    let rejectedItems = 0;

    for (const grn of all) {
      for (const item of grn.items) {
        const poItem = grn.purchaseOrder.items.find((p) => p.id === item.poItemId);
        const price = poItem ? Number(poItem.unitPrice) : 0;
        totalValue += Number(item.acceptedQty) * price;
        rejectedItems += Number(item.rejectedQty) + Number(item.damagedQty);
      }
    }

    const receivedToday = all.filter(
      (g) => g.receivedDate >= today && g.receivedDate < tomorrow,
    ).length;

    const countByStatus = (status: string) =>
      all.filter((g) => g.status === status).length;

    return {
      totalReceipts: all.length,
      receivedToday,
      pendingInspection: countByStatus('PENDING_INSPECTION') + countByStatus('DRAFT'),
      partiallyReceived: countByStatus('PARTIALLY_RECEIVED'),
      fullyReceived: countByStatus('FULLY_RECEIVED') + countByStatus('ACCEPTED'),
      rejectedItems,
      totalReceivedValue: totalValue,
    };
  }

  async getById(organizationId: string, id: string) {
    const grn = await prisma.goodsReceiving.findFirst({
      where: { id, organizationId },
      include: grnInclude,
    });
    if (!grn) throw new AppError(404, 'Goods receiving not found');
    return grn;
  }

  async getPoReceivingContext(organizationId: string, poId: string) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: poId, organizationId },
      include: {
        supplier: true,
        items: true,
        purchaseRequest: { include: { department: true } },
        goodsReceivings: { include: { items: true } },
      },
    });
    if (!po) throw new AppError(404, 'Purchase order not found');

    const previouslyReceived = new Map<string, number>();
    for (const grn of po.goodsReceivings) {
      for (const item of grn.items) {
        previouslyReceived.set(
          item.poItemId,
          (previouslyReceived.get(item.poItemId) ?? 0) + Number(item.receivedQty),
        );
      }
    }

    const lineItems = po.items.map((item) => {
      const prev = previouslyReceived.get(item.id) ?? 0;
      const ordered = Number(item.quantity);
      return {
        poItemId: item.id,
        itemName: item.itemName,
        description: item.description,
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        orderedQty: ordered,
        previouslyReceived: prev,
        remainingQty: Math.max(0, ordered - prev),
      };
    });

    return { purchaseOrder: po, lineItems };
  }

  async create(organizationId: string, userId: string, userName: string, data: any) {
    const grnNumber = generateGRNNumber();
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: data.poId, organizationId },
      include: { items: true, goodsReceivings: { include: { items: true } } },
    });
    if (!po) throw new AppError(404, 'Purchase order not found');

    const previouslyReceived = new Map<string, number>();
    for (const grn of po.goodsReceivings) {
      for (const item of grn.items) {
        previouslyReceived.set(
          item.poItemId,
          (previouslyReceived.get(item.poItemId) ?? 0) + Number(item.receivedQty),
        );
      }
    }

    let totalOrdered = 0;
    let totalAfterReceipt = 0;
    let hasRejection = false;

    for (const poItem of po.items) {
      const ordered = Number(poItem.quantity);
      const prev = previouslyReceived.get(poItem.id) ?? 0;
      totalOrdered += ordered;

      const incoming = data.items?.find((i: any) => i.poItemId === poItem.id);
      const receivingNow = incoming ? Number(incoming.receivedQty) || 0 : 0;
      totalAfterReceipt += prev + receivingNow;

      if (incoming && (Number(incoming.rejectedQty) > 0 || incoming.qualityStatus === 'REJECTED')) {
        hasRejection = true;
      }
    }

    let grnStatus = data.status ?? 'PENDING_INSPECTION';
    if (!data.status) {
      if (totalAfterReceipt >= totalOrdered && !hasRejection) {
        grnStatus = 'FULLY_RECEIVED';
      } else if (totalAfterReceipt > 0) {
        grnStatus = hasRejection ? 'PARTIALLY_RECEIVED' : 'PARTIALLY_RECEIVED';
      }
    }

    const grn = await prisma.goodsReceiving.create({
      data: {
        organizationId,
        grnNumber,
        poId: data.poId,
        receivedBy: userId,
        receivedByName: userName,
        notes: data.notes,
        inspectionNotes: data.inspectionNotes,
        barcode: data.barcode,
        status: grnStatus,
        items: {
          create:
            data.items?.map((item: any) => ({
              poItemId: item.poItemId,
              itemName: item.itemName,
              orderedQty: Number(item.orderedQty),
              receivedQty: Number(item.receivedQty),
              acceptedQty: Number(item.acceptedQty ?? item.receivedQty),
              rejectedQty: Number(item.rejectedQty) || 0,
              damagedQty: Number(item.damagedQty) || 0,
              condition: item.condition,
              qualityStatus: item.qualityStatus,
              warehouseLocation: item.warehouseLocation,
              batchNumber: item.batchNumber,
              serialNumber: item.serialNumber,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
              warrantyMonths: item.warrantyMonths ? Number(item.warrantyMonths) : null,
              itemNotes: item.itemNotes,
            })) || [],
        },
      },
      include: grnInclude,
    });

    for (const item of data.items ?? []) {
      const poItem = po.items.find((p) => p.id === item.poItemId);
      if (!poItem) continue;
      const prev = previouslyReceived.get(item.poItemId) ?? 0;
      const newReceived = prev + Number(item.receivedQty);
      await prisma.purchaseOrderItem.update({
        where: { id: item.poItemId },
        data: { receivedQty: newReceived },
      });
    }

    const allReceived = po.items.every((poItem) => {
      const prev = previouslyReceived.get(poItem.id) ?? 0;
      const incoming = data.items?.find((i: any) => i.poItemId === poItem.id);
      const receivingNow = incoming ? Number(incoming.receivedQty) || 0 : 0;
      return prev + receivingNow >= Number(poItem.quantity);
    });

    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: allReceived ? 'DELIVERED' : 'PARTIALLY_DELIVERED',
      },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        userName,
        action: 'GOODS_RECEIVED',
        entity: 'GoodsReceiving',
        entityId: grn.id,
        metadata: { grnNumber, poNumber: po.poNumber },
      },
    });

    return grn;
  }

  async getByPoId(organizationId: string, poId: string) {
    return prisma.goodsReceiving.findMany({
      where: { organizationId, poId },
      include: grnInclude,
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const goodsReceivingService = new GoodsReceivingService();
