import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { AppError } from "../middleware/error.middleware";
import { settingsService } from "../services/settings.service";

const academicSettingsSchema = z.object({
  academicYears: z.array(z.string()),
  terms: z.array(z.string()),
  currentAcademicYear: z.string().nullable(),
  currentTerm: z.string().nullable(),
});

function requireOrgAdmin(req: AuthenticatedRequest) {
  const roles = (req.user?.roles ?? []).map((r) => r.toLowerCase());
  const allowed = roles.some(
    (r) =>
      r.includes("organization_admin") || r === "super_admin" || r === "root_admin"
  );
  if (!allowed) {
    throw new AppError(403, "Only organization admins can manage academic settings");
  }
}

export class SettingsController {
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
      requireOrgAdmin(req);
      const body = academicSettingsSchema.parse(req.body);
      const data = await settingsService.updateAcademicSettings(req.organizationRef!, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
