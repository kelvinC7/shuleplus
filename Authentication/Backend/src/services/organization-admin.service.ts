import { AuditAction, DataScope, ModuleAccessLevel, UserStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { ROLES } from '../constants/roles';
import { AppError } from '../middleware/error.middleware';
import { moduleManagementService } from './module-management.service';
import {
  generateSecurePassword,
  hashPassword,
  validatePasswordPolicy,
} from '../utils/security';
import { sendOrganizationAdminCredentialsEmail, buildOrgCredentialsLoginUrl } from '../utils/email';
import { queueStaffFanout } from './staff-fanout.service';
import { staffIdService } from './staff-id.service';
import {
  isModernStaffId,
  normalizeStaffIdInput,
  realignStaffIdRolePrefix,
} from '../utils/staff-id';
import {
  createHrDepartment,
  deleteHrDepartment,
  fetchHrDepartments,
} from '../clients/hr-module.client';
import { smartAccessModuleClient } from '../clients/smart-access-module.client';
import { rootAdminService } from './root-admin.service';

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

export type ModuleAssignmentInput = {
  slug: string;
  accessLevel?: 'USER' | 'HEAD';
  dataScope?: DataScope;
};

export class OrganizationAdminService {
  async listLicensedModules(organizationId: string) {
    return moduleManagementService.getOrganizationLicensedModules(organizationId);
  }

  async listModuleCatalog(organizationId: string) {
    return moduleManagementService.listMarketplaceForOrganization(organizationId);
  }

  async enrollModule(actorId: string, organizationId: string, moduleId: string) {
    return moduleManagementService.enrollOrganizationModule(organizationId, actorId, moduleId);
  }

  async listUsers(organizationId: string) {
    const users = await prisma.user.findMany({
      where: { organizationId },
      include: {
        userRoles: { include: { role: { select: { slug: true, name: true } } } },
        userModules: {
          include: { module: { select: { slug: true, name: true, shortName: true } } },
        },
        supervisor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      department: u.department,
      branch: u.branch,
      position: u.position,
      employeeId: u.employeeId,
      status: u.status,
      mfaEnabled: u.mfaEnabled,
      lastLoginAt: u.lastLoginAt,
      activatedAt: u.activatedAt,
      roles: u.userRoles.map((ur) => ur.role.slug),
      modules: u.userModules.map((um) => ({
        slug: um.module.slug,
        name: um.module.name,
        shortName: um.module.shortName,
        accessLevel: um.accessLevel,
        dataScope: um.dataScope,
      })),
      supervisor: u.supervisor
        ? {
            id: u.supervisor.id,
            name: `${u.supervisor.firstName} ${u.supervisor.lastName}`.trim(),
            email: u.supervisor.email,
          }
        : null,
      createdAt: u.createdAt,
    }));
  }

  async getUser(organizationId: string, userId: string) {
    const users = await this.listUsers(organizationId);
    const user = users.find((u) => u.id === userId);
    if (!user) throw new AppError(404, 'User not found in your organization');
    return user;
  }

  async getUserPhotoSources(organizationId: string, userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, email: true, avatarUrl: true },
    });
    if (!user) throw new AppError(404, 'User not found in your organization');

    let hrPhotoUrl: string | null = null;
    try {
      const hrRows = await smartAccessModuleClient.listStaffFromHr(organizationId);
      const match = hrRows.find(
        (row) => normalizeEmail(row.email) === normalizeEmail(user.email) && row.photoUrl
      );
      hrPhotoUrl = match?.photoUrl ?? null;
    } catch {
      hrPhotoUrl = null;
    }

    return {
      avatarUrl: user.avatarUrl ?? null,
      hrPhotoUrl,
    };
  }

  async createUser(
    actorId: string,
    organizationId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      password?: string;
      department?: string;
      branch?: string;
      position?: string;
      employeeId?: string;
      supervisorId?: string;
      avatarUrl?: string;
      /** organization_admin | organization_member (default) */
      roleSlug?: string;
      moduleAssignments?: ModuleAssignmentInput[];
      /** @deprecated prefer moduleAssignments */
      moduleSlugs?: string[];
      dataScope?: DataScope;
      requirePasswordChange?: boolean;
      sendCredentialsEmail?: boolean;
      status?: UserStatus;
      activatedAt?: string | Date | null;
    }
  ) {
    const email = data.email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { organizationId, email },
    });
    if (existing) throw new AppError(409, 'A user with this email already exists in your organization');

    const passwordProvided = Boolean(data.password?.trim());
    const password = passwordProvided ? data.password!.trim() : generateSecurePassword();
    const policyError = validatePasswordPolicy(password);
    if (policyError) throw new AppError(400, policyError);
    const requirePasswordChange = data.requirePasswordChange ?? !passwordProvided;

    const roleSlug =
      data.roleSlug === ROLES.ORGANIZATION_ADMIN
        ? ROLES.ORGANIZATION_ADMIN
        : ROLES.ORGANIZATION_MEMBER;

    const licensedSlugs = await moduleManagementService.getOrganizationModuleSlugs(organizationId);
    const assignments =
      roleSlug === ROLES.ORGANIZATION_ADMIN ? [] : this.normalizeAssignments(data, licensedSlugs);

    if (roleSlug === ROLES.ORGANIZATION_MEMBER && licensedSlugs.length > 0 && assignments.length === 0) {
      throw new AppError(400, 'Select at least one licensed module for this user');
    }

    if (data.supervisorId) {
      const supervisor = await prisma.user.findFirst({
        where: { id: data.supervisorId, organizationId },
      });
      if (!supervisor) throw new AppError(400, 'Supervisor not found in your organization');
    }

    const role = await this.ensureOrgRole(organizationId, roleSlug);
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true },
    });

    let employeeId = data.employeeId ? normalizeStaffIdInput(data.employeeId) || null : null;
    if (!employeeId) {
      employeeId = await staffIdService.allocateForOrganization(organizationId, {
        position: data.position,
        roleSlug,
      });
    }

    const status = data.status ?? UserStatus.ACTIVE;
    const activatedAt = data.activatedAt
      ? new Date(data.activatedAt)
      : status === UserStatus.ACTIVE
        ? new Date()
        : null;

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          organizationId,
          email,
          passwordHash: await hashPassword(password),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone?.trim() || null,
          avatarUrl: data.avatarUrl?.trim() || null,
          department: data.department?.trim() || null,
          branch: data.branch?.trim() || null,
          position: data.position?.trim() || null,
          employeeId,
          supervisorId: data.supervisorId || null,
          status,
          emailVerifiedAt: new Date(),
          mustChangePassword: requirePasswordChange,
          activatedAt,
          userRoles: { create: { roleId: role.id } },
        },
      });

      if (assignments.length) {
        const modules = await tx.platformModule.findMany({
          where: { slug: { in: assignments.map((a) => a.slug) } },
          select: { id: true, slug: true },
        });
        const bySlug = new Map(modules.map((m) => [m.slug, m.id]));
        for (const assignment of assignments) {
          const moduleId = bySlug.get(assignment.slug);
          if (!moduleId) continue;
          await tx.userModule.create({
            data: {
              userId: created.id,
              organizationId,
              moduleId,
              accessLevel: assignment.accessLevel,
              dataScope: assignment.dataScope,
              assignedById: actorId,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          organizationId,
          userId: actorId,
          action: AuditAction.USER_CREATED,
          resource: 'user',
          resourceId: created.id,
          metadata: {
            email,
            role: roleSlug,
            modules: assignments,
            department: data.department,
            branch: data.branch,
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
        organizationName: org.name,
        loginUrl,
        email,
        password: plainPassword,
        requirePasswordChange,
      });
    }

    if (assignments.some((a) => a.slug === 'teacher-portal') && !user.position) {
      await prisma.user.update({
        where: { id: user.id },
        data: { position: 'Teacher' },
      });
    }

    queueStaffFanout({
      organizationId,
      iamUserId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      position: assignments.some((a) => a.slug === 'teacher-portal') ? user.position || 'Teacher' : user.position,
      department: user.department,
      employeeId: user.employeeId,
      avatarUrl: user.avatarUrl,
      moduleSlugs: assignments.map((a) => a.slug),
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: roleSlug,
      modules: assignments,
      tempPassword: plainPassword,
      credentialsSent: data.sendCredentialsEmail !== false,
    };
  }

  async setUserModules(
    actorId: string,
    organizationId: string,
    userId: string,
    input: { moduleSlugs?: string[]; moduleAssignments?: ModuleAssignmentInput[] }
  ) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new AppError(404, 'User not found in your organization');

    const isOrgAdmin = user.userRoles.some((ur) => ur.role.slug === ROLES.ORGANIZATION_ADMIN);
    if (isOrgAdmin) {
      throw new AppError(400, 'Organization administrators already have access to all licensed modules');
    }

    const licensedSlugs = await moduleManagementService.getOrganizationModuleSlugs(organizationId);
    const assignments = this.normalizeAssignments(input, licensedSlugs);

    const modules = await prisma.platformModule.findMany({
      where: { slug: { in: assignments.map((a) => a.slug) } },
      select: { id: true, slug: true },
    });
    const bySlug = new Map(modules.map((m) => [m.slug, m.id]));

    await prisma.$transaction(async (tx) => {
      await tx.userModule.deleteMany({ where: { userId, organizationId } });
      for (const assignment of assignments) {
        const moduleId = bySlug.get(assignment.slug);
        if (!moduleId) continue;
        await tx.userModule.create({
          data: {
            userId,
            organizationId,
            moduleId,
            accessLevel: assignment.accessLevel,
            dataScope: assignment.dataScope,
            assignedById: actorId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId,
          userId: actorId,
          action: AuditAction.PERMISSION_CHANGED,
          resource: 'user_modules',
          resourceId: userId,
          metadata: { modules: assignments },
        },
      });
    });

    if (assignments.some((a) => a.slug === 'teacher-portal') && !user.position) {
      await prisma.user.update({
        where: { id: userId },
        data: { position: 'Teacher' },
      });
    }

    queueStaffFanout({
      organizationId,
      iamUserId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      position: assignments.some((a) => a.slug === 'teacher-portal')
        ? user.position || 'Teacher'
        : user.position,
      department: user.department,
      employeeId: user.employeeId,
      avatarUrl: user.avatarUrl,
      moduleSlugs: assignments.map((a) => a.slug),
    });

    return { userId, modules: assignments };
  }

  async updateUserStatus(
    actorId: string,
    organizationId: string,
    userId: string,
    status: UserStatus
  ) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new AppError(404, 'User not found in your organization');
    if (user.id === actorId) throw new AppError(400, 'You cannot change your own account status');
    if (user.userRoles.some((ur) => ur.role.slug === ROLES.ORGANIZATION_ADMIN)) {
      throw new AppError(400, 'Cannot change status of another organization administrator');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        status,
        activatedAt: status === UserStatus.ACTIVE ? new Date() : user.activatedAt,
        lockedUntil: status === UserStatus.LOCKED ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: actorId,
        action: AuditAction.USER_UPDATED,
        resource: 'user_status',
        resourceId: userId,
        metadata: { status, previousStatus: user.status },
      },
    });

    return { id: updated.id, status: updated.status };
  }

  async listDepartments(organizationId: string) {
    return fetchHrDepartments(organizationId);
  }

  async createDepartment(
    organizationId: string,
    input: { name: string; branch?: string; departmentHead?: string; departmentType?: string }
  ) {
    const name = input.name?.trim();
    if (!name) throw new AppError(400, 'Department name is required');
    try {
      return await createHrDepartment(organizationId, {
        name,
        branch: input.branch?.trim() || undefined,
        departmentHead: input.departmentHead?.trim() || undefined,
        departmentType: input.departmentType?.trim() || undefined,
        status: 'ACTIVE',
      });
    } catch (e) {
      throw new AppError(
        502,
        e instanceof Error ? e.message : 'Could not create department. Ensure HR service is running.'
      );
    }
  }

  async deleteDepartment(organizationId: string, departmentId: string) {
    try {
      await deleteHrDepartment(organizationId, departmentId);
      return { id: departmentId, deleted: true };
    } catch (e) {
      throw new AppError(
        400,
        e instanceof Error ? e.message : 'Could not delete department'
      );
    }
  }

  async updateUser(
    actorId: string,
    organizationId: string,
    userId: string,
    data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      department?: string;
      branch?: string;
      position?: string;
      employeeId?: string;
      supervisorId?: string | null;
      avatarUrl?: string | null;
    }
  ) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
      include: {
        userRoles: { include: { role: true } },
        userModules: { include: { module: { select: { slug: true } } } },
      },
    });
    if (!user) throw new AppError(404, 'User not found in your organization');

    const roleSlug = user.userRoles[0]?.role.slug;
    const roleName = user.userRoles[0]?.role.name;
    const currentEmployeeId = normalizeStaffIdInput(user.employeeId) || null;
    const submittedEmployeeId =
      data.employeeId !== undefined ? normalizeStaffIdInput(data.employeeId) || null : undefined;

    const newPosition =
      data.position !== undefined ? data.position?.trim() || null : user.position;

    let employeeId: string | null | undefined = undefined;

    const realignedForPosition =
      currentEmployeeId && isModernStaffId(currentEmployeeId)
        ? realignStaffIdRolePrefix(currentEmployeeId, {
            position: newPosition,
            roleSlug,
            roleName,
          })
        : null;

    const manualEmployeeIdEdit =
      submittedEmployeeId !== undefined &&
      submittedEmployeeId !== currentEmployeeId &&
      submittedEmployeeId !== (realignedForPosition ?? currentEmployeeId);

    /** Legacy / numeric IDs (e.g. national ID) — modernize on save even if position unchanged. */
    const needsModernStaffIdReplacement =
      Boolean(currentEmployeeId) &&
      !isModernStaffId(currentEmployeeId) &&
      !manualEmployeeIdEdit;

    if (manualEmployeeIdEdit) {
      employeeId = submittedEmployeeId!;
    } else if (
      realignedForPosition &&
      realignedForPosition !== currentEmployeeId &&
      !manualEmployeeIdEdit
    ) {
      employeeId = realignedForPosition;
    } else if (needsModernStaffIdReplacement) {
      employeeId = await staffIdService.allocateForOrganization(organizationId, {
        position: newPosition,
        roleSlug,
        roleName,
      });
    } else if (submittedEmployeeId !== undefined) {
      employeeId = submittedEmployeeId;
    }

    if (employeeId === undefined && !user.employeeId?.trim()) {
      employeeId = await staffIdService.allocateForOrganization(organizationId, {
        position: newPosition,
        roleSlug,
        roleName,
      });
    }

    if (data.supervisorId) {
      if (data.supervisorId === userId) {
        throw new AppError(400, 'A user cannot be their own supervisor');
      }
      const supervisor = await prisma.user.findFirst({
        where: { id: data.supervisorId, organizationId },
      });
      if (!supervisor) throw new AppError(400, 'Supervisor not found in your organization');
    }

    let emailUpdate: string | undefined;
    if (data.email !== undefined) {
      const email = normalizeEmail(data.email);
      if (!email) throw new AppError(400, 'Email is required');
      if (email !== normalizeEmail(user.email)) {
        const existing = await prisma.user.findFirst({
          where: { organizationId, email, id: { not: userId } },
        });
        if (existing) {
          throw new AppError(409, 'A user with this email already exists in your organization');
        }
        emailUpdate = email;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        email: emailUpdate,
        firstName: data.firstName?.trim() ?? undefined,
        lastName: data.lastName?.trim() ?? undefined,
        phone: data.phone !== undefined ? data.phone.trim() || null : undefined,
        department: data.department !== undefined ? data.department.trim() || null : undefined,
        branch: data.branch !== undefined ? data.branch.trim() || null : undefined,
        position: data.position !== undefined ? data.position.trim() || null : undefined,
        employeeId:
          employeeId !== undefined
            ? employeeId
            : data.employeeId !== undefined
              ? normalizeStaffIdInput(data.employeeId) || null
              : undefined,
        supervisorId: data.supervisorId !== undefined ? data.supervisorId || null : undefined,
        avatarUrl:
          data.avatarUrl !== undefined
            ? data.avatarUrl?.trim()
              ? data.avatarUrl.trim()
              : null
            : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: actorId,
        action: AuditAction.USER_UPDATED,
        resource: 'user',
        resourceId: userId,
        metadata: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          email: updated.email,
          previousEmail: emailUpdate ? user.email : undefined,
          department: updated.department,
          branch: updated.branch,
          position: updated.position,
        },
      },
    });

    const moduleSlugs = user.userModules.map((m) => m.module.slug);
    queueStaffFanout({
      organizationId,
      iamUserId: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      position: updated.position,
      department: updated.department,
      employeeId: updated.employeeId,
      avatarUrl: updated.avatarUrl,
      moduleSlugs,
    });

    return this.getUser(organizationId, userId);
  }

  async deleteUser(actorId: string, organizationId: string, userId: string) {
    if (userId === actorId) {
      throw new AppError(400, 'You cannot delete your own account');
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new AppError(404, 'User not found in your organization');

    if (user.userRoles.some((ur) => ur.role.slug === ROLES.ORGANIZATION_ADMIN)) {
      throw new AppError(400, 'Organization administrators cannot be deleted');
    }

    await prisma.user.delete({ where: { id: userId } });

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: actorId,
        action: AuditAction.USER_DELETED,
        resource: 'user',
        resourceId: userId,
        metadata: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          operation: 'ORG_USER_DELETED',
        },
      },
    });

    return { id: userId, deleted: true };
  }

  async resetUserPassword(
    actorId: string,
    organizationId: string,
    userId: string,
    options?: { password?: string; sendEmail?: boolean }
  ) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
      include: { organization: { select: { name: true } } },
    });
    if (!user) throw new AppError(404, 'User not found in your organization');

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
        organizationId,
        userId: actorId,
        action: AuditAction.PASSWORD_RESET,
        resource: 'user',
        resourceId: userId,
        metadata: { method: 'org_admin_reset' },
      },
    });

    if (options?.sendEmail !== false) {
      const loginUrl = buildOrgCredentialsLoginUrl(true);
      await sendOrganizationAdminCredentialsEmail({
        to: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        organizationName: user.organization.name,
        loginUrl,
        email: user.email,
        password,
        requirePasswordChange: true,
      });
    }

    return { userId, tempPassword: password, emailSent: options?.sendEmail !== false };
  }

  async usageStats(organizationId: string) {
    const [licensed, users, heads] = await Promise.all([
      moduleManagementService.getOrganizationLicensedModules(organizationId),
      prisma.user.count({ where: { organizationId } }),
      prisma.userModule.groupBy({
        by: ['moduleId'],
        where: { organizationId, accessLevel: ModuleAccessLevel.HEAD },
        _count: { _all: true },
      }),
    ]);

    const moduleCounts = await prisma.userModule.groupBy({
      by: ['moduleId'],
      where: { organizationId },
      _count: { _all: true },
    });

    const countByModule = new Map(moduleCounts.map((m) => [m.moduleId, m._count._all]));
    const headsByModule = new Map(heads.map((m) => [m.moduleId, m._count._all]));

    const modulesWithIds = await prisma.organizationModule.findMany({
      where: { organizationId, status: 'ACTIVE' },
      include: { module: { select: { id: true, slug: true, name: true } } },
    });

    return {
      totalUsers: users,
      licensedModules: licensed.length,
      seats: modulesWithIds.map((om) => ({
        slug: om.module.slug,
        name: om.module.name,
        assignedUsers: countByModule.get(om.module.id) ?? 0,
        heads: headsByModule.get(om.module.id) ?? 0,
      })),
    };
  }

  async listAccessAudit(organizationId: string, limit = 50) {
    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        action: {
          in: [
            AuditAction.USER_CREATED,
            AuditAction.USER_UPDATED,
            AuditAction.PERMISSION_CHANGED,
            AuditAction.PASSWORD_RESET,
            AuditAction.ROLE_ASSIGNED,
            AuditAction.ROLE_REMOVED,
          ],
        },
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });

    return logs.map((l) => ({
      id: l.id,
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      metadata: l.metadata,
      actor: l.user
        ? { name: `${l.user.firstName} ${l.user.lastName}`.trim(), email: l.user.email }
        : null,
      createdAt: l.createdAt,
    }));
  }

  /**
   * Resolve whether the caller can see all records in a module (HEAD) or only own (USER).
   * Org admins are treated as HEAD for every licensed module.
   */
  async getModuleVisibility(
    userId: string,
    organizationId: string,
    roles: string[],
    moduleSlug: string
  ): Promise<{ accessLevel: ModuleAccessLevel; dataScope: DataScope; canViewAll: boolean }> {
    if (roles.includes(ROLES.ORGANIZATION_ADMIN)) {
      return {
        accessLevel: ModuleAccessLevel.HEAD,
        dataScope: DataScope.ORGANIZATION,
        canViewAll: true,
      };
    }

    const row = await prisma.userModule.findFirst({
      where: {
        userId,
        organizationId,
        module: { slug: moduleSlug },
      },
      select: { accessLevel: true, dataScope: true },
    });

    if (!row) {
      throw new AppError(403, 'You do not have access to this module');
    }

    return {
      accessLevel: row.accessLevel,
      dataScope: row.dataScope,
      canViewAll: row.accessLevel === ModuleAccessLevel.HEAD,
    };
  }

  private normalizeAssignments(
    data: { moduleSlugs?: string[]; moduleAssignments?: ModuleAssignmentInput[]; dataScope?: DataScope },
    licensedSlugs: string[]
  ): Array<{ slug: string; accessLevel: ModuleAccessLevel; dataScope: DataScope }> {
    if (data.moduleAssignments?.length) {
      return data.moduleAssignments
        .filter((a) => licensedSlugs.includes(a.slug))
        .map((a) => ({
          slug: a.slug,
          accessLevel: a.accessLevel === 'HEAD' ? ModuleAccessLevel.HEAD : ModuleAccessLevel.USER,
          dataScope: a.dataScope ?? (a.accessLevel === 'HEAD' ? DataScope.ORGANIZATION : DataScope.SELF),
        }));
    }

    return (data.moduleSlugs ?? [])
      .filter((s) => licensedSlugs.includes(s))
      .map((slug) => ({
        slug,
        accessLevel: ModuleAccessLevel.USER,
        dataScope: data.dataScope ?? DataScope.SELF,
      }));
  }

  private async ensureOrgRole(organizationId: string, slug: string) {
    if (slug === ROLES.ORGANIZATION_ADMIN) {
      let role = await prisma.role.findFirst({
        where: { organizationId, slug: ROLES.ORGANIZATION_ADMIN },
      });
      if (!role) {
        role = await prisma.role.create({
          data: {
            organizationId,
            name: 'Organization Administrator',
            slug: ROLES.ORGANIZATION_ADMIN,
            description: 'Organization administrator with full licensed module access',
            hierarchyLevel: 100,
            isSystem: true,
            dataScope: 'ORGANIZATION',
          },
        });
      }
      return role;
    }
    return this.ensureMemberRole(organizationId);
  }

  async getOrganizationProfile(organizationId: string) {
    return rootAdminService.getOrganizationById(organizationId);
  }

  async updateOrganizationProfile(
    actorId: string,
    organizationId: string,
    payload: Record<string, unknown>
  ) {
    const updated = await rootAdminService.updateOrganizationProfile(
      organizationId,
      actorId,
      payload
    );

    const headName = payload.organizationHead ? String(payload.organizationHead).trim() : '';
    const headPhone = payload.headPhone ? String(payload.headPhone).trim() : undefined;
    const headEmail = payload.headEmail ? normalizeEmail(String(payload.headEmail)) : undefined;

    if (headName || headPhone || headEmail) {
      const adminUser = await prisma.user.findFirst({
        where: {
          organizationId,
          userRoles: { some: { role: { slug: ROLES.ORGANIZATION_ADMIN } } },
        },
      });

      if (adminUser) {
        const nameParts = headName.split(/\s+/).filter(Boolean);
        const firstName = nameParts[0] ?? adminUser.firstName;
        const lastName = nameParts.slice(1).join(' ') || adminUser.lastName;

        await prisma.user.update({
          where: { id: adminUser.id },
          data: {
            ...(headName ? { firstName, lastName } : {}),
            ...(headPhone !== undefined ? { phone: headPhone || null } : {}),
          },
        });
      }
    }

    return updated;
  }

  private async ensureMemberRole(organizationId: string) {
    let role = await prisma.role.findFirst({
      where: { organizationId, slug: ROLES.ORGANIZATION_MEMBER },
    });
    if (!role) {
      role = await prisma.role.create({
        data: {
          organizationId,
          name: 'Organization Member',
          slug: ROLES.ORGANIZATION_MEMBER,
          description: 'Standard organization user with assigned module access',
          hierarchyLevel: 10,
          isSystem: true,
          dataScope: 'ORGANIZATION',
        },
      });
    }
    return role;
  }
}

export const organizationAdminService = new OrganizationAdminService();
