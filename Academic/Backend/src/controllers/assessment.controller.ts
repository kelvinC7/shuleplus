import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { assessmentService } from '../services/assessment.service';

export class AssessmentController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const userId = req.user?.sub;
      const data = { ...req.body, createdBy: userId };
      const result = await assessmentService.create(orgId, data);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async previewCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const q = req.query as Record<string, string | undefined>;
      const result = await assessmentService.previewNextCode(orgId, {
        subjectId: q.subjectId,
        subjectName: q.subjectName,
        classId: q.classId,
        className: q.className,
        academicYear: q.academicYear || q.academic_year || '',
        term: q.term || '',
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const userId = req.user?.sub;
      const result = await assessmentService.approveByAcademic(req.params.id as string, orgId, userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const reason = (req.body as { reason?: string })?.reason;
      const result = await assessmentService.rejectByAcademic(req.params.id as string, orgId, reason);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const result = await assessmentService.list(orgId, req.query as Record<string, string | undefined>);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const result = await assessmentService.update(orgId, req.params.id as string, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const result = await assessmentService.getById(req.params.id as string, orgId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const userId = req.user?.sub;
      const result = await assessmentService.updateStatus(
        req.params.id as string,
        orgId,
        req.body.status,
        userId
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getStatistics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const result = await assessmentService.getStatistics(req.params.id as string, orgId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const result = await assessmentService.delete(req.params.id as string, orgId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getTeacherDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const userId = req.user?.sub!;
      const result = await assessmentService.getTeacherDashboard(orgId, userId, req.query as Record<string, string | undefined>);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const assessmentController = new AssessmentController();
