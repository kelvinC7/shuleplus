import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserStatus } from '../generated/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { shuleTripOfficialAdminService } from '../services/shule-trip-official-admin.service';
import { routeParam } from '../utils/route-param';
import { SHULE_TRIP_OFFICIAL_ROLE_SLUGS } from '../constants/shule-trip-roles';

const tripRoleSchema = z.enum(SHULE_TRIP_OFFICIAL_ROLE_SLUGS);

const createSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(9).optional(),
  password: z.string().min(8).optional(),
  requirePasswordChange: z.boolean().optional(),
  sendCredentialsEmail: z.boolean().optional(),
  tripRoleSlug: tripRoleSchema,
  authority: z.string().optional(),
  jurisdictionScope: z.enum(['assigned_only', 'sectors', 'districts', 'national']).optional(),
  provinceId: z.string().optional(),
  provinceName: z.string().optional(),
  districtId: z.string().optional(),
  districtName: z.string().optional(),
  sectorId: z.string().optional(),
  sectorName: z.string().optional(),
  canFinalApprove: z.boolean().optional(),
  employeeRef: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  tripRoleSlug: tripRoleSchema.optional(),
  authority: z.string().optional(),
  jurisdictionScope: z.string().optional(),
  districtName: z.string().optional(),
  sectorName: z.string().optional(),
  canFinalApprove: z.boolean().optional(),
  notes: z.string().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8).optional(),
  sendCredentialsEmail: z.boolean().optional(),
  requirePasswordChange: z.boolean().optional(),
});

export class ShuleTripOfficialController {
  async adminList(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await shuleTripOfficialAdminService.listOfficials();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminCreate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const data = await shuleTripOfficialAdminService.createOfficial(req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body);
      const data = await shuleTripOfficialAdminService.updateOfficial(req.user!.sub, routeParam(req.params.id), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminDelete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await shuleTripOfficialAdminService.deleteOfficial(req.user!.sub, routeParam(req.params.id));
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  async adminResetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = resetPasswordSchema.parse(req.body ?? {});
      const data = await shuleTripOfficialAdminService.resetPassword(req.user!.sub, routeParam(req.params.id), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const shuleTripOfficialController = new ShuleTripOfficialController();
