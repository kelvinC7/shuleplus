import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { Prisma } from '@prisma/client';

function generateReturnNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `RTN-${year}${month}-${random}`;
}

export interface ReturnListFilters {
  status?: string;
  supplierId?: string;
  reason?: string;
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
  academicYear?: string;
  term?: string;
}

const returnInclude = {
  items: true,
  grn: {
    include: {
      purchaseOrder: {
        include: {
          supplier: true,
          purchaseRequest: { include: { department: true } },
        },
      },
    },
  },
} satisfies Prisma.GoodsReturnInclude;

export class GoodsReturnService {
  private buildWhere(organizationId: string, filters?: ReturnListFilters): Prisma.GoodsReturnWhereInput {
    const where: Prisma.GoodsReturnWhereInput = { organizationId };

    if (filters?.status && filters.status !== 'ALL') where.status = filters.status;
    if (filters?.supplierId) where.supplierId = filters.supplierId;
    if (filters?.reason && filters.reason !== 'ALL') where.reason = filters.reason;

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (filters?.departmentId || filters?.academicYear || filters?.term) {
      where.grn = { purchaseOrder: { purchaseRequest: {} } };
      if (filters.departmentId) {
        where.grn!.purchaseOrder!.purchaseRequest!.departmentId = filters.departmentId;
      }
      if (filters.academicYear) {
        where.grn!.purchaseOrder!.purchaseRequest!.academicYear = filters.academicYear;
      }
      if (filters.term) {
        where.grn!.purchaseOrder!.purchaseRequest!.term = filters.term;
      }
    }

    return where;
  }

  async list(organizationId: string, filters?: ReturnListFilters) {
    return prisma.goodsReturn.findMany({
      where: this.buildWhere(organizationId, filters),
      orderBy: { createdAt: 'desc' },
      include: returnInclude,
    });
  }

