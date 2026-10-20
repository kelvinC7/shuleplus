import { Request, Response, NextFunction } from 'express';
import { gradingEngineService } from '../services/grading-engine.service';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';

function orgIdOf(req: Request) {
  const r = req as AuthenticatedRequest;
  return r.organizationRef || r.user?.organizationId || (req as any).organizationId;
}

export class GradingEngineController {
  async calculateStudentResult(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const result = await gradingEngineService.calculateStudentResult(req.params.assessmentId as string, orgId);
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  async calculateCategoryResults(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const { templateId, classId, subjectId } = req.params as Record<string, string>;
      const result = await gradingEngineService.calculateCategoryResults(templateId, classId, subjectId, orgId);
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  async calculateFinalResults(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const { templateId, classId, subjectId } = req.params as Record<string, string>;
      const result = await gradingEngineService.calculateFinalResults(templateId, classId, subjectId, orgId);
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  async getGradingScale(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const { academicLevel } = req.query;
      const result = await gradingEngineService.getGradingScale(orgId, academicLevel as string);
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  async upsertGradingScale(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const result = await gradingEngineService.upsertGradingScale(orgId, req.body);
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  async getClassReportSummaries(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const { classId, academicYear } = req.params as Record<string, string>;
      const term = req.query.term as string | undefined;
      const result = await gradingEngineService.getClassReportSummaries(
        orgId,
        classId,
        academicYear,
        term
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  async getReportCard(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const { studentId, classId, academicYear } = req.params as Record<string, string>;
      const term = req.query.term as string | undefined;
      const includeTermsRaw = req.query.includeTerms as string | undefined;
      const includeTerms = includeTermsRaw
        ? includeTermsRaw
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;
      const result = await gradingEngineService.getReportCard(
        orgId,
        studentId,
        classId,
        academicYear,
        term,
        includeTerms
      );
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  async getTermlyGrowth(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const { studentId, classId } = req.params as Record<string, string>;
      const result = await gradingEngineService.getTermlyGrowth(orgId, studentId, classId);
      res.json({ data: result });
    } catch (err) { next(err); }
  }

  async listCourseDefaultMarks(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const { classId, academicYear, term } = req.query as Record<string, string>;
      if (!academicYear || !term) {
        res.status(400).json({ message: 'academicYear and term are required' });
        return;
      }
      const data = await gradingEngineService.listCourseDefaultMarks(orgId, {
        classId,
        academicYear,
        term,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async upsertCourseDefaultMarksService(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = String(req.query.organizationId ?? '');
      if (!orgId) {
        res.status(400).json({ message: 'organizationId is required' });
        return;
      }
      const body = req.body as {
        className: string;
        subjectName: string;
        academicYear: string;
        term: string;
        defaultCourseMarks: number;
      };
      const data = await gradingEngineService.upsertCourseDefaultMarksByNames(orgId, {
        className: body.className,
        subjectName: body.subjectName,
        academicYear: body.academicYear,
        term: body.term,
        defaultCourseMarks: body.defaultCourseMarks,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async upsertCourseDefaultMarks(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const r = req as AuthenticatedRequest;
      const body = req.body as {
        classId?: string;
        subjectId?: string;
        className?: string;
        subjectName?: string;
        academicYear: string;
        term: string;
        defaultCourseMarks: number;
      };
      let data;
      if (body.classId && body.subjectId) {
        data = await gradingEngineService.upsertCourseDefaultMarks(orgId, {
          classId: body.classId,
          subjectId: body.subjectId,
          academicYear: body.academicYear,
          term: body.term,
          defaultCourseMarks: body.defaultCourseMarks,
          updatedBy: r.user?.sub,
        });
      } else if (body.classId && body.subjectName) {
        data = await gradingEngineService.upsertCourseDefaultMarksByClassId(orgId, {
          classId: body.classId,
          className: body.className ? String(body.className) : undefined,
          subjectName: String(body.subjectName),
          academicYear: body.academicYear,
          term: body.term,
          defaultCourseMarks: body.defaultCourseMarks,
          updatedBy: r.user?.sub,
        });
      } else {
        data = await gradingEngineService.upsertCourseDefaultMarksByNames(orgId, {
          className: String(body.className || ''),
          subjectName: String(body.subjectName || ''),
          academicYear: body.academicYear,
          term: body.term,
          defaultCourseMarks: body.defaultCourseMarks,
          updatedBy: r.user?.sub,
        });
      }
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async upsertCourseDefaultMarksBySubject(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const r = req as AuthenticatedRequest;
      const body = req.body as {
        subjectName: string;
        academicYear: string;
        term: string;
        defaultCourseMarks: number;
      };
      if (!body.subjectName?.trim() || !body.academicYear || !body.term) {
        res.status(400).json({ message: 'subjectName, academicYear, and term are required' });
        return;
      }
      const data = await gradingEngineService.upsertCourseDefaultMarksForSubjectCatalog(orgId, {
        subjectName: body.subjectName,
        academicYear: body.academicYear,
        term: body.term,
        defaultCourseMarks: body.defaultCourseMarks,
        updatedBy: r.user?.sub,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getAcademicDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = orgIdOf(req);
      const { academicYear, term } = req.query;
      const result = await gradingEngineService.getAcademicDashboard(orgId, academicYear as string, term as string);
      res.json({ data: result });
    } catch (err) { next(err); }
  }
}

export const gradingEngineController = new GradingEngineController();
