import { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  changeGovernmentAccountPassword,
  getGovernmentAccountProfile,
  updateGovernmentAccountAvatar,
  updateGovernmentAccountProfile,
} from '../services/gov-account.service';

export const govAccountController = {
  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await getGovernmentAccountProfile(req.user!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          firstName: z.string().min(1).optional(),
          lastName: z.string().min(1).optional(),
          phone: z.string().min(9).nullable().optional(),
        })
        .parse(req.body);
      const data = await updateGovernmentAccountProfile(req.user!, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async updateAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          avatarUrl: z.string().nullable(),
        })
        .parse(req.body);
      const data = await updateGovernmentAccountAvatar(req.user!, body.avatarUrl);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          currentPassword: z.string().min(1),
          newPassword: z.string().min(8),
        })
        .parse(req.body);
      const data = await changeGovernmentAccountPassword(req.user!, body.currentPassword, body.newPassword);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
