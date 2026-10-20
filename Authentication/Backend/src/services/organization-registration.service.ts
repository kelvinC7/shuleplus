import {
  AuditAction,
  ModuleAssignmentStatus,
  OrganizationStatus,
  OrganizationType,
  RegistrationStatus,
  UserStatus,
  type Prisma,
} from '../generated/prisma';
import { isHiddenFromSchoolMarketplace } from '../constants/platform-modules';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { ROLES } from '../constants/roles';
import { locationService } from './location.service';
import { slugify } from '../utils/slug';
import { hashPassword } from '../utils/security';
import { moduleManagementService } from './module-management.service';

export type RegistrationPayload = Record<string, unknown>;

export class OrganizationRegistrationService {
  async saveDraft(input: {
    id?: string;
    submittedById: string;
    payload: RegistrationPayload;
  }) {
    const p = input.payload;
    const organizationName = String(p.organizationName ?? p.name ?? '').trim();
    const organizationType = (p.organizationType ?? p.type ?? 'SCHOOL') as OrganizationType;

    if (!organizationName) throw new AppError(400, 'Organization name is required');

    const data = {
      organizationName,
      organizationType,
      status: RegistrationStatus.DRAFT,
      payload: input.payload as Prisma.InputJsonValue,
      submittedById: input.submittedById,
    };

    if (input.id) {
      const existing = await prisma.organizationRegistration.findUnique({ where: { id: input.id } });
      if (!existing) throw new AppError(404, 'Registration draft not found');
      if (existing.status !== RegistrationStatus.DRAFT) {
        throw new AppError(400, 'Only drafts can be updated');
      }
      return prisma.organizationRegistration.update({
        where: { id: input.id },
        data,
      });
    }

    return prisma.organizationRegistration.create({ data });
  }

