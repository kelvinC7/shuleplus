import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { fetchIamAcademicSettings, defaultAcademicSettings } from '../clients/iam.client';

export class AcademicSettingsController {
  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const settings = await fetchIamAcademicSettings(req.organizationRef!);
      res.json({ success: true, data: settings ?? defaultAcademicSettings() });
    } catch (error) {
      next(error);
    }
  }
}

export const academicSettingsController = new AcademicSettingsController();
