import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AdmissionApplicationStatus } from '../generated/prisma';
import { admissionService } from '../services/admission.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { routeParam } from '../utils/route-param';

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  applicationDeadline: z.string().datetime().nullable().optional(),
  estimatedFee: z.number().int().min(0).nullable().optional(),
  availablePlaces: z.record(z.number().int().min(0)).optional(),
  requiredDocuments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        required: z.boolean(),
        transferOnly: z.boolean().optional(),
        levels: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  termsUrl: z.string().url().nullable().optional().or(z.literal('')),
  privacyUrl: z.string().url().nullable().optional().or(z.literal('')),
  welcomeMessage: z.string().nullable().optional(),
});

const statusSchema = z.object({
  status: z.nativeEnum(AdmissionApplicationStatus),
  schoolNotes: z.string().optional(),
  interviewAt: z.string().datetime().nullable().optional(),
});

const submitSchema = z.object({
  organizationId: z.string().uuid(),
  draftToken: z.string().uuid().optional(),
  admissionLevel: z.string().min(1),
  classApplying: z.string().min(1),
  academicYear: z.string().min(1),
  termOfEntry: z.string().min(1),
  boardingPreference: z.string().min(1),
  studentGender: z.string().min(1),
  previousSchool: z.string().optional(),
  preferredCombination: z.string().optional(),
  admissionType: z.string().min(1),
  studentDetails: z.record(z.unknown()),
  parentDetails: z.record(z.unknown()),
  documents: z
    .array(
      z.object({
        id: z.string(),
        fileName: z.string().optional(),
        contentBase64: z.string().optional(),
        mimeType: z.string().optional(),
        url: z.string().optional(),
      }),
    )
    .default([]),
  confirmAccurate: z.boolean(),
  acceptTerms: z.boolean(),
});

const draftSchema = z.object({
  organizationId: z.string().uuid(),
  draftToken: z.string().uuid().optional(),
  payload: z.record(z.unknown()),
});

export class AdmissionController {
  async publicConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const data = await admissionService.getPublicConfig(organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async publicCheck(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '');
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const enabled = await admissionService.isAdmissionsEnabled(organizationId);
      res.json({ success: true, data: { enabled } });
    } catch (e) {
      next(e);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const body = submitSchema.parse(req.body);
      const data = await admissionService.submitApplication(body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async saveDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const body = draftSchema.parse(req.body);
      const data = await admissionService.saveDraft(body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async track(req: Request, res: Response, next: NextFunction) {
    try {
      const applicationNumber = String(req.params.applicationNumber ?? '').trim();
      const data = await admissionService.trackByNumber(applicationNumber);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await admissionService.getSettingsForOrg(req.user!.organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = settingsSchema.parse(req.body);
      const data = await admissionService.updateSettingsForOrg(req.user!.organizationId, {
        ...body,
        termsUrl: body.termsUrl === '' ? null : body.termsUrl,
        privacyUrl: body.privacyUrl === '' ? null : body.privacyUrl,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listApplications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const data = await admissionService.listApplicationsForOrg(
        req.user!.organizationId,
        status,
      );
      res.json({ success: true, count: data.length, data });
    } catch (e) {
      next(e);
    }
  }

  async getApplication(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await admissionService.getApplicationForOrg(
        req.user!.organizationId,
        routeParam(req.params.applicationId),
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = statusSchema.parse(req.body);
      const data = await admissionService.updateApplicationStatus(
        req.user!.organizationId,
        routeParam(req.params.applicationId),
        body.status,
        { schoolNotes: body.schoolNotes, interviewAt: body.interviewAt },
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const admissionController = new AdmissionController();
