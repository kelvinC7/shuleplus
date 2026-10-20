import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class SupplierDeliveryService {
  async list(organizationId: string, query?: { status?: string; supplierId?: string }) {
    const where: any = { organizationId };
    if (query?.status) where.status = query.status;
    if (query?.supplierId) where.supplierId = query.supplierId;

    return prisma.supplierDelivery.findMany({
      where,
      include: { items: true },
      orderBy: { deliveryDate: 'desc' },
    });
  }

  async getById(organizationId: string, id: string) {
    const delivery = await prisma.supplierDelivery.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!delivery) throw new AppError(404, 'Supplier delivery not found');
    return delivery;
  }

  async create(organizationId: string, userId: string, data: any) {
    const { items, ...deliveryData } = data;
    return prisma.supplierDelivery.create({
      data: {
        organizationId,
        receivedBy: userId,
        ...deliveryData,
        items: items ? { create: items.map((i: any) => ({ ...i })) } : undefined,
      },
      include: { items: true },
    });
  }

  async update(organizationId: string, id: string, data: any) {
    const existing = await prisma.supplierDelivery.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Supplier delivery not found');

    const { items, ...deliveryData } = data;

    return prisma.$transaction(async (tx) => {
      if (items) {
        await tx.supplierDeliveryItem.deleteMany({ where: { deliveryId: id } });
      }
      return tx.supplierDelivery.update({
        where: { id },
        data: {
          ...deliveryData,
          ...(items && { items: { create: items.map((i: any) => ({ ...i })) } }),
        },
        include: { items: true },
      });
    });
  }

  async remove(organizationId: string, id: string) {
    const existing = await prisma.supplierDelivery.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Supplier delivery not found');
    if (existing.status === 'DELIVERED') throw new AppError(400, 'Cannot delete delivered records');
    await prisma.supplierDelivery.delete({ where: { id } });
  }
}

export const supplierDeliveryService = new SupplierDeliveryService();
