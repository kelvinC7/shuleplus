import { PrismaClient, ModuleAssignmentStatus } from '../../src/generated/prisma';

/**
 * Grants an organization and its users access to the ActionPlanMIS module,
 * then provisions the tenant on the Action Plan backend.
 */
export async function seedActionPlanAccess(prisma: PrismaClient) {
  const MODULE_SLUG = 'action-plan';

  const mod = await prisma.platformModule.upsert({
    where: { slug: MODULE_SLUG },
    update: {
      frontendUrl: 'http://localhost:3035',
      backendUrl: 'http://localhost:3034',
      healthCheckUrl: '/api/health',
      isEnabled: true,
    },
    create: {
      slug: MODULE_SLUG,
      name: 'Action Plan Management',
      shortName: 'AP',
      category: 'Productivity',
      version: '1.0.0',
      description: 'Enterprise action plan tracking, approval workflows, KPIs, and reporting',
      frontendUrl: 'http://localhost:3035',
      backendUrl: 'http://localhost:3034',
      healthCheckUrl: '/api/health',
      isPremium: false,
    },
  });

  const orgId = process.env.ACTION_PLAN_ORG_ID;
  let org;
  if (orgId) {
    org = await prisma.organization.findUnique({ where: { id: orgId } });
  } else {
    org = await prisma.organization.findFirst({
      where: { slug: { not: 'babyeyi-platform' }, status: 'ACTIVE' },
    });
  }

  if (!org) {
    console.warn('[Seed] No target organization found — skipping action-plan access seed');
    return;
  }

  console.log(`[Seed] Granting action-plan access to org: ${org.name} (${org.id})`);

  const now = new Date();
  let tenantProvisioned = false;

  const backendUrl = (mod.backendUrl ?? 'http://localhost:3034').replace(/\/$/, '');
  const tenantUrl = backendUrl.endsWith('/api')
    ? `${backendUrl}/tenant/create`
    : `${backendUrl}/api/tenant/create`;

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
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      tenantProvisioned = true;
      console.log('[Seed] Action-plan tenant provisioned');
    } else {
      const body = await res.text().catch(() => '');
      console.warn(`[Seed] Action-plan tenant provisioning returned ${res.status}: ${body}`);
    }
  } catch (err) {
    console.warn('[Seed] Action-plan tenant provisioning failed (backend may be offline):', err);
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

  const adminUsers = await prisma.user.findMany({
    where: { organizationId: org.id, status: 'ACTIVE' },
    include: { userRoles: { include: { role: true } } },
  });

  for (const user of adminUsers) {
    const isAdmin = user.userRoles.some(
      (ur) => ur.role?.slug === 'organization_admin' || ur.role?.hierarchyLevel >= 800
    );
    if (isAdmin) continue;

    await prisma.userModule.upsert({
      where: { userId_moduleId: { userId: user.id, moduleId: mod.id } },
      update: {},
      create: {
        userId: user.id,
        organizationId: org.id,
        moduleId: mod.id,
      },
    });
  }

  console.log(`[Seed] Action-plan module access granted for org "${org.name}"`);
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
