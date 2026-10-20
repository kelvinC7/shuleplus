import { Response, NextFunction } from 'express';
import { nesaService } from '../services/nesa.service';
import { integrationService } from '../services/integration.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

function queryOf(req: AuthenticatedRequest): Record<string, string | undefined> {
  const q = req.query as Record<string, string | string[] | undefined>;
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(q)) {
    out[key] = Array.isArray(value) ? value[0] : value;
  }
  return out;
}

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export class NesaController {
  async dashboard(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = nesaService.getDashboard();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async schools(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await integrationService.listSchools(queryOf(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async school(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await integrationService.getSchool(param(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async circulars(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await integrationService.listCirculars(queryOf(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async circular(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await integrationService.getCircular(param(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async circularComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { content } = req.body as { content?: string };
      const data = await integrationService.commentOnCircular(
        req,
        param(req.params.id),
        content ?? ''
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async circularReject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body as { reason?: string };
      const data = await integrationService.rejectCircular(req, param(req.params.id), reason ?? '');
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async circularUnpublish(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body as { reason?: string };
      const data = await integrationService.unpublishCircular(
        req,
        param(req.params.id),
        reason ?? ''
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async circularApprove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { notes } = req.body as { notes?: string };
      const data = await integrationService.approveCircular(req, param(req.params.id), notes);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async circularPrint(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const lang = typeof req.query.lang === 'string' ? req.query.lang : 'en';
      const html = await integrationService.printCircular(param(req.params.id), lang);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }

  async approvals(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = nesaService.listApprovals(queryOf(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async provinces(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = nesaService.listProvinces();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async districts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = nesaService.listDistricts(queryOf(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async sectors(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = nesaService.listSectors(queryOf(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async academicYears(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = nesaService.listAcademicYears();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async feePolicies(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = nesaService.listFeePolicies(queryOf(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const nesaController = new NesaController();
