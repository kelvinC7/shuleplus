import type { Response, NextFunction } from "express";
import { fetchIamSchoolProfile } from "../clients/iam.client";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";

export class OrgProfileController {
  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const profile = await fetchIamSchoolProfile(req.organizationRef!);
      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }
}

export const orgProfileController = new OrgProfileController();
