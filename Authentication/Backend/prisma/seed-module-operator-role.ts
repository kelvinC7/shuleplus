import { PrismaClient } from '../src/generated/prisma';
import { ROLES } from '../src/constants/roles';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: 'babyeyi-platform' } });
  if (!org) throw new Error('Platform organization not found');

  await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: ROLES.MODULE_OPERATOR } },
    update: { isSystem: true, hierarchyLevel: 100, dataScope: 'GLOBAL' },
    create: {
      organizationId: org.id,
      name: 'Module Operator',
      slug: ROLES.MODULE_OPERATOR,
      description: 'National/system user with direct module access',
      hierarchyLevel: 100,
      isSystem: true,
      dataScope: 'GLOBAL',
    },
  });

  console.log('MODULE_OPERATOR role ready');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
