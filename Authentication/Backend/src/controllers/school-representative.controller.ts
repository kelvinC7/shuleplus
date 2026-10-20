import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserStatus } from '../generated/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { schoolRepresentativeService } from '../services/school-representative.service';
import { schoolRepresentativeAdminService } from '../services/school-representative-admin.service';
import { orgChiefAccountantAccessService } from '../services/org-chief-accountant-access.service';
import { AppError } from '../middleware/error.middleware';
import { routeParam } from '../utils/route-param';

const createRepSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  requirePasswordChange: z.boolean().optional(),
  sendCredentialsEmail: z.boolean().optional(),
  permissions: z.record(z.string()).optional(),
  accessMode: z.enum(['view_only', 'authorized_actions']).optional(),
  enforceMfa: z.boolean().optional(),
  organizationIds: z.array(z.string().uuid()).optional(),
  assignmentExpiresAt: z.string().datetime().optional(),
});

const updateRepSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  permissions: z.record(z.string()).optional(),
  accessMode: z.enum(['view_only', 'authorized_actions']).optional(),
  enforceMfa: z.boolean().optional(),
});

const assignmentsSchema = z.object({
  organizationIds: z.array(z.string().uuid()),
  permissions: z.record(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
});

const resetRepPasswordSchema = z.object({
  password: z.string().min(8).optional(),
  sendCredentialsEmail: z.boolean().optional(),
  requirePasswordChange: z.boolean().optional(),
});

const followUpSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().optional(),
});

