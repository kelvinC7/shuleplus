import { PrismaClient, ModuleAssignmentStatus } from '../src/generated/prisma';

const prisma = new PrismaClient();

const MODULE_SLUG = 'school-fees';
const DEMO_ORG_SLUG = 'demo-school';

async function main() {
  console.log('[Seed:SchoolFees] Starting school fees module seed...');

  const feesModule = await prisma.platformModule.upsert({
    where: { slug: MODULE_SLUG },
    update: {
      name: 'School Fees Collection',
      shortName: 'School Fees',
      category: 'Finance',
      version: '1.0.0',
      description:
        'Student fee structures, billing, payments, installments, scholarships, receipts & AI financial insights',
      isPremium: false,
      isCore: false,
      frontendUrl: 'http://localhost:3015',
      backendUrl: 'http://localhost:3014',
      healthCheckUrl: '/api/health',
    },
    create: {
      slug: MODULE_SLUG,
      name: 'School Fees Collection',
      shortName: 'School Fees',
      category: 'Finance',
      version: '1.0.0',
      description:
        'Student fee structures, billing, payments, installments, scholarships, receipts & AI financial insights',
      isPremium: false,
      isCore: false,
      frontendUrl: 'http://localhost:3015',
      backendUrl: 'http://localhost:3014',
      healthCheckUrl: '/api/health',
    },
  });
  console.log(`[Seed:SchoolFees] Module ready: ${feesModule.slug}`);

  const org = await prisma.organization.findUnique({ where: { slug: DEMO_ORG_SLUG } });
  if (!org) {
    console.warn(
      `[Seed:SchoolFees] Demo org "${DEMO_ORG_SLUG}" not found — assign via Super Admin Module Catalog`
    );
    return;
  }

  await prisma.organizationModule.upsert({
    where: { organizationId_moduleId: { organizationId: org.id, moduleId: feesModule.id } },
    update: {
      status: ModuleAssignmentStatus.ACTIVE,
      tenantProvisioned: true,
      tenantProvisionedAt: new Date(),
    },
    create: {
      organizationId: org.id,
      moduleId: feesModule.id,
      status: ModuleAssignmentStatus.ACTIVE,
      tenantProvisioned: true,
      tenantProvisionedAt: new Date(),
    },
  });

  const orgUsers = await prisma.user.findMany({
    where: { organizationId: org.id, status: 'ACTIVE' },
    select: { id: true, email: true },
  });

  for (const user of orgUsers) {
    await prisma.userModule.upsert({
      where: { userId_moduleId: { userId: user.id, moduleId: feesModule.id } },
      update: {},
      create: {
        userId: user.id,
        organizationId: org.id,
        moduleId: feesModule.id,
      },
    });
    console.log(`[Seed:SchoolFees] Module linked to user: ${user.email}`);
  }

  const backendUrl = feesModule.backendUrl ?? 'http://localhost:3014';
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
      console.log('[Seed:SchoolFees] Tenant provisioned in School Fees service');
    } else {
      const text = await res.text();
      console.warn(`[Seed:SchoolFees] Tenant provisioning returned ${res.status}: ${text}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Seed:SchoolFees] Could not provision tenant (is backend running?): ${message}`);
  }

  console.log('\n[Seed:SchoolFees] Done!');
  console.log(' Open School Fees at: http://localhost:3015/dashboard');
}

main()
  .catch((e) => {
    console.error('[Seed:SchoolFees] Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
