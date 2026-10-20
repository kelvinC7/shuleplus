import { Response, NextFunction } from 'express';
import { DataScope, UserStatus } from '../generated/prisma';
import { z } from 'zod';
import { RepresentativeAssignmentStatus } from '../generated/prisma';
import { organizationAdminService } from '../services/organization-admin.service';
import { orgChiefAccountantAccessService } from '../services/org-chief-accountant-access.service';
import { academicSettingsService } from '../services/academic-settings.service';
import { parseAcademicSettings } from '../utils/academic-settings';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const moduleAssignmentSchema = z.object({
  slug: z.string().min(1),
  accessLevel: z.enum(['USER', 'HEAD']).optional(),
  dataScope: z.nativeEnum(DataScope).optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  password: z.string().min(12).optional(),
  department: z.string().optional(),
  branch: z.string().optional(),
  position: z.string().optional(),
  employeeId: z.string().optional(),
  supervisorId: z.string().uuid().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  moduleSlugs: z.array(z.string()).optional(),
  moduleAssignments: z.array(moduleAssignmentSchema).optional(),
  roleSlug: z.enum(['organization_admin', 'organization_member']).optional(),
  dataScope: z.nativeEnum(DataScope).optional(),
  requirePasswordChange: z.boolean().optional(),
  sendCredentialsEmail: z.boolean().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  activatedAt: z.string().datetime().optional().nullable(),
});

const setModulesSchema = z.object({
  moduleSlugs: z.array(z.string()).optional(),
  moduleAssignments: z.array(moduleAssignmentSchema).optional(),
});

const statusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

const resetPasswordSchema = z.object({
  password: z.string().min(12).optional(),
  sendEmail: z.boolean().optional(),
});

const avatarUrlField = z
  .string()
  .max(2_000_000)
  .optional()
  .nullable()
  .or(z.literal(''));

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  branch: z.string().optional(),
  position: z.string().optional(),
  employeeId: z.string().optional(),
  supervisorId: z.string().uuid().optional().nullable(),
  avatarUrl: avatarUrlField,
});

const enrollModuleSchema = z.object({
  moduleId: z.string().uuid(),
});

const orgChiefAccountantPatchSchema = z.object({
  permissions: z.record(z.unknown()).optional(),
  status: z.nativeEnum(RepresentativeAssignmentStatus).optional(),
});

export class OrganizationAdminController {
  async licensedModules(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await organizationAdminService.listLicensedModules(req.user!.organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async moduleCatalog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await organizationAdminService.listModuleCatalog(req.user!.organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async enrollModule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = enrollModuleSchema.parse(req.body);
      const data = await organizationAdminService.enrollModule(
        req.user!.sub,
        req.user!.organizationId,
        body.moduleId
      );
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await organizationAdminService.listUsers(req.user!.organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await organizationAdminService.getUser(
        req.user!.organizationId,
        String(req.params.userId)
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getUserPhotoSources(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await organizationAdminService.getUserPhotoSources(
        req.user!.organizationId,
        String(req.params.userId)
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createUserSchema.parse(req.body);
      const data = await organizationAdminService.createUser(
        req.user!.sub,
        req.user!.organizationId,
        {
          ...body,
          avatarUrl: body.avatarUrl || undefined,
          activatedAt: body.activatedAt ?? undefined,
        }
      );
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = updateUserSchema.parse(req.body);
      const data = await organizationAdminService.updateUser(
        req.user!.sub,
        req.user!.organizationId,
        String(req.params.userId),
        body
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await organizationAdminService.deleteUser(
        req.user!.sub,
        req.user!.organizationId,
        String(req.params.userId)
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listDepartments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await organizationAdminService.listDepartments(req.user!.organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = z
        .object({
          name: z.string().min(1),
          branch: z.string().optional(),
          departmentHead: z.string().optional(),
          departmentType: z.string().optional(),
        })
        .parse(req.body);
      const data = await organizationAdminService.createDepartment(
        req.user!.organizationId,
        body
      );
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteDepartment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await organizationAdminService.deleteDepartment(
        req.user!.organizationId,
        String(req.params.departmentId)
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async setUserModules(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = setModulesSchema.parse(req.body);
      const data = await organizationAdminService.setUserModules(
        req.user!.sub,
        req.user!.organizationId,
        String(req.params.userId),
        body
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = statusSchema.parse(req.body);
      const data = await organizationAdminService.updateUserStatus(
        req.user!.sub,
        req.user!.organizationId,
        String(req.params.userId),
        body.status
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async resetUserPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = resetPasswordSchema.parse(req.body ?? {});
      const data = await organizationAdminService.resetUserPassword(
        req.user!.sub,
        req.user!.organizationId,
        String(req.params.userId),
        body
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async usageStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await organizationAdminService.usageStats(req.user!.organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async accessAudit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const data = await organizationAdminService.listAccessAudit(
        req.user!.organizationId,
        Number.isFinite(limit) ? limit : 50
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async moduleVisibility(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const moduleSlug = String(req.params.moduleSlug);
      const data = await organizationAdminService.getModuleVisibility(
        req.user!.sub,
        req.user!.organizationId,
        req.user!.roles,
        moduleSlug
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getAcademicSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await academicSettingsService.getForOrganization(req.user!.organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateAcademicSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = parseAcademicSettings(req.body);
      const data = await academicSettingsService.updateForOrganization(req.user!.organizationId, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getOrganizationProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await organizationAdminService.getOrganizationProfile(req.user!.organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateOrganizationProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await organizationAdminService.updateOrganizationProfile(
        req.user!.sub,
        req.user!.organizationId,
        req.body as Record<string, unknown>
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listChiefAccountants(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await orgChiefAccountantAccessService.listForOrganization(req.user!.organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateChiefAccountantAssignment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = orgChiefAccountantPatchSchema.parse(req.body);
      await orgChiefAccountantAccessService.updateOrgAssignment(
        req.user!.sub,
        req.user!.organizationId,
        String(req.params.userId),
        body
      );
      const data = await orgChiefAccountantAccessService.listForOrganization(req.user!.organizationId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

}

export const organizationAdminController = new OrganizationAdminController();
