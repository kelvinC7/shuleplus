import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AuthenticatedRequest, orgScope, param } from '../types';
import { AppError } from '../middleware/error.middleware';

const createOrderSchema = z.object({
  supplierId: z.string().min(1),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
        productId: z.string().optional(),
      })
    )
    .min(1),
  notes: z.string().optional(),
  schoolCode: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'REJECTED']),
});

export const orderController = {
  /** Seller creates a purchase order against a supplier's catalog. */
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createOrderSchema.parse(req.body);
      const org = req.organizationRef!;

      const supplier = await prisma.supplier.findUnique({ where: { id: body.supplierId } });
      if (!supplier) throw new AppError(404, 'Supplier not found');

      const totalAmount = body.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

      const order = await prisma.purchaseOrder.create({
        data: {
          organizationId: org,
          orderNumber: `ORD-${Date.now()}`,
          supplierId: body.supplierId,
          supplierName: supplier.companyName,
          status: 'PENDING',
          items: body.items as unknown as object,
          totalAmount: Math.round(totalAmount * 100) / 100,
          notes: body.notes ?? null,
          createdById: req.user?.sub ?? null,
          createdByName: req.user?.email ?? null,
          schoolCode: body.schoolCode ?? null,
        },
      });

      res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const org = orgScope(req.user);
      const orders = await prisma.purchaseOrder.findMany({
        where: org ? { organizationId: org } : {},
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { supplier: { select: { companyName: true, logoUrl: true } } },
      });
      res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const order = await prisma.purchaseOrder.findUnique({
        where: { id: param(req, 'id') },
        include: { supplier: true, delivery: true },
      });
      if (!order) throw new AppError(404, 'Order not found');
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = statusSchema.parse(req.body);
      const order = await prisma.purchaseOrder.update({
        where: { id: param(req, 'id') },
        data: { status },
      });
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  },

  /** Orders addressed to a supplier (supplier portal). */
  async bySupplier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orders = await prisma.purchaseOrder.findMany({
        where: { supplierId: param(req, 'supplierId') },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  },
};
