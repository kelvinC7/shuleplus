import { PrismaClient } from '../src/generated/prisma';

const p = new PrismaClient();

async function main() {
  const orgs = await p.organization.findMany({
    where: {
      OR: [
        { name: { contains: 'theo', mode: 'insensitive' } },
        { slug: { contains: 'theo', mode: 'insensitive' } },
        { organizationCode: { contains: 'THEO', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, slug: true, organizationCode: true, status: true },
    orderBy: { name: 'asc' },
  });
  console.log('IAM organizations:', JSON.stringify(orgs, null, 2));

  const partners = await p.developerPartner.findMany({
    select: {
      name: true,
      sandboxOrganizationId: true,
      sandboxOrganization: { select: { id: true, name: true } },
    },
  });
  console.log('Developer partners:', JSON.stringify(partners, null, 2));
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
