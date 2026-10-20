import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { assessmentMarkService } from '../services/assessment-mark.service';

export class AssessmentMarkController {
  async enterMarks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const userId = req.user?.sub;
      const data = { ...req.body, enteredBy: userId };
      const result = await assessmentMarkService.enterMarks(req.params.assessmentId as string, orgId, data);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getMarks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const result = await assessmentMarkService.getMarks(req.params.assessmentId as string, orgId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async requestCorrection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const userId = req.user?.sub;
      const result = await assessmentMarkService.requestCorrection(
        req.params.assessmentId as string,
        orgId,
        { ...req.body, requestedBy: userId }
      );
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async reviewCorrection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const userId = req.user?.sub;
      const data = { ...req.body, reviewedBy: userId };
      const result = await assessmentMarkService.reviewCorrection(req.params.requestId as string, orgId, data);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getPendingCorrections(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const status = typeof req.query.status === 'string' ? req.query.status : 'all';
      const result = await assessmentMarkService.listCorrections(orgId, status);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const assessmentMarkController = new AssessmentMarkController();
