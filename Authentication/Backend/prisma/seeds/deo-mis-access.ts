import { PrismaClient, ModuleAssignmentStatus } from '../../src/generated/prisma';

/** Grants a dev org access to DEO MIS and provisions the module tenant. */
export async function seedDeoMisAccess(prisma: PrismaClient) {
  const MODULE_SLUG = 'deo-mis';

  const mod = await prisma.platformModule.upsert({
    where: { slug: MODULE_SLUG },
    update: {
      frontendUrl: 'http://localhost:3073',
      backendUrl: 'http://localhost:3072',
      healthCheckUrl: '/api/health',
      isEnabled: true,
    },
    create: {
      slug: MODULE_SLUG,
      name: 'DEO MIS',
      shortName: 'DEO',
      category: 'Governance',
      version: '1.0.0',
      description: 'DEO Attendance Intelligence — district monitoring and follow-up',
      frontendUrl: 'http://localhost:3073',
      backendUrl: 'http://localhost:3072',
      healthCheckUrl: '/api/health',
      isPremium: false,
    },
  });

  const orgId = process.env.DEO_MIS_ORG_ID;
  let org;
  if (orgId) {
    org = await prisma.organization.findUnique({ where: { id: orgId } });
  } else {
    org = await prisma.organization.findFirst({
      where: { slug: { not: 'babyeyi-platform' }, status: 'ACTIVE' },
    });
  }

  if (!org) {
    console.warn('[Seed] No target organization — skipping deo-mis access seed');
    return;
  }

  console.log(`[Seed] Granting deo-mis access to org: ${org.name} (${org.id})`);

  const now = new Date();
  let tenantProvisioned = false;

  const backendUrl = (mod.backendUrl ?? 'http://localhost:3072').replace(/\/$/, '');
  const tenantUrl = backendUrl.endsWith('/api') ? `${backendUrl}/tenant/create` : `${backendUrl}/api/tenant/create`;

  try {
    const res = await fetch(tenantUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': process.env.MODULE_PROVISIONING_KEY ?? 'dev-service-key',
        'x-source-service': 'IAM',
      },
      body: JSON.stringify({
        organizationId: org.id,
        organizationName: org.name,
        organizationCode: org.organizationCode ?? undefined,
        schoolProfile: { district: org.name },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      tenantProvisioned = true;
      console.log('[Seed] deo-mis tenant provisioned');
    } else {
      const body = await res.text().catch(() => '');
      console.warn(`[Seed] deo-mis tenant provisioning returned ${res.status}: ${body}`);
    }
  } catch (err) {
    console.warn('[Seed] deo-mis tenant provisioning failed (backend may be offline):', err);
  }

  await prisma.organizationModule.upsert({
    where: { organizationId_moduleId: { organizationId: org.id, moduleId: mod.id } },
    update: {
      status: ModuleAssignmentStatus.ACTIVE,
      moduleVersion: mod.version,
      activatedAt: now,
      tenantProvisioned,
      tenantProvisionedAt: tenantProvisioned ? now : null,
      provisionLastError: tenantProvisioned ? null : 'Tenant not provisioned during seed — use Super Admin Provision',
    },
    create: {
      organizationId: org.id,
      moduleId: mod.id,
      status: ModuleAssignmentStatus.ACTIVE,
      subscriptionPlan: org.subscriptionTier ?? 'Standard',
      moduleVersion: mod.version,
      activatedAt: now,
      tenantProvisioned,
      tenantProvisionedAt: tenantProvisioned ? now : null,
      provisionLastError: tenantProvisioned ? null : 'Tenant not provisioned during seed — use Super Admin Provision',
    },
  });

  await syncOrgModulesJson(prisma, org.id);
  console.log(`[Seed] deo-mis module access granted for org "${org.name}"`);
}

async function syncOrgModulesJson(prisma: PrismaClient, organizationId: string) {
  const active = await prisma.organizationModule.findMany({
    where: { organizationId, status: ModuleAssignmentStatus.ACTIVE, tenantProvisioned: true },
    include: { module: { select: { slug: true } } },
  });

  const slugs = active.map((a) => a.module.slug);

  await prisma.organization.update({
    where: { id: organizationId },
    data: { modules: slugs },
  });
}
