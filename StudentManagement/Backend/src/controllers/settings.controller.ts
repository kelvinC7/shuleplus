import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { settingsService } from '../services/settings.service';
import { validateAcademicYear } from '../utils/academic-settings';

const academicSettingsSchema = z.object({
  academicYears: z
    .array(z.string().refine(validateAcademicYear, 'Use format 2025-2026'))
    .min(1),
  terms: z.array(z.string().min(1)).min(1),
  currentAcademicYear: z.string().nullable().optional(),
  currentTerm: z.string().nullable().optional(),
});

export class SettingsController {
  async getAcademic(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await settingsService.ensureDefaults(req.organizationRef!);
      const data = await settingsService.getAcademic(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateAcademic(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = academicSettingsSchema.parse(req.body);
      const data = await settingsService.updateAcademic(req.organizationRef!, {
        academicYears: body.academicYears,
        terms: body.terms,
        currentAcademicYear: body.currentAcademicYear ?? null,
        currentTerm: body.currentTerm ?? null,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
