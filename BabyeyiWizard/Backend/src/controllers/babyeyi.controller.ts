import { Request, Response, NextFunction } from 'express';
import { ApprovalAction, ApprovalStage } from '../generated/prisma';
import { babyeyiService } from '../services/babyeyi.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { parseAcademicSettings } from '../utils/academic-settings';

function parseBody(req: { body?: unknown }) {
  return { ...(req.body as Record<string, unknown>) };
}

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export class BabyeyiController {
  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.getDashboard(req);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async schoolInfo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.getSchoolInfo(req);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async nesaLimit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.getNesaLimit(req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async academicClasses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.getAcademicClasses(req);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async requirementsCatalog(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.getRequirementsCatalog();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.listCirculars(req, req.query as Record<string, string>);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.getCircular(req, param(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const data = await babyeyiService.createCircular(req, parseBody(req), files);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const data = await babyeyiService.updateCircular(req, param(req.params.id), parseBody(req), files);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.deleteCircular(req, param(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async duplicate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.duplicateCircular(req, param(req.params.id));
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async publish(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.publishCircular(req, param(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async qrcode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.generateQr(req, param(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async verify(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.verifyCircular(param(req.params.docId), req.query.h as string | undefined);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async reportVerify(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.reportSuspiciousDocument(param(req.params.docId), parseBody(req) as {
        reason?: string;
        details?: string;
        reporterEmail?: string;
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async approvals(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.listApprovals(req);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { stage, action, notes } = req.body;
      const data = await babyeyiService.actOnApproval(
        req,
        param(req.params.id),
        stage as ApprovalStage,
        action as ApprovalAction,
        notes
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async analytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.getAnalytics(req);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async templates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.listTemplates(req);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async assets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.listAssets(req);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async uploadAsset(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const assetType = (req.body.asset_type as string) ?? 'logo';
      const data = await babyeyiService.uploadAsset(req, assetType, file);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async notifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.listNotifications(req);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async markNotificationRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.markNotificationRead(req, param(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async markAllNotificationsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.markAllNotificationsRead(req);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async versions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.listVersions(req, param(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async restoreVersion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.restoreVersion(req, param(req.params.id), param(req.params.versionId));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async collaboration(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const circularId = req.query.circular_id as string | undefined;
      const data = await babyeyiService.getCollaboration(req, circularId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async academicSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (req.method === 'GET') {
        const data = await babyeyiService.getAcademicSettings(req);
        res.json({ success: true, data });
        return;
      }
      const data = await babyeyiService.updateAcademicSettings(req, parseAcademicSettings(parseBody(req)));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async settings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (req.method === 'GET') {
        const data = await babyeyiService.getSettings(req);
        res.json({ success: true, data });
        return;
      }
      const data = await babyeyiService.updateSettings(req, parseBody(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async patchContentI18nRw(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.patchContentI18nRw(req, param(req.params.id), parseBody(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async regenerateTranslations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.regenerateTranslations(req, param(req.params.id));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async bulkAction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { action, ids } = req.body as { action: string; ids: string[] };
      const data = await babyeyiService.bulkAction(req, action, ids);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async addComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { content } = req.body as { content: string };
      const data = await babyeyiService.addComment(req, param(req.params.id), content);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async download(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await babyeyiService.incrementDownload(req, param(req.params.id));
      const circular = await babyeyiService.getCircular(req, param(req.params.id));
      res.json({ success: true, data: circular, message: 'Download recorded' });
    } catch (err) {
      next(err);
    }
  }

  async print(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const lang = typeof req.query.lang === 'string' ? req.query.lang : 'en';
      const autoprint = req.query.autoprint === '1' || req.query.autoprint === 'true';
      const html = await babyeyiService.getPrintHtml(req, param(req.params.id), { lang, autoprint });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }

  /** Public: academic year / term options from approved circulars. */
  async publicCircularOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '').trim();
      const classLabel = String(req.query.class ?? req.query.className ?? '').trim() || undefined;
      const data = await babyeyiService.listPublicCircularOptions(organizationId, classLabel);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /** Public: load fee/requirement lines for a year + term + class. */
  async publicCircular(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await babyeyiService.getPublicCircular({
        organizationId: String(req.query.organizationId ?? '').trim(),
        academicYear: String(req.query.academicYear ?? req.query.academic_year ?? '').trim(),
        term: String(req.query.term ?? '').trim(),
        classLabel: String(req.query.class ?? req.query.className ?? '').trim() || undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /** Public: list approved/published circulars for a school. */
  async publicCircularList(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '').trim();
      const academicYear = String(req.query.academicYear ?? req.query.academic_year ?? '').trim();
      const term = String(req.query.term ?? '').trim();
      const data = await babyeyiService.listPublicCirculars(organizationId, {
        academicYear: academicYear || undefined,
        term: term || undefined,
      });
      res.json({ success: true, count: data.length, data });
    } catch (err) {
      next(err);
    }
  }

  /** Public: print view for an approved/published circular. */
  async publicCircularPrint(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = String(req.query.organizationId ?? '').trim();
      const lang = typeof req.query.lang === 'string' ? req.query.lang : 'en';
      const autoprint = req.query.autoprint === '1' || req.query.autoprint === 'true';
      const html = await babyeyiService.getPublicPrintHtml(organizationId, param(req.params.id), {
        lang,
        autoprint,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }
}

export const babyeyiController = new BabyeyiController();
