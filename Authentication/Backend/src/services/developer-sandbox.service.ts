import {
  DeveloperEnvironment,
  DeveloperProductionAccessStatus,
  OrganizationStatus,
  OrganizationType,
} from '../generated/prisma';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import {
  resolveDeveloperGatewayBaseUrl,
  resolvePublicApiBaseUrl,
} from '../config/developer-public-url';
import { AppError } from '../middleware/error.middleware';
import { moduleManagementService } from './module-management.service';
import {
  DEFAULT_PARTNER_MODULE_SLUGS,
  DEVELOPER_SANDBOX_SCHOOL,
  resolveSandboxOrganizationId,
  SANDBOX_SAMPLE_ACADEMIC_YEAR,
  SANDBOX_SAMPLE_TERM,
  SANDBOX_TEST_SCENARIOS,
} from '../config/developer-sandbox-config';
import {
  filterModulesByPermissions,
  findRoute,
  type DeveloperModuleDef,
} from '../config/developer-module-registry';

function parseAllowedModules(raw: unknown): Record<string, Record<string, boolean>> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, Record<string, boolean>>;
  }
  return {};
}

function collectGrantedPermissions(allowed: Record<string, Record<string, boolean>>): Set<string> {
  const granted = new Set<string>();
  for (const mod of Object.values(allowed)) {
    for (const [key, enabled] of Object.entries(mod)) {
      if (enabled) granted.add(key);
    }
  }
  return granted;
}

function permissionsForModule(
  allowed: Record<string, Record<string, boolean>>,
  permissionModule: string
): string[] {
  const mod = allowed[permissionModule] ?? {};
  return Object.entries(mod)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function pingModuleHealth(baseUrl: string): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const url = `${baseUrl.replace(/\/$/, '')}/health`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
    }
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unreachable',
    };
  }
}

function pathHasParams(path: string): boolean {
  return /\{[^}]+\}/.test(path);
}

export type SandboxScenarioItem = {
  id: string;
  label: string;
  description: string;
  moduleSlug: string;
  method: string;
  path: string;
  permission: string;
  authMode: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  hasPathParams?: boolean;
};

function applyCuratedSamples(
  path: string,
  method: string,
  moduleSlug: string,
  organizationId: string,
  studentCode: string
): { query?: Record<string, string>; body?: Record<string, unknown> } {
  const curated = SANDBOX_TEST_SCENARIOS.find(
    (s) => s.moduleSlug === moduleSlug && s.method === method && s.path === path
  );

  if (curated) {
    const query: Record<string, string> = {
      ...('query' in curated && curated.query ? curated.query : {}),
      ...('queryKeys' in curated && curated.queryKeys?.includes('organizationId')
        ? { organizationId }
        : {}),
    };
    if (studentCode) {
      if ('code' in query) query.code = studentCode;
      if ('studentCode' in query) query.studentCode = studentCode;
    }
    let body = 'body' in curated ? (curated as { body?: Record<string, unknown> }).body : undefined;
    if (body && studentCode && 'studentCode' in body) {
      body = { ...body, studentCode };
    }
    return {
      query: Object.keys(query).length ? query : undefined,
      body,
    };
  }

  const query: Record<string, string> = {};

  if (
    path === '/public/student-fees' ||
    path === '/fees/student-fees'
  ) {
    query.studentCode = studentCode;
    query.academicYear = SANDBOX_SAMPLE_ACADEMIC_YEAR;
    query.term = SANDBOX_SAMPLE_TERM;
    query.organizationId = organizationId;
  } else if (path === '/public/students/lookup' || path === '/students/lookup') {
    query.code = studentCode;
  } else if (path === '/students' && method === 'GET') {
    query.academicYear = SANDBOX_SAMPLE_ACADEMIC_YEAR;
    query.organizationId = organizationId;
  } else if (
    path.startsWith('/public/circulars') ||
    path.startsWith('/circulars') ||
    path === '/dashboard' ||
    path === '/outstanding' ||
    path === '/babyeyi' ||
    path.startsWith('/public/loans/types') ||
    path === '/fees/loans/types' ||
    path === '/school-registrations' ||
    path.startsWith('/admissions/')
  ) {
    if (!pathHasParams(path)) {
      query.organizationId = organizationId;
    }
  }

  return { query: Object.keys(query).length ? query : undefined };
}

