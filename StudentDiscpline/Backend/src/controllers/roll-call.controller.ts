import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { rollCallService, type RollCallRow } from '../services/roll-call.service';

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export const rollCallController = {
  async roster(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rollCallService.loadRoster(req.organizationRef!, {
        className: str(req.query.className) || '',
        classId: str(req.query.classId),
        date: str(req.query.date) || new Date().toISOString().slice(0, 10),
        label: str(req.query.label),
        subject: str(req.query.subject),
        period: str(req.query.period),
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async sessions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rollCallService.listSessions(req.organizationRef!, {
        className: str(req.query.className),
        date: str(req.query.date),
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async history(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rollCallService.history(req.organizationRef!, {
        q: str(req.query.q),
        className: str(req.query.className),
        from: str(req.query.from),
        to: str(req.query.to),
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async session(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rollCallService.session(req.organizationRef!, req.params.sessionId as string);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async save(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = req.body as Record<string, unknown>;
      const data = await rollCallService.save(
        req.organizationRef!,
        {
          className: str(body.className) || str(body.class_name) || '',
          classId: str(body.classId),
          date: str(body.date) || new Date().toISOString().slice(0, 10),
          label: str(body.label) || str(body.rollLabel) || 'Class attendance',
          subject: str(body.subject),
          period: str(body.period),
          records: Array.isArray(body.records) ? (body.records as RollCallRow[]) : [],
        },
        { id: req.user?.sub || '', name: req.user?.email }
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
