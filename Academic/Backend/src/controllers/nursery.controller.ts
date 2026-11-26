import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { nurseryService } from '../services/nursery.service';

function orgIdOf(req: Request) {
  const r = req as AuthenticatedRequest;
  return r.organizationRef || r.user?.organizationId || '';
}

function actorOf(req: Request) {
  const r = req as AuthenticatedRequest;
  return {
    actorId: r.user?.sub ?? null,
    actorName: r.user?.email ?? null,
  };
}

export class NurseryController {
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await nurseryService.getSettings(orgIdOf(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async savePerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await nurseryService.savePerformanceBands(orgIdOf(req), req.body?.bands);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async saveTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await nurseryService.saveTemplate(orgIdOf(req), req.body?.template ?? req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async listClasses(req: Request, res: Response, next: NextFunction) {
    try {
      const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
      const data = await nurseryService.listClasses(orgIdOf(req), academicYear);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async saveClassConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await nurseryService.saveClassConfig(orgIdOf(req), req.body ?? {});
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async deleteClassConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await nurseryService.deleteClassConfig(orgIdOf(req), req.params.id as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async listSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query as Record<string, string | undefined>;
      const data = await nurseryService.listSubjects(orgIdOf(req), {
        classId: q.classId,
        academicYear: q.academicYear,
        term: q.term,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async saveSubjects(req: Request, res: Response, next: NextFunction) {
    try {
      const body = (req.body ?? {}) as {
        classId?: string;
        academicYear?: string;
        subjects?: unknown;
      };
      const data = await nurseryService.saveSubjects(orgIdOf(req), body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async listReports(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query as Record<string, string | undefined>;
      const data = await nurseryService.listReports(orgIdOf(req), {
        classId: q.classId,
        academicYear: q.academicYear,
        term: q.term,
        search: q.search,
        reportKind: q.reportKind,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async generateOne(req: Request, res: Response, next: NextFunction) {
    try {
      const { actorId } = actorOf(req);
      const data = await nurseryService.generateForStudent(orgIdOf(req), {
        ...(req.body ?? {}),
        actorId: actorId ?? undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async generateClass(req: Request, res: Response, next: NextFunction) {
    try {
      const { actorId } = actorOf(req);
      const data = await nurseryService.generateForClass(orgIdOf(req), {
        ...(req.body ?? {}),
        actorId: actorId ?? undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await nurseryService.getReport(orgIdOf(req), req.params.id as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async updateComments(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await nurseryService.updateComments(orgIdOf(req), req.params.id as string, req.body ?? {});
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const { actorId, actorName } = actorOf(req);
      const data = await nurseryService.publish(orgIdOf(req), {
        ...(req.body ?? {}),
        actorId: actorId ?? undefined,
        actorName: actorName ?? undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async verifyPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const ref = String(req.query.ref || req.params.ref || '');
      const data = await nurseryService.verifyPublic(ref);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const nurseryController = new NurseryController();
