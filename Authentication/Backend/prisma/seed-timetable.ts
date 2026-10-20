import { PrismaClient, ModuleAssignmentStatus } from '../src/generated/prisma';

const prisma = new PrismaClient();

const TIMETABLE_MODULE_SLUG = 'timetable';
const DEMO_ORG_SLUG = 'demo-school';

async function main() {
  console.log('[Seed:Timetable] Starting timetable module seed...');

  const timetableModule = await prisma.platformModule.findUnique({
    where: { slug: TIMETABLE_MODULE_SLUG },
  });
  if (!timetableModule) {
    throw new Error('Timetable module not found — run npm run prisma:seed first');
  }
  console.log(`[Seed:Timetable] Module ready: ${timetableModule.slug}`);

  const org = await prisma.organization.findUnique({ where: { slug: DEMO_ORG_SLUG } });
  if (!org) {
    console.warn(
      `[Seed:Timetable] Demo org "${DEMO_ORG_SLUG}" not found — run npm run seed:inventory first, or assign via Super Admin`
    );
    return;
  }

  const orgModule = await prisma.organizationModule.upsert({
    where: { organizationId_moduleId: { organizationId: org.id, moduleId: timetableModule.id } },
    update: {
      status: ModuleAssignmentStatus.ACTIVE,
      tenantProvisioned: true,
      tenantProvisionedAt: new Date(),
    },
    create: {
      organizationId: org.id,
      moduleId: timetableModule.id,
      status: ModuleAssignmentStatus.ACTIVE,
      tenantProvisioned: true,
      tenantProvisionedAt: new Date(),
    },
  });
  console.log(`[Seed:Timetable] Module assigned to ${org.name}: ${orgModule.status}`);

  const orgUsers = await prisma.user.findMany({
    where: { organizationId: org.id, status: 'ACTIVE' },
    select: { id: true, email: true },
  });

  for (const user of orgUsers) {
    await prisma.userModule.upsert({
      where: { userId_moduleId: { userId: user.id, moduleId: timetableModule.id } },
      update: {},
      create: {
        userId: user.id,
        organizationId: org.id,
        moduleId: timetableModule.id,
      },
    });
    console.log(`[Seed:Timetable] Module linked to user: ${user.email}`);
  }

  const backendUrl = timetableModule.backendUrl ?? 'http://localhost:3010';
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
      console.log('[Seed:Timetable] Tenant provisioned in Timetable service');
    } else if (res.status === 409) {
      console.log('[Seed:Timetable] Tenant already exists in Timetable service');
    } else {
      const text = await res.text();
      console.warn(`[Seed:Timetable] Tenant provisioning returned ${res.status}: ${text}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Seed:Timetable] Could not provision tenant (is Timetable backend running?): ${message}`);
  }

  console.log('\n[Seed:Timetable] Done!');
  console.log(' Open Timetable at: http://localhost:3011/dashboard');
  console.log(' (Login as demo org admin via IAM, then open from Organization Admin)');
}

main()
  .catch((e) => {
    console.error('[Seed:Timetable] Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