export class SchoolRepresentativeController {
  // ── Representative portal ──
  async session(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const data = await schoolRepresentativeService.getSession(userId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schools(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const academicYear =
        typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
      const term = typeof req.query.term === 'string' ? req.query.term : undefined;
      const includePerformance = req.query.includePerformance === '1' || req.query.includePerformance === 'true';
      const data = await schoolRepresentativeService.listSchools(userId, {
        search,
        status,
        academicYear,
        term,
        includePerformance,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async academicContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
      const data = await schoolRepresentativeService.getAcademicContext(userId, organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async overview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
      const academicYear =
        typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
      const term = typeof req.query.term === 'string' ? req.query.term : undefined;
      const data = await schoolRepresentativeService.getOverview(userId, {
        organizationId,
        academicYear,
        term,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async academics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
      const data = await schoolRepresentativeService.getAcademics(userId, organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async financePayroll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
      const data = await schoolRepresentativeService.getFinancePayroll(userId, organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async attendance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
      const data = await schoolRepresentativeService.getAttendance(userId, organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async studentsDirectory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const data = await schoolRepresentativeService.getStudentsDirectory(userId, {
        organizationId:
          typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        className: typeof req.query.className === 'string' ? req.query.className : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async staffDirectory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const data = await schoolRepresentativeService.getStaffDirectory(userId, {
        organizationId:
          typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        department: typeof req.query.department === 'string' ? req.query.department : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async gateAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const pageRaw = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : undefined;
      const pageSizeRaw =
        typeof req.query.pageSize === 'string' ? Number.parseInt(req.query.pageSize, 10) : undefined;
      const data = await schoolRepresentativeService.getGateAttendance(userId, {
        organizationId:
          typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined,
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        personKind: typeof req.query.personKind === 'string' ? req.query.personKind : undefined,
        shift: typeof req.query.shift === 'string' ? req.query.shift : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        page: Number.isFinite(pageRaw) ? pageRaw : undefined,
        pageSize: Number.isFinite(pageSizeRaw) ? pageSizeRaw : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schoolFeesOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const q = req.query as Record<string, string>;
      const data = await schoolRepresentativeService.getSchoolFeesOverview(userId, q);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schoolFeesTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const pageRaw = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : undefined;
      const pageSizeRaw =
        typeof req.query.pageSize === 'string' ? Number.parseInt(req.query.pageSize, 10) : undefined;
      const data = await schoolRepresentativeService.getSchoolFeesTransactions(userId, {
        ...(req.query as Record<string, string | undefined>),
        page: Number.isFinite(pageRaw) ? pageRaw : undefined,
        pageSize: Number.isFinite(pageSizeRaw) ? pageSizeRaw : undefined,
      } as Record<string, string | undefined> & { page?: number; pageSize?: number });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schoolFeesBalances(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const pageRaw = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : undefined;
      const pageSizeRaw =
        typeof req.query.pageSize === 'string' ? Number.parseInt(req.query.pageSize, 10) : undefined;
      const data = await schoolRepresentativeService.getSchoolFeesBalances(userId, {
        ...(req.query as Record<string, string | undefined>),
        page: Number.isFinite(pageRaw) ? pageRaw : undefined,
        pageSize: Number.isFinite(pageSizeRaw) ? pageSizeRaw : undefined,
      } as Record<string, string | undefined> & { page?: number; pageSize?: number });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schoolFeesFilterOptions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
      const data = await schoolRepresentativeService.getSchoolFeesFilterOptions(userId, organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schoolFeesAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const data = await schoolRepresentativeService.getSchoolFeesAnalytics(
        userId,
        req.query as Record<string, string>
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async attendanceMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const data = await schoolRepresentativeService.getAttendanceMetrics(userId, {
        organizationId:
          typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined,
        period: typeof req.query.period === 'string' ? req.query.period : undefined,
        department: typeof req.query.department === 'string' ? req.query.department : undefined,
        personKind: typeof req.query.personKind === 'string' ? req.query.personKind : undefined,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async alerts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
      const data = await schoolRepresentativeService.listAlerts(userId, organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async followUps(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const data = await schoolRepresentativeService.listFollowUps(userId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listChiefAccountants(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId.trim() : '';
      if (!organizationId) throw new AppError(400, 'organizationId is required');
      await schoolRepresentativeService.assertOrgAccess(req.user!.sub, organizationId);
      const data = await orgChiefAccountantAccessService.listForOrganization(organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async revokeChiefAccountant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId.trim() : '';
      if (!organizationId) throw new AppError(400, 'organizationId is required');
      await schoolRepresentativeService.assertOrgAccess(req.user!.sub, organizationId);
      const data = await orgChiefAccountantAccessService.revokeSchoolAssignment(
        req.user!.sub,
        organizationId,
        routeParam(req.params.userId),
        'school_representative'
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createFollowUp(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const body = followUpSchema.parse(req.body);
      const data = await schoolRepresentativeService.createFollowUp(userId, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateFollowUp(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const followUpId = routeParam(req.params.id);
      const body = z
        .object({
          status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
          resolutionNotes: z.string().optional(),
        })
        .parse(req.body);
      const data = await schoolRepresentativeService.updateFollowUp(userId, followUpId, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  // ── SuperAdmin ──
  async adminList(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await schoolRepresentativeAdminService.listRepresentatives();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminGet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await schoolRepresentativeAdminService.getRepresentative(routeParam(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminCreate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createRepSchema.parse(req.body);
      const data = await schoolRepresentativeAdminService.createRepresentative(req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateRepSchema.parse(req.body);
      const data = await schoolRepresentativeAdminService.updateRepresentative(
        req.user!.sub,
        routeParam(req.params.id),
        body
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminSetAssignments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = assignmentsSchema.parse(req.body);
      const data = await schoolRepresentativeAdminService.setAssignments(
        req.user!.sub,
        routeParam(req.params.id),
        body
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminDelete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await schoolRepresentativeAdminService.deleteRepresentative(
        req.user!.sub,
        routeParam(req.params.id)
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminResetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = resetRepPasswordSchema.parse(req.body ?? {});
      const data = await schoolRepresentativeAdminService.resetRepresentativePassword(
        req.user!.sub,
        routeParam(req.params.id),
        body
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminAssignableSchools(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const data = await schoolRepresentativeAdminService.listAssignableSchools(search);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const schoolRepresentativeController = new SchoolRepresentativeController();
