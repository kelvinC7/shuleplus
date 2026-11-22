import { AuditAction, ModuleAssignmentStatus, UserStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { PLATFORM_ORG_SLUG } from '../constants/roles';
import {
  SHULE_TRIP_OFFICIAL_ROLE_SLUGS,
  SHULE_TRIP_ROLE_LABELS,
} from '../constants/shule-trip-roles';
import {
  generateSecurePassword,
  hashPassword,
  validatePasswordPolicy,
} from '../utils/security';
import { sendOrganizationAdminCredentialsEmail, buildOrgCredentialsLoginUrl } from '../utils/email';
import { env } from '../config/env';

const SHULE_TRIP_SLUG = 'shule-trip';

export class ShuleTripOfficialAdminService {
  private async platformOrgId() {
    const org = await prisma.organization.findUnique({
      where: { slug: PLATFORM_ORG_SLUG },
      select: { id: true, name: true },
    });
    if (!org) throw new AppError(500, 'Platform organization is not configured');
    return org;
  }

  private async ensureTripRole(organizationId: string, slug: string) {
    if (!SHULE_TRIP_OFFICIAL_ROLE_SLUGS.includes(slug as (typeof SHULE_TRIP_OFFICIAL_ROLE_SLUGS)[number])) {
      throw new AppError(400, 'Invalid ShuleTrip government role');
    }
    const name = SHULE_TRIP_ROLE_LABELS[slug] ?? slug;
    return prisma.role.upsert({
      where: { organizationId_slug: { organizationId, slug } },
      update: { isSystem: true, dataScope: 'GLOBAL' },
      create: {
        organizationId,
        name,
        slug,
        description: `ShuleTrip government console: ${name}`,
        hierarchyLevel: 120,
        isSystem: true,
        dataScope: 'GLOBAL',
      },
    });
  }

  private async ensureShuleTripLicensed(organizationId: string) {
    let mod = await prisma.platformModule.findUnique({ where: { slug: SHULE_TRIP_SLUG } });
    if (!mod) {
      mod = await prisma.platformModule.create({
        data: {
          slug: SHULE_TRIP_SLUG,
          name: 'ShuleTrip',
          shortName: 'Trips',
          category: 'Education',
          version: '1.0.0',
          description: 'School trip registration and government approval',
          frontendUrl: 'http://localhost:3077',
          backendUrl: 'http://localhost:3076/api',
          healthCheckUrl: '/api/health',
        },
      });
    }

    const now = new Date();
    await prisma.organizationModule.upsert({
      where: { organizationId_moduleId: { organizationId, moduleId: mod.id } },
      update: { status: ModuleAssignmentStatus.ACTIVE, moduleVersion: mod.version },
      create: {
        organizationId,
        moduleId: mod.id,
        status: ModuleAssignmentStatus.ACTIVE,
        subscriptionPlan: 'Standard',
        moduleVersion: mod.version,
        activatedAt: now,
        tenantProvisioned: true,
        tenantProvisionedAt: now,
      },
    });

    return mod;
  }

  private async grantUserShuleTrip(userId: string, organizationId: string, moduleId: string) {
    await prisma.userModule.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      update: {},
      create: { userId, organizationId, moduleId },
    });
  }

  async listOfficials() {
    const platformOrgId = (await this.platformOrgId()).id;
    const users = await prisma.user.findMany({
      where: {
        organizationId: platformOrgId,
        shuleTripOfficialProfile: { isNot: null },
      },
      include: {
        shuleTripOfficialProfile: true,
        userRoles: { include: { role: { select: { slug: true, name: true } } } },
        userModules: { include: { module: { select: { slug: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      profile: u.shuleTripOfficialProfile,
      roles: u.userRoles.map((r) => r.role.slug),
      hasShuleTripAccess: u.userModules.some((m) => m.module.slug === SHULE_TRIP_SLUG),
    }));
  }

  async createOfficial(
    actorId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      password?: string;
      requirePasswordChange?: boolean;
      sendCredentialsEmail?: boolean;
      tripRoleSlug: string;
      authority?: string;
      jurisdictionScope?: string;
      provinceId?: string;
      provinceName?: string;
      districtId?: string;
      districtName?: string;
      sectorId?: string;
      sectorName?: string;
      canFinalApprove?: boolean;
      employeeRef?: string;
      notes?: string;
    }
  ) {
    const platformOrg = await this.platformOrgId();
    const email = data.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { organizationId_email: { organizationId: platformOrg.id, email } },
    });
    if (existing) throw new AppError(409, 'A platform user with this email already exists');

    const password = data.password?.trim() || generateSecurePassword();
    if (data.password) {
      const policyErr = validatePasswordPolicy(data.password);
      if (policyErr) throw new AppError(400, policyErr);
    }

    const mod = await this.ensureShuleTripLicensed(platformOrg.id);
    const role = await this.ensureTripRole(platformOrg.id, data.tripRoleSlug.trim());

    const user = await prisma.user.create({
      data: {
        organizationId: platformOrg.id,
        email,
        passwordHash: await hashPassword(password),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim() || null,
        status: UserStatus.ACTIVE,
        mustChangePassword: data.requirePasswordChange !== false,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: role.id } },
        shuleTripOfficialProfile: {
          create: {
            tripRoleSlug: data.tripRoleSlug.trim(),
            authority: data.authority?.trim(),
            jurisdictionScope: data.jurisdictionScope?.trim() || 'districts',
            provinceId: data.provinceId,
            provinceName: data.provinceName,
            districtId: data.districtId,
            districtName: data.districtName?.trim(),
            sectorId: data.sectorId,
            sectorName: data.sectorName?.trim(),
            canFinalApprove: Boolean(data.canFinalApprove),
            employeeRef: data.employeeRef?.trim(),
            notes: data.notes?.trim(),
          },
        },
      },
    });

    await this.grantUserShuleTrip(user.id, platformOrg.id, mod.id);

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrg.id,
        userId: actorId,
        action: AuditAction.USER_CREATED,
        resource: 'SHULE_TRIP_OFFICIAL',
        resourceId: user.id,
        metadata: { email, tripRoleSlug: data.tripRoleSlug },
      },
    });

    if (data.sendCredentialsEmail) {
      await sendOrganizationAdminCredentialsEmail({
        to: email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        organizationName: 'ShuleTrip Government Console',
        loginUrl: buildOrgCredentialsLoginUrl(data.requirePasswordChange !== false),
        email,
        password,
        requirePasswordChange: data.requirePasswordChange !== false,
      });
    }

    return {
      userId: user.id,
      email,
      tempPassword: data.sendCredentialsEmail ? undefined : password,
    };
  }

  async updateOfficial(
    actorId: string,
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      status?: UserStatus;
      tripRoleSlug?: string;
      authority?: string;
      jurisdictionScope?: string;
      districtName?: string;
      sectorName?: string;
      canFinalApprove?: boolean;
      notes?: string;
    }
  ) {
    const platformOrg = await this.platformOrgId();
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: platformOrg.id, shuleTripOfficialProfile: { isNot: null } },
      include: { shuleTripOfficialProfile: true, userRoles: true },
    });
    if (!user?.shuleTripOfficialProfile) throw new AppError(404, 'ShuleTrip official not found');

    if (data.tripRoleSlug && data.tripRoleSlug !== user.shuleTripOfficialProfile.tripRoleSlug) {
      const role = await this.ensureTripRole(platformOrg.id, data.tripRoleSlug);
      await prisma.userRole.deleteMany({ where: { userId } });
      await prisma.userRole.create({ data: { userId, roleId: role.id } });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName?.trim(),
        lastName: data.lastName?.trim(),
        phone: data.phone?.trim(),
        status: data.status,
      },
    });

    await prisma.shuleTripOfficialProfile.update({
      where: { userId },
      data: {
        tripRoleSlug: data.tripRoleSlug?.trim(),
        authority: data.authority?.trim(),
        jurisdictionScope: data.jurisdictionScope?.trim(),
        districtName: data.districtName?.trim(),
        sectorName: data.sectorName?.trim(),
        canFinalApprove: data.canFinalApprove,
        notes: data.notes?.trim(),
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrg.id,
        userId: actorId,
        action: AuditAction.USER_UPDATED,
        resource: 'SHULE_TRIP_OFFICIAL',
        resourceId: userId,
      },
    });

    return this.listOfficials().then((rows) => rows.find((r) => r.id === userId));
  }

  async deleteOfficial(actorId: string, userId: string) {
    const platformOrg = await this.platformOrgId();
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: platformOrg.id, shuleTripOfficialProfile: { isNot: null } },
    });
    if (!user) throw new AppError(404, 'ShuleTrip official not found');

    await prisma.user.delete({ where: { id: userId } });

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrg.id,
        userId: actorId,
        action: AuditAction.USER_DELETED,
        resource: 'SHULE_TRIP_OFFICIAL',
        resourceId: userId,
      },
    });
  }

  async resetPassword(
    actorId: string,
    userId: string,
    data: { password?: string; sendCredentialsEmail?: boolean; requirePasswordChange?: boolean }
  ) {
    const platformOrg = await this.platformOrgId();
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: platformOrg.id, shuleTripOfficialProfile: { isNot: null } },
    });
    if (!user) throw new AppError(404, 'ShuleTrip official not found');

    const password = data.password?.trim() || generateSecurePassword();
    if (data.password) {
      const policyErr = validatePasswordPolicy(data.password);
      if (policyErr) throw new AppError(400, policyErr);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(password),
        mustChangePassword: data.requirePasswordChange !== false,
      },
    });

    if (data.sendCredentialsEmail) {
      await sendOrganizationAdminCredentialsEmail({
        to: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        organizationName: 'ShuleTrip Government Console',
        loginUrl: buildOrgCredentialsLoginUrl(data.requirePasswordChange !== false),
        email: user.email,
        password,
        requirePasswordChange: data.requirePasswordChange !== false,
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrg.id,
        userId: actorId,
        action: AuditAction.PASSWORD_RESET,
        resource: 'SHULE_TRIP_OFFICIAL',
        resourceId: userId,
      },
    });

    return { tempPassword: data.sendCredentialsEmail ? undefined : password };
  }
}

export const shuleTripOfficialAdminService = new ShuleTripOfficialAdminService();
