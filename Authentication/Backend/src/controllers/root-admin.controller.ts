import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuditAction, DataScope, OrganizationStatus, OrganizationType, UserStatus } from '../generated/prisma';
import { rootAdminService } from '../services/root-admin.service';
import {
  platformAuditLogService,
  type AuditPeriod,
} from '../services/platform-audit-log.service';
import { organizationAdminService } from '../services/organization-admin.service';
import { platformUsersService } from '../services/platform-users.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { routeParam } from '../utils/route-param';

const createOrgSchema = z.object({
  name: z.string().min(2),
  type: z.enum([
    'SCHOOL',
    'UNIVERSITY',
    'NGO',
    'FACTORY',
    'HOSPITAL',
    'CHURCH',
    'BUSINESS',
    'OTHER',
  ]),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  subscriptionTier: z.string().optional(),
  status: z.enum(['ACTIVE', 'PENDING']).optional(),
});

const transferOwnershipSchema = z.object({
  newOwnerEmail: z.string().email(),
});

const orgAdminCredentialsSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined))
    .refine((v) => v === undefined || v.length >= 12, {
      message: 'Password must be at least 12 characters (or leave blank to auto-generate)',
    }),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  requirePasswordChange: z.boolean().optional(),
  sendCredentials: z.boolean().optional(),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(12),
});

const createPlatformAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z
    .enum([
      'SUPER_ADMIN',
      'OPERATIONS_ADMIN',
      'SECURITY_ADMIN',
      'SUPPORT_ADMIN',
      'BILLING_ADMIN',
      'DEVELOPER_ADMIN',
    ])
    .optional(),
  requirePasswordChange: z.boolean().optional(),
  sendInvitation: z.boolean().optional(),
});

const createOrgUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  department: z.string().optional(),
  branch: z.string().optional(),
  position: z.string().optional(),
  employeeId: z.string().optional(),
  supervisorId: z.string().uuid().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  roleSlug: z.enum(['organization_admin', 'organization_member']).optional(),
  moduleSlugs: z.array(z.string()).optional(),
  moduleAssignments: z
    .array(
      z.object({
        slug: z.string().min(1),
        accessLevel: z.enum(['USER', 'HEAD']).optional(),
        dataScope: z.nativeEnum(DataScope).optional(),
      })
    )
    .optional(),
  dataScope: z.nativeEnum(DataScope).optional(),
  requirePasswordChange: z.boolean().optional(),
  sendCredentialsEmail: z.boolean().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  activatedAt: z.string().datetime().optional().nullable(),
});

const createPlatformUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  moduleAssignments: z
    .array(
      z.object({
        slug: z.string().min(1),
        accessLevel: z.enum(['USER', 'HEAD']).optional(),
        dataScope: z.nativeEnum(DataScope).optional(),
      })
    )
    .min(1),
  requirePasswordChange: z.boolean().optional(),
  sendCredentialsEmail: z.boolean().optional(),
  mfaEnabled: z.boolean().optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

const updatePlatformUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
});

const resetPlatformUserPasswordSchema = z.object({
  password: z.string().min(8).optional(),
  sendEmail: z.boolean().optional(),
});

const createPrintCardUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  requirePasswordChange: z.boolean().optional(),
  sendCredentialsEmail: z.boolean().optional(),
});

const createNesaDashboardUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  requirePasswordChange: z.boolean().optional(),
  sendCredentialsEmail: z.boolean().optional(),
});

const createSuperAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

const orgStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DISABLED', 'ARCHIVED', 'PENDING']),
});

const moduleToggleSchema = z.object({
  isEnabled: z.boolean(),
});

const emergencySchema = z.object({
  maintenanceMode: z.boolean().optional(),
  loginsDisabled: z.boolean().optional(),
  registrationsDisabled: z.boolean().optional(),
  forceLogoutAll: z.boolean().optional(),
  lockedOrganizationId: z.string().nullable().optional(),
  edgeMaintenanceMode: z.boolean().optional(),
});

const updateSuperAdminSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
});

const resetSuperAdminPasswordSchema = z.object({
  password: z.string().min(8).optional(),
  sendEmail: z.boolean().optional(),
});

const userStatusSchema = z.object({
  status: z.nativeEnum(UserStatus).refine((s) => s === UserStatus.ACTIVE || s === UserStatus.SUSPENDED, {
    message: 'Only ACTIVE or SUSPENDED status is allowed',
  }),
});

export class RootAdminController {
  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.getDashboard();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async organizations(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.listOrganizations();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async organizationDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.getOrganizationById(routeParam(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createOrgSchema.parse(req.body);
      const data = await rootAdminService.createOrganization(req.user!.sub, {
        ...body,
        type: body.type as OrganizationType,
        email: body.email || undefined,
        status: body.status as OrganizationStatus | undefined,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = orgStatusSchema.parse(req.body);
      const data = await rootAdminService.updateOrganizationStatus(
        routeParam(req.params.id),
        status as OrganizationStatus,
        req.user!.sub
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateOrganizationProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.updateOrganizationProfile(
        routeParam(req.params.id),
        req.user!.sub,
        req.body as Record<string, unknown>
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.deleteOrganization(routeParam(req.params.id), req.user!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async transferOwnership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { newOwnerEmail } = transferOwnershipSchema.parse(req.body);
      const data = await rootAdminService.transferOwnership(
        routeParam(req.params.id),
        newOwnerEmail,
        req.user!.sub
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateOrganizationAdminCredentials(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const body = orgAdminCredentialsSchema.parse(req.body);
      const data = await rootAdminService.updateOrganizationAdminCredentials(
        routeParam(req.params.id),
        req.user!.sub,
        body
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async modules(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.listPlatformModules();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async toggleModule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { isEnabled } = moduleToggleSchema.parse(req.body);
      const data = await rootAdminService.toggleModule(
        routeParam(req.params.id),
        isEnabled,
        req.user!.sub
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async auditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const hasQuery =
        req.query.period ||
        req.query.page ||
        req.query.organizationId ||
        req.query.from ||
        req.query.to ||
        req.query.search ||
        req.query.action;

      if (!hasQuery) {
        const data = await rootAdminService.getAuditLogs();
        res.json({ success: true, data });
        return;
      }

      const periodRaw = typeof req.query.period === 'string' ? req.query.period : 'week';
      const period = (['today', 'week', 'term', 'range'] as const).includes(periodRaw as AuditPeriod)
        ? (periodRaw as AuditPeriod)
        : 'week';

      const pageRaw =
        typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) : undefined;
      const pageSizeRaw =
        typeof req.query.pageSize === 'string' ? Number.parseInt(req.query.pageSize, 10) : undefined;

      const actionRaw = typeof req.query.action === 'string' ? req.query.action : undefined;
      const action =
        actionRaw && Object.values(AuditAction).includes(actionRaw as AuditAction)
          ? (actionRaw as AuditAction)
          : undefined;

      const data = await platformAuditLogService.queryLogs({
        period,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined,
        organizationId:
          typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined,
        action,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        page: Number.isFinite(pageRaw) ? pageRaw : undefined,
        pageSize: Number.isFinite(pageSizeRaw) ? pageSizeRaw : undefined,
      });

      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async auditAccessAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const periodRaw = typeof req.query.period === 'string' ? req.query.period : 'week';
      const period = (['today', 'week', 'term', 'range'] as const).includes(periodRaw as AuditPeriod)
        ? (periodRaw as AuditPeriod)
        : 'week';

      const data = await platformAuditLogService.getAccessAnalytics({
        period,
        from: typeof req.query.from === 'string' ? req.query.from : undefined,
        to: typeof req.query.to === 'string' ? req.query.to : undefined,
        organizationId:
          typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined,
      });

      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async emergencyControls(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (req.method === 'GET') {
        const data = await rootAdminService.getEmergencyControls();
        res.json({ success: true, data });
        return;
      }
      const body = emergencySchema.parse(req.body);
      const data = await rootAdminService.updateEmergencyControls(req.user!.sub, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async platformAdminStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.getPlatformAdminStats();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async platformAdmins(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.listPlatformAdmins();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async platformAdminDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.getPlatformAdminById(routeParam(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createPlatformAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createPlatformAdminSchema.parse(req.body);
      const data = await rootAdminService.createPlatformAdmin(req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async verifyInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const token = String(req.query.token ?? '');
      const data = await rootAdminService.verifyInvitation(token);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = acceptInvitationSchema.parse(req.body);
      const data = await rootAdminService.acceptInvitation(token, password);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async terminateAdminSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.terminateAdminSession(
        routeParam(req.params.id),
        routeParam(req.params.sessionId),
        req.user!.sub
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async terminateAllAdminSessions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.terminateAllAdminSessions(routeParam(req.params.id), req.user!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async superAdmins(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.listSuperAdmins();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createSuperAdminSchema.parse(req.body);
      const data = await rootAdminService.createSuperAdmin(req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSuperAdminSchema.parse(req.body);
      const data = await rootAdminService.updateSuperAdmin(routeParam(req.params.id), req.user!.sub, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async resetSuperAdminPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = resetSuperAdminPasswordSchema.parse(req.body ?? {});
      const data = await rootAdminService.resetSuperAdminPassword(routeParam(req.params.id), req.user!.sub, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.deletePlatformAdmin(routeParam(req.params.id), req.user!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = userStatusSchema.parse(req.body);
      const data = await rootAdminService.updateUserStatus(routeParam(req.params.id), req.user!.sub, status);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async systemHealth(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.getSystemHealth();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async suspendUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.suspendUser(routeParam(req.params.id), req.user!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deletePlatformAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await rootAdminService.deletePlatformAdmin(routeParam(req.params.id), req.user!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listOrganizationUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = routeParam(req.params.id);
      await rootAdminService.assertTenantOrganization(organizationId);
      const data = await organizationAdminService.listUsers(organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listOrganizationLicensedModules(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = routeParam(req.params.id);
      await rootAdminService.assertTenantOrganization(organizationId);
      const data = await organizationAdminService.listLicensedModules(organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createOrganizationUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = routeParam(req.params.id);
      await rootAdminService.assertTenantOrganization(organizationId);
      const body = createOrgUserSchema.parse(req.body);
      const data = await organizationAdminService.createUser(req.user!.sub, organizationId, {
        ...body,
        avatarUrl: body.avatarUrl || undefined,
        activatedAt: body.activatedAt ?? undefined,
      });
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listPlatformUsers(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformUsersService.listPlatformUsers();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listPlatformUserModules(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformUsersService.listAssignableModules();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createPlatformUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createPlatformUserSchema.parse(req.body);
      const data = await platformUsersService.createPlatformUser(req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listPrintCardUsers(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformUsersService.listPlatformUsersByModule('print-card');
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createPrintCardUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createPrintCardUserSchema.parse(req.body);
      const data = await platformUsersService.createPrintCardUser(req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listNesaDashboardUsers(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await platformUsersService.ensureNesaModuleForAdmin();
      const data = await platformUsersService.listPlatformUsersByModule('nesa');
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createNesaDashboardUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createNesaDashboardUserSchema.parse(req.body);
      const data = await platformUsersService.createNesaDashboardUser(req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updatePlatformUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updatePlatformUserSchema.parse(req.body);
      const data = await platformUsersService.updatePlatformUser(req.user!.sub, routeParam(req.params.id), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deletePlatformUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await platformUsersService.deletePlatformUser(req.user!.sub, routeParam(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async resetPlatformUserPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = resetPlatformUserPasswordSchema.parse(req.body ?? {});
      const data = await platformUsersService.resetPlatformUserPassword(req.user!.sub, routeParam(req.params.id), body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const rootAdminController = new RootAdminController();
