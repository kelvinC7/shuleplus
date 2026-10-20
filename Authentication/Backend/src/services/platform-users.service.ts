import {
  AuditAction,
  DataScope,
  ModuleAccessLevel,
  OrganizationStatus,
  UserStatus,
} from '../generated/prisma';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { PLATFORM_ORG_SLUG, ROLES } from '../constants/roles';
import { AppError } from '../middleware/error.middleware';
import {
  generateSecurePassword,
  hashPassword,
  validatePasswordPolicy,
} from '../utils/security';
import { sendOrganizationAdminCredentialsEmail, buildOrgCredentialsLoginUrl } from '../utils/email';
import type { ModuleAssignmentInput } from './organization-admin.service';
import {
  LOCAL_MODULE_URLS,
  useLocalModuleUrlOverrides,
} from '../config/local-module-urls';

const PLATFORM_ADMIN_ROLES = [ROLES.ROOT_ADMIN, ROLES.SUPER_ADMIN] as const;
const PRINT_CARD_MODULE_SLUG = 'print-card';
const NESA_MODULE_SLUG = 'nesa';

export class PlatformUsersService {
  async getPlatformOrganization() {
    const existing = await prisma.organization.findUnique({
      where: { slug: PLATFORM_ORG_SLUG },
      select: { id: true, name: true, slug: true },
    });
    if (existing) return existing;

    return prisma.organization.create({
      data: {
        name: 'Babyeyi Platform',
        slug: PLATFORM_ORG_SLUG,
        type: 'OTHER',
        status: OrganizationStatus.ACTIVE,
        email: 'platform@babyeyi.com',
        modules: [],
      },
      select: { id: true, name: true, slug: true },
    });
  }

  async listAssignableModules() {
    const modules = await prisma.platformModule.findMany({
      where: { isEnabled: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        shortName: true,
        category: true,
        frontendUrl: true,
        color: true,
        icon: true,
      },
    });
    return modules;
  }

