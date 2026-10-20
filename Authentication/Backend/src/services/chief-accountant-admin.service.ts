import { AuditAction, RepresentativeAssignmentStatus, UserStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { PLATFORM_ORG_SLUG, ROLES } from '../constants/roles';
import {
  DEFAULT_CHIEF_ACCOUNTANT_PERMISSIONS,
  type ChiefAccountantPermissionProfile,
} from '../constants/chief-accountant-permissions';
import {
  generateSecurePassword,
  hashPassword,
  validatePasswordPolicy,
} from '../utils/security';
import { sendOrganizationAdminCredentialsEmail, buildOrgCredentialsLoginUrl } from '../utils/email';

export class ChiefAccountantAdminService {
  private async platformOrgId() {
    const org = await prisma.organization.findUnique({
      where: { slug: PLATFORM_ORG_SLUG },
      select: { id: true },
    });
    if (!org) throw new AppError(500, 'Platform organization is not configured');
    return org.id;
  }

  private async ensureChiefAccountantRole(organizationId: string) {
    return prisma.role.upsert({
      where: { organizationId_slug: { organizationId, slug: ROLES.CHIEF_ACCOUNTANT } },
      update: { isSystem: true, hierarchyLevel: 150, dataScope: 'GLOBAL' },
      create: {
        organizationId,
        name: 'Chief Accountant',
        slug: ROLES.CHIEF_ACCOUNTANT,
        description: 'Multi-school finance chief accountant',
        hierarchyLevel: 150,
        isSystem: true,
        dataScope: 'GLOBAL',
      },
    });
  }

  async listChiefAccountants() {
    const platformOrgId = await this.platformOrgId();
    const users = await prisma.user.findMany({
      where: {
        organizationId: platformOrgId,
        userRoles: { some: { role: { slug: ROLES.CHIEF_ACCOUNTANT } } },
      },
      include: {
        chiefAccountantProfile: true,
        chiefAccountantAssignments: {
          include: {
            organization: {
              select: { id: true, name: true, organizationCode: true, status: true },
            },
          },
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
      avatarUrl: u.avatarUrl,
      status: u.status,
      mfaEnabled: u.mfaEnabled,
      lastLoginAt: u.lastLoginAt,
      profile: u.chiefAccountantProfile,
      assignments: u.chiefAccountantAssignments.map((a) => ({
        id: a.id,
        organizationId: a.organizationId,
        organization: a.organization,
        status: a.status,
        permissions: a.permissions,
        assignedAt: a.assignedAt,
        expiresAt: a.expiresAt,
      })),
    }));
  }

  async getChiefAccountant(userId: string) {
    const list = await this.listChiefAccountants();
    const found = list.find((r) => r.id === userId);
    if (!found) throw new AppError(404, 'Chief accountant not found');
    return found;
  }

  async createChiefAccountant(
    actorId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      password?: string;
      requirePasswordChange?: boolean;
      sendCredentialsEmail?: boolean;
      permissions?: Partial<ChiefAccountantPermissionProfile>;
      accessLevel?: string;
      enforceMfa?: boolean;
      organizationIds?: string[];
      assignmentExpiresAt?: string;
    }
  ) {
    const platformOrgId = await this.platformOrgId();
    const email = data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { organizationId_email: { organizationId: platformOrgId, email } },
    });
    if (existing) throw new AppError(409, 'A platform user with this email already exists');

    const password = data.password?.trim() || generateSecurePassword();
    if (data.password) validatePasswordPolicy(data.password);

    const role = await this.ensureChiefAccountantRole(platformOrgId);
    const permissions = { ...DEFAULT_CHIEF_ACCOUNTANT_PERMISSIONS, ...(data.permissions ?? {}) };

    const user = await prisma.user.create({
      data: {
        organizationId: platformOrgId,
        email,
        passwordHash: await hashPassword(password),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim(),
        status: UserStatus.ACTIVE,
        mustChangePassword: data.requirePasswordChange !== false,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: role.id } },
        chiefAccountantProfile: {
          create: {
            permissions,
            accessLevel: data.accessLevel ?? 'prepare',
            enforceMfa: data.enforceMfa ?? false,
          },
        },
      },
    });

    if (data.organizationIds?.length) {
      await this.setAssignments(actorId, user.id, {
        organizationIds: data.organizationIds,
        permissions,
        expiresAt: data.assignmentExpiresAt,
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrgId,
        userId: actorId,
        action: AuditAction.USER_CREATED,
        resource: 'CHIEF_ACCOUNTANT',
        resourceId: user.id,
        metadata: { email, assignmentCount: data.organizationIds?.length ?? 0 },
      },
    });

    if (data.sendCredentialsEmail) {
      await sendOrganizationAdminCredentialsEmail({
        to: email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        organizationName: 'ShulePlus Chief Accountant Portal',
        loginUrl: buildOrgCredentialsLoginUrl(data.requirePasswordChange !== false),
        email,
        password,
        requirePasswordChange: data.requirePasswordChange !== false,
      });
    }

    return { userId: user.id, email, tempPassword: data.sendCredentialsEmail ? undefined : password };
  }

  async updateChiefAccountant(
    actorId: string,
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      status?: UserStatus;
      permissions?: Partial<ChiefAccountantPermissionProfile>;
      accessLevel?: string;
      enforceMfa?: boolean;
    }
  ) {
    const platformOrgId = await this.platformOrgId();
    await this.getChiefAccountant(userId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName?.trim(),
        lastName: data.lastName?.trim(),
        phone: data.phone?.trim(),
        status: data.status,
      },
    });

    if (
      data.permissions ||
      data.accessLevel !== undefined ||
      data.enforceMfa !== undefined
    ) {
      const current = await prisma.chiefAccountantProfile.findUnique({ where: { userId } });
      const merged = {
        ...(typeof current?.permissions === 'object' && current.permissions
          ? (current.permissions as object)
          : DEFAULT_CHIEF_ACCOUNTANT_PERMISSIONS),
        ...(data.permissions ?? {}),
      };
      await prisma.chiefAccountantProfile.upsert({
        where: { userId },
        create: {
          userId,
          permissions: merged,
          accessLevel: data.accessLevel ?? 'prepare',
          enforceMfa: data.enforceMfa ?? false,
        },
        update: {
          permissions: merged,
          accessLevel: data.accessLevel,
          enforceMfa: data.enforceMfa,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrgId,
        userId: actorId,
        action: AuditAction.USER_UPDATED,
        resource: 'CHIEF_ACCOUNTANT',
        resourceId: userId,
      },
    });

    return this.getChiefAccountant(userId);
  }

  async deleteChiefAccountant(actorId: string, userId: string) {
    if (userId === actorId) {
      throw new AppError(400, 'You cannot delete your own account');
    }
    const platformOrgId = await this.platformOrgId();
    const rep = await this.getChiefAccountant(userId);

    await prisma.user.delete({ where: { id: userId } });

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrgId,
        userId: actorId,
        action: AuditAction.USER_DELETED,
        resource: 'CHIEF_ACCOUNTANT',
        resourceId: userId,
        metadata: { email: rep.email },
      },
    });

    return { deleted: true };
  }

  async resetChiefAccountantPassword(
    actorId: string,
    userId: string,
    options?: {
      password?: string;
      sendCredentialsEmail?: boolean;
      requirePasswordChange?: boolean;
    }
  ) {
    const platformOrgId = await this.platformOrgId();
    const rep = await this.getChiefAccountant(userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'Chief accountant not found');

    const password = options?.password?.trim() || generateSecurePassword();
    if (options?.password) validatePasswordPolicy(options.password);

    const requireChange = options?.requirePasswordChange !== false;

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(password),
        mustChangePassword: requireChange,
        failedLoginCount: 0,
        lockedUntil: null,
        status: user.status === UserStatus.LOCKED ? UserStatus.ACTIVE : user.status,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrgId,
        userId: actorId,
        action: AuditAction.PASSWORD_RESET,
        resource: 'CHIEF_ACCOUNTANT',
        resourceId: userId,
        metadata: { email: rep.email, emailed: Boolean(options?.sendCredentialsEmail) },
      },
    });

    if (options?.sendCredentialsEmail) {
      await sendOrganizationAdminCredentialsEmail({
        to: rep.email,
        name: `${rep.firstName} ${rep.lastName}`.trim(),
        organizationName: 'ShulePlus Chief Accountant Portal',
        loginUrl: buildOrgCredentialsLoginUrl(requireChange),
        email: rep.email,
        password,
        requirePasswordChange: requireChange,
      });
    }

    return {
      tempPassword: options?.sendCredentialsEmail ? undefined : password,
      emailed: Boolean(options?.sendCredentialsEmail),
    };
  }

  async setAssignments(
    actorId: string,
    userId: string,
    data: {
      organizationIds: string[];
      permissions?: Partial<ChiefAccountantPermissionProfile>;
      expiresAt?: string;
    }
  ) {
    await this.getChiefAccountant(userId);
    const profile = await prisma.chiefAccountantProfile.findUnique({ where: { userId } });
    const permissions = {
      ...DEFAULT_CHIEF_ACCOUNTANT_PERMISSIONS,
      ...(typeof profile?.permissions === 'object' && profile?.permissions
        ? (profile.permissions as object)
        : {}),
      ...(data.permissions ?? {}),
    };

    const orgs = await prisma.organization.findMany({
      where: { id: { in: data.organizationIds }, type: 'SCHOOL' },
      select: { id: true },
    });
    if (orgs.length !== data.organizationIds.length) {
      throw new AppError(400, 'One or more organizations are invalid or not schools');
    }

    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

    await prisma.$transaction(
      data.organizationIds.map((organizationId) =>
        prisma.chiefAccountantAssignment.upsert({
          where: { userId_organizationId: { userId, organizationId } },
          create: {
            userId,
            organizationId,
            permissions,
            assignedById: actorId,
            expiresAt,
            status: RepresentativeAssignmentStatus.ACTIVE,
          },
          update: {
            permissions,
            expiresAt,
            status: RepresentativeAssignmentStatus.ACTIVE,
            assignedById: actorId,
          },
        })
      )
    );

    const assignedSet = new Set(data.organizationIds);
    const existing = await prisma.chiefAccountantAssignment.findMany({
      where: { userId },
      select: { id: true, organizationId: true },
    });
    const toRemove = existing.filter((e) => !assignedSet.has(e.organizationId));
    if (toRemove.length) {
      await prisma.chiefAccountantAssignment.deleteMany({
        where: { id: { in: toRemove.map((t) => t.id) } },
      });
    }

    return this.getChiefAccountant(userId);
  }

  async listAssignableSchools(search?: string) {
    const q = search?.trim();
    return prisma.organization.findMany({
      where: {
        type: 'SCHOOL',
        status: { in: ['ACTIVE', 'PENDING'] },
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { organizationCode: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        organizationCode: true,
        status: true,
        district: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }
}

export const chiefAccountantAdminService = new ChiefAccountantAdminService();
