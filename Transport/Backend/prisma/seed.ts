import { PrismaClient } from "@prisma/client";
import { seedTenantData } from "../src/services/seed.service";

const prisma = new PrismaClient();
const ORG_ID = process.env.SEED_ORG_ID ?? "org-demo-school";

async function main() {
  console.log("Ensuring transport tenant settings (no demo fleet)…");
  await prisma.tenant.upsert({
    where: { organizationId: ORG_ID },
    update: { organizationName: "Organization", organizationCode: "ORG" },
    create: {
      organizationId: ORG_ID,
      organizationCode: "ORG",
      organizationName: "Organization",
    },
  });
  await seedTenantData(ORG_ID);
  console.log("Done. Add buses, routes, and learners via the Transport UI.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
