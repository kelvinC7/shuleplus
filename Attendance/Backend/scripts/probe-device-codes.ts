/**
 * Compare what Prisma sees vs manual psql (same DATABASE_URL as attendance-api).
 * Usage: cd Attendance/Backend && npx tsx scripts/probe-device-codes.ts [prefix]
 */
import { env, logAttendanceDatabaseTarget } from "../src/config/env";
import { prisma } from "../src/config/database";

const prefix = (process.argv[2] ?? "23001").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

async function main() {
  logAttendanceDatabaseTarget();
  console.log(`DATABASE_URL host (env): ${env.DATABASE_URL.replace(/:[^:@/]+@/, ":***@")}`);

  const rows = await prisma.rfidDevice.findMany({
    where: { deviceCode: { startsWith: `${prefix}_` } },
    select: { deviceCode: true, organizationId: true, deletedAt: true, name: true },
    orderBy: { deviceCode: "asc" },
  });

  console.log(`Rows matching ${prefix}_*: ${rows.length}`);
  for (const r of rows) {
    console.log(
      `  ${r.deviceCode} org=${r.organizationId} deleted=${r.deletedAt ? "yes" : "no"} name=${r.name}`
    );
  }

  for (const code of [`${prefix}_012`, `${prefix}_031`]) {
    const one = await prisma.rfidDevice.findFirst({ where: { deviceCode: code } });
    console.log(`${code}: ${one ? `exists (deleted=${one.deletedAt ? "yes" : "no"})` : "missing"}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
