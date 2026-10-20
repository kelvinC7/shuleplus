import { AuditAction, ModuleAssignmentStatus, UserStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { PLATFORM_ORG_SLUG, ROLES } from '../constants/roles';
import {
  generateSecurePassword,
  hashPassword,
  validatePasswordPolicy,
} from '../utils/security';
import { sendOrganizationAdminCredentialsEmail, buildOrgCredentialsLoginUrl } from '../utils/email';
import { env } from '../config/env';

const DEO_MIS_SLUG = 'deo-mis';
const NESA_MODULE_SLUG = 'nesa';

export class DeoOfficerAdminService {
  private async platformOrgId() {
    const org = await prisma.organization.findUnique({
      where: { slug: PLATFORM_ORG_SLUG },
      select: { id: true, name: true, organizationCode: true },
    });
    if (!org) throw new AppError(500, 'Platform organization is not configured');
    return org;
  }

  private async ensureDeoRole(organizationId: string) {
    return prisma.role.upsert({
      where: { organizationId_slug: { organizationId, slug: ROLES.DISTRICT_EDUCATION_OFFICER } },
      update: { isSystem: true, hierarchyLevel: 135, dataScope: 'GLOBAL' },
      create: {
        organizationId,
        name: 'District Education Officer',
        slug: ROLES.DISTRICT_EDUCATION_OFFICER,
        description: 'DEO — District MIS attendance intelligence',
        hierarchyLevel: 135,
        isSystem: true,
        dataScope: 'GLOBAL',
      },
    });
  }

  private async ensureDeoMisLicensed(organizationId: string) {
    const mod = await prisma.platformModule.findUnique({ where: { slug: DEO_MIS_SLUG } });
    if (!mod) throw new AppError(500, 'DEO MIS module is not registered in the catalog');

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

  private async grantUserDeoMis(userId: string, organizationId: string, moduleId: string) {
    await prisma.userModule.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      update: {},
      create: { userId, organizationId, moduleId },
    });
  }

  private async grantUserNesaDashboard(userId: string, organizationId: string) {
    const mod = await prisma.platformModule.findUnique({ where: { slug: NESA_MODULE_SLUG } });
    if (!mod) return;
    await prisma.userModule.upsert({
      where: { userId_moduleId: { userId, moduleId: mod.id } },
      update: {},
      create: { userId, organizationId, moduleId: mod.id },
    });
  }

  private async provisionDeoMisTenant(
    org: { id: string; name: string; organizationCode: string | null },
    districtName: string
  ) {
    const mod = await prisma.platformModule.findUnique({ where: { slug: DEO_MIS_SLUG } });
    const backendUrl = (mod?.backendUrl ?? 'http://localhost:3072/api').replace(/\/$/, '');
    const tenantUrl = backendUrl.endsWith('/api') ? `${backendUrl}/tenant/create` : `${backendUrl}/api/tenant/create`;
    const serviceKey = env.MODULE_PROVISIONING_KEY ?? env.PLATFORM_SERVICE_KEY ?? 'dev-service-key';

    try {
      await fetch(tenantUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': serviceKey,
          'x-source-service': 'IAM',
        },
        body: JSON.stringify({
          organizationId: org.id,
          organizationName: org.name,
          organizationCode: org.organizationCode ?? undefined,
          schoolProfile: { district: districtName },
        }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      /* offline during dev — Super Admin can provision later */
    }
  }

  async listDeoOfficers() {
    const platformOrgId = (await this.platformOrgId()).id;
    const users = await prisma.user.findMany({
      where: {
        organizationId: platformOrgId,
        userRoles: { some: { role: { slug: ROLES.DISTRICT_EDUCATION_OFFICER } } },
      },
      include: {
        deoOfficerProfile: true,
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
      mfaEnabled: u.mfaEnabled,
      lastLoginAt: u.lastLoginAt,
      profile: u.deoOfficerProfile,
      hasDeoMisAccess: u.userModules.some((m) => m.module.slug === DEO_MIS_SLUG),
      hasNesaDashboardAccess: u.userModules.some((m) => m.module.slug === NESA_MODULE_SLUG),
    }));
  }

  async getDeoOfficer(userId: string) {
    const found = (await this.listDeoOfficers()).find((u) => u.id === userId);
    if (!found) throw new AppError(404, 'DEO officer not found');
    return found;
  }

  async createDeoOfficer(
    actorId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
      password?: string;
      requirePasswordChange?: boolean;
      sendCredentialsEmail?: boolean;
      provinceId?: string;
      provinceName?: string;
      districtId?: string;
      districtName: string;
      notes?: string;
      grantNesaDashboard?: boolean;
    }
  ) {
    const platformOrg = await this.platformOrgId();
    const email = data.email.trim().toLowerCase();
    const phone = data.phone.trim();
    if (!phone || phone.length < 9) {
      throw new AppError(400, 'Phone number is required for dual OTP verification (SMS step)');
    }

    const existing = await prisma.user.findUnique({
      where: { organizationId_email: { organizationId: platformOrg.id, email } },
    });
    if (existing) throw new AppError(409, 'A platform user with this email already exists');

    const password = data.password?.trim() || generateSecurePassword();
    if (data.password) validatePasswordPolicy(data.password);

    const mod = await this.ensureDeoMisLicensed(platformOrg.id);
    await this.provisionDeoMisTenant(platformOrg, data.districtName.trim());

    const role = await this.ensureDeoRole(platformOrg.id);

    const user = await prisma.user.create({
      data: {
        organizationId: platformOrg.id,
        email,
        passwordHash: await hashPassword(password),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone,
        status: UserStatus.ACTIVE,
        mustChangePassword: data.requirePasswordChange !== false,
        emailVerifiedAt: new Date(),
        userRoles: { create: { roleId: role.id } },
        deoOfficerProfile: {
          create: {
            provinceId: data.provinceId,
            provinceName: data.provinceName,
            districtId: data.districtId,
            districtName: data.districtName.trim(),
            enforceMfa: true,
            requireDualOtp: true,
            notes: data.notes?.trim(),
          },
        },
      },
    });

    await this.grantUserDeoMis(user.id, platformOrg.id, mod.id);
    if (data.grantNesaDashboard) {
      await this.grantUserNesaDashboard(user.id, platformOrg.id);
    }

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrg.id,
        userId: actorId,
        action: AuditAction.USER_CREATED,
        resource: 'DEO_OFFICER',
        resourceId: user.id,
        metadata: { email, district: data.districtName },
      },
    });

    if (data.sendCredentialsEmail) {
      await sendOrganizationAdminCredentialsEmail({
        to: email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        organizationName: 'ShulePlus DEO Attendance Intelligence',
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

  async updateDeoOfficer(
    actorId: string,
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      status?: UserStatus;
      districtName?: string;
      provinceId?: string;
      provinceName?: string;
      districtId?: string;
      notes?: string;
    }
  ) {
    const platformOrg = await this.platformOrgId();
    await this.getDeoOfficer(userId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName?.trim(),
        lastName: data.lastName?.trim(),
        phone: data.phone?.trim(),
        status: data.status,
      },
    });

    if (data.districtName || data.provinceId || data.districtId || data.notes !== undefined) {
      await prisma.deoOfficerProfile.update({
        where: { userId },
        data: {
          districtName: data.districtName?.trim(),
          provinceId: data.provinceId,
          provinceName: data.provinceName,
          districtId: data.districtId,
          notes: data.notes?.trim(),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrg.id,
        userId: actorId,
        action: AuditAction.USER_UPDATED,
        resource: 'DEO_OFFICER',
        resourceId: userId,
      },
    });

    return this.getDeoOfficer(userId);
  }

  async deleteDeoOfficer(actorId: string, userId: string) {
    const platformOrg = await this.platformOrgId();
    const rep = await this.getDeoOfficer(userId);
    await prisma.user.delete({ where: { id: userId } });
    await prisma.auditLog.create({
      data: {
        organizationId: platformOrg.id,
        userId: actorId,
        action: AuditAction.USER_DELETED,
        resource: 'DEO_OFFICER',
        resourceId: userId,
        metadata: { email: rep.email },
      },
    });
    return { deleted: true };
  }

  async resetDeoPassword(
    actorId: string,
    userId: string,
    options?: {
      password?: string;
      sendCredentialsEmail?: boolean;
      requirePasswordChange?: boolean;
    }
  ) {
    const platformOrg = await this.platformOrgId();
    const rep = await this.getDeoOfficer(userId);
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
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrg.id,
        userId: actorId,
        action: AuditAction.PASSWORD_RESET,
        resource: 'DEO_OFFICER',
        resourceId: userId,
        metadata: { email: rep.email },
      },
    });

    if (options?.sendCredentialsEmail) {
      await sendOrganizationAdminCredentialsEmail({
        to: rep.email,
        name: `${rep.firstName} ${rep.lastName}`.trim(),
        organizationName: 'ShulePlus DEO Attendance Intelligence',
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
}

export const deoOfficerAdminService = new DeoOfficerAdminService();
