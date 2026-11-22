import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  DOCUMENT_TYPES,
  documentVerificationService,
} from '../services/document-verification.service';
import { resolveRequestVisibility } from '../utils/module-access';

const ensureSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  documentId: z.string().optional(),
  reference: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

function bearerToken(req: AuthenticatedRequest): string | undefined {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
}

function requestMeta(req: Request) {
  return {
    ipAddress:
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.ip ||
      null,
    userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
  };
}

export class DocumentVerificationController {
  async ensure(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = ensureSchema.parse(req.body);
      const needsVisibility =
        body.documentType === 'PURCHASE_REQUEST' || body.documentType === 'REQUISITION';

      const visibility = needsVisibility
        ? await resolveRequestVisibility(
            req.user!.sub,
            req.user!.roles ?? [],
            bearerToken(req),
          )
        : undefined;

      const data = await documentVerificationService.ensure(
        req.organizationRef!,
        body,
        visibility,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async verifyPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await documentVerificationService.verifyPublic(
        String(req.params.token),
        requestMeta(req),
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const documentVerificationController = new DocumentVerificationController();
