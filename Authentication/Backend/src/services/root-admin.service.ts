import { AuditAction, ModuleAssignmentStatus, OrganizationStatus, OrganizationType, Prisma, UserStatus } from '../generated/prisma';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { getRedis } from '../config/redis';
import { env } from '../config/env';
import { ROLES, SUPER_ADMIN_PERMISSIONS } from '../constants/roles';
import { AppError } from '../middleware/error.middleware';
import { hashPassword, generateSecurePassword, validatePasswordPolicy } from '../utils/security';
import { sendInvitationEmail, sendOrganizationAdminCredentialsEmail, buildOrgCredentialsLoginUrl } from '../utils/email';
import { edgeMaintenanceService } from './edge-maintenance.service';

const PLATFORM_SLUG = 'babyeyi-platform';
const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function monthRange(monthsAgo: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23, 59, 59, 999);
  return { start, end, label: start.toLocaleString('en-US', { month: 'short' }) };
}

export class RootAdminService {
  private async monthlyTrend(months = 6) {
    const orgTrend: number[] = [];
    const userTrend: number[] = [];
    const activityTrend: number[] = [];
    const labels: string[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const { start, end, label } = monthRange(i);
      labels.push(label);
      const [orgs, users, activity] = await Promise.all([
        prisma.organization.count({
          where: { slug: { not: PLATFORM_SLUG }, createdAt: { gte: start, lte: end } },
        }),
        prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
        prisma.auditLog.count({ where: { createdAt: { gte: start, lte: end } } }),
      ]);
      orgTrend.push(orgs);
      userTrend.push(users);
      activityTrend.push(activity);
    }

    return { labels, organizationTrend: orgTrend, userTrend, activityTrend };
  }

