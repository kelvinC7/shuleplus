import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { kitchenStaffService } from '../services/kitchen-staff.service';

const createSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['CHEF', 'KITCHEN_ASSISTANT', 'STOREKEEPER', 'CLEANER', 'SUPERVISOR']),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  qualification: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

export class KitchenStaffController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await kitchenStaffService.list(req.organizationRef!, req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await kitchenStaffService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await kitchenStaffService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await kitchenStaffService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await kitchenStaffService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, message: 'Staff member deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const kitchenStaffController = new KitchenStaffController();
