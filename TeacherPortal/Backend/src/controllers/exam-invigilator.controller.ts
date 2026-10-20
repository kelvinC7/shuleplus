import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { academicGet, academicPost } from '../clients/academic.client';

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef ?? req.user?.organizationId;
  if (!id) throw new AppError(401, 'Missing organization context');
  return id;
}

function authHeader(req: AuthenticatedRequest) {
  return req.headers.authorization;
}

export const examInvigilatorController = {
  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const payload = await academicGet<{ success: boolean; data: unknown }>(
        '/exam-invigilator/me',
        orgId(req),
        authHeader(req),
      );
      res.json({ success: true, data: payload.data });
    } catch (e) { next(e); }
  },

  async lists(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const payload = await academicGet<{ success: boolean; data: unknown }>(
        '/exam-invigilator/lists',
        orgId(req),
        authHeader(req),
      );
      res.json({ success: true, data: payload.data });
    } catch (e) { next(e); }
  },

  async room(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const payload = await academicGet<{ success: boolean; data: unknown }>(
        '/exam-invigilator/room',
        orgId(req),
        authHeader(req),
        {
          roomName: typeof req.query.roomName === 'string' ? req.query.roomName : undefined,
          sessionId: typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined,
          examDate: typeof req.query.examDate === 'string' ? req.query.examDate : undefined,
          slotCode: typeof req.query.slotCode === 'string' ? req.query.slotCode : undefined,
        },
      );
      res.json({ success: true, data: payload.data });
    } catch (e) { next(e); }
  },

  async entry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const payload = await academicPost<{ success: boolean; data: unknown }>(
        '/exam-invigilator/entry',
        orgId(req),
        req.body,
        authHeader(req),
      );
      res.json({ success: true, data: payload.data });
    } catch (e) { next(e); }
  },

  async eligibility(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const payload = await academicPost<{ success: boolean; data: unknown }>(
        '/exam-invigilator/eligibility',
        orgId(req),
        req.body,
        authHeader(req),
      );
      res.json({ success: true, data: payload.data });
    } catch (e) { next(e); }
  },

  async exit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const payload = await academicPost<{ success: boolean; data: unknown }>(
        '/exam-invigilator/exit',
        orgId(req),
        req.body,
        authHeader(req),
      );
      res.json({ success: true, data: payload.data });
    } catch (e) { next(e); }
  },
};
