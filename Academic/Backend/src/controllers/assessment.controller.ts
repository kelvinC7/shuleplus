import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, hasAcademicPublishRole } from '../middleware/auth.middleware';
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
      const query = { ...(req.query as Record<string, string | undefined>) };
      // Teacher portals send mine=1; Academic filters on createdBy (JWT sub).
      if (query.mine === '1' && !query.createdBy && req.user?.sub) {
        query.createdBy = req.user.sub;
      }
      delete query.mine;
      const result = await assessmentService.list(orgId, query);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async listMarkRecordsForStatusUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const q = req.query as Record<string, string | undefined>;
      const result = await assessmentService.listAssessmentMarkRecordsForStatusUpdate(orgId, {
        academicYear: q.academicYear,
        term: q.term,
        classId: q.classId,
        stream: q.stream,
        subjectId: q.subjectId,
        componentId: q.componentId,
        dateFrom: q.dateFrom,
        dateTo: q.dateTo,
        search: q.search,
        reportingStage: q.reportingStage,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async bulkUpdateReportingStage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const body = req.body as {
        assessmentIds?: string[];
        markIds?: string[];
        reportingStage: 'BEGINNING_TERM' | 'MID_TERM' | 'TERM_FINAL' | 'UNASSIGNED';
        filters?: { academicYear?: string; term?: string; classId?: string };
      };
      const actorName = req.user ? `${(req.user as any).firstName || ''} ${(req.user as any).lastName || ''}`.trim() || req.user.sub : undefined;
      const result = await assessmentService.bulkUpdateAssessmentReportingStage(
        orgId,
        { id: req.user?.sub, name: actorName, roles: req.user?.roles },
        body
      );
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

  async deleteCourse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorName = req.user ? `${(req.user as any).firstName || ''} ${(req.user as any).lastName || ''}`.trim() || req.user.sub : undefined;
      const data = await assessmentService.deleteCourse(req.params.id as string, req.organizationRef!, {
        id: req.user?.sub,
        name: actorName,
        roles: req.user?.roles,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async deleteAllMarks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actorName = req.user ? `${(req.user as any).firstName || ''} ${(req.user as any).lastName || ''}`.trim() || req.user.sub : undefined;
      const data = await assessmentService.deleteAllMarks(req.params.assessmentId as string, req.organizationRef!, {
        id: req.user?.sub,
        name: actorName,
        roles: req.user?.roles,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.organizationRef!;
      const result = await assessmentService.delete(req.params.id as string, orgId, {
        id: req.user?.sub,
        roles: req.user?.roles,
        canDeleteAny: hasAcademicPublishRole(req.user),
      });
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
