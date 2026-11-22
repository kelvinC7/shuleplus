import { Response, NextFunction } from 'express';

import { z } from 'zod';

import { AuthenticatedRequest } from '../middleware/auth.middleware';

import path from 'path';

import { AppError } from '../middleware/error.middleware';

import { reviewService } from '../services/review.service';

import { tripDocumentFileService } from '../services/trip-document-file.service';

import { approvalAttestationService } from '../services/approval-attestation.service';
import { authorizationLetterService } from '../services/authorization-letter.service';



const decisionSchema = z.object({

  action: z.enum(['approve', 'reject', 'request_corrections']),

  reason: z.string().min(3),

  responseDeadline: z.string().optional(),

  checklist: z.record(z.string()).optional(),

  signatureName: z.string().min(2).optional(),

  officialTitle: z.string().optional(),

});



type MulterFiles = {

  signatureFile?: Express.Multer.File[];

  stampFile?: Express.Multer.File[];

};



function multerFilePayload(file: Express.Multer.File) {

  return {

    originalname: file.originalname,

    buffer: file.buffer,

    mimetype: file.mimetype,

    size: file.size,

  };

}



export class ReviewController {

  async getApplication(req: AuthenticatedRequest, res: Response, next: NextFunction) {

    try {

      const tripId = String(req.params.tripId);

      const data = await reviewService.getApplication(tripId, req.user!);

      res.json({ success: true, data });

    } catch (error) {

      next(error);

    }

  }



  async startReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {

    try {

      const tripId = String(req.params.tripId);

      const data = await reviewService.startReview(tripId, req.user!);

      res.json({ success: true, data });

    } catch (error) {

      next(error);

    }

  }



  async downloadDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {

    try {

      const tripId = String(req.params.tripId);

      const documentId = String(req.params.documentId);

      await reviewService.getApplication(tripId, req.user!);

      const { doc, absPath } = await tripDocumentFileService.openForTrip(tripId, documentId);

      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName ?? 'document')}"`);

      res.sendFile(path.resolve(absPath));

    } catch (error) {

      next(error);

    }

  }



  async downloadApprovalAsset(req: AuthenticatedRequest, res: Response, next: NextFunction) {

    try {

      const tripId = String(req.params.tripId);

      const approvalId = String(req.params.approvalId);

      const asset = String(req.params.asset);

      if (asset !== 'signature' && asset !== 'stamp') {

        throw new AppError(400, 'Asset must be signature or stamp');

      }

      await reviewService.getApplication(tripId, req.user!);

      const { absPath, fileName } = await approvalAttestationService.openApprovalAsset(tripId, approvalId, asset);

      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);

      res.sendFile(path.resolve(absPath));

    } catch (error) {

      next(error);

    }

  }



  async getAuthorizationLetter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tripId = String(req.params.tripId);
      await reviewService.getApplication(tripId, req.user!);
      const data = await authorizationLetterService.buildForTrip(tripId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async decide(req: AuthenticatedRequest, res: Response, next: NextFunction) {

    try {

      const tripId = String(req.params.tripId);

      const body = decisionSchema.parse({

        action: req.body?.action,

        reason: req.body?.reason,

        responseDeadline: req.body?.responseDeadline,

        signatureName: req.body?.signatureName,

        officialTitle: req.body?.officialTitle,

      });



      const files = req.files as MulterFiles | undefined;

      const attestationFiles =

        body.action === 'approve' && files?.signatureFile?.[0] && files?.stampFile?.[0]

          ? {

              signature: multerFilePayload(files.signatureFile[0]),

              stamp: multerFilePayload(files.stampFile[0]),

            }

          : undefined;



      const data = await reviewService.recordDecision(tripId, req.user!, {

        ...body,

        attestationFiles,

      });

      res.json({ success: true, data });

    } catch (error) {

      next(error);

    }

  }

}



export const reviewController = new ReviewController();

