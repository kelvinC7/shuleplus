import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { tenantService } from '../services/tenant.service';
import type { IamSchoolProfile } from '../clients/iam.client';

const createTenantSchema = z.object({
  organizationId: z.string().min(1),
  organizationName: z.string().min(1),
  organizationCode: z.string().optional(),
  schoolProfile: z
    .object({
      organizationId: z.string().optional(),
      organizationCode: z.string().nullable().optional(),
      schoolName: z.string().optional(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      logoUrl: z.string().nullable().optional(),
      schoolMotto: z.string().nullable().optional(),
    })
    .passthrough()
    .optional()
    .nullable(),
});

export class TenantController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createTenantSchema.parse(req.body);
      const tenant = await tenantService.createTenant({
        organizationId: body.organizationId,
        organizationName: body.organizationName,
        organizationCode: body.organizationCode,
        schoolProfile: (body.schoolProfile as IamSchoolProfile | null | undefined) ?? null,
      });
      res.status(201).json({ success: true, data: tenant });
    } catch (error) {
      next(error);
    }
  }
}

export const tenantController = new TenantController();
