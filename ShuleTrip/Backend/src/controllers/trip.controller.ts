import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { tripService } from '../services/trip.service';
import { tripDocumentFileService } from '../services/trip-document-file.service';
import { authorizationLetterService } from '../services/authorization-letter.service';
import { approvalAttestationService } from '../services/approval-attestation.service';
import { TripStatus } from '../generated/prisma';
import path from 'path';
import { AppError } from '../middleware/error.middleware';

const createDraftSchema = z.object({
  title: z.string().min(3),
  academicYear: z.string().optional(),
});

const participantSchema = z.object({
  studentId: z.string().min(1),
  studentCode: z.string().optional(),
  fullName: z.string().min(1),
  classLabel: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email().optional().or(z.literal('')),
  photoUrl: z.string().optional(),
  guardianConsent: z.boolean().optional(),
});

const staffSchema = z.object({
  fullName: z.string().min(1),
  role: z.string().min(1),
  isLeader: z.boolean().optional(),
  staffId: z.string().optional(),
});

const vehicleSchema = z.object({
  mode: z.string().optional(),
  plateNumber: z.string().optional(),
  vehicleType: z.string().optional(),
  capacity: z.number().int().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  driverLicenseCategory: z.string().optional(),
  driverLicenseNumber: z.string().optional(),
});

const documentSchema = z.object({
  documentType: z.string().min(1),
  fileName: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
});

export class TripController {
  async listSchool(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const data = await tripService.listForSchool(req.organizationRef!, { status, q });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getSchoolTrip(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const data = await tripService.getById(req.organizationRef!, tripId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createDraft(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createDraftSchema.parse(req.body);
      const data = await tripService.createDraft(req.organizationRef!, req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateDraft(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const data = await tripService.updateDraft(req.organizationRef!, tripId, req.body ?? {});
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async saveWizard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const body = z
        .object({
          trip: z.record(z.unknown()).default({}),
          participants: z.array(participantSchema).default([]),
          staff: z.array(staffSchema).default([]),
          vehicles: z.array(vehicleSchema).default([]),
          documents: z.array(documentSchema).default([]),
        })
        .parse(req.body ?? {});
      const data = await tripService.saveWizardBulk(req.organizationRef!, tripId, body);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async submit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const data = await tripService.submit(req.organizationRef!, tripId, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async deleteSchoolTrip(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const data = await tripService.deleteSchoolTrip(req.organizationRef!, tripId, req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async readiness(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const data = await tripService.getReadiness(req.organizationRef!, tripId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async setParticipants(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const body = z.object({ participants: z.array(participantSchema) }).parse(req.body);
      const data = await tripService.setParticipants(req.organizationRef!, tripId, body.participants);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async setStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const body = z.object({ staff: z.array(staffSchema) }).parse(req.body);
      const data = await tripService.setStaff(req.organizationRef!, tripId, body.staff);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async setVehicles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const body = z.object({ vehicles: z.array(vehicleSchema) }).parse(req.body);
      const data = await tripService.setVehicles(req.organizationRef!, tripId, body.vehicles);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async uploadDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const documentType = typeof req.body?.documentType === 'string' ? req.body.documentType : '';
      const file = req.file;
      if (!file) throw new AppError(400, 'file is required');
      const doc = await tripDocumentFileService.upload(req.organizationRef!, tripId, documentType, {
        originalname: file.originalname,
        buffer: file.buffer,
        mimetype: file.mimetype,
        size: file.size,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (error) {
      next(error);
    }
  }

  async downloadDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const documentId = String(req.params.documentId);
      const trip = await tripService.getById(req.organizationRef!, tripId);
      if (!trip) return;
      const { doc, absPath } = await tripDocumentFileService.openForTrip(tripId, documentId);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName ?? 'document')}"`);
      res.sendFile(path.resolve(absPath));
    } catch (error) {
      next(error);
    }
  }

  async setDocuments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const body = z.object({ documents: z.array(documentSchema) }).parse(req.body);
      const data = await tripService.setDocuments(req.organizationRef!, tripId, body.documents);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async setConsent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const body = z
        .object({ updates: z.array(z.object({ studentId: z.string(), guardianConsent: z.boolean() })) })
        .parse(req.body);
      const data = await tripService.setParticipantConsent(req.organizationRef!, tripId, body.updates);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAuthorizationLetter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const data = await authorizationLetterService.buildForTrip(tripId, req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async downloadAuthorizationAsset(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      const asset = String(req.params.asset);
      if (asset !== 'signature' && asset !== 'stamp') throw new AppError(400, 'Asset must be signature or stamp');
      const letter = await authorizationLetterService.buildForTrip(tripId, req.organizationRef!);
      const approvalId = letter.finalApproval?.id;
      if (!approvalId) throw new AppError(404, 'No final approval on file');
      const { absPath, fileName } = await approvalAttestationService.openApprovalAsset(tripId, approvalId, asset);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
      res.sendFile(path.resolve(absPath));
    } catch (error) {
      next(error);
    }
  }

  async listGovernment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const jurisdiction = {
        district: typeof user.district === 'string' ? user.district : undefined,
        sector: typeof user.sector === 'string' ? user.sector : undefined,
      };
      const statusRaw = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
      const status =
        statusRaw && Object.values(TripStatus).includes(statusRaw as TripStatus)
          ? (statusRaw as TripStatus)
          : undefined;
      const stage = typeof req.query.stage === 'string' ? req.query.stage.trim() : undefined;
      const queue = req.query.queue === 'actionable' ? ('actionable' as const) : undefined;
      const data = await tripService.listForGovernment(jurisdiction, { status, stage, queue }, user);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const tripController = new TripController();
