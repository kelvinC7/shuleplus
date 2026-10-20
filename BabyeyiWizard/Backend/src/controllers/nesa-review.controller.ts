import { Request, Response, NextFunction } from 'express';
import { nesaReviewService } from '../services/nesa-review.service';

function q(req: Request): Record<string, string | undefined> {
  const raw = req.query as Record<string, string | string[] | undefined>;
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = Array.isArray(v) ? v[0] : v;
  }
  return out;
}

function actorName(req: Request): string {
  const header = req.headers['x-actor-name'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  return 'NESA Officer';
}

export class NesaReviewController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = q(req);
      const data = await nesaReviewService.listCirculars({
        organizationId: query.organizationId,
        status: query.status,
        academicYear: query.academicYear ?? query.academic_year,
        district: query.district,
        search: query.search,
        limit: query.limit ? Number(query.limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await nesaReviewService.getCircular(String(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async comment(req: Request, res: Response, next: NextFunction) {
    try {
      const { content } = req.body as { content?: string };
      const data = await nesaReviewService.addComment(
        String(req.params.id),
        content ?? '',
        actorName(req)
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body as { reason?: string };
      const data = await nesaReviewService.reject(
        String(req.params.id),
        reason ?? '',
        actorName(req)
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async unpublish(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body as { reason?: string };
      const data = await nesaReviewService.unpublish(
        String(req.params.id),
        reason ?? '',
        actorName(req)
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { notes } = req.body as { notes?: string };
      const data = await nesaReviewService.approve(
        String(req.params.id),
        notes,
        actorName(req)
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async print(req: Request, res: Response, next: NextFunction) {
    try {
      const lang = typeof req.query.lang === 'string' ? req.query.lang : 'en';
      const autoprint = req.query.autoprint === '1' || req.query.autoprint === 'true';
      const html = await nesaReviewService.getPrintHtml(String(req.params.id), {
        lang,
        autoprint,
        host: req.get('host') || undefined,
        protocol: (req.get('x-forwarded-proto') as string) || req.protocol,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }
}

export const nesaReviewController = new NesaReviewController();
