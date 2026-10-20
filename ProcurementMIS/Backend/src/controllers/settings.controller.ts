import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { settingsService } from '../services/settings.service';
import { AppError } from '../middleware/error.middleware';

const signatorySchema = z.object({
  name: z.string(),
  title: z.string(),
  signatureUrl: z.string().optional(),
});

const receiptSettingsSchema = z.object({
  verifier: signatorySchema,
  approver: signatorySchema,
  supplier: signatorySchema,
});

const academicSettingsSchema = z.object({
  academicYears: z.array(z.string()),
  terms: z.array(z.string()),
  currentAcademicYear: z.string().nullable(),
  currentTerm: z.string().nullable(),
});

function requireSupervisor(req: AuthenticatedRequest) {
  const roles = req.user?.roles ?? [];
  const normalized = roles.map((r) => r.toLowerCase());
  const isAdmin = normalized.some(
    (r) =>
      r.includes('organization_admin') ||
      r === 'super_admin' ||
      r === 'root_admin',
  );
  if (isAdmin) return;
  throw new AppError(403, 'Only module supervisors and organization admins can manage settings');
}

export class SettingsController {
  async getReceiptSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.getReceiptSettings(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateReceiptSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      requireSupervisor(req);
      const body = receiptSettingsSchema.parse(req.body);
      const data = await settingsService.updateReceiptSettings(req.organizationRef!, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAcademicSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.getAcademicSettings(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateAcademicSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      requireSupervisor(req);
      const body = academicSettingsSchema.parse(req.body);
      const data = await settingsService.updateAcademicSettings(req.organizationRef!, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getOrgProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.getOrgProfile(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
