import { AuditAction, RepresentativeAssignmentStatus, UserStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { PLATFORM_ORG_SLUG, ROLES } from '../constants/roles';
import {
  DEFAULT_REP_PERMISSIONS,
  type RepresentativePermissionProfile,
} from '../constants/representative-permissions';
import {
  generateSecurePassword,
  hashPassword,
  validatePasswordPolicy,
} from '../utils/security';
import { sendOrganizationAdminCredentialsEmail, buildOrgCredentialsLoginUrl } from '../utils/email';

export class SchoolRepresentativeAdminService {
  private async platformOrgId() {
    const org = await prisma.organization.findUnique({
      where: { slug: PLATFORM_ORG_SLUG },
      select: { id: true },
    });
    if (!org) throw new AppError(500, 'Platform organization is not configured');
    return org.id;
  }

  private async ensureRepRole(organizationId: string) {
    return prisma.role.upsert({
      where: { organizationId_slug: { organizationId, slug: ROLES.SCHOOL_REPRESENTATIVE } },
      update: { isSystem: true, hierarchyLevel: 150, dataScope: 'GLOBAL' },
      create: {
        organizationId,
        name: 'School Representative',
        slug: ROLES.SCHOOL_REPRESENTATIVE,
        description: 'Multi-school oversight representative',
        hierarchyLevel: 150,
        isSystem: true,
        dataScope: 'GLOBAL',
      },
    });
  }

  async listRepresentatives() {
    const platformOrgId = await this.platformOrgId();
    const users = await prisma.user.findMany({
      where: {
        organizationId: platformOrgId,
        userRoles: { some: { role: { slug: ROLES.SCHOOL_REPRESENTATIVE } } },
      },
      include: {
        representativeProfile: true,
        representativeAssignments: {
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
      profile: u.representativeProfile,
      assignments: u.representativeAssignments.map((a) => ({
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

  async getRepresentative(userId: string) {
    const list = await this.listRepresentatives();
    const found = list.find((r) => r.id === userId);
    if (!found) throw new AppError(404, 'Representative not found');
    return found;
  }

  async createRepresentative(
    actorId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      password?: string;
      requirePasswordChange?: boolean;
      sendCredentialsEmail?: boolean;
      permissions?: Partial<RepresentativePermissionProfile>;
      accessMode?: string;
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

    const role = await this.ensureRepRole(platformOrgId);
    const permissions = { ...DEFAULT_REP_PERMISSIONS, ...(data.permissions ?? {}) };

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
        representativeProfile: {
          create: {
            permissions,
            accessMode: data.accessMode ?? 'view_only',
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
        resource: 'school_representative',
        resourceId: user.id,
        metadata: { email, assignmentCount: data.organizationIds?.length ?? 0 },
      },
    });

    if (data.sendCredentialsEmail) {
      await sendOrganizationAdminCredentialsEmail({
        to: email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        organizationName: 'ShulePlus Representative Portal',
        loginUrl: buildOrgCredentialsLoginUrl(data.requirePasswordChange !== false),
        email,
        password,
        requirePasswordChange: data.requirePasswordChange !== false,
      });
    }

    return { userId: user.id, email, tempPassword: data.sendCredentialsEmail ? undefined : password };
  }

  async updateRepresentative(
    actorId: string,
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      status?: UserStatus;
      permissions?: Partial<RepresentativePermissionProfile>;
      accessMode?: string;
      enforceMfa?: boolean;
    }
  ) {
    const platformOrgId = await this.platformOrgId();
    await this.getRepresentative(userId);

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
      data.accessMode !== undefined ||
      data.enforceMfa !== undefined
    ) {
      const current = await prisma.schoolRepresentativeProfile.findUnique({ where: { userId } });
      const merged = {
        ...(typeof current?.permissions === 'object' && current.permissions
          ? (current.permissions as object)
          : DEFAULT_REP_PERMISSIONS),
        ...(data.permissions ?? {}),
      };
      await prisma.schoolRepresentativeProfile.upsert({
        where: { userId },
        create: {
          userId,
          permissions: merged,
          accessMode: data.accessMode ?? 'view_only',
          enforceMfa: data.enforceMfa ?? false,
        },
        update: {
          permissions: merged,
          accessMode: data.accessMode,
          enforceMfa: data.enforceMfa,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrgId,
        userId: actorId,
        action: AuditAction.USER_UPDATED,
        resource: 'school_representative',
        resourceId: userId,
      },
    });

    return this.getRepresentative(userId);
  }

  async deleteRepresentative(actorId: string, userId: string) {
    if (userId === actorId) {
      throw new AppError(400, 'You cannot delete your own account');
    }
    const platformOrgId = await this.platformOrgId();
    const rep = await this.getRepresentative(userId);

    await prisma.user.delete({ where: { id: userId } });

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrgId,
        userId: actorId,
        action: AuditAction.USER_DELETED,
        resource: 'school_representative',
        resourceId: userId,
        metadata: { email: rep.email },
      },
    });

    return { deleted: true };
  }

  async resetRepresentativePassword(
    actorId: string,
    userId: string,
    options?: {
      password?: string;
      sendCredentialsEmail?: boolean;
      requirePasswordChange?: boolean;
    }
  ) {
    const platformOrgId = await this.platformOrgId();
    const rep = await this.getRepresentative(userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'Representative not found');

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
        resource: 'school_representative',
        resourceId: userId,
        metadata: { email: rep.email, emailed: Boolean(options?.sendCredentialsEmail) },
      },
    });

    if (options?.sendCredentialsEmail) {
      await sendOrganizationAdminCredentialsEmail({
        to: rep.email,
        name: `${rep.firstName} ${rep.lastName}`.trim(),
        organizationName: 'ShulePlus Representative Portal',
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
      permissions?: Partial<RepresentativePermissionProfile>;
      expiresAt?: string;
    }
  ) {
    await this.getRepresentative(userId);
    const profile = await prisma.schoolRepresentativeProfile.findUnique({ where: { userId } });
    const permissions = {
      ...DEFAULT_REP_PERMISSIONS,
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
        prisma.schoolRepresentativeAssignment.upsert({
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
    const existing = await prisma.schoolRepresentativeAssignment.findMany({
      where: { userId },
      select: { id: true, organizationId: true },
    });
    const toRemove = existing.filter((e) => !assignedSet.has(e.organizationId));
    if (toRemove.length) {
      await prisma.schoolRepresentativeAssignment.deleteMany({
        where: { id: { in: toRemove.map((t) => t.id) } },
      });
    }

    return this.getRepresentative(userId);
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

export const schoolRepresentativeAdminService = new SchoolRepresentativeAdminService();