  async submit(registrationId: string, submittedById: string) {
    const reg = await prisma.organizationRegistration.findUnique({ where: { id: registrationId } });
    if (!reg) throw new AppError(404, 'Registration not found');
    if (reg.status !== RegistrationStatus.DRAFT) {
      throw new AppError(400, 'Registration already submitted');
    }

    const payload = reg.payload as RegistrationPayload;
    const districtId = String(payload.districtId ?? '');
    if (!districtId) throw new AppError(400, 'District is required before submit');

    const organizationCode = await locationService.allocateOrganizationCode(districtId);

    return prisma.organizationRegistration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.PENDING,
        organizationCode,
        submittedById,
        submittedAt: new Date(),
        payload: { ...payload, organizationCode } as Prisma.InputJsonValue,
      },
    });
  }

  /** Public school onboarding:
   *  - Creates ACTIVE org + Head Teacher admin (must change password on first login)
   *  - Assigns selected modules as PENDING (locked on dashboard)
   *  - Leaves registration PENDING for Super Admin review
   *  - On approve: modules flip to ACTIVE automatically
   */
  async submitPublic(payload: RegistrationPayload) {
    const organizationName = String(payload.organizationName ?? '').trim();
    const districtName = String(payload.districtName ?? '').trim();
    const districtId = String(payload.districtId ?? '').trim();
    const provinceName = String(payload.provinceName ?? '').trim();
    const provinceId = String(payload.provinceId ?? '').trim();
    const sectorName = String(payload.sectorName ?? '').trim();
    const sectorId = String(payload.sectorId ?? '').trim();
    const cellName = String(payload.cellName ?? '').trim();
    const cellId = String(payload.cellId ?? '').trim();
    const villageName = String(payload.villageName ?? '').trim();
    const villageId = String(payload.villageId ?? '').trim();
    const headName = String(payload.organizationHead ?? payload.adminName ?? '').trim();
    const adminEmail = String(payload.headEmail ?? payload.adminEmail ?? '')
      .trim()
      .toLowerCase();
    const adminPhone = String(payload.headPhone ?? payload.adminPhone ?? '').trim();
    const tempPassword = String(payload.tempPassword ?? '').trim();

    if (!organizationName) throw new AppError(400, 'School name is required');
    if (!districtId && !districtName) throw new AppError(400, 'District is required');
    if (!headName) throw new AppError(400, 'Head Teacher / Principal name is required');
    if (!adminEmail) throw new AppError(400, 'Head Teacher email is required');
    if (!tempPassword || tempPassword.length < 8) {
      throw new AppError(400, 'Password must be at least 8 characters');
    }

    const emailTaken = await prisma.user.findFirst({ where: { email: adminEmail } });
    if (emailTaken) throw new AppError(400, 'An account with this email already exists. Please log in.');

    let resolvedProvinceId = provinceId || undefined;
    let resolvedDistrictId = districtId || undefined;
    let resolvedSectorId = sectorId || undefined;
    let resolvedCellId = cellId || undefined;
    let resolvedVillageId = villageId || undefined;

    if (!resolvedProvinceId && provinceName) {
      const province = await locationService.getProvinceByName(provinceName);
      resolvedProvinceId = province?.id ?? undefined;
    }

    if (!resolvedDistrictId && districtName) {
      const district = await locationService.getDistrictByName(districtName, resolvedProvinceId);
      resolvedDistrictId = district?.id ?? undefined;
    }

    if (!resolvedSectorId && sectorName && resolvedDistrictId) {
      const sector = await locationService.getSectorByName(sectorName, resolvedDistrictId);
      resolvedSectorId = sector?.id ?? undefined;
    }

    if (!resolvedCellId && cellName && resolvedSectorId) {
      const cell = await locationService.getCellByName(cellName, resolvedSectorId);
      resolvedCellId = cell?.id ?? undefined;
    }

    if (!resolvedVillageId && villageName && resolvedCellId) {
      const village = await locationService.getVillageByName(villageName, resolvedCellId);
      resolvedVillageId = village?.id ?? undefined;
    }

    if (!resolvedDistrictId) throw new AppError(400, 'District is required');

    const organizationCode = await locationService.allocateOrganizationCode(resolvedDistrictId);
    const selectedModules = Array.isArray(payload.selectedModules) ? payload.selectedModules : [];

    const base = slugify(organizationName) || 'org';
    let slug = base;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }

    const enrichedPayload: RegistrationPayload = {
      ...payload,
      organizationType: 'SCHOOL',
      organizationName,
      organizationCode,
      organizationHead: headName,
      headEmail: adminEmail,
      headPhone: adminPhone || undefined,
      adminName: headName,
      adminEmail,
      adminPhone: adminPhone || undefined,
      requirePasswordChange: Boolean(payload.requirePasswordChange ?? false),
      selectedModules,
      source: 'public_onboard',
    };

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          organizationCode,
          name: organizationName,
          slug,
          type: OrganizationType.SCHOOL,
          category: payload.category
            ? String(payload.category)
            : payload.schoolCategory
              ? String(payload.schoolCategory)
              : null,
          status: OrganizationStatus.ACTIVE,
          email: payload.email ? String(payload.email) : adminEmail,
          phone: payload.phone ? String(payload.phone) : null,
          website: payload.website ? String(payload.website) : null,
          description: payload.description ? String(payload.description) : null,
          country: String(payload.country ?? 'Rwanda'),
          provinceId: resolvedProvinceId ?? null,
          districtId: resolvedDistrictId,
          sectorId: resolvedSectorId ?? null,
          cellId: resolvedCellId ?? null,
          villageId: resolvedVillageId ?? null,
          subscriptionTier: payload.subscriptionTier ? String(payload.subscriptionTier) : 'Standard',
          logoUrl: payload.logoUrl ? String(payload.logoUrl) : null,
          signatureUrl: payload.signatureUrl ? String(payload.signatureUrl) : null,
          stampUrl: payload.stampUrl ? String(payload.stampUrl) : null,
          poBox: postalFromRegistrationPayload(payload),
          physicalAddress: postalFromRegistrationPayload(payload),
        },
      });

      await this.createTypeProfile(tx, organization.id, OrganizationType.SCHOOL, enrichedPayload);
      const adminUser = await this.provisionOrganizationAdmin(tx, organization.id, enrichedPayload);

      const registration = await tx.organizationRegistration.create({
        data: {
          organizationName,
          organizationType: OrganizationType.SCHOOL,
          status: RegistrationStatus.PENDING,
          organizationCode,
          organizationId: organization.id,
          submittedAt: new Date(),
          payload: enrichedPayload as Prisma.InputJsonValue,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: adminUser?.id ?? null,
          action: AuditAction.ORGANIZATION_CREATED,
          resource: 'organization_registration',
          resourceId: registration.id,
          metadata: {
            organizationCode,
            name: organizationName,
            workflow: 'public_onboard',
            modulesLockedPending: true,
            awaitingSuperAdminApproval: true,
          },
        },
      });

      return { organization, registration, adminUser };
    });

    await this.assignSelectedModules(result.organization.id, result.adminUser?.id ?? null, enrichedPayload, {
      lockedPending: true,
    });

    return {
      id: result.registration.id,
      organizationId: result.organization.id,
      organizationCode: result.organization.organizationCode,
      organizationName: result.organization.name,
      status: result.registration.status,
      submittedAt: result.registration.submittedAt,
      adminEmail,
      modulesLocked: true,
      mustChangePassword: Boolean(enrichedPayload.requirePasswordChange ?? false),
      message:
        'Account created. Sign in with your Head Teacher email and the password you set, then wait for Super Admin approval to unlock modules.',
    };
  }

  async approve(registrationId: string, reviewerId: string) {
    const reg = await prisma.organizationRegistration.findUnique({ where: { id: registrationId } });
    if (!reg) throw new AppError(404, 'Registration not found');
    if (reg.status !== RegistrationStatus.PENDING) {
      throw new AppError(400, 'Only pending registrations can be approved');
    }

    const p = reg.payload as RegistrationPayload;

    // Public onboard already created the org + locked modules — just approve & unlock
    const existingOrgId =
      reg.organizationId ??
      (
        await prisma.organization.findFirst({
          where: { organizationCode: reg.organizationCode ?? undefined },
          select: { id: true },
        })
      )?.id ??
      null;

    if (existingOrgId) {
      const updatedReg = await prisma.organizationRegistration.update({
        where: { id: registrationId },
        data: {
          status: RegistrationStatus.APPROVED,
          organizationId: existingOrgId,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });

      await this.syncOrganizationPostalFromPayload(existingOrgId, p);

      await this.activateLockedModules(existingOrgId, reviewerId, p);

      await prisma.auditLog.create({
        data: {
          organizationId: existingOrgId,
          userId: reviewerId,
          action: AuditAction.ORGANIZATION_UPDATED,
          resource: 'organization_registration',
          resourceId: registrationId,
          metadata: {
            workflow: 'public_onboard_approve',
            modulesActivated: true,
          },
        },
      });

      const organization = await prisma.organization.findUniqueOrThrow({ where: { id: existingOrgId } });
      return { organization, registration: updatedReg, adminUser: null };
    }

    const base = slugify(reg.organizationName) || 'org';
    let slug = base;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }

    const org = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          organizationCode: reg.organizationCode,
          name: reg.organizationName,
          slug,
          type: reg.organizationType,
          category: p.category
            ? String(p.category)
            : p.schoolCategory
              ? String(p.schoolCategory)
              : null,
          status: OrganizationStatus.ACTIVE,
          email: p.email ? String(p.email) : null,
          phone: p.phone ? String(p.phone) : null,
          website: p.website ? String(p.website) : null,
          description: p.description ? String(p.description) : null,
          country: String(p.country ?? 'Rwanda'),
          provinceId: p.provinceId ? String(p.provinceId) : null,
          districtId: p.districtId ? String(p.districtId) : null,
          sectorId: p.sectorId ? String(p.sectorId) : null,
          cellId: p.cellId ? String(p.cellId) : null,
          villageId: p.villageId ? String(p.villageId) : null,
          subscriptionTier: p.subscriptionTier ? String(p.subscriptionTier) : 'Standard',
          logoUrl: p.logoUrl ? String(p.logoUrl) : null,
          signatureUrl: p.signatureUrl ? String(p.signatureUrl) : null,
          stampUrl: p.stampUrl ? String(p.stampUrl) : null,
          poBox: postalFromRegistrationPayload(p),
          physicalAddress: postalFromRegistrationPayload(p),
        },
      });

      await this.createTypeProfile(tx, organization.id, reg.organizationType, p);
      const adminUser = await this.provisionOrganizationAdmin(tx, organization.id, p);

      const updatedReg = await tx.organizationRegistration.update({
        where: { id: registrationId },
        data: {
          status: RegistrationStatus.APPROVED,
          organizationId: organization.id,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: reviewerId,
          action: AuditAction.ORGANIZATION_CREATED,
          resource: 'organization_registration',
          resourceId: registrationId,
          metadata: {
            organizationCode: organization.organizationCode,
            name: organization.name,
            type: organization.type,
            workflow: 'registration_wizard',
            adminCreated: Boolean(adminUser),
            invitationSent: false,
          },
        },
      });

      return { organization, registration: updatedReg, adminUser };
    });

    // Classic wizard pending → assign modules as ACTIVE on approve
    await this.assignSelectedModules(org.organization.id, reviewerId, p);

    return org;
  }

  /** Flip PENDING module assignments to ACTIVE after Super Admin approval. */
  private async activateLockedModules(
    organizationId: string,
    actorId: string,
    p: RegistrationPayload
  ) {
    const now = new Date();
    const pending = await prisma.organizationModule.findMany({
      where: { organizationId, status: ModuleAssignmentStatus.PENDING },
      select: { moduleId: true },
    });

    if (pending.length > 0) {
      const moduleIds = pending.map((m) => m.moduleId);
      try {
        await moduleManagementService.assignModulesToOrganization(organizationId, actorId, moduleIds);
        return;
      } catch {
        await prisma.organizationModule.updateMany({
          where: { organizationId, status: ModuleAssignmentStatus.PENDING },
          data: {
            status: ModuleAssignmentStatus.ACTIVE,
            activatedById: actorId,
            activatedAt: now,
          },
        });
      }
      return;
    }

    // No locked rows yet — assign selected modules as ACTIVE
    await this.assignSelectedModules(organizationId, actorId, p);
  }

  private async assignSelectedModules(
    organizationId: string,
    actorId: string | null,
    p: RegistrationPayload,
    options?: { lockedPending?: boolean }
  ) {
    const selected = Array.isArray(p.selectedModules) ? (p.selectedModules as Array<Record<string, unknown>>) : [];
    if (selected.length === 0) return;

    const catalog = await prisma.platformModule.findMany({
      where: { isEnabled: true },
      select: { id: true, slug: true, name: true, shortName: true, version: true },
    });

    const moduleIds: string[] = [];
    for (const item of selected) {
      const key = String(item.slug ?? item.id ?? item.name ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');
      const name = String(item.name ?? '').trim().toLowerCase();
      const match = catalog.find((m) => {
        const slug = m.slug.toLowerCase();
        const n = m.name.toLowerCase();
        const short = (m.shortName ?? '').toLowerCase();
        return (
          slug === key ||
          slug.includes(key) ||
          key.includes(slug) ||
          (name && (n === name || n.includes(name) || name.includes(n))) ||
          (name && short === name)
        );
      });
      if (match && !isHiddenFromSchoolMarketplace(match.slug) && !moduleIds.includes(match.id)) {
        moduleIds.push(match.id);
      }
    }

    if (moduleIds.length === 0) return;

    const status = options?.lockedPending
      ? ModuleAssignmentStatus.PENDING
      : ModuleAssignmentStatus.ACTIVE;
    const now = new Date();

    if (!options?.lockedPending && actorId) {
      try {
        await moduleManagementService.assignModulesToOrganization(organizationId, actorId, moduleIds);
        return;
      } catch {
        /* fall through to upsert */
      }
    }

    for (const moduleId of moduleIds) {
      const mod = catalog.find((m) => m.id === moduleId);
      await prisma.organizationModule.upsert({
        where: { organizationId_moduleId: { organizationId, moduleId } },
        update: {
          status,
          activatedById: status === ModuleAssignmentStatus.ACTIVE ? actorId : null,
          activatedAt: status === ModuleAssignmentStatus.ACTIVE ? now : null,
          moduleVersion: mod?.version ?? null,
        },
        create: {
          organizationId,
          moduleId,
          status,
          activatedById: status === ModuleAssignmentStatus.ACTIVE ? actorId : null,
          activatedAt: status === ModuleAssignmentStatus.ACTIVE ? now : null,
          subscriptionPlan: 'Standard',
          moduleVersion: mod?.version ?? null,
        },
      });
    }

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        modules: catalog
          .filter((m) => moduleIds.includes(m.id))
          .map((m) => m.slug) as Prisma.InputJsonValue,
      },
    });
  }

  private async provisionOrganizationAdmin(
    tx: Prisma.TransactionClient,
    organizationId: string,
    p: RegistrationPayload
  ) {
    const adminEmail = String(p.adminEmail ?? '').trim().toLowerCase();
    const tempPassword = String(p.tempPassword ?? '').trim();
    if (!adminEmail || !tempPassword) return null;

    const existing = await tx.user.findFirst({
      where: { organizationId, email: adminEmail },
    });
    if (existing) return existing;

    const adminName = String(p.adminName ?? 'Organization Admin').trim();
    const nameParts = adminName.split(/\s+/);
    const firstName = nameParts[0] || 'Admin';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    let adminRole = await tx.role.findFirst({
      where: { organizationId, slug: ROLES.ORGANIZATION_ADMIN },
    });
    if (!adminRole) {
      adminRole = await tx.role.create({
        data: {
          organizationId,
          name: 'Organization Administrator',
          slug: ROLES.ORGANIZATION_ADMIN,
          description: 'Organization administrator',
          hierarchyLevel: 100,
          isSystem: true,
          dataScope: 'ORGANIZATION',
        },
      });
    }

    const user = await tx.user.create({
      data: {
        organizationId,
        email: adminEmail,
        passwordHash: await hashPassword(tempPassword),
        firstName,
        lastName,
        phone: p.adminPhone ? String(p.adminPhone) : null,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        mustChangePassword: Boolean(p.requirePasswordChange ?? true),
      },
    });

    await tx.userRole.create({ data: { userId: user.id, roleId: adminRole.id } });
    return user;
  }

  /** Copy postal address from registration payload onto organization when poBox was never set. */
  private async syncOrganizationPostalFromPayload(
    organizationId: string,
    p: RegistrationPayload,
    tx?: Prisma.TransactionClient
  ) {
    const postal = postalFromRegistrationPayload(p);
    if (!postal) return;
    const client = tx ?? prisma;
    const org = await client.organization.findUnique({
      where: { id: organizationId },
      select: { poBox: true },
    });
    if (org?.poBox?.trim()) return;
    await client.organization.update({
      where: { id: organizationId },
      data: { poBox: postal, physicalAddress: postal },
    });
  }

  private async createTypeProfile(
    tx: Prisma.TransactionClient,
    organizationId: string,
    type: OrganizationType,
    p: RegistrationPayload
  ) {
    switch (type) {
      case OrganizationType.SCHOOL:
      case OrganizationType.TVET:
      case OrganizationType.UNIVERSITY:
        await tx.schoolProfile.create({
          data: {
            organizationId,
            schoolCategory: p.schoolCategory ? String(p.schoolCategory) : null,
            schoolProgram: p.schoolProgram ? String(p.schoolProgram) : null,
            educationLevels: (p.educationLevels as string[]) ?? [],
            aLevelCombinations: (p.aLevelCombinations as string[]) ?? [],
            tvetTrades: (p.tvetTrades as string[]) ?? [],
            curriculum: p.curriculum ? String(p.curriculum) : null,
            academicYear: p.academicYear ? String(p.academicYear) : null,
            schoolShift: p.schoolShift ? String(p.schoolShift) : null,
            principalName: p.organizationHead ? String(p.organizationHead) : null,
            deputyHeadName: p.deputyHead ? String(p.deputyHead) : null,
            bursarName: p.bursar ? String(p.bursar) : null,
            secretaryName: p.secretary ? String(p.secretary) : null,
            leadershipPhone: p.headPhone ? String(p.headPhone) : null,
            leadershipEmail: p.headEmail ? String(p.headEmail) : null,
          },
        });
        break;
      case OrganizationType.HOSPITAL:
        await tx.hospitalProfile.create({
          data: {
            organizationId,
            hospitalType: p.hospitalType ? String(p.hospitalType) : null,
            bedsCapacity: p.bedsCapacity ? Number(p.bedsCapacity) : null,
            departments: (p.departments as string[]) ?? [],
            emergencyServices: Boolean(p.emergencyServices),
            laboratory: Boolean(p.laboratory),
            pharmacy: Boolean(p.pharmacy),
            operatingHours: p.operatingHours ? String(p.operatingHours) : null,
          },
        });
        break;
      case OrganizationType.FACTORY:
        await tx.factoryProfile.create({
          data: {
            organizationId,
            industry: p.industry ? String(p.industry) : null,
            productionType: p.productionType ? String(p.productionType) : null,
            factorySize: p.factorySize ? String(p.factorySize) : null,
            employeeCapacity: p.employeeCapacity ? Number(p.employeeCapacity) : null,
            workingShifts: (p.workingShifts as string[]) ?? [],
            environmentalLicense: p.environmentalLicense ? String(p.environmentalLicense) : null,
          },
        });
        break;
      case OrganizationType.CHURCH:
        await tx.churchProfile.create({
          data: {
            organizationId,
            denomination: p.denomination ? String(p.denomination) : null,
            branch: p.branch ? String(p.branch) : null,
            diocese: p.diocese ? String(p.diocese) : null,
            serviceDays: (p.serviceDays as string[]) ?? [],
            capacity: p.capacity ? Number(p.capacity) : null,
            youthMinistry: Boolean(p.youthMinistry),
            choir: Boolean(p.choir),
          },
        });
        break;
      case OrganizationType.BUSINESS:
      case OrganizationType.SACCO:
      case OrganizationType.COOPERATIVE:
      case OrganizationType.GOVERNMENT_INSTITUTION:
      case OrganizationType.HOTEL:
      case OrganizationType.NGO:
        await tx.companyProfile.create({
          data: {
            organizationId,
            businessSector: p.businessSector ? String(p.businessSector) : null,
            industry: p.industry ? String(p.industry) : null,
            businessSize: p.businessSize ? String(p.businessSize) : null,
            departments: (p.departments as string[]) ?? [],
            taxCategory: p.taxCategory ? String(p.taxCategory) : null,
          },
        });
        break;
      default:
        break;
    }
  }

  async reject(registrationId: string, reviewerId: string, reviewNotes?: string) {
    const reg = await prisma.organizationRegistration.findUnique({ where: { id: registrationId } });
    if (!reg) throw new AppError(404, 'Registration not found');
    if (reg.status !== RegistrationStatus.PENDING) {
      throw new AppError(400, 'Only pending registrations can be rejected');
    }

    return prisma.organizationRegistration.update({
      where: { id: registrationId },
      data: {
        status: RegistrationStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes?.trim() || null,
      },
    });
  }

  async list(status?: RegistrationStatus) {
    return prisma.organizationRegistration.findMany({
      where: status ? { status } : undefined,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  async getById(id: string) {
    const reg = await prisma.organizationRegistration.findUnique({ where: { id } });
    if (!reg) throw new AppError(404, 'Registration not found');
    return reg;
  }

  /** Public directory feed: all onboarded schools for the babyeyi.rw landing page */
  async listPublicSchools() {
    const orgs = await prisma.organization.findMany({
      where: { type: OrganizationType.SCHOOL, status: OrganizationStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        organizationCode: true,
        name: true,
        slug: true,
        category: true,
        description: true,
        email: true,
        phone: true,
        website: true,
        logoUrl: true,
        establishedDate: true,
        physicalAddress: true,
        poBox: true,
        address: true,
        createdAt: true,
        province: { select: { name: true } },
        district: { select: { name: true } },
        sector: { select: { name: true } },
        cell: { select: { name: true } },
        village: { select: { name: true } },
        registration: { select: { payload: true } },
        schoolProfile: {
          select: {
            schoolCategory: true,
            schoolProgram: true,
            educationLevels: true,
            aLevelCombinations: true,
            tvetTrades: true,
            curriculum: true,
            schoolMotto: true,
          },
        },
        admissionSettings: { select: { enabled: true } },
      },
    });

    return orgs.map((org) => {
      const payload = registrationPayload(org);
      return {
      id: org.id,
      organizationCode: org.organizationCode,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      category: org.category,
      schoolCategory: org.schoolProfile?.schoolCategory ?? null,
      program: org.schoolProfile?.schoolProgram ?? null,
      educationLevels: toStringArray(org.schoolProfile?.educationLevels),
      aLevelCombinations: toStringArray(org.schoolProfile?.aLevelCombinations),
      tvetTrades: toStringArray(org.schoolProfile?.tvetTrades),
      curriculum: org.schoolProfile?.curriculum ?? null,
      motto: org.schoolProfile?.schoolMotto ?? null,
      description: org.description,
      phone: org.phone,
      email: org.email,
      website: org.website,
      provinceName: resolveLocationName(org.province?.name, payload, 'provinceName'),
      districtName: resolveLocationName(org.district?.name, payload, 'districtName'),
      sectorName: resolveLocationName(org.sector?.name, payload, 'sectorName'),
      cellName: resolveLocationName(org.cell?.name, payload, 'cellName'),
      villageName: resolveLocationName(org.village?.name, payload, 'villageName'),
      postalAddress:
        org.physicalAddress?.trim() ||
        org.poBox?.trim() ||
        org.address?.trim() ||
        payloadString(payload, 'postalAddress') ||
        null,
      establishedDate: org.establishedDate ? org.establishedDate.toISOString().slice(0, 10) : null,
      onboardedAt: org.createdAt.toISOString(),
      admissionsEnabled: org.admissionSettings?.enabled ?? false,
    };
    });
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function postalFromRegistrationPayload(p: RegistrationPayload): string | null {
  const raw = p.postalAddress ? String(p.postalAddress).trim() : '';
  return raw || null;
}

function payloadString(payload: RegistrationPayload, key: string): string | null {
  const value = (payload as Record<string, unknown>)[key];
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

/** Prefer linked admin location; fall back to names saved in the registration payload. */
function resolveLocationName(
  linked: string | null | undefined,
  payload: RegistrationPayload,
  payloadKey: string,
): string | null {
  if (linked?.trim()) return linked.trim();
  return payloadString(payload, payloadKey);
}

function registrationPayload(org: { registration?: { payload: unknown } | null }): RegistrationPayload {
  return (org.registration?.payload ?? {}) as RegistrationPayload;
}

export const organizationRegistrationService = new OrganizationRegistrationService();
