import { AuditAction, ModuleAssignmentStatus, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { env } from '../config/env';
import {
  isHostedModuleUrl,
  LOCAL_PROVISION_HINT,
  resolveLocalModuleBackendUrl,
  resolveLocalModuleFrontendUrl,
  sanitizeProvisionErrorMessage,
} from '../config/local-module-urls';
import {
  isHiddenFromSchoolMarketplace,
  isPlatformOwnedModule,
} from '../constants/platform-modules';
import { AppError } from '../middleware/error.middleware';
import { slugify } from '../utils/slug';
import { applyPlatformModuleDisplay } from '../utils/platform-module-display';
import { organizationProfileService } from './organization-profile.service';

export class ModuleManagementService {
  async getCatalogStats() {
    const [total, active, premium, core, disabled, orgAssignments] = await Promise.all([
      prisma.platformModule.count(),
      prisma.platformModule.count({ where: { isEnabled: true } }),
      prisma.platformModule.count({ where: { isPremium: true } }),
      prisma.platformModule.count({ where: { isCore: true } }),
      prisma.platformModule.count({ where: { isEnabled: false } }),
      prisma.organizationModule.groupBy({
        by: ['organizationId'],
        where: { status: ModuleAssignmentStatus.ACTIVE },
      }),
    ]);

    return {
      totalModules: total,
      activeModules: active,
      premiumModules: premium,
      coreModules: core,
      disabledModules: disabled,
      organizationsUsingModules: orgAssignments.length,
    };
  }

  async listCatalog() {
    const modules = await prisma.platformModule.findMany({
      orderBy: { name: 'asc' },
      include: {
        dependencies: { include: { dependsOn: { select: { id: true, slug: true, name: true } } } },
        _count: { select: { organizationModules: true } },
      },
    });

    return modules.map((m) =>
      applyPlatformModuleDisplay({
        ...m,
        organizationCount: m._count.organizationModules,
        dependencies: m.dependencies.map((d) => applyPlatformModuleDisplay(d.dependsOn)),
      }),
    );
  }

  async getModuleById(id: string) {
    const mod = await prisma.platformModule.findUnique({
      where: { id },
      include: {
        dependencies: { include: { dependsOn: { select: { id: true, slug: true, name: true } } } },
        _count: { select: { organizationModules: true } },
      },
    });
    if (!mod) throw new AppError(404, 'Module not found');
    return {
      ...mod,
      organizationCount: mod._count.organizationModules,
      dependencies: mod.dependencies.map((d) => d.dependsOn),
    };
  }

  async createModule(
    actorId: string,
    data: {
      name: string;
      shortName?: string;
      slug?: string;
      category?: string;
      version?: string;
      description?: string;
      color?: string;
      icon?: string;
      frontendUrl?: string;
      backendUrl?: string;
      docsUrl?: string;
      healthCheckUrl?: string;
      minSubscriptionPlan?: string;
      licenseType?: string;
      isPremium?: boolean;
      isCore?: boolean;
      isEnabled?: boolean;
      maintenanceMode?: boolean;
      allowTrial?: boolean;
      visibleInMarketplace?: boolean;
      dependencyIds?: string[];
    }
  ) {
    const base = data.slug?.trim() || slugify(data.name);
    let slug = base || 'module';
    let counter = 1;
    while (await prisma.platformModule.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }

    const mod = await prisma.platformModule.create({
      data: {
        name: data.name,
        shortName: data.shortName,
        slug,
        category: data.category,
        version: data.version ?? '1.0.0',
        description: data.description,
        color: data.color ?? '#FCB038',
        icon: data.icon,
        frontendUrl: data.frontendUrl,
        backendUrl: data.backendUrl,
        docsUrl: data.docsUrl,
        healthCheckUrl: data.healthCheckUrl,
        minSubscriptionPlan: data.minSubscriptionPlan,
        licenseType: data.licenseType ?? 'Standard',
      isPremium: data.isPremium ?? false,
      isCore: data.isCore ?? false,
      isEnabled: data.isEnabled ?? true,
      maintenanceMode: data.maintenanceMode ?? false,
      allowTrial: data.allowTrial ?? false,
        visibleInMarketplace: data.visibleInMarketplace ?? true,
      },
    });

    if (data.dependencyIds?.length) {
      await prisma.moduleDependency.createMany({
        data: data.dependencyIds.map((dependsOnModuleId) => ({
          moduleId: mod.id,
          dependsOnModuleId,
        })),
        skipDuplicates: true,
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.MODULE_ENABLED,
        resource: 'platform_module',
        resourceId: mod.id,
        metadata: { operation: 'CREATED', slug: mod.slug, name: mod.name },
      },
    });

    return this.getModuleById(mod.id);
  }

  async updateModule(
    moduleId: string,
    actorId: string,
    data: Partial<{
      name: string;
      shortName: string;
      category: string;
      version: string;
      description: string;
      color: string;
      icon: string;
      frontendUrl: string;
      backendUrl: string;
      docsUrl: string;
      healthCheckUrl: string;
      minSubscriptionPlan: string;
      licenseType: string;
      isEnabled: boolean;
      maintenanceMode: boolean;
      isPublic: boolean;
      isPremium: boolean;
      isCore: boolean;
      allowTrial: boolean;
      visibleInMarketplace: boolean;
      dependencyIds: string[];
    }>
  ) {
    const { dependencyIds, ...fields } = data;
    await prisma.platformModule.update({
      where: { id: moduleId },
      data: fields,
    });

    if (dependencyIds) {
      await prisma.moduleDependency.deleteMany({ where: { moduleId } });
      if (dependencyIds.length) {
        await prisma.moduleDependency.createMany({
          data: dependencyIds.map((dependsOnModuleId) => ({ moduleId, dependsOnModuleId })),
          skipDuplicates: true,
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.MODULE_ENABLED,
        resource: 'platform_module',
        resourceId: moduleId,
        metadata: { operation: 'UPDATED' },
      },
    });

    return this.getModuleById(moduleId);
  }

  async deleteModule(moduleId: string, actorId: string) {
    const mod = await prisma.platformModule.findUnique({
      where: { id: moduleId },
      include: {
        requiredBy: { include: { module: { select: { name: true } } } },
        organizationModules: { select: { organizationId: true } },
      },
    });

    if (!mod) throw new AppError(404, 'Module not found');
    if (mod.isCore) {
      throw new AppError(400, 'Core modules cannot be deleted. Disable instead.');
    }

    if (mod.requiredBy.length > 0) {
      const names = mod.requiredBy.map((r) => r.module.name).join(', ');
      throw new AppError(400, `Cannot delete: other modules depend on this (${names}). Edit those modules first.`);
    }

    const orgIds = [...new Set(mod.organizationModules.map((o) => o.organizationId))];

    await prisma.platformModule.delete({ where: { id: moduleId } });

    for (const orgId of orgIds) {
      await this.syncOrganizationModulesJson(orgId);
    }

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.MODULE_DISABLED,
        resource: 'platform_module',
        resourceId: moduleId,
        metadata: { operation: 'DELETED', slug: mod.slug, name: mod.name },
      },
    });

    return { deleted: true, slug: mod.slug, name: mod.name };
  }

  async listOrganizationAssignments(organizationId: string) {
    const [org, catalog, assignments] = await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId } }),
      prisma.platformModule.findMany({
        where: { isEnabled: true },
        orderBy: { name: 'asc' },
        include: {
          dependencies: { include: { dependsOn: { select: { id: true, slug: true, name: true } } } },
        },
      }),
      prisma.organizationModule.findMany({
        where: { organizationId },
        include: { module: true },
      }),
    ]);

    if (!org) throw new AppError(404, 'Organization not found');

    const assignmentMap = new Map(assignments.map((a) => [a.moduleId, a]));

    return {
      organization: org,
      modules: catalog.map((m) => ({
        module: m,
        assignment: assignmentMap.get(m.id) ?? null,
        dependencies: m.dependencies.map((d) => d.dependsOn),
      })),
    };
  }

  async assignModulesToOrganization(
    organizationId: string,
    actorId: string,
    moduleIds: string[],
    options?: { subscriptionPlan?: string; expiresAt?: string }
  ) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new AppError(404, 'Organization not found');

    const modules = await prisma.platformModule.findMany({
      where: { id: { in: moduleIds }, isEnabled: true },
      include: { dependencies: true },
    });

    if (modules.length !== moduleIds.length) {
      throw new AppError(400, 'One or more modules are invalid or disabled');
    }

    const platformOwned = modules.filter((m) => isPlatformOwnedModule(m.slug));
    if (platformOwned.length) {
      throw new AppError(
        400,
        `${platformOwned.map((m) => m.name).join(', ')} is platform-owned and cannot be assigned to schools`
      );
    }

    const assignedSet = new Set(moduleIds);
    for (const mod of modules) {
      for (const dep of mod.dependencies) {
        if (!assignedSet.has(dep.dependsOnModuleId)) {
          const depMod = await prisma.platformModule.findUnique({ where: { id: dep.dependsOnModuleId } });
          throw new AppError(
            400,
            `${mod.name} requires ${depMod?.name ?? 'another module'} to be assigned first`
          );
        }
      }
    }

    await prisma.organizationModule.deleteMany({
      where: { organizationId, moduleId: { notIn: moduleIds } },
    });

    const now = new Date();
    for (const mod of modules) {
      await prisma.organizationModule.upsert({
        where: { organizationId_moduleId: { organizationId, moduleId: mod.id } },
        update: {
          status: ModuleAssignmentStatus.ACTIVE,
          subscriptionPlan: options?.subscriptionPlan ?? org.subscriptionTier ?? 'Standard',
          moduleVersion: mod.version,
          activatedById: actorId,
          activatedAt: now,
          expiresAt: options?.expiresAt ? new Date(options.expiresAt) : null,
        },
        create: {
          organizationId,
          moduleId: mod.id,
          status: ModuleAssignmentStatus.ACTIVE,
          subscriptionPlan: options?.subscriptionPlan ?? org.subscriptionTier ?? 'Standard',
          moduleVersion: mod.version,
          activatedById: actorId,
          activatedAt: now,
          expiresAt: options?.expiresAt ? new Date(options.expiresAt) : null,
        },
      });
    }

    await this.syncOrganizationModulesJson(organizationId);

    const provisionResults: {
      moduleSlug: string;
      assignmentId: string;
      provisioned: boolean;
      error?: string;
    }[] = [];

    for (const mod of modules) {
      const assignment = await prisma.organizationModule.findUnique({
        where: { organizationId_moduleId: { organizationId, moduleId: mod.id } },
      });
      if (!assignment) continue;

      // Always attempt real microservice tenant create when not yet provisioned.
      if (!assignment.tenantProvisioned) {
        const result = await this.tryProvisionTenant(assignment.id, actorId);
        provisionResults.push({
          moduleSlug: mod.slug,
          assignmentId: assignment.id,
          provisioned: result.ok,
          error: result.error,
        });
      } else {
        provisionResults.push({
          moduleSlug: mod.slug,
          assignmentId: assignment.id,
          provisioned: true,
        });
      }
    }

    const iamActorId = await this.resolveIamAuditUserId(actorId);
    if (iamActorId) {
      await prisma.auditLog.create({
        data: {
          organizationId,
          userId: iamActorId,
          action: AuditAction.MODULE_ENABLED,
          resource: 'organization_modules',
          resourceId: organizationId,
          metadata: {
            moduleIds,
            moduleSlugs: modules.map((m) => m.slug),
            provisionResults,
          },
        },
      });
    }

    const assignments = await this.listOrganizationAssignments(organizationId);
    const pending = provisionResults.filter((r) => !r.provisioned);
    return {
      ...assignments,
      provisioning: {
        attempted: provisionResults.length,
        provisioned: provisionResults.filter((r) => r.provisioned).length,
        pending: pending.length,
        results: provisionResults,
        message:
          pending.length === 0
            ? 'All module tenants provisioned and active.'
            : `${pending.length} module(s) need tenant setup — open Module Provisioning and click Create tenant (module backends must be running).`,
      },
    };
  }

  async listProvisioningQueue() {
    return prisma.organizationModule.findMany({
      where: {
        status: ModuleAssignmentStatus.ACTIVE,
        tenantProvisioned: false,
      },
      include: {
        organization: { select: { id: true, name: true, slug: true, organizationCode: true } },
        module: { select: { id: true, slug: true, name: true, backendUrl: true, frontendUrl: true } },
      },
      orderBy: { activatedAt: 'asc' },
    });
  }

  /**
   * Provision every ACTIVE assignment that is still tenantProvisioned=false.
   * Also supports force=true to re-call module /tenant/create and set the flag
   * (fixes rows incorrectly marked provisioned by license-only scripts).
   */
  async provisionAllPending(actorId: string, options?: { force?: boolean }) {
    const where = options?.force
      ? { status: ModuleAssignmentStatus.ACTIVE }
      : {
          status: ModuleAssignmentStatus.ACTIVE,
          tenantProvisioned: false,
        };

    const queue = await prisma.organizationModule.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        module: { select: { id: true, slug: true, name: true, backendUrl: true } },
      },
      orderBy: { activatedAt: 'asc' },
    });

    const results: {
      assignmentId: string;
      organizationName: string;
      moduleSlug: string;
      ok: boolean;
      error?: string;
    }[] = [];

    for (const item of queue) {
      const result = await this.tryProvisionTenant(item.id, actorId, { force: options?.force });
      results.push({
        assignmentId: item.id,
        organizationName: item.organization.name,
        moduleSlug: item.module.slug,
        ok: result.ok,
        error: result.error,
      });
    }

    return {
      total: results.length,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  }

  async provisionModuleTenant(assignmentId: string, actorId: string, options?: { force?: boolean }) {
    const assignment = await prisma.organizationModule.findUnique({
      where: { id: assignmentId },
      include: {
        organization: true,
        module: true,
      },
    });

    if (!assignment) throw new AppError(404, 'Module assignment not found');
    if (assignment.tenantProvisioned && !options?.force) {
      throw new AppError(400, 'Tenant already provisioned for this module');
    }

    const result = await this.tryProvisionTenant(assignmentId, actorId, { force: options?.force });
    if (!result.ok) {
      throw new AppError(
        502,
        result.error ??
          (assignment.module.backendUrl
            ? 'Failed to provision tenant in module microservice'
            : 'Module has no backend URL — configure backendUrl in module catalog first')
      );
    }

    const updated = await prisma.organizationModule.findUniqueOrThrow({
      where: { id: assignmentId },
      include: { organization: true, module: true },
    });

    return {
      assignment: updated,
      organization: updated.organization,
      module: updated.module,
      message: `Tenant workspace ready for ${updated.module.name} — organization ${updated.organization.name}`,
    };
  }

  private resolveTenantCreateUrl(backendUrl: string): string {
    const base = backendUrl.replace(/\/$/, '');
    if (base.endsWith('/api')) {
      return `${base}/tenant/create`;
    }
    return `${base}/api/tenant/create`;
  }

  private async tryProvisionTenant(
    assignmentId: string,
    actorId: string,
    options?: { force?: boolean }
  ): Promise<{ ok: boolean; error?: string }> {
    const assignment = await prisma.organizationModule.findUnique({
      where: { id: assignmentId },
      include: { organization: true, module: true },
    });

    if (!assignment) return { ok: false, error: 'Assignment not found' };
    if (assignment.tenantProvisioned && !options?.force) return { ok: true };

    const backendUrl = resolveLocalModuleBackendUrl(
      assignment.module.slug,
      assignment.module.backendUrl,
      env.NODE_ENV
    );

    if (!backendUrl) {
      if (isHostedModuleUrl(assignment.module.backendUrl)) {
        const full = `Catalog has a hosted URL for ${assignment.module.name}. ${LOCAL_PROVISION_HINT}`;
        await prisma.organizationModule.update({
          where: { id: assignmentId },
          data: {
            provisionLastError: full,
            provisionAttempts: { increment: 1 },
          },
        });
        await this.writeProvisionLog({
          organizationId: assignment.organizationId,
          moduleId: assignment.moduleId,
          moduleSlug: assignment.module.slug,
          action: options?.force ? 'RE_PROVISION' : 'PROVISION',
          success: false,
          message: full,
          actorId,
        });
        return { ok: false, error: full };
      }

      await prisma.organizationModule.update({
        where: { id: assignmentId },
        data: {
          tenantProvisioned: true,
          tenantProvisionedAt: new Date(),
          provisionLastError: null,
          provisionAttempts: { increment: 1 },
        },
      });
      await this.syncOrganizationModulesJson(assignment.organizationId);
      await this.writeProvisionLog({
        organizationId: assignment.organizationId,
        moduleId: assignment.moduleId,
        moduleSlug: assignment.module.slug,
        action: options?.force ? 'RE_PROVISION' : 'PROVISION',
        success: true,
        message: 'Marked provisioned (no backend URL configured)',
        actorId,
      });
      return { ok: true };
    }

    const url = this.resolveTenantCreateUrl(backendUrl);
    const organizationRef =
      assignment.organization.organizationCode ?? assignment.organization.id;

    let schoolProfile: Awaited<
      ReturnType<typeof organizationProfileService.getOrganizationProfile>
    > | null = null;
    try {
      schoolProfile = await organizationProfileService.getOrganizationProfile(
        assignment.organization.id
      );
    } catch {
      schoolProfile = null;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': env.MODULE_PROVISIONING_KEY,
          'x-source-service': 'IAM',
        },
        body: JSON.stringify({
          organizationId: assignment.organization.id,
          organizationName: assignment.organization.name,
          organizationCode: assignment.organization.organizationCode ?? undefined,
          schoolProfile: schoolProfile ?? undefined,
        }),
      });

      if (!response.ok) {
        let detail = '';
        try {
          const body = (await response.json()) as { message?: string };
          detail = body.message ? `: ${body.message}` : '';
        } catch {
          /* ignore */
        }
        const error = `${assignment.module.name} returned HTTP ${response.status}${detail}`;
        console.error(`[ModuleProvisioning] ${error} (org ${organizationRef}, url ${url})`);
        await prisma.organizationModule.update({
          where: { id: assignmentId },
          data: {
            provisionLastError: error,
            provisionAttempts: { increment: 1 },
          },
        });
        await this.writeProvisionLog({
          organizationId: assignment.organizationId,
          moduleId: assignment.moduleId,
          moduleSlug: assignment.module.slug,
          action: options?.force ? 'RE_PROVISION' : 'PROVISION',
          success: false,
          message: error,
          actorId,
        });
        return { ok: false, error };
      }
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Connection failed';
      const message = sanitizeProvisionErrorMessage(raw);
      console.error(`[ModuleProvisioning] ${assignment.module.slug} call failed:`, error);
      const full =
        message.includes('unreachable') || message.includes('ECONNREFUSED')
          ? `${message}. ${LOCAL_PROVISION_HINT}`
          : message;
      await prisma.organizationModule.update({
        where: { id: assignmentId },
        data: {
          provisionLastError: full,
          provisionAttempts: { increment: 1 },
        },
      });
      await this.writeProvisionLog({
        organizationId: assignment.organizationId,
        moduleId: assignment.moduleId,
        moduleSlug: assignment.module.slug,
        action: options?.force ? 'RE_PROVISION' : 'PROVISION',
        success: false,
        message: full,
        actorId,
      });
      return { ok: false, error: full };
    }

    await prisma.organizationModule.update({
      where: { id: assignmentId },
      data: {
        tenantProvisioned: true,
        tenantProvisionedAt: new Date(),
        provisionLastError: null,
        provisionAttempts: { increment: 1 },
      },
    });

    await this.syncOrganizationModulesJson(assignment.organizationId);

    await prisma.auditLog.create({
      data: {
        organizationId: assignment.organizationId,
        userId: actorId,
        action: AuditAction.MODULE_ENABLED,
        resource: 'module_provisioning',
        resourceId: assignmentId,
        metadata: {
          moduleSlug: assignment.module.slug,
          organizationCode: assignment.organization.organizationCode,
          tenantStatus: 'PROVISIONED',
        },
      },
    });

    await this.writeProvisionLog({
      organizationId: assignment.organizationId,
      moduleId: assignment.moduleId,
      moduleSlug: assignment.module.slug,
      action: options?.force ? 'RE_PROVISION' : 'PROVISION',
      success: true,
      message: `Tenant workspace ready for ${assignment.module.name}`,
      actorId,
    });

    return { ok: true };
  }

  async getModuleControl(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        organizationCode: true,
        status: true,
        subscriptionTier: true,
      },
    });
    if (!org) throw new AppError(404, 'Organization not found');

    const assignments = await prisma.organizationModule.findMany({
      where: { organizationId },
      include: {
        module: {
          select: {
            id: true,
            slug: true,
            name: true,
            shortName: true,
            category: true,
            color: true,
            icon: true,
            version: true,
            frontendUrl: true,
            backendUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const modules = assignments.map((a) => ({
      assignmentId: a.id,
      moduleId: a.moduleId,
      status: a.status,
      subscriptionPlan: a.subscriptionPlan,
      moduleVersion: a.moduleVersion,
      activatedAt: a.activatedAt,
      expiresAt: a.expiresAt,
      tenantProvisioned: a.tenantProvisioned,
      tenantProvisionedAt: a.tenantProvisionedAt,
      isHidden: a.isHidden,
      limits: a.limits,
      provisionLastError: a.provisionLastError,
      provisionAttempts: a.provisionAttempts,
      tenantStatus: a.tenantProvisioned
        ? a.provisionLastError
          ? 'FAILED'
          : 'PROVISIONED'
        : a.provisionAttempts > 0
          ? 'FAILED'
          : 'NOT_PROVISIONED',
      module: a.module,
    }));

    const stats = {
      total: modules.length,
      active: modules.filter((m) => m.status === ModuleAssignmentStatus.ACTIVE).length,
      locked: modules.filter((m) => m.status === ModuleAssignmentStatus.PENDING).length,
      disabled: modules.filter((m) => m.status === ModuleAssignmentStatus.SUSPENDED).length,
      expired: modules.filter((m) => m.status === ModuleAssignmentStatus.EXPIRED).length,
      provisioned: modules.filter((m) => m.tenantProvisioned).length,
      hidden: modules.filter((m) => m.isHidden).length,
      lastActivityAt: assignments.reduce<string | null>((latest, a) => {
        const ts = a.updatedAt?.toISOString?.() ?? null;
        if (!ts) return latest;
        if (!latest || ts > latest) return ts;
        return latest;
      }, null),
    };

    return { organization: org, modules, stats };
  }

  async patchOrganizationModule(
    organizationId: string,
    moduleId: string,
    actorId: string,
    action: 'activate' | 'deactivate' | 'lock' | 'unlock' | 'hide' | 'show' | 'remove' | 'reset',
    limits?: Record<string, unknown>
  ) {
    const assignment = await prisma.organizationModule.findUnique({
      where: { organizationId_moduleId: { organizationId, moduleId } },
      include: { module: { select: { slug: true, name: true } } },
    });
    if (!assignment) throw new AppError(404, 'Module is not assigned to this organization');

    if (action === 'remove') {
      await prisma.organizationModule.delete({ where: { id: assignment.id } });
      await this.syncOrganizationModulesJson(organizationId);
      await this.writeProvisionLog({
        organizationId,
        moduleId,
        moduleSlug: assignment.module.slug,
        action: 'REMOVE',
        success: true,
        message: `${assignment.module.name} removed from organization`,
        actorId,
      });
      return this.getModuleControl(organizationId);
    }

    if (action === 'reset') {
      await prisma.organizationModule.update({
        where: { id: assignment.id },
        data: {
          tenantProvisioned: false,
          tenantProvisionedAt: null,
          provisionLastError: null,
          provisionAttempts: 0,
        },
      });
      await this.writeProvisionLog({
        organizationId,
        moduleId,
        moduleSlug: assignment.module.slug,
        action: 'RESET',
        success: true,
        message: 'Provisioning state reset',
        actorId,
      });
      return this.getModuleControl(organizationId);
    }

    let logAction = action.toUpperCase();
    const data: Prisma.OrganizationModuleUncheckedUpdateInput = {};

    switch (action) {
      case 'activate':
      case 'unlock':
        data.status = ModuleAssignmentStatus.ACTIVE;
        data.activatedAt = new Date();
        data.activatedById = actorId;
        logAction = action === 'unlock' ? 'UNLOCK' : 'ACTIVATE';
        break;
      case 'deactivate':
        data.status = ModuleAssignmentStatus.SUSPENDED;
        logAction = 'DEACTIVATE';
        break;
      case 'lock':
        data.status = ModuleAssignmentStatus.PENDING;
        logAction = 'LOCK';
        break;
      case 'hide':
        data.isHidden = true;
        logAction = 'HIDE';
        break;
      case 'show':
        data.isHidden = false;
        logAction = 'SHOW';
        break;
      default:
        throw new AppError(400, 'Unknown action');
    }

    if (limits) {
      data.limits = limits as Prisma.InputJsonValue;
    }

    await prisma.organizationModule.update({ where: { id: assignment.id }, data });
    await this.syncOrganizationModulesJson(organizationId);
    await this.writeProvisionLog({
      organizationId,
      moduleId,
      moduleSlug: assignment.module.slug,
      action: logAction,
      success: true,
      message: `${assignment.module.name}: ${logAction.toLowerCase()}`,
      actorId,
    });

    return this.getModuleControl(organizationId);
  }

  async provisionOrganizationModule(
    organizationId: string,
    moduleId: string,
    actorId: string,
    options?: { force?: boolean }
  ) {
    const assignment = await prisma.organizationModule.findUnique({
      where: { organizationId_moduleId: { organizationId, moduleId } },
    });
    if (!assignment) throw new AppError(404, 'Module is not assigned to this organization');
    return this.provisionModuleTenant(assignment.id, actorId, options);
  }

  async listProvisionLogs(organizationId: string, moduleId?: string) {
    return prisma.moduleProvisionLog.findMany({
      where: {
        organizationId,
        ...(moduleId ? { moduleId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private async writeProvisionLog(entry: {
    organizationId: string;
    moduleId?: string | null;
    moduleSlug?: string | null;
    action: string;
    success: boolean;
    message?: string;
    actorId?: string;
  }) {
    await prisma.moduleProvisionLog.create({
      data: {
        organizationId: entry.organizationId,
        moduleId: entry.moduleId ?? null,
        moduleSlug: entry.moduleSlug ?? null,
        action: entry.action,
        success: entry.success,
        message: entry.message,
        actorId: entry.actorId,
      },
    });
  }

  async getOrganizationLicensedModules(organizationId: string) {
    // ACTIVE = can launch. PENDING = locked until super-admin activates. SUSPENDED = Deactivated.
    // isHidden = not listed in the launcher at all.
    const assignments = await prisma.organizationModule.findMany({
      where: {
        organizationId,
        isHidden: false,
        status: {
          in: [
            ModuleAssignmentStatus.ACTIVE,
            ModuleAssignmentStatus.SUSPENDED,
            ModuleAssignmentStatus.PENDING,
          ],
        },
      },
      include: {
        module: {
          select: {
            slug: true,
            name: true,
            shortName: true,
            frontendUrl: true,
            color: true,
            icon: true,
            category: true,
          },
        },
      },
    });

    const mapped = assignments
      .filter((a) => !isPlatformOwnedModule(a.module.slug))
      .map((a) => {
      const frontendUrl = resolveLocalModuleFrontendUrl(
        a.module.slug,
        a.module.frontendUrl,
        env.NODE_ENV
      );
      const canLaunch =
        a.status === ModuleAssignmentStatus.ACTIVE && a.tenantProvisioned && Boolean(frontendUrl);
      return {
        slug: a.module.slug,
        name: a.module.name,
        shortName: a.module.shortName,
        frontendUrl: canLaunch ? frontendUrl : null,
        color: a.module.color,
        icon: a.module.icon,
        category: a.module.category,
        activatedAt: a.activatedAt,
        tenantProvisioned: a.tenantProvisioned,
        status: a.status,
        deactivated: a.status === ModuleAssignmentStatus.SUSPENDED,
        locked: a.status === ModuleAssignmentStatus.PENDING,
        notProvisioned:
          a.status === ModuleAssignmentStatus.ACTIVE && !a.tenantProvisioned,
        isHidden: a.isHidden,
      };
    });

    // Circulars is the same product as Babyeyi — show one tile: Circular (Babyeyi) Wizard
    const hasBabyeyi = mapped.some((m) => m.slug === 'babyeyi');
    const deduped = mapped.filter((m) => !(m.slug === 'circulars' && hasBabyeyi));

    return deduped.map((m) => {
      if (m.slug !== 'circulars' && m.slug !== 'babyeyi') return m;
      const isProdHosted =
        env.NODE_ENV === 'production' ||
        (process.env.FRONTEND_URL ?? '').includes('shuleplus.rw');
      // Never trust a mis-set catalog URL (e.g. academic.shuleplus.rw) for Babyeyi.
      const babyeyiFrontend = isProdHosted
        ? 'https://babyeyi.shuleplus.rw'
        : m.frontendUrl?.includes('shuleplus.rw')
          ? m.frontendUrl
          : 'http://localhost:3013';
      const canLaunch =
        m.status === ModuleAssignmentStatus.ACTIVE &&
        m.tenantProvisioned &&
        !m.deactivated &&
        !m.locked;
      return {
        ...m,
        slug: 'babyeyi',
        name: 'Circular (Babyeyi) Wizard',
        shortName: 'Circulars',
        frontendUrl: canLaunch ? babyeyiFrontend : null,
      };
    });
  }

  async getOrganizationModuleSlugs(organizationId: string): Promise<string[]> {
    const modules = await this.getOrganizationLicensedModules(organizationId);
    return modules.filter((m) => !m.deactivated && !m.locked).map((m) => m.slug);
  }

  private async syncOrganizationModulesJson(organizationId: string) {
    const active = await prisma.organizationModule.findMany({
      where: { organizationId, status: ModuleAssignmentStatus.ACTIVE },
      include: { module: { select: { slug: true } } },
    });

    await prisma.organization.update({
      where: { id: organizationId },
      data: { modules: active.map((a) => a.module.slug) as Prisma.InputJsonValue },
    });
  }

  async listMarketplaceForOrganization(organizationId: string) {
    const [catalog, assignments] = await Promise.all([
      prisma.platformModule.findMany({
        where: { isEnabled: true, visibleInMarketplace: true },
        orderBy: { name: 'asc' },
        include: {
          dependencies: {
            include: { dependsOn: { select: { id: true, slug: true, name: true } } },
          },
        },
      }),
      prisma.organizationModule.findMany({ where: { organizationId } }),
    ]);

    const assignmentMap = new Map(assignments.map((a) => [a.moduleId, a]));

    return catalog.filter((m) => !isHiddenFromSchoolMarketplace(m.slug)).map((m) => {
      const assignment = assignmentMap.get(m.id) ?? null;
      let enrollmentStatus:
        | 'available'
        | 'active'
        | 'pending_activation'
        | 'provisioning'
        | 'suspended' = 'available';

      if (assignment) {
        if (assignment.status === ModuleAssignmentStatus.PENDING) {
          enrollmentStatus = 'pending_activation';
        } else if (assignment.status === ModuleAssignmentStatus.SUSPENDED) {
          enrollmentStatus = 'suspended';
        } else if (assignment.status === ModuleAssignmentStatus.ACTIVE && assignment.tenantProvisioned) {
          enrollmentStatus = 'active';
        } else if (assignment.status === ModuleAssignmentStatus.ACTIVE) {
          enrollmentStatus = 'provisioning';
        }
      }

      return {
        module: {
          id: m.id,
          slug: m.slug,
          name: m.name,
          shortName: m.shortName,
          category: m.category,
          description: m.description,
          color: m.color,
          icon: m.icon,
          isPremium: m.isPremium,
          isCore: m.isCore,
        },
        enrollmentStatus,
        assignment: assignment
          ? {
              id: assignment.id,
              status: assignment.status,
              tenantProvisioned: assignment.tenantProvisioned,
              activatedAt: assignment.activatedAt,
            }
          : null,
        dependencies: m.dependencies.map((d) => d.dependsOn),
      };
    });
  }

  async enrollOrganizationModule(organizationId: string, actorId: string, moduleId: string) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new AppError(404, 'Organization not found');

    const mod = await prisma.platformModule.findFirst({
      where: { id: moduleId, isEnabled: true, visibleInMarketplace: true },
      include: {
        dependencies: { include: { dependsOn: { select: { id: true, slug: true, name: true } } } },
      },
    });
    if (!mod) throw new AppError(404, 'Module is not available in the marketplace');
    if (isHiddenFromSchoolMarketplace(mod.slug)) {
      throw new AppError(400, 'This module is not available for school self-enrollment');
    }

    const existing = await prisma.organizationModule.findUnique({
      where: { organizationId_moduleId: { organizationId, moduleId } },
    });

    if (existing) {
      if (existing.status === ModuleAssignmentStatus.ACTIVE && existing.tenantProvisioned) {
        return {
          enrollmentStatus: 'active' as const,
          message: 'This module is already active for your organization.',
          module: { id: mod.id, slug: mod.slug, name: mod.name },
          provisioning: { provisioned: true },
        };
      }

      if (existing.status === ModuleAssignmentStatus.PENDING) {
        return {
          enrollmentStatus: 'pending_activation' as const,
          message: 'This module is awaiting platform activation.',
          module: { id: mod.id, slug: mod.slug, name: mod.name },
          provisioning: { provisioned: false },
        };
      }

      if (existing.status === ModuleAssignmentStatus.SUSPENDED) {
        await prisma.organizationModule.update({
          where: { id: existing.id },
          data: {
            status: ModuleAssignmentStatus.ACTIVE,
            activatedAt: new Date(),
            activatedById: actorId,
          },
        });
        await this.syncOrganizationModulesJson(organizationId);
        const result = await this.tryProvisionTenant(existing.id, actorId);
        return {
          enrollmentStatus: result.ok ? ('active' as const) : ('provisioning' as const),
          message: result.ok
            ? 'Module reactivated and ready to use.'
            : 'Module reactivated — tenant setup is in progress.',
          module: { id: mod.id, slug: mod.slug, name: mod.name },
          provisioning: { provisioned: result.ok, error: result.error },
        };
      }

      if (existing.status === ModuleAssignmentStatus.ACTIVE && !existing.tenantProvisioned) {
        const result = await this.tryProvisionTenant(existing.id, actorId);
        return {
          enrollmentStatus: result.ok ? ('active' as const) : ('provisioning' as const),
          message: result.ok
            ? 'Tenant workspace is ready.'
            : 'Tenant setup is still in progress.',
          module: { id: mod.id, slug: mod.slug, name: mod.name },
          provisioning: { provisioned: result.ok, error: result.error },
        };
      }
    }

    for (const dep of mod.dependencies) {
      const depAssignment = await prisma.organizationModule.findUnique({
        where: {
          organizationId_moduleId: { organizationId, moduleId: dep.dependsOnModuleId },
        },
      });
      const depActive =
        depAssignment?.status === ModuleAssignmentStatus.ACTIVE &&
        depAssignment.tenantProvisioned;
      if (!depActive) {
        throw new AppError(
          400,
          `${mod.name} requires ${dep.dependsOn.name} to be active and provisioned first`
        );
      }
    }

    const initialStatus = mod.isPremium
      ? ModuleAssignmentStatus.PENDING
      : ModuleAssignmentStatus.ACTIVE;
    const now = new Date();

    const assignment = await prisma.organizationModule.create({
      data: {
        organizationId,
        moduleId,
        status: initialStatus,
        subscriptionPlan: org.subscriptionTier ?? 'Standard',
        moduleVersion: mod.version,
        activatedById: initialStatus === ModuleAssignmentStatus.ACTIVE ? actorId : null,
        activatedAt: initialStatus === ModuleAssignmentStatus.ACTIVE ? now : null,
      },
    });

    await this.syncOrganizationModulesJson(organizationId);

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: actorId,
        action: AuditAction.MODULE_ENABLED,
        resource: 'organization_module_enrollment',
        resourceId: assignment.id,
        metadata: {
          moduleId,
          moduleSlug: mod.slug,
          status: initialStatus,
          isPremium: mod.isPremium,
        },
      },
    });

    if (initialStatus === ModuleAssignmentStatus.PENDING) {
      return {
        enrollmentStatus: 'pending_activation' as const,
        message:
          'Enrollment submitted. Your platform administrator will activate this module shortly.',
        module: { id: mod.id, slug: mod.slug, name: mod.name },
        provisioning: { provisioned: false },
      };
    }

    const result = await this.tryProvisionTenant(assignment.id, actorId);
    return {
      enrollmentStatus: result.ok ? ('active' as const) : ('provisioning' as const),
      message: result.ok
        ? 'Module enrolled and ready to use.'
        : 'Module enrolled — tenant workspace setup is in progress.',
      module: { id: mod.id, slug: mod.slug, name: mod.name },
      provisioning: { provisioned: result.ok, error: result.error },
    };
  }

  /** Audit logs require an IAM `users` row — developer portal actors may not have one. */
  private async resolveIamAuditUserId(actorId: string): Promise<string | null> {
    const direct = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
    if (direct) return direct.id;

    const developer = await prisma.developerUser.findUnique({
      where: { id: actorId },
      select: { createdByUserId: true },
    });
    if (developer?.createdByUserId) {
      const creator = await prisma.user.findUnique({
        where: { id: developer.createdByUserId },
        select: { id: true },
      });
      if (creator) return creator.id;
    }

    if (env.ROOT_ADMIN_EMAIL) {
      const root = await prisma.user.findFirst({
        where: { email: env.ROOT_ADMIN_EMAIL },
        select: { id: true },
      });
      if (root) return root.id;
    }

    return null;
  }
}

export const moduleManagementService = new ModuleManagementService();
