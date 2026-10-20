import { Request, Response, NextFunction } from 'express';
import { tenantService } from '../services/tenant.service';
import type { IamSchoolProfile } from '../clients/iam.client';

export class TenantController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, organizationName, organizationCode, schoolProfile } = req.body as {
        organizationId?: string;
        organizationName?: string;
        organizationCode?: string;
        schoolProfile?: IamSchoolProfile;
      };
      if (!organizationId || !organizationName) {
        res.status(400).json({ success: false, message: 'organizationId and organizationName required' });
        return;
      }
      const tenant = await tenantService.createTenant({
        organizationId,
        organizationName,
        organizationCode,
        schoolProfile,
      });
      res.json({ success: true, data: tenant });
    } catch (err) {
      next(err);
    }
  }
}

export const tenantController = new TenantController();
