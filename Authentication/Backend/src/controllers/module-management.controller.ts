import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { moduleManagementService } from '../services/module-management.service';

const createModuleSchema = z.object({
  name: z.string().min(2),
  shortName: z.string().optional(),
  slug: z.string().optional(),
  category: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  frontendUrl: z.string().optional(),
  backendUrl: z.string().optional(),
  docsUrl: z.string().optional(),
  healthCheckUrl: z.string().optional(),
  minSubscriptionPlan: z.string().optional(),
  licenseType: z.string().optional(),
  isPremium: z.boolean().optional(),
  isCore: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  allowTrial: z.boolean().optional(),
  visibleInMarketplace: z.boolean().optional(),
  dependencyIds: z.array(z.string().uuid()).optional(),
});

const assignModulesSchema = z.object({
  moduleIds: z.array(z.string().uuid()),
  subscriptionPlan: z.string().optional(),
  expiresAt: z.string().optional(),
});

const moduleControlActionSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'lock', 'unlock', 'hide', 'show', 'remove', 'reset']),
  limits: z.record(z.string(), z.unknown()).optional(),
});

export class ModuleManagementController {
  async catalogStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await moduleManagementService.getCatalogStats();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listCatalog(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await moduleManagementService.listCatalog();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async getModule(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await moduleManagementService.getModuleById(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async createModule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createModuleSchema.parse(req.body);
      const data = await moduleManagementService.createModule(req.user!.sub, body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateModule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = createModuleSchema.partial().extend({
        isEnabled: z.boolean().optional(),
        maintenanceMode: z.boolean().optional(),
        isPublic: z.boolean().optional(),
      }).parse(req.body);
      const data = await moduleManagementService.updateModule(String(req.params.id), req.user!.sub, body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async deleteModule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await moduleManagementService.deleteModule(String(req.params.id), req.user!.sub);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listOrgAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await moduleManagementService.listOrganizationAssignments(String(req.params.organizationId));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async assignModules(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = assignModulesSchema.parse(req.body);
      const data = await moduleManagementService.assignModulesToOrganization(
        String(req.params.organizationId),
        req.user!.sub,
        body.moduleIds,
        { subscriptionPlan: body.subscriptionPlan, expiresAt: body.expiresAt }
      );
      const pending = data.provisioning?.pending ?? 0;
      res.json({
        success: true,
        data,
        message:
          pending === 0
            ? 'Modules assigned and tenants provisioned.'
            : data.provisioning?.message,
      });
    } catch (e) {
      next(e);
    }
  }

  async getModuleControl(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await moduleManagementService.getModuleControl(String(req.params.id));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async patchOrgModule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const body = moduleControlActionSchema.parse(req.body);
      const data = await moduleManagementService.patchOrganizationModule(
        String(req.params.id),
        String(req.params.moduleId),
        req.user!.sub,
        body.action,
        body.limits
      );
      res.json({ success: true, data, message: `Module ${body.action} applied.` });
    } catch (e) {
      next(e);
    }
  }

  async provisionOrgModule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const force = req.query.force === 'true' || req.body?.force === true;
      const data = await moduleManagementService.provisionOrganizationModule(
        String(req.params.id),
        String(req.params.moduleId),
        req.user!.sub,
        { force }
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async listProvisionLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const moduleId = typeof req.query.moduleId === 'string' ? req.query.moduleId : undefined;
      const data = await moduleManagementService.listProvisionLogs(String(req.params.id), moduleId);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async provisioningQueue(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await moduleManagementService.listProvisioningQueue();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async provisionTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const force = req.query.force === 'true' || req.body?.force === true;
      const data = await moduleManagementService.provisionModuleTenant(
        String(req.params.id),
        req.user!.sub,
        { force }
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async provisionAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const force = req.query.force === 'true' || req.body?.force === true;
      const data = await moduleManagementService.provisionAllPending(req.user!.sub, { force });
      res.json({
        success: true,
        data,
        message:
          data.failed === 0
            ? `Provisioned ${data.succeeded} tenant workspace(s).`
            : `Provisioned ${data.succeeded}, failed ${data.failed}. Start module backends and retry failed rows.`,
      });
    } catch (e) {
      next(e);
    }
  }

  async licensedModules(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await moduleManagementService.getOrganizationLicensedModules(String(req.params.organizationId));
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
}

export const moduleManagementController = new ModuleManagementController();
