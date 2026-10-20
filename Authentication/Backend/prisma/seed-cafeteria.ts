import { PrismaClient, ModuleAssignmentStatus } from '../src/generated/prisma';

const prisma = new PrismaClient();

const CAFETERIA_MODULE_SLUG = 'cafeteria';
const DEMO_ORG_SLUG = 'demo-school';

async function main() {
  console.log('[Seed:Cafeteria] Starting cafeteria module seed...');

  // 1. Upsert the cafeteria platform module
  const cafModule = await prisma.platformModule.upsert({
    where: { slug: CAFETERIA_MODULE_SLUG },
    update: {
      name: 'Cafeteria & Meal Management',
      shortName: 'Cafeteria',
      category: 'Operations',
      version: '1.0.0',
      description:
        'Cafeteria operations — menu planning, meal production, kitchen requests, staff scheduling, hygiene tracking, food waste, supplier deliveries',
      isPremium: false,
      isCore: false,
      frontendUrl: 'http://localhost:3005',
      backendUrl: 'http://localhost:3007',
      healthCheckUrl: '/api/health',
    },
    create: {
      slug: CAFETERIA_MODULE_SLUG,
      name: 'Cafeteria & Meal Management',
      shortName: 'Cafeteria',
      category: 'Operations',
      version: '1.0.0',
      description:
        'Cafeteria operations — menu planning, meal production, kitchen requests, staff scheduling, hygiene tracking, food waste, supplier deliveries',
      isPremium: false,
      isCore: false,
      frontendUrl: 'http://localhost:3005',
      backendUrl: 'http://localhost:3007',
      healthCheckUrl: '/api/health',
    },
  });
  console.log(`[Seed:Cafeteria] Module ready: ${cafModule.slug}`);

  // 2. Find the demo organization
  const org = await prisma.organization.findUnique({ where: { slug: DEMO_ORG_SLUG } });
  if (!org) {
    console.warn(
      `[Seed:Cafeteria] Demo org "${DEMO_ORG_SLUG}" not found — run npm run seed:inventory first, or assign via Super Admin`
    );
    return;
  }
  console.log(`[Seed:Cafeteria] Organization: ${org.name} (${org.id})`);

  // 3. Assign the cafeteria module to the organization
  const orgModule = await prisma.organizationModule.upsert({
    where: { organizationId_moduleId: { organizationId: org.id, moduleId: cafModule.id } },
    update: {
      status: ModuleAssignmentStatus.ACTIVE,
      tenantProvisioned: true,
      tenantProvisionedAt: new Date(),
    },
    create: {
      organizationId: org.id,
      moduleId: cafModule.id,
      status: ModuleAssignmentStatus.ACTIVE,
      tenantProvisioned: true,
      tenantProvisionedAt: new Date(),
    },
  });
  console.log(`[Seed:Cafeteria] Module assigned to ${org.name}: ${orgModule.status}`);

  // 4. Link all active org users to the cafeteria module
  const orgUsers = await prisma.user.findMany({
    where: { organizationId: org.id, status: 'ACTIVE' },
    select: { id: true, email: true },
  });

  for (const user of orgUsers) {
    await prisma.userModule.upsert({
      where: { userId_moduleId: { userId: user.id, moduleId: cafModule.id } },
      update: {},
      create: {
        userId: user.id,
        organizationId: org.id,
        moduleId: cafModule.id,
      },
    });
    console.log(`[Seed:Cafeteria] Module linked to user: ${user.email}`);
  }

  // 5. Provision tenant in Cafeteria backend
  const backendUrl = cafModule.backendUrl ?? 'http://localhost:3007';
  try {
    const res = await fetch(`${backendUrl}/api/tenant/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': process.env.MODULE_PROVISIONING_KEY ?? 'dev-service-key',
      },
      body: JSON.stringify({
        organizationId: org.id,
        organizationName: org.name,
        organizationCode: org.organizationCode ?? undefined,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      console.log('[Seed:Cafeteria] Tenant provisioned in Cafeteria service (with demo data)');
    } else if (res.status === 409) {
      console.log('[Seed:Cafeteria] Tenant already exists in Cafeteria service');
    } else {
      const text = await res.text();
      console.warn(`[Seed:Cafeteria] Tenant provisioning returned ${res.status}: ${text}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Seed:Cafeteria] Could not provision tenant (is Cafeteria backend running?): ${message}`);
  }

  console.log('\n[Seed:Cafeteria] Done!');
  console.log(' Open Cafeteria at: http://localhost:3005/dashboard');
  console.log(' (Login as demo org admin via IAM, then open from Organization Admin)');
}

main()
  .catch((e) => {
    console.error('[Seed:Cafeteria] Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
