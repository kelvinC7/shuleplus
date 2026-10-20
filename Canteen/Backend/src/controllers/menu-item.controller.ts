import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AuthenticatedRequest, param } from '../types';
import { AppError } from '../middleware/error.middleware';

const menuItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  price: z.number().nonnegative(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const menuItemController = {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const items = await prisma.menuItem.findMany({
        where: { organizationId: req.organizationRef! },
        orderBy: { name: 'asc' },
      });
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const item = await prisma.menuItem.findFirst({
        where: { id: param(req, 'id'), organizationId: req.organizationRef! },
      });
      if (!item) throw new AppError(404, 'Menu item not found');
      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = menuItemSchema.parse(req.body);
      const item = await prisma.menuItem.create({
        data: {
          organizationId: req.organizationRef!,
          name: body.name,
          category: body.category ?? null,
          price: body.price,
          description: body.description ?? null,
          imageUrl: body.imageUrl ?? null,
          isActive: body.isActive ?? true,
        },
      });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = menuItemSchema.partial().parse(req.body);
      const item = await prisma.menuItem.updateMany({
        where: { id: param(req, 'id'), organizationId: req.organizationRef! },
        data: body,
      });
      if (item.count === 0) throw new AppError(404, 'Menu item not found');
      const updated = await prisma.menuItem.findUnique({ where: { id: param(req, 'id') } });
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await prisma.menuItem.deleteMany({
        where: { id: param(req, 'id'), organizationId: req.organizationRef! },
      });
      if (result.count === 0) throw new AppError(404, 'Menu item not found');
      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  },
};
