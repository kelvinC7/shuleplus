/**
 * Search organizations (schools) in the IAM database.
 *
 * Usage:
 *   npx tsx scripts/search-organizations.ts
 *   npx tsx scripts/search-organizations.ts MATTHEWS
 *   npx tsx scripts/search-organizations.ts --status=ACTIVE --type=SCHOOL
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  let search = '';
  let status: string | undefined;
  let type: string | undefined;
  let limit = 50;

  for (const arg of argv) {
    if (arg.startsWith('--status=')) status = arg.slice('--status='.length);
    else if (arg.startsWith('--type=')) type = arg.slice('--type='.length);
    else if (arg.startsWith('--limit=')) limit = Number(arg.slice('--limit='.length)) || 50;
    else if (!arg.startsWith('-')) search = arg;
  }

  return { search, status, type, limit };
}

async function main() {
  const { search, status, type, limit } = parseArgs(process.argv.slice(2));

  const orgs = await prisma.organization.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(type ? { type: type as never } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { organizationCode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      organizationCode: true,
      type: true,
      status: true,
    },
    orderBy: { name: 'asc' },
    take: limit,
  });

  if (!orgs.length) {
    console.log('No organizations found.');
    return;
  }

  console.log(`Found ${orgs.length} organization(s):\n`);
  for (const org of orgs) {
    console.log(`  ${org.name}`);
    console.log(`    id:   ${org.id}`);
    console.log(`    code: ${org.organizationCode ?? '—'}`);
    console.log(`    slug: ${org.slug}`);
    console.log(`    type: ${org.type}  status: ${org.status}`);
    console.log('');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
