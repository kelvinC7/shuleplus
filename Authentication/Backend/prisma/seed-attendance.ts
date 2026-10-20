import { PrismaClient, ModuleAssignmentStatus } from "../src/generated/prisma";

const prisma = new PrismaClient();

const MODULE_SLUG = "attendance";
const DEMO_ORG_SLUG = "demo-school";

async function main() {
  console.log("[Seed:Attendance] Starting Digital Attendance module seed...");

  const mod = await prisma.platformModule.upsert({
    where: { slug: MODULE_SLUG },
    update: {
      name: "Digital Attendance",
      shortName: "Digital",
      category: "Education",
      version: "1.0.0",
      description: "Entry and exit logs, devices, and live presence.",
      frontendUrl: "http://localhost:3025",
      backendUrl: "http://localhost:3024/api",
      healthCheckUrl: "/health",
      isPremium: false,
    },
    create: {
      slug: MODULE_SLUG,
      name: "Digital Attendance",
      shortName: "Digital",
      category: "Education",
      version: "1.0.0",
      description: "Entry and exit logs, devices, and live presence.",
      frontendUrl: "http://localhost:3025",
      backendUrl: "http://localhost:3024/api",
      healthCheckUrl: "/health",
      isPremium: false,
    },
  });
  console.log(`[Seed:Attendance] Module ready: ${mod.slug}`);

  const org = await prisma.organization.findUnique({ where: { slug: DEMO_ORG_SLUG } });
  if (!org) {
    console.warn(`[Seed:Attendance] Demo org "${DEMO_ORG_SLUG}" not found`);
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
    console.log(`[Seed:Attendance] Module linked to user: ${user.email}`);
  }

  const backendUrl = (mod.backendUrl ?? "http://localhost:3024/api").replace(/\/$/, "");
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
    if (res.ok) console.log("[Seed:Attendance] Tenant provisioned");
    else console.warn(`[Seed:Attendance] Tenant provisioning returned ${res.status}`);
  } catch (err: unknown) {
    console.warn(
      `[Seed:Attendance] Could not provision tenant (is Attendance backend running?): ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  console.log("\n[Seed:Attendance] Done! Open http://localhost:3025/dashboard");
}

main()
  .catch((e) => {
    console.error("[Seed:Attendance] Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
