import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class SupplierService {
  async list(organizationId: string) {
    return prisma.supplier.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true, receivings: true } } },
    });
  }

  async getById(organizationId: string, id: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, organizationId },
      include: {
        products: { select: { id: true, name: true, sku: true } },
        _count: { select: { receivings: true } },
      },
    });
    if (!supplier) throw new AppError(404, 'Supplier not found');
    return supplier;
  }

  async create(organizationId: string, data: {
    name: string; contactPerson?: string; email?: string; phone?: string;
    address?: string; tinNumber?: string; paymentMethod?: string;
    mobileMoneyNumber?: string; bankName?: string; bankAccountNumber?: string;
    contractUrl?: string;
  }) {
    const existing = await prisma.supplier.findUnique({
      where: { organizationId_name: { organizationId, name: data.name } },
    });
    if (existing) throw new AppError(409, 'Supplier with this name already exists');
    return prisma.supplier.create({ data: { organizationId, ...data } });
  }

  async update(organizationId: string, id: string, data: Partial<{
    name: string; contactPerson: string; email: string; phone: string;
    address: string; tinNumber: string; paymentMethod: string;
    mobileMoneyNumber: string; bankName: string; bankAccountNumber: string;
    contractUrl: string; isActive: boolean;
  }>) {
    await this.getById(organizationId, id);
    if (data.name) {
      const existing = await prisma.supplier.findFirst({
        where: { organizationId, name: data.name, id: { not: id } },
      });
      if (existing) throw new AppError(409, 'Name already in use');
    }
    return prisma.supplier.update({ where: { id }, data: data as any });
  }
}

export const supplierService = new SupplierService();