/** Every registered gateway route the developer is permitted to call. */
function buildAllPermittedScenarios(
  permittedModules: DeveloperModuleDef[],
  organizationId: string,
  studentCode: string
): SandboxScenarioItem[] {
  const scenarios: SandboxScenarioItem[] = [];

  for (const mod of permittedModules) {
    for (const route of mod.routes) {
      const samples = applyCuratedSamples(
        route.upstreamPath,
        route.method,
        mod.slug,
        organizationId,
        studentCode
      );

      scenarios.push({
        id: route.id,
        label: route.summary,
        description: route.description,
        moduleSlug: mod.slug,
        method: route.method,
        path: route.upstreamPath,
        permission: route.permission,
        authMode: route.authMode,
        query: samples.query,
        body: samples.body ?? route.requestBody,
        hasPathParams: pathHasParams(route.upstreamPath),
      });
    }
  }

  return scenarios;
}

export class DeveloperSandboxService {
  /** ST THEO SCHOOL — shared live test data for every developer sandbox / Postman export. */
  getSharedSandboxOrganizationId(): string {
    return resolveSandboxOrganizationId();
  }

  /**
   * Ensures partner sandbox points at ST THEO SCHOOL and modules are assigned there.
   */
  async provisionPartnerSandbox(
    partnerId: string,
    actorId: string,
    options?: { organizationId?: string }
  ) {
    const partner = await prisma.developerPartner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new AppError(404, 'Partner not found');

    const organizationId = options?.organizationId ?? resolveSandboxOrganizationId();
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      throw new AppError(
        503,
        `Sandbox school not found in IAM (${organizationId}). Choose a school that exists on this server from Super Admin → Organizations.`
      );
    }

    if (org.status !== OrganizationStatus.ACTIVE) {
      throw new AppError(400, 'Sandbox school organization must be active');
    }

    const moduleSlugs =
      (partner.assignedModuleSlugs as string[])?.length > 0
        ? (partner.assignedModuleSlugs as string[])
        : DEFAULT_PARTNER_MODULE_SLUGS;

    const platformModules = await prisma.platformModule.findMany({
      where: { slug: { in: moduleSlugs }, isEnabled: true },
    });

    let provisioning = null;
    if (platformModules.length > 0) {
      provisioning = await moduleManagementService.assignModulesToOrganization(
        org.id,
        actorId,
        platformModules.map((m) => m.id),
        { subscriptionPlan: 'Developer Sandbox' }
      );
    }

    const testData = {
      organizationId: org.id,
      organizationSlug: org.slug,
      organizationName: org.name,
      sharedTestSchool: organizationId === resolveSandboxOrganizationId(),
      schoolCode: org.organizationCode ?? DEVELOPER_SANDBOX_SCHOOL.organizationCode,
    };

    await prisma.developerPartner.update({
      where: { id: partnerId },
      data: {
        sandboxOrganizationId: org.id,
        sandboxTestData: testData,
      },
    });

    await this.syncSandboxApplicationOrganizations(partnerId, org.id);

