import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { settingService } from '../services/setting.service';

const setSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

const bulkSchema = z.object({
  settings: z.record(z.string()),
});

export class SettingController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await settingService.list(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await settingService.get(req.organizationRef!, req.params.key);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async set(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = setSchema.parse(req.body);
      const data = await settingService.set(req.organizationRef!, body.key, body.value);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async setBulk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = bulkSchema.parse(req.body);
      await settingService.setBulk(req.organizationRef!, body.settings);
      res.json({ success: true, message: 'Settings updated' });
    } catch (error) {
      next(error);
    }
  }
}

export const settingController = new SettingController();
