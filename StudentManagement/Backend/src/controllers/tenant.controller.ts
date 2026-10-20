import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { tenantService } from '../services/tenant.service';

const createTenantSchema = z.object({
  organizationId: z.string().min(1),
  organizationName: z.string().min(1),
  organizationCode: z.string().optional(),
  schoolProfile: z
    .object({
      district: z.string().nullable().optional(),
      schoolCode: z.string().nullable().optional(),
      organizationCode: z.string().nullable().optional(),
      location: z
        .object({
          district: z.string().nullable().optional(),
        })
        .optional(),
    })
    .passthrough()
    .optional()
    .nullable(),
});

export class TenantController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createTenantSchema.parse(req.body);
      const tenant = await tenantService.createTenant(body);
      res.status(201).json({ success: true, data: tenant });
    } catch (error) {
      next(error);
    }
  }
}

export const tenantController = new TenantController();
