import { Request, Response, NextFunction } from 'express';
import { ensureTenant } from '../services/tenant.service';

export const tenantController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, organizationName } = req.body;
      if (!organizationId) {
        return res.status(400).json({ success: false, message: 'organizationId required' });
      }
      const tenant = await ensureTenant(organizationId, organizationName);
      res.json({ success: true, data: tenant });
    } catch (err) { next(err); }
  },
};
