import { PrismaClient } from '../src/generated/prisma';

const p = new PrismaClient();

async function main() {
  const tenants = await p.tenant.findMany({
    where: {
      OR: [
        { organizationName: { contains: 'theo', mode: 'insensitive' } },
        { organizationCode: { contains: 'THEO', mode: 'insensitive' } },
      ],
    },
    select: { organizationId: true, organizationName: true, organizationCode: true },
    orderBy: { organizationName: 'asc' },
  });

  for (const t of tenants) {
    const n = await p.student.count({ where: { organizationId: t.organizationId } });
    console.log(`${t.organizationName} | ${t.organizationId} | code=${t.organizationCode ?? '—'} | students=${n}`);
  }

  const top = await p.student.groupBy({
    by: ['organizationId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });
  console.log('\nTop orgs by student count:');
  for (const row of top) {
    const tenant = await p.tenant.findUnique({ where: { organizationId: row.organizationId } });
    console.log(`${tenant?.organizationName ?? row.organizationId} | students=${row._count.id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