  async getSummary(organizationId: string) {
    const all = await prisma.goodsReturn.findMany({
      where: { organizationId },
      include: {
        items: true,
        grn: { include: { purchaseOrder: { include: { supplier: true } } } },
      },
    });

    const countStatus = (s: string) => all.filter((r) => r.status === s).length;
    const totalItems = all.reduce((n, r) => n + r.items.length, 0);
    const totalValue = all.reduce((s, r) => s + Number(r.returnValue ?? 0), 0);

    const bySupplier = new Map<string, { name: string; count: number; value: number }>();
    const byItem = new Map<string, number>();
    const byReason = new Map<string, number>();

    for (const ret of all) {
      const supplierName =
        ret.grn?.purchaseOrder?.supplier?.companyName ?? 'Unknown';
      const supplierId = ret.supplierId ?? 'unknown';
      const cur = bySupplier.get(supplierId) ?? { name: supplierName, count: 0, value: 0 };
      cur.count += 1;
      cur.value += Number(ret.returnValue ?? 0);
      bySupplier.set(supplierId, cur);
      byReason.set(ret.reason, (byReason.get(ret.reason) ?? 0) + 1);
      for (const item of ret.items) {
        byItem.set(item.itemName, (byItem.get(item.itemName) ?? 0) + Number(item.returnQty));
      }
    }

    const totalReturns = all.length || 1;
    const supplierReturnRate = [...bySupplier.values()]
      .map((s) => ({
        supplier: s.name,
        rate: Math.round((s.count / totalReturns) * 1000) / 10,
        value: s.value,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    const topItems = [...byItem.entries()]
      .map(([itemName, qty]) => ({ itemName, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const reasonTotal = [...byReason.values()].reduce((a, b) => a + b, 0) || 1;
    const reasonBreakdown = [...byReason.entries()]
      .map(([reason, count]) => ({
        reason,
        percentage: Math.round((count / reasonTotal) * 100),
      }))
      .sort((a, b) => b.percentage - a.percentage);

    return {
      totalReturns: all.length,
      pendingReturns: countStatus('PENDING_APPROVAL') + countStatus('DRAFT'),
      approvedReturns: countStatus('APPROVED'),
      itemsReturned: totalItems,
      returnValue: totalValue,
      awaitingReplacement: countStatus('REPLACEMENT_PENDING') + countStatus('SENT_TO_SUPPLIER'),
      creditNotes: countStatus('CREDIT_RECEIVED'),
      supplierReturnRate,
      topReturnedItems: topItems,
      returnReasons: reasonBreakdown,
    };
  }

  async getById(organizationId: string, id: string) {
    const ret = await prisma.goodsReturn.findFirst({
      where: { id, organizationId },
      include: returnInclude,
    });
    if (!ret) throw new AppError(404, 'Return not found');
    return ret;
  }

  async getGrnReturnContext(organizationId: string, grnId: string) {
    const grn = await prisma.goodsReceiving.findFirst({
      where: { id: grnId, organizationId },
      include: {
        items: true,
        returns: { include: { items: true } },
        purchaseOrder: { include: { items: true, supplier: true } },
      },
    });
    if (!grn) throw new AppError(404, 'GRN not found');

    const alreadyReturned = new Map<string, number>();
    for (const ret of grn.returns) {
      for (const item of ret.items) {
        if (item.grnItemId) {
          alreadyReturned.set(
            item.grnItemId,
            (alreadyReturned.get(item.grnItemId) ?? 0) + Number(item.returnQty),
          );
        }
      }
    }

    const lineItems = grn.items.map((item) => {
      const returned = alreadyReturned.get(item.id) ?? 0;
      const received = Number(item.acceptedQty);
      const returnable = Math.max(0, received - returned);
      const poItem = grn.purchaseOrder.items.find((p) => p.id === item.poItemId);
      return {
        grnItemId: item.id,
        itemName: item.itemName,
        receivedQty: received,
        returnableQty: returnable,
        unitPrice: poItem ? Number(poItem.unitPrice) : 0,
      };
    });

    return { grn, lineItems };
  }

  async create(organizationId: string, userId: string, userName: string, data: any) {
    const grn = await prisma.goodsReceiving.findFirst({
      where: { id: data.grnId, organizationId },
      include: { purchaseOrder: true, items: true },
    });
    if (!grn) throw new AppError(404, 'GRN not found');

    const returnNumber = generateReturnNumber();
    let returnValue = 0;
    const items = (data.items ?? []).filter((i: any) => Number(i.returnQty) > 0);

    for (const item of items) {
      returnValue += Number(item.returnQty) * (Number(item.unitPrice) || 0);
    }

    const ret = await prisma.goodsReturn.create({
      data: {
        organizationId,
        returnNumber,
        grnId: data.grnId,
        poId: grn.poId,
        supplierId: grn.purchaseOrder.supplierId,
        reason: data.reason,
        reasonDescription: data.reasonDescription,
        resolution: data.resolution,
        status: data.status ?? 'PENDING_APPROVAL',
        returnValue,
        createdBy: userId,
        createdByName: userName,
        items: {
          create: items.map((item: any) => ({
            grnItemId: item.grnItemId,
            itemName: item.itemName,
            receivedQty: Number(item.receivedQty),
            returnQty: Number(item.returnQty),
            unitPrice: Number(item.unitPrice) || 0,
            reason: item.reason ?? data.reason,
          })),
        },
      },
      include: returnInclude,
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        userName,
        action: 'GOODS_RETURN_CREATED',
        entity: 'GoodsReturn',
        entityId: ret.id,
        metadata: { returnNumber, grnNumber: grn.grnNumber },
      },
    });

    return ret;
  }

  async updateStatus(organizationId: string, id: string, status: string) {
    await this.getById(organizationId, id);
    return prisma.goodsReturn.update({
      where: { id },
      data: { status },
      include: returnInclude,
    });
  }
}

export const goodsReturnService = new GoodsReturnService();
