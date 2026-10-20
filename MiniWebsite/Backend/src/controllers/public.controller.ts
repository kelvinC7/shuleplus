import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { websiteService } from '../services/website.service';

const applySchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  gradeAppliedFor: z.string().optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  parentName: z.string().optional().or(z.literal('')),
  previousSchool: z.string().optional().or(z.literal('')),
  message: z.string().optional().or(z.literal('')),
  formData: z.record(z.unknown()).optional(),
});

export class PublicController {
  async listSchools(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.listPublicSites();
      res.json({ success: true, count: data.length, data });
    } catch (error) {
      next(error);
    }
  }

  async lookupSchoolByOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId.trim() : '';
      if (!organizationId) {
        res.status(400).json({ success: false, message: 'organizationId is required' });
        return;
      }
      const data = await websiteService.lookupPublicSiteByOrganization(organizationId);
      if (!data) {
        res.status(404).json({
          success: false,
          message: 'Your school does not have a Mini Website yet',
        });
        return;
      }
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async apply(req: Request, res: Response, next: NextFunction) {
    try {
      const body = applySchema.parse(req.body);
      const applicant = await websiteService.createPublicApplicant(String(req.params.slug), body);
      res.status(201).json({
        success: true,
        message: 'Application received. We will contact you soon.',
        data: { id: applicant.id },
      });
    } catch (error) {
      next(error);
    }
  }

  async circularOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.getPublicCircularOptions(String(req.params.slug));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async circularList(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query as Record<string, string | undefined>;
      const data = await websiteService.listPublicCirculars(String(req.params.slug), {
        academicYear: q.academicYear ?? q.academic_year,
        term: q.term,
      });
      res.json({ success: true, count: data.length, data });
    } catch (error) {
      next(error);
    }
  }

  async circularPrint(req: Request, res: Response, next: NextFunction) {
    try {
      const lang = typeof req.query.lang === 'string' ? req.query.lang : 'en';
      const autoprint = req.query.autoprint === '1' || req.query.autoprint === 'true';
      const html = await websiteService.getPublicCircularPrint(String(req.params.slug), String(req.params.id), {
        lang,
        autoprint,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      next(error);
    }
  }
}

export const publicController = new PublicController();
