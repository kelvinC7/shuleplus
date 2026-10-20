import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { settingsService } from "../services/settings.service";

const updateSettingsSchema = z.object({
  enableFabricManagement: z.boolean().optional(),
  enableTailoring: z.boolean().optional(),
  enableBarcode: z.boolean().optional(),
  enableQrCodes: z.boolean().optional(),
  enableAutoStockAlerts: z.boolean().optional(),
  enableInstallments: z.boolean().optional(),
  enableDiscounts: z.boolean().optional(),
  enableParentNotifications: z.boolean().optional(),
  enableTrackOwnership: z.boolean().optional(),
  enableMissingAlerts: z.boolean().optional(),
  enableSizeRecommendations: z.boolean().optional(),
  receiptSignatureUrl: z.string().nullable().optional(),
  receiptStampUrl: z.string().nullable().optional(),
});

export class SettingsController {
  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.getSettings(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSettingsSchema.parse(req.body);
      const data = await settingsService.updateSettings(
        req.organizationRef!,
        body,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