  async listPlatformUsers() {
    const platformOrg = await this.getPlatformOrganization();
    const users = await prisma.user.findMany({
      where: {
        organizationId: platformOrg.id,
        userRoles: {
          some: {
            role: {
              slug: ROLES.MODULE_OPERATOR,
            },
          },
        },
      },
      include: {
        userRoles: { include: { role: { select: { slug: true, name: true } } } },
        userModules: {
          include: { module: { select: { slug: true, name: true, shortName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      department: u.department,
      position: u.position,
      status: u.status,
      mfaEnabled: u.mfaEnabled,
      lastLoginAt: u.lastLoginAt,
      roles: u.userRoles.map((ur) => ur.role.slug),
      modules: u.userModules.map((um) => ({
        slug: um.module.slug,
        name: um.module.name,
        shortName: um.module.shortName,
        accessLevel: um.accessLevel,
        dataScope: um.dataScope,
      })),
      createdAt: u.createdAt,
    }));
  }

  async createPrintCardUser(
    actorId: string,
    data: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      requirePasswordChange?: boolean;
      sendCredentialsEmail?: boolean;
    }
  ) {
    await this.ensurePrintCardModule();
    const email = data.email.trim().toLowerCase();
    const local = email.split('@')[0]?.trim() || 'user';
    const parts = local.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean);
    const firstName =
      data.firstName?.trim() ||
      (parts[0]
        ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase()
        : 'User');
    const lastName =
      data.lastName?.trim() ||
      (parts[1]
        ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase()
        : 'Operator');

    return this.createPlatformUser(actorId, {
      email,
      firstName,
      lastName,
      password: data.password,
      moduleAssignments: [{ slug: PRINT_CARD_MODULE_SLUG }],
      requirePasswordChange: data.requirePasswordChange ?? false,
      sendCredentialsEmail: data.sendCredentialsEmail ?? false,
    });
  }

  async createNesaDashboardUser(
    actorId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      password?: string;
      department?: string;
      position?: string;
      requirePasswordChange?: boolean;
      sendCredentialsEmail?: boolean;
    }
  ) {
    await this.ensureNesaModule();
    return this.createPlatformUser(actorId, {
      email: data.email.trim().toLowerCase(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone?.trim(),
      department: data.department?.trim(),
      position: data.position?.trim(),
      password: data.password?.trim(),
      moduleAssignments: [{ slug: NESA_MODULE_SLUG }],
      requirePasswordChange: data.requirePasswordChange ?? true,
      sendCredentialsEmail: data.sendCredentialsEmail ?? true,
    });
  }

  async ensureNesaModuleForAdmin() {
    await this.ensureNesaModule();
  }

  private async ensureNesaModule() {
    const useLocal = useLocalModuleUrlOverrides(env.NODE_ENV);
    const local = LOCAL_MODULE_URLS[NESA_MODULE_SLUG];
    const frontendUrl = useLocal
      ? (local?.frontendUrl ?? 'http://localhost:3016')
      : 'https://nesa.shuleplus.rw';
    const backendUrl = useLocal
      ? (local?.backendUrl ?? 'http://localhost:3018/api')
      : 'https://nesa-api.shuleplus.rw/api';

    await prisma.platformModule.upsert({
      where: { slug: NESA_MODULE_SLUG },
      update: useLocal ? { isEnabled: true } : { isEnabled: true, frontendUrl, backendUrl },
      create: {
        slug: NESA_MODULE_SLUG,
        name: 'NESA Dashboard',
        shortName: 'NESA',
        category: 'National',
        version: '1.0.0',
        description: 'National oversight — circulars, compliance, and school monitoring',
        isEnabled: true,
        isPremium: false,
        isCore: false,
        frontendUrl,
        backendUrl,
        healthCheckUrl: '/api/health',
      },
    });
  }

  private async ensurePrintCardModule() {
    const useLocal = useLocalModuleUrlOverrides(env.NODE_ENV);
    const local = LOCAL_MODULE_URLS[PRINT_CARD_MODULE_SLUG];
    const frontendUrl = useLocal
      ? (local?.frontendUrl ?? 'http://localhost:3092')
      : 'https://printcard.shuleplus.rw';
    const backendUrl = useLocal
      ? (local?.backendUrl ?? 'http://localhost:3093/api')
      : 'https://printcard-api.shuleplus.rw/api';

    await prisma.platformModule.upsert({
      where: { slug: PRINT_CARD_MODULE_SLUG },
      update: useLocal
        ? { isEnabled: true }
        : { isEnabled: true, frontendUrl, backendUrl },
      create: {
        slug: PRINT_CARD_MODULE_SLUG,
        name: 'Print Card',
        shortName: 'Print Card',
        category: 'Operations',
        version: '1.0.0',
        description: 'Manage, preview, print, and track student and staff smart cards',
        isEnabled: true,
        isPremium: false,
        isCore: false,
        frontendUrl,
        backendUrl,
        healthCheckUrl: '/api/health',
      },
    });
  }

  async createPlatformUser(
    actorId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      password?: string;
      department?: string;
      position?: string;
      moduleAssignments: ModuleAssignmentInput[];
      requirePasswordChange?: boolean;
      sendCredentialsEmail?: boolean;
      mfaEnabled?: boolean;
      status?: UserStatus;
    }
  ) {
    const platformOrg = await this.getPlatformOrganization();
    const email = data.email.trim().toLowerCase();

    const existing = await prisma.user.findFirst({
      where: { organizationId: platformOrg.id, email },
    });
    if (existing) {
      throw new AppError(409, 'A platform user with this email already exists');
    }

    const passwordProvided = Boolean(data.password?.trim());
    const password = passwordProvided ? data.password!.trim() : generateSecurePassword();
    const policyError = validatePasswordPolicy(password);
    if (policyError) throw new AppError(400, policyError);
    const requirePasswordChange = data.requirePasswordChange ?? !passwordProvided;

    const catalogSlugs = (
      await prisma.platformModule.findMany({
        where: { isEnabled: true },
        select: { slug: true },
      })
    ).map((m) => m.slug);

    const assignments = this.normalizeAssignments(data.moduleAssignments, catalogSlugs);
    if (assignments.length === 0) {
      throw new AppError(400, 'Select at least one enabled module for this user');
    }

    const role = await this.ensureModuleOperatorRole(platformOrg.id);
    const status = data.status ?? UserStatus.ACTIVE;

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          organizationId: platformOrg.id,
          email,
          passwordHash: await hashPassword(password),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone?.trim() || null,
          department: data.department?.trim() || null,
          position: data.position?.trim() || null,
          status,
          emailVerifiedAt: new Date(),
          mustChangePassword: requirePasswordChange,
          mfaEnabled: data.mfaEnabled ?? false,
          activatedAt: status === UserStatus.ACTIVE ? new Date() : null,
          userRoles: { create: { roleId: role.id } },
        },
      });

      const modules = await tx.platformModule.findMany({
        where: { slug: { in: assignments.map((a) => a.slug) }, isEnabled: true },
        select: { id: true, slug: true },
      });
      const bySlug = new Map(modules.map((m) => [m.slug, m.id]));

      for (const assignment of assignments) {
        const moduleId = bySlug.get(assignment.slug);
        if (!moduleId) continue;
        await tx.userModule.create({
          data: {
            userId: created.id,
            organizationId: platformOrg.id,
            moduleId,
            accessLevel: assignment.accessLevel,
            dataScope: assignment.dataScope,
            assignedById: actorId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: platformOrg.id,
          userId: actorId,
          action: AuditAction.USER_CREATED,
          resource: 'platform_user',
          resourceId: created.id,
          metadata: {
            email,
            role: ROLES.MODULE_OPERATOR,
            modules: assignments,
          },
        },
      });

      return created;
    });

    const plainPassword = passwordProvided ? data.password!.trim() : password;
    if (data.sendCredentialsEmail !== false) {
      const loginUrl = buildOrgCredentialsLoginUrl(requirePasswordChange);
      await sendOrganizationAdminCredentialsEmail({
        to: email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        organizationName: 'ShulePlus Platform',
        loginUrl,
        email,
        password: plainPassword,
        requirePasswordChange,
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: ROLES.MODULE_OPERATOR,
      modules: assignments,
      tempPassword: plainPassword,
      credentialsSent: data.sendCredentialsEmail !== false,
    };
  }

  async getUserAssignedCatalogModules(userId: string, organizationId: string) {
    const assigned = await prisma.userModule.findMany({
      where: { userId, organizationId },
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
            isEnabled: true,
          },
        },
      },
    });

    return assigned
      .filter((a) => a.module.isEnabled)
      .map((a) => ({
        slug: a.module.slug,
        name: a.module.name,
        shortName: a.module.shortName,
        frontendUrl: a.module.frontendUrl,
        color: a.module.color,
        icon: a.module.icon,
        category: a.module.category,
        accessLevel: a.accessLevel,
        dataScope: a.dataScope,
      }));
  }

  isPlatformAdminRole(slug: string) {
    return (PLATFORM_ADMIN_ROLES as readonly string[]).includes(slug);
  }

  private normalizeAssignments(
    input: ModuleAssignmentInput[],
    allowedSlugs: string[]
  ): Array<{ slug: string; accessLevel: ModuleAccessLevel; dataScope: DataScope }> {
    const allowed = new Set(allowedSlugs);
    const seen = new Set<string>();
    const result: Array<{ slug: string; accessLevel: ModuleAccessLevel; dataScope: DataScope }> = [];

    for (const item of input) {
      const slug = item.slug?.trim();
      if (!slug || !allowed.has(slug) || seen.has(slug)) continue;
      seen.add(slug);
      const accessLevel = item.accessLevel === 'HEAD' ? ModuleAccessLevel.HEAD : ModuleAccessLevel.USER;
      const dataScope =
        item.dataScope ??
        (accessLevel === ModuleAccessLevel.HEAD ? DataScope.ORGANIZATION : DataScope.SELF);
      result.push({ slug, accessLevel, dataScope });
    }

    return result;
  }

  private async ensureModuleOperatorRole(organizationId: string) {
    const existing = await prisma.role.findFirst({
      where: { organizationId, slug: ROLES.MODULE_OPERATOR },
    });
    if (existing) return existing;

    return prisma.role.create({
      data: {
        organizationId,
        name: 'Module Operator',
        slug: ROLES.MODULE_OPERATOR,
        description: 'National/system user with direct module access',
        hierarchyLevel: 100,
        isSystem: true,
        dataScope: DataScope.GLOBAL,
      },
    });
  }

  private async assertModuleOperator(userId: string) {
    const platformOrg = await this.getPlatformOrganization();
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: platformOrg.id,
        userRoles: { some: { role: { slug: ROLES.MODULE_OPERATOR } } },
      },
      include: {
        userModules: { include: { module: { select: { slug: true } } } },
      },
    });
    if (!user) throw new AppError(404, 'Platform user not found');
    return { user, platformOrg };
  }

  async listPlatformUsersByModule(moduleSlug: string) {
    const platformOrg = await this.getPlatformOrganization();
    await this.ensureModuleOperatorRole(platformOrg.id);
    const users = await prisma.user.findMany({
      where: {
        organizationId: platformOrg.id,
        userModules: { some: { module: { slug: moduleSlug } } },
      },
      include: {
        userRoles: { include: { role: { select: { slug: true, name: true } } } },
        userModules: {
          include: { module: { select: { slug: true, name: true, shortName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      department: u.department,
      position: u.position,
      status: u.status,
      mfaEnabled: u.mfaEnabled,
      lastLoginAt: u.lastLoginAt,
      roles: u.userRoles.map((ur) => ur.role.slug),
      modules: u.userModules.map((um) => ({
        slug: um.module.slug,
        name: um.module.name,
        shortName: um.module.shortName,
        accessLevel: um.accessLevel,
        dataScope: um.dataScope,
      })),
      createdAt: u.createdAt,
    }));
  }

  async updatePlatformUser(
    actorId: string,
    userId: string,
    data: { firstName?: string; lastName?: string; email?: string; phone?: string | null }
  ) {
    const { user, platformOrg } = await this.assertModuleOperator(userId);

    if (data.email && data.email.toLowerCase() !== user.email) {
      const existing = await prisma.user.findFirst({
        where: {
          email: data.email.toLowerCase(),
          organizationId: platformOrg.id,
          id: { not: userId },
        },
      });
      if (existing) throw new AppError(409, 'A platform user with this email already exists');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName?.trim() ?? undefined,
        lastName: data.lastName?.trim() ?? undefined,
        email: data.email?.trim().toLowerCase() ?? undefined,
        phone: data.phone === undefined ? undefined : data.phone?.trim() || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrg.id,
        userId: actorId,
        action: AuditAction.USER_UPDATED,
        resource: 'platform_user',
        resourceId: userId,
        metadata: { email: updated.email },
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      status: updated.status,
      lastLoginAt: updated.lastLoginAt,
      createdAt: updated.createdAt,
    };
  }

  async deletePlatformUser(actorId: string, userId: string) {
    if (userId === actorId) {
      throw new AppError(400, 'You cannot delete your own account');
    }

    const { user, platformOrg } = await this.assertModuleOperator(userId);

    await prisma.user.delete({ where: { id: userId } });

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrg.id,
        userId: actorId,
        action: AuditAction.USER_DELETED,
        resource: 'platform_user',
        resourceId: userId,
        metadata: { email: user.email },
      },
    });

    return { deleted: true };
  }

  async resetPlatformUserPassword(
    actorId: string,
    userId: string,
    options?: { password?: string; sendEmail?: boolean }
  ) {
    const { user, platformOrg } = await this.assertModuleOperator(userId);

    const password = options?.password?.trim() || generateSecurePassword();
    const policyError = validatePasswordPolicy(password);
    if (policyError) throw new AppError(400, policyError);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
        failedLoginCount: 0,
        lockedUntil: null,
        status: user.status === UserStatus.LOCKED ? UserStatus.ACTIVE : user.status,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrg.id,
        userId: actorId,
        action: AuditAction.PASSWORD_RESET,
        resource: 'platform_user',
        resourceId: userId,
        metadata: { method: 'platform_user_reset', email: user.email },
      },
    });

    const sendEmail = options?.sendEmail !== false;
    if (sendEmail) {
      const loginUrl = buildOrgCredentialsLoginUrl(true);
      await sendOrganizationAdminCredentialsEmail({
        to: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        organizationName: 'ShulePlus Platform',
        loginUrl,
        email: user.email,
        password,
        requirePasswordChange: true,
      });
    }

    return { tempPassword: sendEmail ? undefined : password };
  }
}

export const platformUsersService = new PlatformUsersService();
