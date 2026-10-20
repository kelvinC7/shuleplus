import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { tenantService } from '../services/tenant.service';
import { actionPlanService } from '../services/action-plan.service';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';

const createTenantSchema = z.object({
  organizationId: z.string().min(1),
  organizationName: z.string().min(1),
  organizationCode: z.string().optional(),
});

export class TenantController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createTenantSchema.parse(req.body);
      const tenant = await tenantService.create(data);

      await actionPlanService.seedDefaultCategories(data.organizationId);
      try {
        await actionPlanService.seedOfficialTemplates(data.organizationId);
      } catch (seedError) {
        console.error('[Tenant] Official templates seed failed (tenant created):', seedError);
      }

      res.status(201).json({ success: true, data: tenant });
    } catch (error) {
      next(error);
    }
  }

  async ensure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const organizationName =
        typeof req.body?.organizationName === 'string' && req.body.organizationName.trim()
          ? req.body.organizationName.trim()
          : 'Organization';
      const organizationCode =
        typeof req.body?.organizationCode === 'string' ? req.body.organizationCode : undefined;

      const tenant = await tenantService.ensure({
        organizationId: user.organizationId,
        organizationName,
        organizationCode,
      });

      await actionPlanService.seedDefaultCategories(user.organizationId).catch((seedError) => {
        console.error('[Tenant] Default categories seed failed (tenant ensured):', seedError);
      });
      await actionPlanService.seedOfficialTemplates(user.organizationId).catch((seedError) => {
        console.error('[Tenant] Official templates seed failed (tenant ensured):', seedError);
      });

      res.json({ success: true, data: tenant });
    } catch (error) {
      next(error);
    }
  }
}

export const tenantController = new TenantController();
