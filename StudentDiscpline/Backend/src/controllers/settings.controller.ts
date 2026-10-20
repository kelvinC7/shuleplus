import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { defaultAcademicSettings, fetchIamAcademicSettings } from '../clients/iam.client';
import { disciplineSettingsService } from '../services/discipline-settings.service';

export const settingsController = {
  async getAcademic(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data =
        (await fetchIamAcademicSettings(req.organizationRef!)) ?? defaultAcademicSettings();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async getDiscipline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineSettingsService.get(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateDiscipline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineSettingsService.update(req.organizationRef!, req.body);
      res.json({ success: true, data });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('Starting score')) return next(new AppError(400, msg));
      next(e);
    }
  },

  async applyStartingScore(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineSettingsService.applyStartingScoreToAll(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async seedDefaultMarks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineSettingsService.seedDefaultMarks(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async initializeStudents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await disciplineSettingsService.initializeAllStudents(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
