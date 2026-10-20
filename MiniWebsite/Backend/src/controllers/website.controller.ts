import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { websiteService } from '../services/website.service';

export class WebsiteController {
  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.getSite(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.updateSite(req.organizationRef!, req.body ?? {});
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateSlug(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { slug } = req.body as { slug?: string };
      const data = await websiteService.updateSlug(req.organizationRef!, slug ?? '');
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async publish(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.publish(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async unpublish(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.unpublish(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async regenerate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const site = await websiteService.getOrCreateSite(req.organizationRef!);
      const data = await websiteService.regenerate(site.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async preview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.preview(req.organizationRef!, req.body ?? {});
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listPages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.listPages(req.organizationRef!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async createPage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.createPage(req.organizationRef!, req.body ?? {});
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updatePage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.updatePage(req.organizationRef!, String(req.params.id), req.body ?? {});
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async deletePage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await websiteService.deletePage(req.organizationRef!, String(req.params.id));
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listApplicants(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status =
        typeof req.query.status === 'string' && req.query.status ? req.query.status : undefined;
      const data = await websiteService.listApplicants(req.organizationRef!, status);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateApplicantStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body as { status?: string };
      const data = await websiteService.updateApplicantStatus(req.organizationRef!, String(req.params.id), status ?? '');
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const websiteController = new WebsiteController();
