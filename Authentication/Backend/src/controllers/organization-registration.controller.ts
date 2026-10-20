import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RegistrationStatus } from '../generated/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { locationService } from '../services/location.service';
import { organizationRegistrationService } from '../services/organization-registration.service';

const draftSchema = z.object({
  id: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
});

const submitSchema = z.object({
  registrationId: z.string().uuid(),
});

const rejectSchema = z.object({
  reviewNotes: z.string().optional(),
});

export class OrganizationRegistrationController {
  async listProvinces(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await locationService.listProvinces();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listDistricts(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await locationService.listDistricts(String(req.params.provinceId));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listSectors(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await locationService.listSectors(String(req.params.districtId));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listCells(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await locationService.listCells(String(req.params.sectorId));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listVillages(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await locationService.listVillages(String(req.params.cellId));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async previewCode(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await locationService.previewOrganizationCode(String(req.params.districtId));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async saveDraft(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = draftSchema.parse(req.body);
      const data = await organizationRegistrationService.saveDraft({
        id: body.id,
        submittedById: req.user!.sub,
        payload: body.payload,
      });
      res.status(body.id ? 200 : 201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async submit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { registrationId } = submitSchema.parse(req.body);
      const data = await organizationRegistrationService.submit(registrationId, req.user!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await organizationRegistrationService.approve(String(req.params.id), req.user!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = rejectSchema.parse(req.body);
      const data = await organizationRegistrationService.reject(
        String(req.params.id),
        req.user!.sub,
        body.reviewNotes
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as RegistrationStatus | undefined;
      const data = await organizationRegistrationService.list(status);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await organizationRegistrationService.getById(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listPublicSchools(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await organizationRegistrationService.listPublicSchools();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async submitPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = z.record(z.unknown()).parse(req.body?.payload ?? req.body);
      const data = await organizationRegistrationService.submitPublic(payload);
      res.status(201).json({
        success: true,
        data,
        message:
          data.message ??
          'Account created. Sign in now, change your password, then wait for Super Admin approval to unlock modules.',
      });
    } catch (e) {
      next(e);
    }
  }
}

export const organizationRegistrationController = new OrganizationRegistrationController();
