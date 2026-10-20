import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { menuItemService } from '../services/menu-item.service';

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  mealType: z.enum(['BREAKFAST', 'MORNING_TEA', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER']),
  description: z.string().optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isHalal: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

export class MenuItemController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await menuItemService.list(req.organizationRef!, req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await menuItemService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await menuItemService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await menuItemService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await menuItemService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, message: 'Menu item deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const menuItemController = new MenuItemController();
