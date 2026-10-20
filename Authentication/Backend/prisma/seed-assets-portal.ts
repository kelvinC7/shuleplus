import { PrismaClient, ModuleAssignmentStatus } from "../src/generated/prisma";

const prisma = new PrismaClient();

const MODULE_SLUG = "assets-portal";
const DEMO_ORG_SLUG = "demo-school";

async function main() {
  console.log("[Seed:AssetsPortal] Starting assets-portal module seed...");

  const mod = await prisma.platformModule.upsert({
    where: { slug: MODULE_SLUG },
    update: {
      name: "Assets Portal",
      shortName: "Assets",
      category: "Operations",
      version: "1.0.0",
      description: "KPS-style asset register, depreciation, operations & reports",
      frontendUrl: "http://localhost:3021",
      backendUrl: "http://localhost:3020/api",
      healthCheckUrl: "/health",
      isPremium: false,
    },
    create: {
      slug: MODULE_SLUG,
      name: "Assets Portal",
      shortName: "Assets",
      category: "Operations",
      version: "1.0.0",
      description: "KPS-style asset register, depreciation, operations & reports",
      frontendUrl: "http://localhost:3021",
      backendUrl: "http://localhost:3020/api",
      healthCheckUrl: "/health",
      isPremium: false,
    },
  });
  console.log(`[Seed:AssetsPortal] Module ready: ${mod.slug}`);

  const org = await prisma.organization.findUnique({ where: { slug: DEMO_ORG_SLUG } });
  if (!org) {
    console.warn(
      `[Seed:AssetsPortal] Demo org "${DEMO_ORG_SLUG}" not found — assign via Super Admin or create demo org first`
    );
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
  console.log(`[Seed:AssetsPortal] Module assigned to ${org.name}`);

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
    console.log(`[Seed:AssetsPortal] Module linked to user: ${user.email}`);
  }

  const backendUrl = (mod.backendUrl ?? "http://localhost:3020/api").replace(/\/$/, "");
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
    if (res.ok) {
      console.log("[Seed:AssetsPortal] Tenant provisioned in Assets Portal service");
    } else {
      const text = await res.text();
      console.warn(`[Seed:AssetsPortal] Tenant provisioning returned ${res.status}: ${text}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[Seed:AssetsPortal] Could not provision tenant (is Assets backend running?): ${message}`
    );
  }

  console.log("\n[Seed:AssetsPortal] Done!");
  console.log(" Open Assets Portal at: http://localhost:3021/dashboard");
}

main()
  .catch((e) => {
    console.error("[Seed:AssetsPortal] Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
