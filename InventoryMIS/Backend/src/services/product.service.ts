import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { generateNumber } from '../utils/number-gen';

export class ProductService {
  async list(organizationId: string, query?: { categoryId?: string; status?: string; search?: string }) {
    const where: Prisma.ProductWhereInput = { organizationId };
    if (query?.categoryId) where.categoryId = query.categoryId;
    if (query?.status) where.status = query.status as any;
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        _count: { select: { batches: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getById(organizationId: string, id: string) {
    const product = await prisma.product.findFirst({
      where: { id, organizationId },
      include: {
        category: true,
        supplier: true,
        batches: {
          where: { isActive: true },
          orderBy: { expiryDate: 'asc' },
        },
      },
    });
    if (!product) throw new AppError(404, 'Product not found');
    return product;
  }

  async getBySku(organizationId: string, sku: string) {
    const product = await prisma.product.findUnique({
      where: { organizationId_sku: { organizationId, sku } },
    });
    if (!product) throw new AppError(404, 'Product not found');
    return product;
  }

  private generateSku(name: string): string {
    const words = name.trim().split(/\s+/);
    const prefix = words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
    const seq = String(Math.floor(1000 + Math.random() * 9000));
    return `${prefix}-${seq}`;
  }

  private async ensureStore(organizationId: string): Promise<string> {
    const existing = await prisma.store.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing.id;

    const store = await prisma.store.create({
      data: {
        organizationId,
        name: 'Stock',
        code: 'MAIN',
        type: 'MAIN',
      },
    });
    return store.id;
  }

  async create(organizationId: string, data: {
    name: string; sku?: string; categoryId: string; unitOfMeasure: string;
    barcode?: string; brand?: string; imageUrl?: string; description?: string;
    costPrice?: number; sellingPrice?: number; reorderLevel?: number;
    minimumStock?: number; maximumStock?: number; supplierId?: string; storageLocation?: string;
  }, initialQuantity?: number, storeId?: string, userId?: string) {
    let sku = data.sku?.trim() || '';
    if (!sku) {
      let attempts = 0;
      do {
        sku = this.generateSku(data.name);
        const existing = await prisma.product.findUnique({
          where: { organizationId_sku: { organizationId, sku } },
        });
        if (!existing) break;
        attempts++;
      } while (attempts < 10);
      if (attempts >= 10) throw new AppError(500, 'Failed to generate unique SKU. Please provide one manually.');
    } else {
      const existing = await prisma.product.findUnique({
        where: { organizationId_sku: { organizationId, sku } },
      });
      if (existing) throw new AppError(409, 'Product with this SKU already exists');
    }
    const createData = { ...data, sku };
    delete (createData as any).sku;
    (createData as any).sku = sku;
    for (const key of ['supplierId', 'categoryId', 'barcode', 'brand', 'imageUrl', 'description', 'storageLocation'] as const) {
      if (!createData[key as keyof typeof createData]) delete createData[key as keyof typeof createData];
    }
    const product = await prisma.product.create({
      data: { organizationId, ...createData },
    });

    if (initialQuantity && initialQuantity > 0 && userId) {
      const batchStoreId = storeId || await this.ensureStore(organizationId);
      const grnNumber = await generateNumber(organizationId, 'GRN');
      await prisma.$transaction(async (tx) => {
        await tx.stockReceiving.create({
          data: {
            organizationId,
            grnNumber,
            storeId: batchStoreId,
            receivedBy: userId,
            notes: 'Initial stock from product creation',
            items: {
              create: [{
                productId: product.id,
                quantity: initialQuantity,
              }],
            },
          },
        });
        await tx.inventoryBatch.create({
          data: {
            organizationId,
            productId: product.id,
            storeId: batchStoreId,
            quantity: initialQuantity,
            batchNumber: `INIT-${sku}`,
          },
        });
      });
    }

    return product;
  }

  async update(organizationId: string, id: string, data: Partial<{
    name: string; sku: string; categoryId: string; unitOfMeasure: string;
    barcode: string; brand: string; imageUrl: string; description: string;
    costPrice: number; sellingPrice: number; reorderLevel: number;
    minimumStock: number; maximumStock: number; supplierId: string; storageLocation: string; status: string;
  }>) {
    await this.getById(organizationId, id);
    if (data.sku) {
      const existing = await prisma.product.findFirst({
        where: { organizationId, sku: data.sku, id: { not: id } },
      });
      if (existing) throw new AppError(409, 'SKU already in use by another product');
    }
    const updateData = { ...data };
    for (const key of ['supplierId', 'categoryId', 'barcode', 'brand', 'imageUrl', 'description', 'storageLocation'] as const) {
      if (!updateData[key as keyof typeof updateData]) delete updateData[key as keyof typeof updateData];
    }
    return prisma.product.update({
      where: { id },
      data: updateData as any,
    });
  }

  async remove(organizationId: string, id: string) {
    const product = await this.getById(organizationId, id);
    const activeBatches = await prisma.inventoryBatch.findFirst({
      where: { productId: id, isActive: true, quantity: { gt: 0 } },
    });
    if (activeBatches) throw new AppError(400, 'Cannot delete product with active stock. Dispose or transfer stock first.');
    await prisma.product.delete({ where: { id } });
    return { deleted: true, name: product.name };
  }

  async getStockSummary(organizationId: string) {
    const products = await prisma.product.findMany({
      where: { organizationId, status: 'ACTIVE' },
      include: {
        batches: { where: { isActive: true }, select: { quantity: true, unitCost: true, expiryDate: true } },
      },
    });
    const summary = products.map(p => {
      const totalStock = p.batches.reduce((sum, b) => sum + Number(b.quantity), 0);
      const avgCost = totalStock > 0
        ? p.batches.reduce((sum, b) => sum + Number(b.quantity) * Number(b.unitCost || 0), 0) / totalStock
        : 0;
      const nearExpiry = p.batches.filter(b => b.expiryDate && this.daysUntil(b.expiryDate) <= 30).length > 0;
      const expired = p.batches.filter(b => b.expiryDate && b.expiryDate < new Date()).length > 0;
      return {
        id: p.id, name: p.name, sku: p.sku, categoryId: p.categoryId,
        unitOfMeasure: p.unitOfMeasure, reorderLevel: p.reorderLevel, minimumStock: p.minimumStock,
        totalStock, avgCost, totalValue: totalStock * avgCost,
        hasNearExpiry: nearExpiry, hasExpired: expired,
        status: totalStock === 0 ? 'OUT_OF_STOCK' : (p.reorderLevel && totalStock <= Number(p.reorderLevel) ? 'LOW_STOCK' : 'IN_STOCK'),
      };
    });
    return summary;
  }

  private daysUntil(date: Date): number {
    const diff = date.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}

export const productService = new ProductService();
