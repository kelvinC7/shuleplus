import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { coldStorageService } from '../services/cold-storage.service';

const createSchema = z.object({
  logDate: z.coerce.date(),
  freezerTemperature: z.number(),
  refrigeratorTemperature: z.number(),
  storageConditions: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

export class ColdStorageController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await coldStorageService.list(req.organizationRef!, req.query as any);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await coldStorageService.getById(req.organizationRef!, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await coldStorageService.create(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await coldStorageService.update(req.organizationRef!, req.params.id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await coldStorageService.remove(req.organizationRef!, req.params.id);
      res.json({ success: true, message: 'Cold storage log deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export const coldStorageController = new ColdStorageController();
