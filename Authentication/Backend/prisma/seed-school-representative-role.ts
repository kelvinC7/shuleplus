import { PrismaClient } from '../src/generated/prisma';

const PLATFORM_ORG_SLUG = 'babyeyi-platform';
const ROLE = 'school_representative';

async function main() {
  const prisma = new PrismaClient();
  const org = await prisma.organization.findUnique({ where: { slug: PLATFORM_ORG_SLUG } });
  if (!org) throw new Error('Platform org missing — run main seed first');

  await prisma.role.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: ROLE } },
    update: { isSystem: true, hierarchyLevel: 150, dataScope: 'GLOBAL' },
    create: {
      organizationId: org.id,
      name: 'School Representative',
      slug: ROLE,
      description: 'Multi-school oversight representative',
      hierarchyLevel: 150,
      isSystem: true,
      dataScope: 'GLOBAL',
    },
  });

  console.log('school_representative role ready');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
