import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { govAdminService } from '../services/gov-admin.service';
import { AppError } from '../middleware/error.middleware';

const createSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  employeeRef: z.string().optional(),
  roleSlug: z.string().min(2),
  authority: z.string().min(2),
  jurisdictionScope: z.enum(['assigned_only', 'sectors', 'districts', 'national']),
  districts: z.array(z.string()).default([]),
  sectors: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  canFinalApprove: z.boolean().default(false),
  status: z.enum(['invited', 'active', 'suspended']).default('invited'),
});

export class GovAdminController {
  async listOfficials(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await govAdminService.listOfficials();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createOfficial(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await govAdminService.createOfficial(body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return next(new AppError(409, error.message));
      }
      next(error);
    }
  }

  async updateOfficial(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const body = createSchema.partial().parse(req.body);
      const data = await govAdminService.updateOfficial(id, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async deleteOfficial(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await govAdminService.deleteOfficial(String(req.params.id));
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

export const govAdminController = new GovAdminController();
