import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { storeService } from '../services/store.service';

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  type: z.enum(['MAIN', 'WAREHOUSE', 'BRANCH']).optional(),
  location: z.string().optional(),
  managerName: z.string().optional(),
  managerContact: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const shelfSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
});

export class StoreController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await storeService.list(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await storeService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await storeService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await storeService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await storeService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, message: 'Store deactivated' });
    } catch (error) {
      next(error);
    }
  }

  async listShelves(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await storeService.listShelves(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createShelf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = shelfSchema.parse(req.body);
      const data = await storeService.createShelf(req.organizationRef!, req.params.id, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const storeController = new StoreController();
