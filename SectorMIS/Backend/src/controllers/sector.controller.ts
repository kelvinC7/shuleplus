import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { sectorService } from '../services/sector.service';
import { requireSeiUserId } from '../utils/sector-request';
import { buildDailyReportPdf, buildDailyReportText } from '../services/sector-report.service';

async function requireTenantRecord(req: AuthenticatedRequest) {
  const tenant = await prisma.tenant.findFirst({
    where: { organizationId: req.organizationRef!, status: 'ACTIVE' },
  });
  if (!tenant) throw new AppError(403, 'Tenant not provisioned for this organization');
  return tenant;
}

function ctx(req: AuthenticatedRequest) {
  return { userId: requireSeiUserId(req), orgRef: req.organizationRef! };
}

export class SectorController {
  async search(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const data = await sectorService.search(userId, orgRef, q);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async settingsGet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await sectorService.getSettings(req.organizationRef!);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async settingsPatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          morningCutoffTime: z.string().optional(),
          autoRefreshSeconds: z.number().int().min(30).max(600).optional(),
          reportSchedule: z
            .object({
              enabled: z.boolean().optional(),
              email: z.string().email().optional(),
              hourLocal: z.number().int().min(0).max(23).optional(),
            })
            .optional(),
          notificationRules: z
            .object({ smsEnabled: z.boolean().optional(), emailEnabled: z.boolean().optional() })
            .optional(),
        })
        .parse(req.body);
      sectorService.invalidateCache(requireSeiUserId(req), req.organizationRef!);
      const data = await sectorService.updateSettings(req.organizationRef!, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async morning(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const data = await sectorService.morningSituation(userId, orgRef);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schools(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const data = await sectorService.listSchools(userId, orgRef);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schoolById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const schoolId = typeof req.params.schoolId === 'string' ? req.params.schoolId : req.params.schoolId[0];
      const data = await sectorService.schoolProfile(userId, orgRef, schoolId);
      if (!data) throw new AppError(404, 'School not found');
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async attention(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const data = await sectorService.attentionRequired(userId, orgRef);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async devices(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const data = await sectorService.deviceHealth(userId, orgRef);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async dataQuality(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const data = await sectorService.dataQuality(userId, orgRef);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async analytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const range = typeof req.query.range === 'string' ? req.query.range : 'week';
      const data = await sectorService.analytics(userId, orgRef, range);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async students(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const data = await sectorService.studentIntelligence(userId, orgRef);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async staff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const data = await sectorService.staffIntelligence(userId, orgRef);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async map(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const data = await sectorService.sectorMap(userId, orgRef);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async integrity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const data = await sectorService.integrity(userId, orgRef);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async report(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const data = await sectorService.dailyReport(userId, orgRef);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async reportPdf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const dash = await sectorService.dailyReport(userId, orgRef);
      const text = buildDailyReportText({
        sector: dash.sector,
        date: dash.date,
        schools: dash.schoolsDetail,
        totals: {
          schools: dash.schools,
          students: dash.students,
          studentAttendancePct: dash.studentAttendancePct,
          staffAttendancePct: dash.staffAttendancePct,
        },
        observations: dash.observations,
      });
      const pdf = buildDailyReportPdf(text);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="sector-report-${dash.date}.pdf"`);
      res.send(pdf);
    } catch (e) {
      next(e);
    }
  }

  async notifyCritical(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, orgRef } = ctx(req);
      const email = req.user?.email ?? '';
      const phone = typeof req.body?.phone === 'string' ? req.body.phone : undefined;
      const data = await sectorService.notifyCritical(userId, orgRef, email, phone);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async followUpList(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await requireTenantRecord(req);
      const data = await sectorService.listFollowUpCases(tenant.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async followUpCreate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await requireTenantRecord(req);
      const body = z
        .object({
          schoolId: z.string(),
          schoolName: z.string(),
          issue: z.string(),
          priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
          assignedTo: z.string().optional(),
        })
        .parse(req.body);
      const data = await sectorService.createFollowUpCase(tenant.id, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async followUpUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await requireTenantRecord(req);
      const caseId = String(req.params.caseId);
      const body = z
        .object({
          status: z.enum(['OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'CLOSED']).optional(),
          priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
          assignedTo: z.string().optional(),
          issue: z.string().optional(),
          comment: z.string().optional(),
          followUpDate: z.string().optional(),
        })
        .parse(req.body);
      const data = await sectorService.updateFollowUpCase(tenant.id, caseId, body);
      if (!data) throw new AppError(404, 'Case not found');
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async visitsList(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await requireTenantRecord(req);
      const data = await sectorService.listSchoolVisits(tenant.id);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async visitStart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await requireTenantRecord(req);
      const body = z.object({ schoolId: z.string(), schoolName: z.string() }).parse(req.body);
      const data = await sectorService.startSchoolVisit(tenant.id, body.schoolId, body.schoolName);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async visitUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenant = await requireTenantRecord(req);
      const visitId = String(req.params.visitId);
      const body = z
        .object({
          observations: z.record(z.unknown()).optional(),
          report: z.record(z.unknown()).optional(),
          complete: z.boolean().optional(),
        })
        .parse(req.body);
      const data = await sectorService.updateSchoolVisit(tenant.id, visitId, body);
      if (!data) throw new AppError(404, 'Visit not found');
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const sectorController = new SectorController();
