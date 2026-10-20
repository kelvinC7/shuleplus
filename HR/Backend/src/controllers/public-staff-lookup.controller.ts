import { Request, Response, NextFunction } from 'express';
import { publicStaffLookupService } from '../services/public-staff-lookup.service';

export class PublicStaffLookupController {
  async lookup(req: Request, res: Response, next: NextFunction) {
    try {
      const code = String(req.query.code ?? '').trim();
      const data = await publicStaffLookupService.lookupByCode(code);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const publicStaffLookupController = new PublicStaffLookupController();
