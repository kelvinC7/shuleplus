import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { parentService } from '../services/parent.service';

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  nationalId: z.string().optional(),
  occupation: z.string().optional(),
  address: z.string().optional(),
});

const updateSchema = createSchema.partial();

const searchQuerySchema = z.object({
  q: z.string().min(1),
});

export class ParentController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await parentService.create(req.organizationRef!, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const search = (req.query.search as string) || undefined;
      const data = await parentService.list(req.organizationRef!, search);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async search(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { q } = searchQuerySchema.parse(req.query);
      const data = await parentService.search(req.organizationRef!, q);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await parentService.getById(req.params.id as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await parentService.update(req.params.id as string, req.organizationRef!, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await parentService.delete(req.params.id as string, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const parentController = new ParentController();
