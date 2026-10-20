import { Request, Response, NextFunction } from 'express';
import { tenantService } from '../services/tenant.service';

export class TenantController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, organizationName, organizationCode } = req.body as {
        organizationId?: string;
        organizationName?: string;
        organizationCode?: string;
      };

      if (!organizationId || !organizationName) {
        res.status(400).json({
          success: false,
          message: 'organizationId and organizationName required',
        });
        return;
      }

      const tenant = await tenantService.createTenant({
        organizationId,
        organizationName,
        organizationCode,
      });

      res.json({ success: true, data: tenant });
    } catch (err) {
      next(err);
    }
  }
}

export const tenantController = new TenantController();
