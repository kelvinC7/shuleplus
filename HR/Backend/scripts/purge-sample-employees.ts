/**
 * Remove HR demo/sample employees seeded from SAMPLE_EMPLOYEES (soft delete).
 *
 *   npx tsx scripts/purge-sample-employees.ts --dry-run
 *   npx tsx scripts/purge-sample-employees.ts
 *   npx tsx scripts/purge-sample-employees.ts --org <organizationId>
 */
import { PrismaClient } from '../src/generated/prisma';
import { SAMPLE_EMPLOYEES } from '../src/constants/sample-employees';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const orgArgIndex = process.argv.indexOf('--org');
const orgFilter = orgArgIndex >= 0 ? process.argv[orgArgIndex + 1] : undefined;

const sampleNationalIds = SAMPLE_EMPLOYEES.map((e) => e.nationalId);
const samplePhones = SAMPLE_EMPLOYEES.map((e) => e.phone);

async function main() {
  const where = {
    deletedAt: null,
    ...(orgFilter ? { organizationId: orgFilter } : {}),
    OR: [
      { nationalId: { in: sampleNationalIds } },
      { phone: { in: samplePhones } },
      { email: { endsWith: '@school.local' } },
    ],
  };

  const matches = await prisma.employee.findMany({
    where,
    select: {
      id: true,
      organizationId: true,
      firstName: true,
      lastName: true,
      nationalId: true,
      email: true,
    },
  });

  console.log(`Found ${matches.length} sample employee row(s)${dryRun ? ' (dry run)' : ''}.`);
  for (const row of matches) {
    console.log(`  - ${row.firstName} ${row.lastName} (${row.nationalId ?? row.email ?? row.id}) org=${row.organizationId}`);
  }

  if (dryRun || matches.length === 0) return;

  const ids = matches.map((m) => m.id);
  const result = await prisma.employee.updateMany({
    where: { id: { in: ids } },
    data: { deletedAt: new Date(), status: 'TERMINATED' },
  });
  console.log(`Soft-deleted ${result.count} employee(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
