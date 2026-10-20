import { Request, Response, NextFunction } from 'express';
import { organizationProfileService } from '../services/organization-profile.service';

export class OrganizationProfileController {
  async listSchools(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query as Record<string, string | undefined>;
      const data = await organizationProfileService.listRegisteredSchools({
        status: q.status,
        type: q.type,
        province: q.province,
        provinceId: q.provinceId,
        district: q.district,
        districtId: q.districtId,
        sectorId: q.sectorId,
        sector: q.sector,
        search: q.search,
        limit: q.limit ? Number(q.limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.params.organizationId);
      const data = await organizationProfileService.getOrganizationProfile(organizationId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const organizationProfileController = new OrganizationProfileController();
