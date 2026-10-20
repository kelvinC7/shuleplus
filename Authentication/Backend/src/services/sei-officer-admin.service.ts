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

const SECTOR_MIS_SLUG = 'sector-mis';

export class SeiOfficerAdminService {
  private async platformOrgId() {
    const org = await prisma.organization.findUnique({
      where: { slug: PLATFORM_ORG_SLUG },
      select: { id: true, name: true, organizationCode: true },
    });
    if (!org) throw new AppError(500, 'Platform organization is not configured');
    return org;
  }

  private async ensureSeiRole(organizationId: string) {
    return prisma.role.upsert({
      where: { organizationId_slug: { organizationId, slug: ROLES.SECTOR_EDUCATION_INSPECTOR } },
      update: { isSystem: true, hierarchyLevel: 140, dataScope: 'GLOBAL' },
      create: {
        organizationId,
        name: 'Sector Education Inspector',
        slug: ROLES.SECTOR_EDUCATION_INSPECTOR,
        description: 'SEI — Sector MIS attendance intelligence',
        hierarchyLevel: 140,
        isSystem: true,
        dataScope: 'GLOBAL',
      },
    });
  }

  private async ensureSectorMisLicensed(organizationId: string) {
    const mod = await prisma.platformModule.findUnique({ where: { slug: SECTOR_MIS_SLUG } });
    if (!mod) throw new AppError(500, 'Sector MIS module is not registered in the catalog');

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

  private async grantUserSectorMis(userId: string, organizationId: string, moduleId: string) {
    await prisma.userModule.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      update: {},
      create: { userId, organizationId, moduleId },
    });
  }

  private async provisionSectorMisTenant(org: { id: string; name: string; organizationCode: string | null }, sectorName: string) {
    const mod = await prisma.platformModule.findUnique({ where: { slug: SECTOR_MIS_SLUG } });
    const backendUrl = (mod?.backendUrl ?? 'http://localhost:3070').replace(/\/$/, '');
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
          schoolProfile: { sector: sectorName },
        }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      /* offline during dev — Super Admin can provision later */
    }
  }

  async listSeiOfficers() {
    const platformOrgId = (await this.platformOrgId()).id;
    const users = await prisma.user.findMany({
      where: {
        organizationId: platformOrgId,
        userRoles: { some: { role: { slug: ROLES.SECTOR_EDUCATION_INSPECTOR } } },
      },
      include: {
        seiOfficerProfile: true,
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
      profile: u.seiOfficerProfile,
      hasSectorMisAccess: u.userModules.some((m) => m.module.slug === SECTOR_MIS_SLUG),
    }));
  }

  async getSeiOfficer(userId: string) {
    const found = (await this.listSeiOfficers()).find((u) => u.id === userId);
    if (!found) throw new AppError(404, 'SEI officer not found');
    return found;
  }

  async createSeiOfficer(
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
      districtName?: string;
      sectorId?: string;
      sectorName: string;
      notes?: string;
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

    const mod = await this.ensureSectorMisLicensed(platformOrg.id);
    await this.provisionSectorMisTenant(platformOrg, data.sectorName.trim());

    const role = await this.ensureSeiRole(platformOrg.id);

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
        seiOfficerProfile: {
          create: {
            provinceId: data.provinceId,
            provinceName: data.provinceName,
            districtId: data.districtId,
            districtName: data.districtName,
            sectorId: data.sectorId,
            sectorName: data.sectorName.trim(),
            enforceMfa: true,
            requireDualOtp: true,
            notes: data.notes?.trim(),
          },
        },
      },
    });

    await this.grantUserSectorMis(user.id, platformOrg.id, mod.id);

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrg.id,
        userId: actorId,
        action: AuditAction.USER_CREATED,
        resource: 'SEI_OFFICER',
        resourceId: user.id,
        metadata: { email, sector: data.sectorName },
      },
    });

    if (data.sendCredentialsEmail) {
      await sendOrganizationAdminCredentialsEmail({
        to: email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        organizationName: 'ShulePlus SEI Attendance Intelligence',
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

  async updateSeiOfficer(
    actorId: string,
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      status?: UserStatus;
      sectorName?: string;
      provinceId?: string;
      provinceName?: string;
      districtId?: string;
      districtName?: string;
      sectorId?: string;
      notes?: string;
    }
  ) {
    const platformOrg = await this.platformOrgId();
    await this.getSeiOfficer(userId);

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
      data.sectorName ||
      data.provinceId ||
      data.districtId ||
      data.sectorId ||
      data.notes !== undefined
    ) {
      await prisma.seiOfficerProfile.update({
        where: { userId },
        data: {
          sectorName: data.sectorName?.trim(),
          provinceId: data.provinceId,
          provinceName: data.provinceName,
          districtId: data.districtId,
          districtName: data.districtName,
          sectorId: data.sectorId,
          notes: data.notes?.trim(),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: platformOrg.id,
        userId: actorId,
        action: AuditAction.USER_UPDATED,
        resource: 'SEI_OFFICER',
        resourceId: userId,
      },
    });

    return this.getSeiOfficer(userId);
  }

  async deleteSeiOfficer(actorId: string, userId: string) {
    const platformOrg = await this.platformOrgId();
    const rep = await this.getSeiOfficer(userId);
    await prisma.user.delete({ where: { id: userId } });
    await prisma.auditLog.create({
      data: {
        organizationId: platformOrg.id,
        userId: actorId,
        action: AuditAction.USER_DELETED,
        resource: 'SEI_OFFICER',
        resourceId: userId,
        metadata: { email: rep.email },
      },
    });
    return { deleted: true };
  }

  async resetSeiPassword(
    actorId: string,
    userId: string,
    options?: {
      password?: string;
      sendCredentialsEmail?: boolean;
      requirePasswordChange?: boolean;
    }
  ) {
    const platformOrg = await this.platformOrgId();
    const rep = await this.getSeiOfficer(userId);
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
        resource: 'SEI_OFFICER',
        resourceId: userId,
        metadata: { email: rep.email },
      },
    });

    if (options?.sendCredentialsEmail) {
      await sendOrganizationAdminCredentialsEmail({
        to: rep.email,
        name: `${rep.firstName} ${rep.lastName}`.trim(),
        organizationName: 'ShulePlus SEI Attendance Intelligence',
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

export const seiOfficerAdminService = new SeiOfficerAdminService();
