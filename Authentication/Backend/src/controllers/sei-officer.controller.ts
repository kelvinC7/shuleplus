import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserStatus } from '../generated/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { seiOfficerAdminService } from '../services/sei-officer-admin.service';
import { routeParam } from '../utils/route-param';

const createSeiSchema = z.object({
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
  districtName: z.string().optional(),
  sectorId: z.string().optional(),
  sectorName: z.string().min(1),
  notes: z.string().optional(),
});

const updateSeiSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(9).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  provinceId: z.string().optional(),
  provinceName: z.string().optional(),
  districtId: z.string().optional(),
  districtName: z.string().optional(),
  sectorId: z.string().optional(),
  sectorName: z.string().min(1).optional(),
  notes: z.string().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8).optional(),
  sendCredentialsEmail: z.boolean().optional(),
  requirePasswordChange: z.boolean().optional(),
});

export class SeiOfficerController {
  async adminList(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await seiOfficerAdminService.listSeiOfficers();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminGet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await seiOfficerAdminService.getSeiOfficer(routeParam(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminCreate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSeiSchema.parse(req.body);
      const data = await seiOfficerAdminService.createSeiOfficer(req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSeiSchema.parse(req.body);
      const data = await seiOfficerAdminService.updateSeiOfficer(req.user!.sub, routeParam(req.params.id), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminDelete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await seiOfficerAdminService.deleteSeiOfficer(req.user!.sub, routeParam(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminResetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = resetPasswordSchema.parse(req.body ?? {});
      const data = await seiOfficerAdminService.resetSeiPassword(req.user!.sub, routeParam(req.params.id), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const seiOfficerController = new SeiOfficerController();