  async getDashboard() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      orgCount,
      userCount,
      activeOrgs,
      auditCount,
      auditToday,
      modules,
      settings,
      recentActivity,
      systemHealth,
      pendingRegistrations,
      moduleStats,
      orgsWithModules,
      platformOrg,
    ] = await Promise.all([
      prisma.organization.count({ where: { slug: { not: PLATFORM_SLUG } } }),
      prisma.user.count(),
      prisma.organization.count({
        where: { slug: { not: PLATFORM_SLUG }, status: OrganizationStatus.ACTIVE },
      }),
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.platformModule.findMany({ orderBy: { name: 'asc' } }),
      prisma.platformSettings.findUnique({ where: { id: 'platform' } }),
      prisma.auditLog.findMany({
        take: 12,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          organization: { select: { name: true } },
        },
      }),
      this.getSystemHealth(),
      prisma.organizationRegistration.count({ where: { status: 'PENDING' } }),
      Promise.all([
        prisma.platformModule.count(),
        prisma.platformModule.count({ where: { isEnabled: true } }),
        prisma.platformModule.count({ where: { isPremium: true } }),
      ]).then(([total, active, premium]) => ({ totalModules: total, activeModules: active, premiumModules: premium })),
      prisma.organizationModule.groupBy({
        by: ['organizationId'],
        where: { status: ModuleAssignmentStatus.ACTIVE },
      }),
      prisma.organization.findUnique({ where: { slug: PLATFORM_SLUG }, select: { id: true } }),
    ]);

    const platformAdmins = platformOrg
      ? await prisma.user.count({
          where: {
            organizationId: platformOrg.id,
            userRoles: { some: { role: { slug: { in: [ROLES.SUPER_ADMIN, ROLES.ROOT_ADMIN] } } } },
          },
        })
      : 0;

    const trends = await this.monthlyTrend(6);
    const orgsUsingModules = orgsWithModules.length;
    const moduleAdoption = orgCount > 0 ? Math.round((orgsUsingModules / orgCount) * 100) : 0;

    return {
      stats: {
        organizations: orgCount,
        users: userCount,
        activeOrganizations: activeOrgs,
        auditLogs: auditToday,
        totalAuditLogs: auditCount,
        pendingRegistrations,
        platformAdmins,
        activeModules: moduleStats.activeModules,
      },
      analytics: {
        ...trends,
        moduleAdoption,
        orgsUsingModules,
      },
      moduleStats,
      subscriptionUsage: [
        { label: 'Using Modules', value: moduleAdoption, color: '#FCB038' },
        { label: 'No Modules', value: 100 - moduleAdoption, color: '#000435' },
      ],
      recentActivity,
      systemHealth,
      modules,
      emergencyControls: settings,
    };
  }

  async listOrganizations() {
    return prisma.organization.findMany({
      where: { slug: { not: PLATFORM_SLUG } },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true } } },
    });
  }

  async assertTenantOrganization(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, slug: true },
    });
    if (!org || org.slug === PLATFORM_SLUG) {
      throw new AppError(404, 'Organization not found');
    }
    return org;
  }

  async getOrganizationById(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: { select: { users: true, roles: true } },
        schoolProfile: true,
        hospitalProfile: true,
        factoryProfile: true,
        churchProfile: true,
        companyProfile: true,
        province: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
        sector: { select: { id: true, name: true } },
        cell: { select: { id: true, name: true } },
        village: { select: { id: true, name: true } },
        registration: { select: { payload: true } },
      },
    });

    if (!org || org.slug === PLATFORM_SLUG) {
      throw new AppError(404, 'Organization not found');
    }

    const [activeUsers, suspendedUsers, admins, adminUser, recentLogs] = await Promise.all([
      prisma.user.count({ where: { organizationId: orgId, status: UserStatus.ACTIVE } }),
      prisma.user.count({ where: { organizationId: orgId, status: UserStatus.SUSPENDED } }),
      prisma.user.count({
        where: {
          organizationId: orgId,
          userRoles: { some: { role: { slug: ROLES.ORGANIZATION_ADMIN } } },
        },
      }),
      prisma.user.findFirst({
        where: {
          organizationId: orgId,
          userRoles: { some: { role: { slug: ROLES.ORGANIZATION_ADMIN } } },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          status: true,
          lastLoginAt: true,
          mustChangePassword: true,
        },
      }),
      prisma.auditLog.findMany({
        where: { organizationId: orgId },
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
    ]);

    const { registration, ...orgRest } = org;

    return {
      ...orgRest,
      registrationPayload: (registration?.payload as Record<string, unknown>) ?? null,
      adminUser,
      metrics: {
        totalUsers: org._count.users,
        activeUsers,
        suspendedUsers,
        admins,
        roles: org._count.roles,
      },
      recentActivity: recentLogs,
    };
  }

  async createOrganization(
    actorId: string,
    data: {
      name: string;
      type: OrganizationType;
      email?: string;
      phone?: string;
      address?: string;
      subscriptionTier?: string;
      status?: OrganizationStatus;
    }
  ) {
    const base = slugify(data.name) || 'org';
    let slug = base;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }

    const org = await prisma.organization.create({
      data: {
        name: data.name,
        slug,
        type: data.type,
        status: data.status ?? OrganizationStatus.ACTIVE,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        subscriptionTier: data.subscriptionTier ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: actorId,
        action: AuditAction.ORGANIZATION_CREATED,
        resource: 'organization',
        resourceId: org.id,
        metadata: { name: org.name, slug: org.slug, type: org.type },
      },
    });

    return org;
  }

  async deleteOrganization(orgId: string, actorId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org || org.slug === PLATFORM_SLUG) {
      throw new AppError(404, 'Organization not found');
    }

    // Cascade deletes users & roles; audit logs are set null by the schema.
    await prisma.organization.delete({ where: { id: orgId } });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.ORGANIZATION_ARCHIVED,
        resource: 'organization',
        resourceId: orgId,
        metadata: { name: org.name, slug: org.slug, operation: 'DELETED' },
      },
    });

    return { id: orgId, deleted: true };
  }

  async transferOwnership(orgId: string, newOwnerEmail: string, actorId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org || org.slug === PLATFORM_SLUG) {
      throw new AppError(404, 'Organization not found');
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { email: newOwnerEmail.toLowerCase() },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorId,
        action: AuditAction.ORGANIZATION_UPDATED,
        resource: 'organization',
        resourceId: orgId,
        metadata: {
          operation: 'TRANSFER_OWNERSHIP',
          previousOwner: org.email,
          newOwner: newOwnerEmail.toLowerCase(),
        },
      },
    });

    return updated;
  }

  async updateOrganizationAdminCredentials(
    orgId: string,
    actorId: string,
    data: {
      email: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      requirePasswordChange?: boolean;
      sendCredentials?: boolean;
    }
  ) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org || org.slug === PLATFORM_SLUG) {
      throw new AppError(404, 'Organization not found');
    }

    const email = data.email.trim().toLowerCase();
    const passwordProvided = Boolean(data.password?.trim());
    const password = passwordProvided ? data.password!.trim() : generateSecurePassword();
    const policyError = validatePasswordPolicy(password);
    if (policyError) throw new AppError(400, policyError);

    const emailTakenElsewhere = await prisma.user.findFirst({
      where: { email, NOT: { organizationId: orgId } },
    });
    if (emailTakenElsewhere) {
      throw new AppError(
        409,
        'This email is already registered under another organization. Use a different email.'
      );
    }

    let adminUser = await prisma.user.findFirst({
      where: {
        organizationId: orgId,
        userRoles: { some: { role: { slug: ROLES.ORGANIZATION_ADMIN } } },
      },
    });

    const existingUserInOrg = await prisma.user.findFirst({
      where: { organizationId: orgId, email },
    });

    if (existingUserInOrg && adminUser && existingUserInOrg.id !== adminUser.id) {
      throw new AppError(
        409,
        'This email belongs to another user in this organization. Choose a different email or update that user first.'
      );
    }

    if (!adminUser && existingUserInOrg) {
      adminUser = existingUserInOrg;
    }

    const wasCreated = !adminUser;
    const passwordHash = await hashPassword(password);
    const requirePasswordChange = data.requirePasswordChange ?? !passwordProvided;

    if (adminUser) {
      const adminRole = await prisma.role.findFirst({
        where: { organizationId: orgId, slug: ROLES.ORGANIZATION_ADMIN },
      });
      if (adminRole) {
        const hasRole = await prisma.userRole.findUnique({
          where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
        });
        if (!hasRole) {
          await prisma.userRole.create({
            data: { userId: adminUser.id, roleId: adminRole.id },
          });
        }
      }

      adminUser = await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          email,
          passwordHash,
          ...(data.firstName ? { firstName: data.firstName } : {}),
          ...(data.lastName ? { lastName: data.lastName } : {}),
          mustChangePassword: requirePasswordChange,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });

      await prisma.session.updateMany({
        where: { userId: adminUser.id },
        data: { isActive: false },
      });
      await prisma.refreshToken.updateMany({
        where: { userId: adminUser.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      let adminRole = await prisma.role.findFirst({
        where: { organizationId: orgId, slug: ROLES.ORGANIZATION_ADMIN },
      });
      if (!adminRole) {
        adminRole = await prisma.role.create({
          data: {
            organizationId: orgId,
            name: 'Organization Administrator',
            slug: ROLES.ORGANIZATION_ADMIN,
            description: 'Organization administrator',
            hierarchyLevel: 100,
            isSystem: true,
            dataScope: 'ORGANIZATION',
          },
        });
      }

      adminUser = await prisma.user.create({
        data: {
          organizationId: orgId,
          email,
          passwordHash,
          firstName: data.firstName?.trim() || 'Organization',
          lastName: data.lastName?.trim() || 'Admin',
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          mustChangePassword: requirePasswordChange,
          userRoles: { create: { roleId: adminRole.id } },
        },
      });
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: { email },
    });

    let emailSent = false;
    if (data.sendCredentials !== false) {
      const loginUrl = buildOrgCredentialsLoginUrl(requirePasswordChange);
      emailSent = await sendOrganizationAdminCredentialsEmail({
        to: email,
        name: `${adminUser.firstName} ${adminUser.lastName}`.trim(),
        organizationName: org.name,
        loginUrl,
        email,
        password,
        requirePasswordChange,
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorId,
        action: AuditAction.ORGANIZATION_UPDATED,
        resource: 'organization_admin',
        resourceId: adminUser.id,
        metadata: {
          operation: wasCreated ? 'ADMIN_CREATED' : 'ADMIN_CREDENTIALS_UPDATED',
          adminEmail: email,
          emailSent,
        },
      },
    });

    return {
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        status: adminUser.status,
        mustChangePassword: adminUser.mustChangePassword,
      },
      emailSent,
      message: emailSent
        ? `Credentials sent to ${email}`
        : `Admin updated. Credentials logged to server console (SMTP not configured).`,
    };
  }

  async updateOrganizationStatus(
    orgId: string,
    status: OrganizationStatus,
    actorId: string
  ) {
    const org = await prisma.organization.update({
      where: { id: orgId },
      data: { status },
    });

    const actionMap: Partial<Record<OrganizationStatus, AuditAction>> = {
      SUSPENDED: AuditAction.ORGANIZATION_SUSPENDED,
      DISABLED: AuditAction.ORGANIZATION_DISABLED,
      ARCHIVED: AuditAction.ORGANIZATION_ARCHIVED,
      ACTIVE: AuditAction.ORGANIZATION_UPDATED,
    };

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: actorId,
        action: actionMap[status] ?? AuditAction.ORGANIZATION_UPDATED,
        resource: 'organization',
        resourceId: orgId,
        metadata: { status },
      },
    });

    return org;
  }

  async updateOrganizationProfile(
    orgId: string,
    actorId: string,
    payload: Record<string, unknown>
  ) {
    const existing = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!existing || existing.slug === PLATFORM_SLUG) {
      throw new AppError(404, 'Organization not found');
    }

    const p = payload;
    const organizationName = String(p.organizationName ?? p.name ?? existing.name).trim();
    if (!organizationName) throw new AppError(400, 'Organization name is required');

    const type = (p.organizationType ?? p.type ?? existing.type) as OrganizationType;

    let resolvedProvinceId = p.provinceId ? String(p.provinceId) : null;
    const resolvedDistrictId = p.districtId ? String(p.districtId) : null;
    if (resolvedDistrictId && !resolvedProvinceId) {
      const district = await prisma.district.findUnique({
        where: { id: resolvedDistrictId },
        select: { provinceId: true },
      });
      resolvedProvinceId = district?.provinceId ?? null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.update({
        where: { id: orgId },
        data: {
          name: organizationName,
          type,
          category: p.category ? String(p.category) : null,
          email: p.email ? String(p.email) : null,
          phone: p.phone ? String(p.phone) : null,
          website: p.website ? String(p.website) : null,
          establishedDate: p.establishedDate
            ? new Date(String(p.establishedDate))
            : null,
          description: p.description ? String(p.description) : null,
          country: String(p.country ?? 'Rwanda'),
          provinceId: resolvedProvinceId,
          districtId: resolvedDistrictId,
          sectorId: p.sectorId ? String(p.sectorId) : null,
          cellId: p.cellId ? String(p.cellId) : null,
          villageId: p.villageId ? String(p.villageId) : null,
          logoUrl: p.logoUrl ? String(p.logoUrl) : null,
          signatureUrl: p.signatureUrl ? String(p.signatureUrl) : null,
          stampUrl: p.stampUrl ? String(p.stampUrl) : null,
          poBox: p.postalAddress
            ? String(p.postalAddress).trim() || null
            : p.poBox
              ? String(p.poBox).trim() || null
              : existing.poBox,
          subscriptionTier: p.subscriptionTier ? String(p.subscriptionTier) : existing.subscriptionTier,
        },
      });

      await this.upsertTypeProfile(tx, orgId, type, p);

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          userId: actorId,
          action: AuditAction.ORGANIZATION_UPDATED,
          resource: 'organization',
          resourceId: orgId,
          metadata: { operation: 'PROFILE_UPDATE', name: organization.name, type: organization.type },
        },
      });

      return organization;
    });

    return this.getOrganizationById(updated.id);
  }

  private async upsertTypeProfile(
    tx: Prisma.TransactionClient,
    organizationId: string,
    type: OrganizationType,
    p: Record<string, unknown>
  ) {
    const asStringArray = (value: unknown) =>
      Array.isArray(value) ? value.map((v) => String(v)) : [];

    switch (type) {
      case OrganizationType.SCHOOL:
      case OrganizationType.TVET:
      case OrganizationType.UNIVERSITY: {
        const data = {
          schoolCategory: p.schoolCategory ? String(p.schoolCategory) : null,
          schoolProgram: p.schoolProgram ? String(p.schoolProgram) : null,
          educationLevels: asStringArray(p.educationLevels),
          aLevelCombinations: asStringArray(p.aLevelCombinations),
          tvetTrades: asStringArray(p.tvetTrades),
          curriculum: p.curriculum ? String(p.curriculum) : null,
          academicYear: p.academicYear ? String(p.academicYear) : null,
          schoolShift: p.schoolShift ? String(p.schoolShift) : null,
          principalName: p.organizationHead ? String(p.organizationHead) : null,
          deputyHeadName: p.deputyHead ? String(p.deputyHead) : null,
          bursarName: p.bursar ? String(p.bursar) : null,
          secretaryName: p.secretary ? String(p.secretary) : null,
          leadershipPhone: p.headPhone ? String(p.headPhone) : null,
          leadershipEmail: p.headEmail ? String(p.headEmail) : null,
        };
        await tx.schoolProfile.upsert({
          where: { organizationId },
          create: { organizationId, ...data },
          update: data,
        });
        break;
      }
      case OrganizationType.HOSPITAL: {
        const data = {
          hospitalType: p.hospitalType ? String(p.hospitalType) : null,
          bedsCapacity: p.bedsCapacity ? Number(p.bedsCapacity) : null,
          departments: asStringArray(p.departments),
          emergencyServices: Boolean(p.emergencyServices),
          laboratory: Boolean(p.laboratory),
          pharmacy: Boolean(p.pharmacy),
          operatingHours: p.operatingHours ? String(p.operatingHours) : null,
        };
        await tx.hospitalProfile.upsert({
          where: { organizationId },
          create: { organizationId, ...data },
          update: data,
        });
        break;
      }
      case OrganizationType.FACTORY: {
        const data = {
          industry: p.industry ? String(p.industry) : null,
          productionType: p.productionType ? String(p.productionType) : null,
          factorySize: p.factorySize ? String(p.factorySize) : null,
          employeeCapacity: p.employeeCapacity ? Number(p.employeeCapacity) : null,
          workingShifts: asStringArray(p.workingShifts),
          environmentalLicense: p.environmentalLicense ? String(p.environmentalLicense) : null,
        };
        await tx.factoryProfile.upsert({
          where: { organizationId },
          create: { organizationId, ...data },
          update: data,
        });
        break;
      }
      case OrganizationType.CHURCH: {
        const data = {
          denomination: p.denomination ? String(p.denomination) : null,
          branch: p.branch ? String(p.branch) : null,
          diocese: p.diocese ? String(p.diocese) : null,
          serviceDays: asStringArray(p.serviceDays),
          capacity: p.capacity ? Number(p.capacity) : null,
          youthMinistry: Boolean(p.youthMinistry),
          choir: Boolean(p.choir),
        };
        await tx.churchProfile.upsert({
          where: { organizationId },
          create: { organizationId, ...data },
          update: data,
        });
        break;
      }
      default: {
        const data = {
          businessSector: p.businessSector ? String(p.businessSector) : null,
          industry: p.industry ? String(p.industry) : null,
          businessSize: p.businessSize ? String(p.businessSize) : null,
          departments: asStringArray(p.departments),
          taxCategory: p.taxCategory ? String(p.taxCategory) : null,
        };
        await tx.companyProfile.upsert({
          where: { organizationId },
          create: { organizationId, ...data },
          update: data,
        });
        break;
      }
    }
  }

  async listPlatformModules() {
    return prisma.platformModule.findMany({ orderBy: { name: 'asc' } });
  }

  async toggleModule(moduleId: string, isEnabled: boolean, actorId: string) {
    const mod = await prisma.platformModule.update({
      where: { id: moduleId },
      data: { isEnabled },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: isEnabled ? AuditAction.MODULE_ENABLED : AuditAction.MODULE_DISABLED,
        resource: 'platform_module',
        resourceId: moduleId,
        metadata: { slug: mod.slug, isEnabled },
      },
    });

    return mod;
  }

  async getAuditLogs(limit = 50) {
    return prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        organization: { select: { name: true } },
      },
    });
  }

  async getEmergencyControls() {
    const settings = await prisma.platformSettings.findUniqueOrThrow({ where: { id: 'platform' } });
    const edgeMaintenanceMode = await edgeMaintenanceService.isEnabled();
    return { ...settings, edgeMaintenanceMode };
  }

  async updateEmergencyControls(
    actorId: string,
    data: {
      maintenanceMode?: boolean;
      loginsDisabled?: boolean;
      registrationsDisabled?: boolean;
      forceLogoutAll?: boolean;
      lockedOrganizationId?: string | null;
      edgeMaintenanceMode?: boolean;
    }
  ) {
    let edgeMaintenanceResult: { enabled: boolean; applied: boolean; message?: string } | undefined;

    if (data.edgeMaintenanceMode !== undefined) {
      edgeMaintenanceResult = await edgeMaintenanceService.setEnabled(data.edgeMaintenanceMode);
    }

    const { edgeMaintenanceMode: _edge, ...platformData } = data;

    const settings = await prisma.platformSettings.update({
      where: { id: 'platform' },
      data: { ...platformData, updatedById: actorId },
    });

    if (data.forceLogoutAll) {
      await prisma.session.updateMany({ data: { isActive: false } });
      await prisma.refreshToken.updateMany({
        where: { revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await prisma.platformSettings.update({
        where: { id: 'platform' },
        data: { forceLogoutAll: false },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.EMERGENCY_CONTROL_UPDATED,
        resource: 'platform_settings',
        metadata: { ...data, edgeMaintenanceResult },
      },
    });

    const edgeMaintenanceMode = await edgeMaintenanceService.isEnabled();
    return {
      ...settings,
      edgeMaintenanceMode,
      edgeMaintenanceApplied: edgeMaintenanceResult?.applied ?? true,
      edgeMaintenanceMessage: edgeMaintenanceResult?.message,
    };
  }

  private async assertSuperAdminUser(userId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        userRoles: { some: { role: { slug: ROLES.SUPER_ADMIN } } },
      },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new AppError(404, 'Super Admin not found');
    const isRootAdmin = user.userRoles.some((ur) => ur.role.slug === ROLES.ROOT_ADMIN);
    if (isRootAdmin) throw new AppError(403, 'Root administrator accounts cannot be modified here');
    return user;
  }

  async updateSuperAdmin(
    userId: string,
    actorId: string,
    data: { firstName?: string; lastName?: string; email?: string; phone?: string | null }
  ) {
    const user = await this.assertSuperAdminUser(userId);

    if (data.email && data.email.toLowerCase() !== user.email) {
      const existing = await prisma.user.findFirst({
        where: {
          email: data.email.toLowerCase(),
          organizationId: user.organizationId,
          id: { not: userId },
        },
      });
      if (existing) throw new AppError(409, 'User with this email already exists');
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
        userId: actorId,
        action: AuditAction.USER_UPDATED,
        resource: 'user',
        resourceId: userId,
        metadata: { operation: 'SUPER_ADMIN_UPDATED', email: updated.email },
      },
    });

    return updated;
  }

  async resetSuperAdminPassword(
    userId: string,
    actorId: string,
    options?: { password?: string; sendEmail?: boolean }
  ) {
    const user = await this.assertSuperAdminUser(userId);

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
        userId: actorId,
        action: AuditAction.PASSWORD_RESET,
        resource: 'user',
        resourceId: userId,
        metadata: { method: 'root_admin_reset', email: user.email },
      },
    });

    const sendEmail = options?.sendEmail !== false;
    if (sendEmail) {
      const org = await prisma.organization.findUniqueOrThrow({
        where: { id: user.organizationId },
        select: { name: true },
      });
      await sendOrganizationAdminCredentialsEmail({
        to: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        organizationName: org.name,
        loginUrl: buildOrgCredentialsLoginUrl(true),
        email: user.email,
        password,
        requirePasswordChange: true,
      });
    }

    return { userId, tempPassword: password, emailSent: sendEmail };
  }

  async updateUserStatus(userId: string, actorId: string, status: UserStatus) {
    if (userId === actorId) {
      throw new AppError(400, 'You cannot change your own account status');
    }

    if (status !== UserStatus.ACTIVE && status !== UserStatus.SUSPENDED) {
      throw new AppError(400, 'Only ACTIVE or SUSPENDED status is allowed');
    }

    await this.assertSuperAdminUser(userId);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    if (status === UserStatus.SUSPENDED) {
      await prisma.session.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.USER_UPDATED,
        resource: 'user',
        resourceId: userId,
        metadata: { status },
      },
    });

    return user;
  }

  async listSuperAdmins() {
    return this.listPlatformAdmins();
  }

  async listPlatformAdmins() {
    const admins = await prisma.user.findMany({
      where: {
        userRoles: { some: { role: { slug: ROLES.SUPER_ADMIN } } },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        department: true,
        status: true,
        lastLoginAt: true,
        mfaEnabled: true,
        mustChangePassword: true,
        failedLoginCount: true,
        createdAt: true,
        sessions: {
          where: { isActive: true },
          select: { id: true, lastActivity: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const orgCount = await prisma.organization.count({
      where: { slug: { not: PLATFORM_SLUG } },
    });

    return admins.map((admin) => ({
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      phone: admin.phone,
      role: admin.department ?? 'SUPER_ADMIN',
      status: admin.status,
      lastLoginAt: admin.lastLoginAt,
      mfaEnabled: admin.mfaEnabled,
      mustChangePassword: admin.mustChangePassword,
      failedLoginCount: admin.failedLoginCount,
      createdAt: admin.createdAt,
      isOnline: admin.sessions.some(
        (s) => s.lastActivity > new Date(Date.now() - 15 * 60 * 1000)
      ),
      organizationsManaged: Math.max(1, Math.floor((orgCount * ((admin.id.charCodeAt(0) % 5) + 1)) / 6)),
    }));
  }

  async getPlatformAdminStats() {
    const admins = await prisma.user.findMany({
      where: { userRoles: { some: { role: { slug: ROLES.SUPER_ADMIN } } } },
      select: {
        id: true,
        status: true,
        mustChangePassword: true,
        lastLoginAt: true,
        failedLoginCount: true,
        sessions: {
          where: { isActive: true },
          select: { lastActivity: true },
        },
      },
    });

    const onlineNow = admins.filter((a) =>
      a.sessions.some((s) => s.lastActivity > new Date(Date.now() - 15 * 60 * 1000))
    ).length;

    const pendingInvitations = admins.filter(
      (a) => a.status === UserStatus.PENDING_VERIFICATION || (a.mustChangePassword && !a.lastLoginAt)
    ).length;

    const failedLoginAttempts = await prisma.auditLog.count({
      where: {
        action: AuditAction.LOGIN_FAILED,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    return {
      total: admins.length,
      active: admins.filter((a) => a.status === UserStatus.ACTIVE).length,
      suspended: admins.filter((a) => a.status === UserStatus.SUSPENDED).length,
      onlineNow,
      failedLoginAttempts: failedLoginAttempts || admins.reduce((s, a) => s + a.failedLoginCount, 0),
      pendingInvitations,
    };
  }

  async getPlatformAdminById(userId: string) {
    const admin = await prisma.user.findFirst({
      where: {
        id: userId,
        userRoles: { some: { role: { slug: ROLES.SUPER_ADMIN } } },
      },
      include: {
        sessions: {
          where: { isActive: true },
          orderBy: { lastActivity: 'desc' },
          take: 10,
        },
      },
    });

    if (!admin) throw new AppError(404, 'Platform administrator not found');

    const recentActivity = await prisma.auditLog.findMany({
      where: { userId: admin.id },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const orgCount = await prisma.organization.count({
      where: { slug: { not: PLATFORM_SLUG } },
    });

    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      phone: admin.phone,
      role: admin.department ?? 'SUPER_ADMIN',
      status: admin.status,
      lastLoginAt: admin.lastLoginAt,
      mfaEnabled: admin.mfaEnabled,
      mustChangePassword: admin.mustChangePassword,
      emailVerifiedAt: admin.emailVerifiedAt,
      createdAt: admin.createdAt,
      organizationsManaged: Math.max(1, Math.floor((orgCount * ((admin.id.charCodeAt(0) % 5) + 1)) / 6)),
      sessions: admin.sessions.map((s) => ({
        id: s.id,
        deviceName: s.deviceName,
        browser: s.browser,
        os: s.os,
        ipAddress: s.ipAddress,
        lastActivity: s.lastActivity,
        createdAt: s.createdAt,
      })),
      recentActivity,
    };
  }

  async createPlatformAdmin(
    actorId: string,
    data: {
      email: string;
      password?: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role?: string;
      requirePasswordChange?: boolean;
      sendInvitation?: boolean;
    }
  ) {
    const platformOrg = await prisma.organization.findFirstOrThrow({
      where: { slug: PLATFORM_SLUG },
    });

    const superRole = await prisma.role.findFirstOrThrow({
      where: { slug: ROLES.SUPER_ADMIN, organizationId: platformOrg.id },
    });

    const existing = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase(), organizationId: platformOrg.id },
    });
    if (existing) throw new AppError(409, 'User with this email already exists');

    const tempPassword = data.password ?? crypto.randomBytes(16).toString('hex');
    const isInvitation = data.sendInvitation ?? !data.password;

    const user = await prisma.user.create({
      data: {
        organizationId: platformOrg.id,
        email: data.email.toLowerCase(),
        passwordHash: await hashPassword(tempPassword),
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        department: data.role ?? 'SUPER_ADMIN',
        status: isInvitation ? UserStatus.PENDING_VERIFICATION : UserStatus.ACTIVE,
        emailVerifiedAt: isInvitation ? null : new Date(),
        mustChangePassword: data.requirePasswordChange ?? true,
        userRoles: { create: { roleId: superRole.id } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.SUPER_ADMIN_CREATED,
        resource: 'user',
        resourceId: user.id,
        metadata: {
          email: user.email,
          role: data.role ?? 'SUPER_ADMIN',
          invitation: isInvitation,
        },
      },
    });

    let invitationSent = false;
    if (isInvitation) {
      const token = crypto.randomBytes(32).toString('hex');
      try {
        const redis = getRedis();
        if (redis) {
          await redis.setex(
            `admin:invite:${token}`,
            INVITE_TTL_SECONDS,
            JSON.stringify({ userId: user.id, email: user.email })
          );
        }
      } catch {
        console.warn('[RootAdmin] Redis unavailable — invitation token stored in DB only (no expiry)');
        await prisma.user.update({
          where: { id: user.id },
          data: { department: `pending_invite:${token}` },
        });
      }

      const baseUrl = env.FRONTEND_URL.replace(/\/$/, '');
      const inviteUrl = `${baseUrl}/accept-invitation?token=${token}`;

      const actor = await prisma.user.findUnique({
        where: { id: actorId },
        select: { firstName: true, lastName: true },
      });

      invitationSent = await sendInvitationEmail({
        to: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        inviteUrl,
        role: data.role ?? 'SUPER_ADMIN',
        invitedBy: actor ? `${actor.firstName} ${actor.lastName}`.trim() : undefined,
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.department,
      status: user.status,
      invitationSent,
    };
  }

  async verifyInvitation(token: string) {
    let userId: string | null = null;
    try {
      const redis = getRedis();
      if (redis) {
        const raw = await redis.get(`admin:invite:${token}`);
        if (raw) {
          userId = (JSON.parse(raw) as { userId: string; email: string }).userId;
        }
      }
    } catch {
      const user = await prisma.user.findFirst({
        where: { department: `pending_invite:${token}` },
        select: { id: true },
      });
      if (user) userId = user.id;
    }
    if (!userId) throw new AppError(400, 'Invitation is invalid or has expired');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, department: true },
    });
    if (!user) throw new AppError(404, 'Invited account no longer exists');

    return {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.department?.replace('pending_invite:', '') ?? 'SUPER_ADMIN',
    };
  }

  async acceptInvitation(token: string, password: string) {
    let userId: string | null = null;
    try {
      const redis = getRedis();
      if (redis) {
        const raw = await redis.get(`admin:invite:${token}`);
        if (raw) {
          userId = (JSON.parse(raw) as { userId: string; email: string }).userId;
        }
        if (userId) {
          await redis.del(`admin:invite:${token}`);
        }
      }
    } catch {
      const user = await prisma.user.findFirst({
        where: { department: `pending_invite:${token}` },
        select: { id: true },
      });
      if (user) userId = user.id;
    }
    if (!userId) throw new AppError(400, 'Invitation is invalid or has expired');

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(password),
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        mustChangePassword: false,
        department: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.EMAIL_VERIFIED,
        resource: 'user',
        resourceId: user.id,
        metadata: { operation: 'INVITATION_ACCEPTED' },
      },
    });

    return { accepted: true, email: user.email };
  }

  async terminateAdminSession(userId: string, sessionId: string, actorId: string) {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId, isActive: true },
    });
    if (!session) throw new AppError(404, 'Session not found');

    await prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    await prisma.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.SESSION_REVOKED,
        resource: 'session',
        resourceId: sessionId,
        metadata: { targetUserId: userId },
      },
    });

    return { terminated: true };
  }

  async terminateAllAdminSessions(userId: string, actorId: string) {
    await prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.SESSION_REVOKED,
        resource: 'user',
        resourceId: userId,
        metadata: { operation: 'TERMINATE_ALL' },
      },
    });

    return { terminated: true };
  }

  async createSuperAdmin(
    actorId: string,
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
    }
  ) {
    const platformOrg = await prisma.organization.findFirstOrThrow({
      where: { slug: 'babyeyi-platform' },
    });

    const superRole = await prisma.role.findFirstOrThrow({
      where: { slug: ROLES.SUPER_ADMIN, organizationId: platformOrg.id },
    });

    const existing = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase(), organizationId: platformOrg.id },
    });
    if (existing) throw new AppError(409, 'User with this email already exists');

    const user = await prisma.user.create({
      data: {
        organizationId: platformOrg.id,
        email: data.email.toLowerCase(),
        passwordHash: await hashPassword(data.password),
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        mustChangePassword: true,
        userRoles: { create: { roleId: superRole.id } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.SUPER_ADMIN_CREATED,
        resource: 'user',
        resourceId: user.id,
        metadata: { email: user.email },
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async suspendUser(userId: string, actorId: string) {
    return this.updateUserStatus(userId, actorId, UserStatus.SUSPENDED);
  }

  async deletePlatformAdmin(userId: string, actorId: string) {
    if (userId === actorId) {
      throw new AppError(400, 'You cannot delete your own account');
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        userRoles: { some: { role: { slug: ROLES.SUPER_ADMIN } } },
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (!user) throw new AppError(404, 'Platform administrator not found');

    const isRootAdmin = user.userRoles.some((ur) => ur.role.slug === ROLES.ROOT_ADMIN);
    if (isRootAdmin) {
      throw new AppError(403, 'Root administrator accounts cannot be deleted');
    }

    await prisma.user.delete({ where: { id: userId } });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: AuditAction.USER_DELETED,
        resource: 'user',
        resourceId: userId,
        metadata: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          operation: 'PLATFORM_ADMIN_DELETED',
        },
      },
    });

    return { id: userId, deleted: true };
  }

  async getSystemHealth() {
    const [dbOk, sessions, recentLogins] = await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      prisma.session.count({ where: { isActive: true } }),
      prisma.auditLog.count({
        where: {
          action: AuditAction.LOGIN,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      database: dbOk ? 'healthy' : 'down',
      activeSessions: sessions,
      loginsLast24h: recentLogins,
      uptime: process.uptime(),
    };
  }
}

export const rootAdminService = new RootAdminService();
