import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { kitService } from '../services/kit.service';

const requirementSchema = z.object({
  title: z.string().min(1),
  quantity: z.number().int().positive().optional(),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
});

const kitSchema = z.object({
  name: z.string().min(1),
  gradeLevel: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  amount: z.union([z.string(), z.number()]),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  requirements: z.array(requirementSchema).optional(),
});

export class KitController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const gradeLevel = typeof req.query.gradeLevel === 'string' ? req.query.gradeLevel : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const data = await kitService.list(req.organizationRef!, gradeLevel, status);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await kitService.getById(String(req.params.id), req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = kitSchema.parse(req.body);
      const data = await kitService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = kitSchema.partial().parse(req.body);
      const data = await kitService.update(String(req.params.id), req.organizationRef!, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await kitService.delete(String(req.params.id), req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const kitController = new KitController();
