import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { examinationTimetableService } from '../services/examination-timetable.service';

function org(req: AuthenticatedRequest) {
  return req.organizationRef || req.user?.organizationId || '';
}

export class ExaminationTimetableController {
  async listExaminationTypes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationTimetableService.listExaminationTypes(org(req), {
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async createExaminationType(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationTimetableService.createExaminationType(org(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  }

  async context(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationTimetableService.context(org(req), {
        classId: String(req.query.classId || ''),
        academicYear: String(req.query.academicYear || ''),
        term: String(req.query.term || ''),
        examinationTypeId: typeof req.query.examinationTypeId === 'string' ? req.query.examinationTypeId : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationTimetableService.list(org(req), {
        classId: typeof req.query.classId === 'string' ? req.query.classId : undefined,
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        term: typeof req.query.term === 'string' ? req.query.term : undefined,
        examinationTypeId: typeof req.query.examinationTypeId === 'string' ? req.query.examinationTypeId : undefined,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationTimetableService.getById(String(req.params.id), org(req));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async impact(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationTimetableService.impact(String(req.params.id), org(req));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async generate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationTimetableService.generate(org(req), req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async save(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await examinationTimetableService.save(org(req), {
        ...req.body,
        id: req.params.id ? String(req.params.id) : req.body?.id,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const confirmImpact = String(req.query.confirmImpact || req.body?.confirmImpact || '') === 'true';
      const data = await examinationTimetableService.remove(String(req.params.id), org(req), { confirmImpact });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
}

export const examinationTimetableController = new ExaminationTimetableController();
