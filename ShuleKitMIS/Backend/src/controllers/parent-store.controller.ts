import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { platformCatalogService } from '../services/platform-catalog.service';
import { generateRequestNumber } from '../utils/request-number';

function num(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v.toString());
}

export const parentStoreController = {
  /** Service-to-service: catalog + order history for a student (ParentMIS store). */
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      const studentCode = String(req.query.studentCode ?? '');
      if (!organizationId || !studentCode) {
        res.status(400).json({ success: false, message: 'organizationId and studentCode are required' });
        return;
      }

      const [products, orders] = await Promise.all([
        platformCatalogService.listProducts({ status: 'ACTIVE', customEligible: true }),
        prisma.kitRequest.findMany({
          where: { organizationId, studentCode },
          include: { items: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);

      res.json({
        success: true,
        data: {
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category?.name ?? 'General',
            price: num(p.unitPrice),
            stock: p.stockQty,
            imageUrl: p.imageUrl,
          })),
          orders: orders.map((o) => ({
            id: o.id,
            date: o.createdAt.toISOString(),
            total: num(o.total),
            status: o.status,
            items: o.items.map((i) => ({
              id: i.id,
              name: i.title,
              quantity: i.quantity,
              price: num(i.unitPrice),
            })),
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /** Service-to-service: create a custom order from the parent store (ParentMIS). */
  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body ?? {};
      const organizationId = String(body.organizationId ?? '');
      const studentCode = String(body.studentCode ?? '');
      const studentName = String(body.studentName ?? '');
      const className = String(body.className ?? '');
      const parentName = String(body.parentName ?? '');
      const items = Array.isArray(body.items) ? body.items : [];

      if (!organizationId || !studentCode) {
        res.status(400).json({ success: false, message: 'organizationId and studentCode are required' });
        return;
      }
      if (items.length === 0) {
        res.status(400).json({ success: false, message: 'Select at least one product' });
        return;
      }

      const lineItems: Array<{
        productId: string | null;
        title: string;
        imageUrl: string | null;
        unitPrice: number;
        quantity: number;
        lineTotal: number;
      }> = [];
      for (const sel of items) {
        const productId = String(sel.productId ?? '');
        if (!productId) continue;
        const product = await prisma.product.findFirst({
          where: { id: productId, status: 'ACTIVE', customEligible: true },
          include: { pricingRules: { where: { available: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
        });
        if (!product) throw new AppError(400, `Product not available: ${productId}`);
        const quantity = Math.min(9999, Math.max(1, Math.round(Number(sel.quantity) || 1)));
        if (product.stockQty < quantity) {
          throw new AppError(400, `Insufficient stock for ${product.name}`);
        }
        const unitPrice = product.pricingRules[0] ? num(product.pricingRules[0].sellingPrice) : num(product.unitPrice);
        lineItems.push({
          productId: product.id,
          title: product.name,
          imageUrl: product.imageUrl,
          unitPrice,
          quantity,
          lineTotal: unitPrice * quantity,
        });
      }
      if (lineItems.length === 0) throw new AppError(400, 'Order has no line items');

      const subtotal = lineItems.reduce((s, i) => s + i.lineTotal, 0);
      const requestNumber = await generateRequestNumber(organizationId);
      const tracking = `TRK-${Date.now().toString(36).toUpperCase()}`;

      const order = await prisma.$transaction(async (tx) => {
        for (const item of lineItems) {
          if (!item.productId) continue;
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQty: { decrement: item.quantity } },
          });
        }

        const created = await tx.kitRequest.create({
          data: {
            organizationId,
            organizationName: body.organizationName ?? null,
            academicYear: body.academicYear ?? '2025-2026',
            term: body.term ?? 'Term II',
            requestNumber,
            orderType: 'CUSTOM',
            studentId: studentCode,
            studentName,
            studentCode,
            className,
            gradeLevel: className,
            parentName,
            parentRelation: 'GUARDIAN',
            deliveryMethod: 'AT_SCHOOL',
            subtotal,
            homeFee: 0,
            total: subtotal,
            status: 'CONFIRMED',
            trackingNumber: tracking,
            items: {
              create: lineItems.map((i) => ({
                productId: i.productId,
                title: i.title,
                imageUrl: i.imageUrl,
                unitPrice: i.unitPrice,
                quantity: i.quantity,
                lineTotal: i.lineTotal,
              })),
            },
            delivery: {
              create: {
                method: 'AT_SCHOOL',
                status: 'PENDING',
                fee: 0,
                trackingCode: tracking,
              },
            },
          },
          include: { items: true, delivery: true, payments: true },
        });

        return created;
      });

      res.status(201).json({
        success: true,
        data: {
          id: order.id,
          requestNumber: order.requestNumber,
          total: num(order.total),
          status: order.status,
          date: order.createdAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
