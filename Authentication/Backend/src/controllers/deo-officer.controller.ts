import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserStatus } from '../generated/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { deoOfficerAdminService } from '../services/deo-officer-admin.service';
import { routeParam } from '../utils/route-param';

const createDeoSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(9),
  password: z.string().min(8).optional(),
  requirePasswordChange: z.boolean().optional(),
  sendCredentialsEmail: z.boolean().optional(),
  provinceId: z.string().optional(),
  provinceName: z.string().optional(),
  districtId: z.string().optional(),
  districtName: z.string().min(1),
  notes: z.string().optional(),
  grantNesaDashboard: z.boolean().optional(),
});

const updateDeoSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(9).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  provinceId: z.string().optional(),
  provinceName: z.string().optional(),
  districtId: z.string().optional(),
  districtName: z.string().min(1).optional(),
  notes: z.string().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8).optional(),
  sendCredentialsEmail: z.boolean().optional(),
  requirePasswordChange: z.boolean().optional(),
});

export class DeoOfficerController {
  async adminList(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await deoOfficerAdminService.listDeoOfficers();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminGet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await deoOfficerAdminService.getDeoOfficer(routeParam(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminCreate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createDeoSchema.parse(req.body);
      const data = await deoOfficerAdminService.createDeoOfficer(req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateDeoSchema.parse(req.body);
      const data = await deoOfficerAdminService.updateDeoOfficer(req.user!.sub, routeParam(req.params.id), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminDelete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await deoOfficerAdminService.deleteDeoOfficer(req.user!.sub, routeParam(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminResetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = resetPasswordSchema.parse(req.body ?? {});
      const data = await deoOfficerAdminService.resetDeoPassword(req.user!.sub, routeParam(req.params.id), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const deoOfficerController = new DeoOfficerController();
