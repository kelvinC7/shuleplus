import { prisma } from '../config/database';
import { fetchIamUser } from '../clients/iam.client';
import { AppError } from '../middleware/error.middleware';
import { fullNameFromParts, personNameFromAuth } from '../utils/person-name';

function generatePONumber(orgId: string): string {
  const date = new Date();
  const prefix = 'PO';
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${year}${month}-${random}`;
}

async function resolveUserDisplayName(userId: string, email?: string): Promise<string> {
  const profile = await fetchIamUser(userId);
  const fullName = fullNameFromParts(profile?.firstName, profile?.lastName);
  if (fullName) return fullName;
  return personNameFromAuth(email);
}

export class PurchaseOrderService {
  async list(organizationId: string, filters?: { status?: string; search?: string }) {
    const where: any = { organizationId };
    if (filters?.status && filters.status !== 'ALL') where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { poNumber: { contains: filters.search, mode: 'insensitive' } },
        { createdByName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { id: true, companyName: true } },
        purchaseRequest: { select: { id: true, prNumber: true } },
        items: true,
        _count: { select: { items: true } },
      },
    });
  }

  async getById(organizationId: string, id: string) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: {
        supplier: true,
        purchaseRequest: { include: { department: true } },
        items: true,
        goodsReceivings: { include: { items: true } },
      },
    });
    if (!po) throw new AppError(404, 'Purchase order not found');

    const displayName = await resolveUserDisplayName(po.createdBy, po.createdByName ?? undefined);
    return { ...po, createdByName: displayName || po.createdByName };
  }

  async create(organizationId: string, userId: string, userEmail: string, data: any) {
    const userName = await resolveUserDisplayName(userId, userEmail);
    const poNumber = generatePONumber(organizationId);
    const subtotal = data.items?.reduce(
      (sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0
    ) || 0;
    const discount = Number(data.discount) || 0;
    const tax = Number(data.tax) || 0;
    const shippingCost = Number(data.shippingCost) || 0;
    const totalAmount = subtotal - discount + tax + shippingCost;

    const po = await prisma.purchaseOrder.create({
      data: {
        organizationId,
        poNumber,
        prId: data.prId || null,
        supplierId: data.supplierId,
        expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
        deliveryAddress: data.deliveryAddress,
        subtotal,
        discount,
        tax,
        shippingCost,
        totalAmount,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
        status: 'DRAFT',
        createdBy: userId,
        createdByName: userName,
        items: {
          create: data.items?.map((item: any) => ({
            itemName: item.itemName,
            description: item.description,
            unit: item.unit,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.quantity) * Number(item.unitPrice),
          })) || [],
        },
      },
      include: { items: true, supplier: true },
    });

    if (data.prId) {
      await prisma.purchaseRequest.update({
        where: { id: data.prId },
        data: { status: 'CONVERTED_TO_PO' },
      });
    }

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action: 'PO_CREATED',
        entity: 'PurchaseOrder',
        entityId: po.id,
        metadata: { poNumber, totalAmount },
      },
    });

    return po;
  }

  async updateStatus(organizationId: string, id: string, status: string, userId: string) {
    await this.getById(organizationId, id);
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: status as any },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action: `PO_${status}`,
        entity: 'PurchaseOrder',
        entityId: id,
        metadata: { status },
      },
    });

    return updated;
  }

  async updatePaymentStatus(organizationId: string, id: string, paymentStatus: string) {
    await this.getById(organizationId, id);
    return prisma.purchaseOrder.update({
      where: { id },
      data: { paymentStatus: paymentStatus as any },
    });
  }

  async remove(organizationId: string, id: string) {
    const po = await this.getById(organizationId, id);
    if (po.status !== 'DRAFT') throw new AppError(400, 'Only draft orders can be deleted');
    return prisma.purchaseOrder.delete({ where: { id } });
  }
}

export const purchaseOrderService = new PurchaseOrderService();
