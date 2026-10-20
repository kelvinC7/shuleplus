import { PrismaClient, ModuleAssignmentStatus } from "../src/generated/prisma";

const prisma = new PrismaClient();

const MODULE_SLUG = "school-budget";
const DEMO_ORG_SLUG = "demo-school";

async function main() {
  console.log("[Seed:SchoolBudget] Starting school-budget module seed...");

  const mod = await prisma.platformModule.upsert({
    where: { slug: MODULE_SLUG },
    update: {
      name: "School Budget",
      shortName: "Budget",
      category: "Finance",
      version: "1.0.0",
      description: "School budget planning, expense allocation, usage tracking and approvals",
      frontendUrl: "http://localhost:3023",
      backendUrl: "http://localhost:3022/api",
      healthCheckUrl: "/health",
      isPremium: false,
    },
    create: {
      slug: MODULE_SLUG,
      name: "School Budget",
      shortName: "Budget",
      category: "Finance",
      version: "1.0.0",
      description: "School budget planning, expense allocation, usage tracking and approvals",
      frontendUrl: "http://localhost:3023",
      backendUrl: "http://localhost:3022/api",
      healthCheckUrl: "/health",
      isPremium: false,
    },
  });
  console.log(`[Seed:SchoolBudget] Module ready: ${mod.slug}`);

  const org = await prisma.organization.findUnique({ where: { slug: DEMO_ORG_SLUG } });
  if (!org) {
    console.warn(`[Seed:SchoolBudget] Demo org "${DEMO_ORG_SLUG}" not found — assign via Super Admin`);
    return;
  }

  await prisma.organizationModule.upsert({
    where: { organizationId_moduleId: { organizationId: org.id, moduleId: mod.id } },
    update: {
      status: ModuleAssignmentStatus.ACTIVE,
      tenantProvisioned: true,
      tenantProvisionedAt: new Date(),
    },
    create: {
      organizationId: org.id,
      moduleId: mod.id,
      status: ModuleAssignmentStatus.ACTIVE,
      tenantProvisioned: true,
      tenantProvisionedAt: new Date(),
    },
  });

  const orgUsers = await prisma.user.findMany({
    where: { organizationId: org.id, status: "ACTIVE" },
    select: { id: true, email: true },
  });

  for (const user of orgUsers) {
    await prisma.userModule.upsert({
      where: { userId_moduleId: { userId: user.id, moduleId: mod.id } },
      update: {},
      create: {
        userId: user.id,
        organizationId: org.id,
        moduleId: mod.id,
      },
    });
    console.log(`[Seed:SchoolBudget] Linked user: ${user.email}`);
  }

  const backendUrl = (mod.backendUrl ?? "http://localhost:3022/api").replace(/\/$/, "");
  const tenantUrl = backendUrl.endsWith("/api")
    ? `${backendUrl}/tenant/create`
    : `${backendUrl}/api/tenant/create`;

  try {
    const res = await fetch(tenantUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-key": process.env.MODULE_PROVISIONING_KEY ?? "dev-service-key",
      },
      body: JSON.stringify({
        organizationId: org.id,
        organizationName: org.name,
        organizationCode: org.organizationCode ?? undefined,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) console.log("[Seed:SchoolBudget] Tenant provisioned");
    else console.warn(`[Seed:SchoolBudget] Tenant provision ${res.status}: ${await res.text()}`);
  } catch (err: unknown) {
    console.warn(
      `[Seed:SchoolBudget] Could not provision tenant (is Budget backend running?): ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  console.log("\n[Seed:SchoolBudget] Done!");
  console.log(" Open School Budget at: http://localhost:3023/dashboard");
}

main()
  .catch((e) => {
    console.error("[Seed:SchoolBudget] Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