    return {
      organization: org,
      modules: platformModules.map((m) => ({ slug: m.slug, name: m.name })),
      provisioning,
      testData,
    };
  }

  /** Point partner sandbox at a real IAM school organization (live module database). */
  async linkSandboxToOrganization(partnerId: string, organizationId: string, actorId: string) {
    const partner = await prisma.developerPartner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new AppError(404, 'Partner not found');

    const org = await this.resolveLinkableOrganization(organizationId, partnerId);

    const moduleSlugs =
      (partner.assignedModuleSlugs as string[])?.length > 0
        ? (partner.assignedModuleSlugs as string[])
        : DEFAULT_PARTNER_MODULE_SLUGS;

    const platformModules = await prisma.platformModule.findMany({
      where: { slug: { in: moduleSlugs }, isEnabled: true },
    });

    let provisioning = null;
    if (platformModules.length > 0) {
      provisioning = await moduleManagementService.assignModulesToOrganization(
        org.id,
        actorId,
        platformModules.map((m) => m.id),
        { subscriptionPlan: 'Developer Sandbox' }
      );
    }

    await prisma.developerPartner.update({
      where: { id: partnerId },
      data: {
        sandboxOrganizationId: org.id,
        sandboxTestData: {
          organizationId: org.id,
          organizationSlug: org.slug,
          organizationName: org.name,
          linkedExistingOrganization: true,
          linkedAt: new Date().toISOString(),
        },
      },
    });

    await this.syncSandboxApplicationOrganizations(partnerId, org.id);

    return {
      organization: org,
      provisioning,
      message: `Sandbox now uses live module data for ${org.name}`,
    };
  }

  private async resolveLinkableOrganization(organizationId: string, partnerId: string) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new AppError(404, 'Organization not found');
    if (org.status !== OrganizationStatus.ACTIVE) {
      throw new AppError(400, 'Organization must be active');
    }

    return org;
  }

  private async syncSandboxApplicationOrganizations(partnerId: string, organizationId: string) {
    await prisma.developerApplication.updateMany({
      where: { partnerId, environment: DeveloperEnvironment.SANDBOX },
      data: { organizationId },
    });
  }

  /** Sync sandbox OAuth apps to the partner's linked school — never overwrite the linked org. */
  async ensureSandboxReadyForExport(partnerId: string) {
    const partner = await prisma.developerPartner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new AppError(404, 'Partner not found');

    const organizationId = partner.sandboxOrganizationId;
    if (!organizationId) {
      throw new AppError(
        400,
        'This partner has no sandbox school linked. Use Link school on the partner card in Super Admin.'
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true, organizationCode: true },
    });
    if (!org) {
      throw new AppError(503, `Linked sandbox school not found in IAM (${organizationId}).`);
    }

    await this.syncSandboxApplicationOrganizations(partnerId, organizationId);
    return org;
  }

  private createSandboxServiceJwt(organizationId: string): string {
    return jwt.sign(
      {
        sub: 'developer-sandbox',
        email: 'sandbox@shuleplus.rw',
        organizationId,
        sessionId: crypto.randomUUID(),
        roles: ['organization_admin'],
        modules: [
          'student-management',
          'school-fees',
          'fees',
          'finance',
          'babyeyi',
          'circulars',
          'academic',
          'webpage-babyeyi',
          'payroll',
          'kaziavance',
          'teacher-portal',
        ],
        portal: 'developer_gateway',
        environment: DeveloperEnvironment.SANDBOX,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '5m' }
    );
  }

  /** Same upstream call as Student Management UI: GET /api/students */
  private async fetchLiveSandboxStudents(organizationId: string) {
    try {
      const base = env.STUDENT_MANAGEMENT_API_URL.replace(/\/$/, '');
      const token = this.createSandboxServiceJwt(organizationId);
      const url = new URL(`${base}/students`);
      url.searchParams.set('organizationId', organizationId);

      const res = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'x-service-key': env.PLATFORM_SERVICE_KEY,
          'x-organization-id': organizationId,
        },
      });

      if (!res.ok) return [];

      const json = (await res.json()) as {
        data?: Array<{
          id: string;
          studentCode?: string;
          studentUid?: string;
          firstName?: string;
          lastName?: string;
          status?: string;
          enrollments?: Array<{ class?: { name?: string } }>;
        }>;
      };

      const rows = Array.isArray(json.data) ? json.data : [];
      return rows.slice(0, 50).map((s) => ({
        id: s.id,
        code: s.studentCode ?? s.studentUid ?? '—',
        name: [s.firstName, s.lastName].filter(Boolean).join(' ') || '—',
        className: s.enrollments?.[0]?.class?.name ?? '—',
        status: s.status ?? 'ACTIVE',
      }));
    } catch {
      return [];
    }
  }

  async getSandboxOverview(partnerId: string, userId: string) {
    const partner = await prisma.developerPartner.findUnique({
      where: { id: partnerId },
      include: {
        productionOrganization: {
          select: { id: true, name: true, slug: true, status: true },
        },
        applications: {
          where: { environment: DeveloperEnvironment.SANDBOX },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!partner) throw new AppError(404, 'Partner not found');

    const developerUser = await prisma.developerUser.findUnique({
      where: { id: userId },
      select: { allowedModules: true },
    });
    if (!developerUser) throw new AppError(404, 'Developer not found');

    const allowedModules = parseAllowedModules(developerUser.allowedModules);
    const grantedPermissions = collectGrantedPermissions(allowedModules);
    const permittedGatewayModules = filterModulesByPermissions(allowedModules);
    const permittedSlugs = new Set(permittedGatewayModules.map((m) => m.slug));

    const organizationId = partner.sandboxOrganizationId;
    if (!organizationId) {
      throw new AppError(
        400,
        'No sandbox school linked for this partner. Link a school in Super Admin → Developer Access.'
      );
    }

    const sandboxOrganization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        organizationCode: true,
        status: true,
      },
    });

    if (!sandboxOrganization) {
      throw new AppError(
        503,
        `Linked sandbox school not found in IAM (${organizationId}). Re-link a valid school.`
      );
    }

    try {
      await this.syncSandboxApplicationOrganizations(partnerId, organizationId);
    } catch (err) {
      console.warn('[DeveloperSandbox] Sandbox app sync failed:', err);
    }

    const liveSample = permittedSlugs.has('student-management')
      ? await this.fetchLiveSandboxStudents(organizationId).catch(() => [])
      : [];
    const studentCode =
      liveSample.find((s) => s.code && s.code !== '—')?.code ?? '04001042426';

    const sharedTestSchool = organizationId === resolveSandboxOrganizationId();

    const scenarios = buildAllPermittedScenarios(
      permittedGatewayModules,
      organizationId,
      studentCode
    );

    const moduleGroups = await Promise.all(
      permittedGatewayModules.map(async (mod) => {
        const upstreamBase = mod.resolveUpstreamBase();
        const health = await pingModuleHealth(upstreamBase);
        return {
          slug: mod.slug,
          name: mod.name,
          description: mod.description,
          endpointCount: mod.routes.length,
          grantedPermissions: permissionsForModule(allowedModules, mod.permissionModule),
          scenarios: scenarios.filter((s) => s.moduleSlug === mod.slug),
          upstreamBase,
          health,
        };
      })
    );

    const sandboxApp = partner.applications[0];

    return {
      partner: {
        id: partner.id,
        name: partner.name,
        productionAccessStatus: partner.productionAccessStatus,
      },
      sandbox: {
        organization: sandboxOrganization,
        organizationId,
        sharedTestSchool,
        schoolLabel: sharedTestSchool ? DEVELOPER_SANDBOX_SCHOOL.name : sandboxOrganization?.name,
        grantedPermissions: [...grantedPermissions],
        modules: permittedGatewayModules.map((m) => ({
          slug: m.slug,
          name: m.name,
          endpointCount: m.routes.length,
          grantedPermissions: permissionsForModule(allowedModules, m.permissionModule),
        })),
        moduleGroups,
        applications: partner.applications.map((app) => ({
          id: app.id,
          name: app.name,
          clientId: app.clientId,
          environment: app.environment,
          status: app.status,
        })),
        sampleStudentCode: studentCode ?? null,
        apiBaseUrl: resolvePublicApiBaseUrl(),
        gatewayBaseUrl: resolveDeveloperGatewayBaseUrl(),
        postman: {
          clientId: sandboxApp?.clientId ?? null,
          organizationId,
          gatewayBaseUrl: resolveDeveloperGatewayBaseUrl(),
        },
        scenarios,
        baseUrl: resolveDeveloperGatewayBaseUrl(),
      },
      production: {
        organization: partner.productionOrganization,
        organizationId: partner.productionOrganizationId,
        accessStatus: partner.productionAccessStatus,
      },
    };
  }

  resolveOrganizationId(
    partner: {
      sandboxOrganizationId: string | null;
      productionOrganizationId: string | null;
    },
    environment: DeveloperEnvironment
  ): string {
    if (environment === DeveloperEnvironment.PRODUCTION) {
      if (!partner.productionOrganizationId) {
        throw new AppError(
          403,
          'Production access not approved. Request production access from your portal.'
        );
      }
      return partner.productionOrganizationId;
    }
    if (!partner.sandboxOrganizationId) {
      throw new AppError(
        403,
        'No sandbox school linked for this partner. Contact your administrator to link a school.'
      );
    }
    return partner.sandboxOrganizationId;
  }

  async requestProductionAccess(input: {
    partnerId: string;
    userId: string;
    requestedModules: string[];
    businessJustification?: string;
  }) {
    const partner = await prisma.developerPartner.findUnique({ where: { id: input.partnerId } });
    if (!partner) throw new AppError(404, 'Partner not found');

    if (partner.productionAccessStatus === DeveloperProductionAccessStatus.APPROVED) {
      throw new AppError(409, 'Production access already approved');
    }

    const existing = await prisma.developerProductionAccessRequest.findFirst({
      where: {
        partnerId: input.partnerId,
        status: DeveloperProductionAccessStatus.PENDING,
      },
    });
    if (existing) {
      throw new AppError(409, 'A production access request is already pending review');
    }

    const request = await prisma.developerProductionAccessRequest.create({
      data: {
        partnerId: input.partnerId,
        requestedByUserId: input.userId,
        requestedModules: input.requestedModules,
        businessJustification: input.businessJustification,
        status: DeveloperProductionAccessStatus.PENDING,
      },
    });

    await prisma.developerPartner.update({
      where: { id: input.partnerId },
      data: { productionAccessStatus: DeveloperProductionAccessStatus.PENDING },
    });

    return request;
  }

  async listProductionRequests(status?: DeveloperProductionAccessStatus) {
    return prisma.developerProductionAccessRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        partner: { select: { id: true, name: true, slug: true, sandboxOrganizationId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveProductionAccess(requestId: string, actorId: string, notes?: string) {
    const request = await prisma.developerProductionAccessRequest.findUnique({
      where: { id: requestId },
      include: { partner: true },
    });
    if (!request) throw new AppError(404, 'Request not found');
    if (request.status !== DeveloperProductionAccessStatus.PENDING) {
      throw new AppError(400, 'Request is not pending');
    }

    const partner = request.partner;
    let productionOrgId = partner.productionOrganizationId;

    if (!productionOrgId) {
      const base = slugify(`${partner.name}-api-production`) || 'dev-production';
      let slug = base;
      let counter = 1;
      while (await prisma.organization.findUnique({ where: { slug } })) {
        slug = `${base}-${counter++}`;
      }

      const org = await prisma.organization.create({
        data: {
          name: `${partner.name} — API Production`,
          slug,
          type: OrganizationType.BUSINESS,
          status: OrganizationStatus.ACTIVE,
          description: `Production API tenant for developer partner: ${partner.name}`,
          subscriptionTier: 'Developer Production',
        },
      });
      productionOrgId = org.id;

      const moduleSlugs = (request.requestedModules as string[])?.length
        ? (request.requestedModules as string[])
        : ((partner.assignedModuleSlugs as string[]) ?? DEFAULT_PARTNER_MODULE_SLUGS);

      const modules = await prisma.platformModule.findMany({
        where: { slug: { in: moduleSlugs }, isEnabled: true },
      });
      if (modules.length > 0) {
        await moduleManagementService.assignModulesToOrganization(
          org.id,
          actorId,
          modules.map((m) => m.id),
          { subscriptionPlan: 'Developer Production' }
        );
      }

      await prisma.developerPartner.update({
        where: { id: partner.id },
        data: { productionOrganizationId: org.id },
      });
    }

    await prisma.$transaction([
      prisma.developerProductionAccessRequest.update({
        where: { id: requestId },
        data: {
          status: DeveloperProductionAccessStatus.APPROVED,
          reviewedByUserId: actorId,
          reviewNotes: notes,
          reviewedAt: new Date(),
        },
      }),
      prisma.developerPartner.update({
        where: { id: partner.id },
        data: { productionAccessStatus: DeveloperProductionAccessStatus.APPROVED },
      }),
    ]);

    return { requestId, productionOrganizationId: productionOrgId, status: 'APPROVED' };
  }

  async rejectProductionAccess(requestId: string, actorId: string, notes?: string) {
    const request = await prisma.developerProductionAccessRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new AppError(404, 'Request not found');

    await prisma.$transaction([
      prisma.developerProductionAccessRequest.update({
        where: { id: requestId },
        data: {
          status: DeveloperProductionAccessStatus.REJECTED,
          reviewedByUserId: actorId,
          reviewNotes: notes,
          reviewedAt: new Date(),
        },
      }),
      prisma.developerPartner.update({
        where: { id: request.partnerId },
        data: { productionAccessStatus: DeveloperProductionAccessStatus.REJECTED },
      }),
    ]);

    return { requestId, status: 'REJECTED' };
  }
}

export const developerSandboxService = new DeveloperSandboxService();
