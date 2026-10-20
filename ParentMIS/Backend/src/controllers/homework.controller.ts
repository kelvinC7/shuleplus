import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { homeworkService } from '../services/homework.service';
import { getRequestedStudent } from '../utils/student-param';

export const homeworkController = {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await homeworkService.list(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async stats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await homeworkService.stats(req.organizationRef!, req.user!.sub, getRequestedStudent(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getOne(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id ?? '');
      const data = await homeworkService.getOne(
        req.organizationRef!,
        req.user!.sub,
        id,
        getRequestedStudent(req)
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async saveDraft(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id ?? '');
      const data = await homeworkService.saveDraft(
        req.organizationRef!,
        req.user!.sub,
        id,
        req.body?.answers,
        getRequestedStudent(req)
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async submit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id ?? '');
      const data = await homeworkService.submit(
        req.organizationRef!,
        req.user!.sub,
        id,
        req.body || {},
        getRequestedStudent(req)
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async ingest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await homeworkService.ingest(req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
};
