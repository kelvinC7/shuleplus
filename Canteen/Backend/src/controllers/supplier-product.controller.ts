import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AuthenticatedRequest, param } from '../types';
import { AppError } from '../middleware/error.middleware';

const productSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  unit: z.string().optional(),
  price: z.number().nonnegative(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const supplierProductController = {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const products = await prisma.supplierProduct.findMany({
        where: { supplierId: param(req, 'supplierId') },
        orderBy: { name: 'asc' },
      });
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = productSchema.parse(req.body);
      const supplier = await prisma.supplier.findUnique({ where: { id: param(req, 'supplierId') } });
      if (!supplier) throw new AppError(404, 'Supplier not found');

      const product = await prisma.supplierProduct.create({
        data: {
          supplierId: param(req, 'supplierId'),
          name: body.name,
          category: body.category ?? null,
          unit: body.unit ?? null,
          price: body.price,
          description: body.description ?? null,
          imageUrl: body.imageUrl ?? null,
        },
      });
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = productSchema.partial().parse(req.body);
      const product = await prisma.supplierProduct.update({
        where: { id: param(req, 'productId') },
        data: body,
      });
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  },

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await prisma.supplierProduct.delete({ where: { id: param(req, 'productId') } });
      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  },
};
