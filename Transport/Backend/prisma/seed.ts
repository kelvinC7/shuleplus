import { PrismaClient } from "@prisma/client";
import { seedTenantData } from "../src/services/seed.service";

const prisma = new PrismaClient();
const ORG_ID = process.env.SEED_ORG_ID ?? "org-demo-school";

async function main() {
  console.log("Seeding Smart Transport demo data…");
  await prisma.tenant.upsert({
    where: { organizationId: ORG_ID },
    update: { organizationName: "Kigali Green Hills School", organizationCode: "KGS" },
    create: {
      organizationId: ORG_ID,
      organizationCode: "KGS",
      organizationName: "Kigali Green Hills School",
    },
  });
  await seedTenantData(ORG_ID);
  console.log("Seed complete. Demo card RFID-004821 (Jean Claude) on BUS-014-RFID");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
