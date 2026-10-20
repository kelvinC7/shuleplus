/**
 * Hide platform / legacy modules from school org marketplace (production one-shot).
 * Usage: cd Authentication/Backend && node scripts/hide-school-marketplace-modules.cjs
 */
const { PrismaClient } = require('../src/generated/prisma');

const HIDDEN_SLUGS = [
  'nesa',
  'deo-mis',
  'sector-mis',
  'print-card',
  'parent-mis',
  'sample-module',
  'finance',
  'dashboard',
  'leave',
];

const prisma = new PrismaClient();

async function main() {
  for (const slug of HIDDEN_SLUGS) {
    const result = await prisma.platformModule.updateMany({
      where: { slug },
      data: { visibleInMarketplace: false },
    });
    if (result.count > 0) {
      console.log(`hidden from marketplace: ${slug}`);
    }
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
