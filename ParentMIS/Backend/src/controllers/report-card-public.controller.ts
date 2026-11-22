import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/** Public QR verify — no student marks; confirms report reference only. */
export class ReportCardPublicController {
  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const ref = typeof req.query.ref === 'string' ? req.query.ref.trim() : '';
      const org = typeof req.query.org === 'string' ? req.query.org.trim() : undefined;
      if (!ref) {
        res.status(400).json({ success: false, message: 'Report reference is required' });
        return;
      }

      const base = env.ACADEMIC_API_URL.replace(/\/$/, '');
      const q = new URLSearchParams({ ref });
      if (org) q.set('org', org);
      const url = `${base}/public/report-card/verify?${q.toString()}`;
      const upstream = await fetch(url, { signal: AbortSignal.timeout(12000) });
      const json = (await upstream.json().catch(() => ({}))) as {
        data?: { valid?: boolean; reportNumber?: string; schoolName?: string | null; message?: string };
        message?: string;
      };

      if (!upstream.ok) {
        res.status(upstream.status).json({
          success: false,
          message: json.message || 'Could not verify this report.',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          valid: Boolean(json.data?.valid),
          reportNumber: json.data?.reportNumber ?? ref,
          schoolName: json.data?.schoolName ?? null,
          message: json.data?.message ?? 'This report was issued by the school through Shule+.',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reportCardPublicController = new ReportCardPublicController();
