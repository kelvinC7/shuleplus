import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserStatus } from '../generated/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { chiefAccountantService } from '../services/chief-accountant.service';
import { chiefAccountantAdminService } from '../services/chief-accountant-admin.service';
import { routeParam } from '../utils/route-param';

const createChiefSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  requirePasswordChange: z.boolean().optional(),
  sendCredentialsEmail: z.boolean().optional(),
  permissions: z.record(z.string()).optional(),
  accessLevel: z.enum(['view_only', 'prepare', 'approve', 'post', 'administer']).optional(),
  enforceMfa: z.boolean().optional(),
  organizationIds: z.array(z.string().uuid()).optional(),
  assignmentExpiresAt: z.string().datetime().optional(),
});

const updateChiefSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  permissions: z.record(z.string()).optional(),
  accessLevel: z.enum(['view_only', 'prepare', 'approve', 'post', 'administer']).optional(),
  enforceMfa: z.boolean().optional(),
});

const assignmentsSchema = z.object({
  organizationIds: z.array(z.string().uuid()),
  permissions: z.record(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8).optional(),
  sendCredentialsEmail: z.boolean().optional(),
  requirePasswordChange: z.boolean().optional(),
});

export class ChiefAccountantController {
  async session(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await chiefAccountantService.getSession(req.user!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async organizations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const data = await chiefAccountantService.listOrganizations(req.user!.sub, { search });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async academicContext(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
      const data = await chiefAccountantService.getAcademicContext(req.user!.sub, organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async overview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const q = req.query as Record<string, string>;
      const data = await chiefAccountantService.getOverview(req.user!.sub, {
        organizationId: q.organizationId,
        academicYear: q.academicYear,
        term: q.term,
        financialPeriod: q.financialPeriod,
      });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schoolFeesOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await chiefAccountantService.getSchoolFeesOverview(
        req.user!.sub,
        req.query as Record<string, string>
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schoolFeesDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await chiefAccountantService.getSchoolFeesDashboard(
        req.user!.sub,
        req.query as Record<string, string>
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schoolFeesAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await chiefAccountantService.getSchoolFeesAnalytics(
        req.user!.sub,
        req.query as Record<string, string>
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schoolFeesFilterOptions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId =
        typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
      const data = await chiefAccountantService.getSchoolFeesFilterOptions(
        req.user!.sub,
        organizationId
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schoolFeesTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const pageRaw = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : undefined;
      const pageSizeRaw =
        typeof req.query.pageSize === 'string' ? Number.parseInt(req.query.pageSize, 10) : undefined;
      const data = await chiefAccountantService.getSchoolFeesTransactions(req.user!.sub, {
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
      const pageRaw = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : undefined;
      const pageSizeRaw =
        typeof req.query.pageSize === 'string' ? Number.parseInt(req.query.pageSize, 10) : undefined;
      const data = await chiefAccountantService.getSchoolFeesBalances(req.user!.sub, {
        ...(req.query as Record<string, string | undefined>),
        page: Number.isFinite(pageRaw) ? pageRaw : undefined,
        pageSize: Number.isFinite(pageSizeRaw) ? pageSizeRaw : undefined,
      } as Record<string, string | undefined> & { page?: number; pageSize?: number });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schoolFeesStructures(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await chiefAccountantService.getSchoolFeesStructures(
        req.user!.sub,
        req.query as Record<string, string>
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async schoolFeesStudentBills(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const pageRaw = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : undefined;
      const pageSizeRaw =
        typeof req.query.pageSize === 'string' ? Number.parseInt(req.query.pageSize, 10) : undefined;
      const data = await chiefAccountantService.getSchoolFeesStudentBills(req.user!.sub, {
        ...(req.query as Record<string, string | undefined>),
        page: Number.isFinite(pageRaw) ? pageRaw : undefined,
        pageSize: Number.isFinite(pageSizeRaw) ? pageSizeRaw : undefined,
      } as Record<string, string | undefined> & { page?: number; pageSize?: number });
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  // SuperAdmin
  async adminList(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await chiefAccountantAdminService.listChiefAccountants();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminAssignableSchools(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const data = await chiefAccountantAdminService.listAssignableSchools(search);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminGet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await chiefAccountantAdminService.getChiefAccountant(routeParam(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminCreate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createChiefSchema.parse(req.body);
      const data = await chiefAccountantAdminService.createChiefAccountant(req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async adminUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateChiefSchema.parse(req.body);
      const data = await chiefAccountantAdminService.updateChiefAccountant(
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
      const data = await chiefAccountantAdminService.setAssignments(
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
      const data = await chiefAccountantAdminService.deleteChiefAccountant(
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
      const body = resetPasswordSchema.parse(req.body ?? {});
      const data = await chiefAccountantAdminService.resetChiefAccountantPassword(
        req.user!.sub,
        routeParam(req.params.id),
        body
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const chiefAccountantController = new ChiefAccountantController();
