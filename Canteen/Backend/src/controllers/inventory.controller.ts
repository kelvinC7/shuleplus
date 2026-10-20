import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AuthenticatedRequest, param } from '../types';
import { AppError } from '../middleware/error.middleware';

const inventorySchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.string().optional(),
  reorderLevel: z.number().nonnegative().optional(),
});

const adjustSchema = z.object({
  delta: z.number(),
  reason: z.string().optional(),
});

export const inventoryController = {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const items = await prisma.inventoryItem.findMany({
        where: { organizationId: req.organizationRef! },
        orderBy: { name: 'asc' },
      });
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = inventorySchema.parse(req.body);
      const item = await prisma.inventoryItem.create({
        data: {
          organizationId: req.organizationRef!,
          name: body.name,
          quantity: body.quantity,
          unit: body.unit ?? null,
          reorderLevel: body.reorderLevel ?? 0,
        },
      });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  },

  async adjust(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { delta, reason } = adjustSchema.parse(req.body);
      const item = await prisma.inventoryItem.findUnique({ where: { id: param(req, 'id') } });
      if (!item) throw new AppError(404, 'Inventory item not found');
      if (Number(item.quantity) + delta < 0) throw new AppError(400, 'Insufficient stock');

      const updated = await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: { increment: delta } },
      });

      await prisma.activityLog.create({
        data: {
          organizationId: item.organizationId,
          userId: req.user?.sub ?? null,
          action: delta >= 0 ? 'STOCK_ADJUSTED' : 'STOCK_DEDUCTED',
          metadata: { itemId: item.id, delta, reason: reason ?? null },
        },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await prisma.inventoryItem.delete({ where: { id: param(req, 'id') } });
      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  },
};
