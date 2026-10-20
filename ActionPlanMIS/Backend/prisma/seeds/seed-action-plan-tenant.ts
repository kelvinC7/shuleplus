import { PrismaClient } from '@prisma/client';

/**
 * Seeds a Tenant and default Categories in the ActionPlanMIS module database
 * for a given organization.
 *
 * Run with:
 *   ACTION_PLAN_ORG_ID=<uuid> ACTION_PLAN_ORG_NAME="My Org" \
 *     npx tsx prisma/seeds/seed-action-plan-tenant.ts
 *
 * Both env vars are required for first-time seeding.
 */
const DEFAULT_CATEGORIES = [
  { name: 'Academic', color: '#3b82f6', icon: 'book-open', sortOrder: 1 },
  { name: 'Finance', color: '#22c55e', icon: 'wallet', sortOrder: 2 },
  { name: 'HR', color: '#f59e0b', icon: 'users', sortOrder: 3 },
  { name: 'ICT', color: '#8b5cf6', icon: 'monitor', sortOrder: 4 },
  { name: 'Procurement', color: '#ec4899', icon: 'shopping-cart', sortOrder: 5 },
  { name: 'Sports', color: '#14b8a6', icon: 'trophy', sortOrder: 6 },
  { name: 'Administration', color: '#6b7280', icon: 'building', sortOrder: 7 },
  { name: 'Maintenance', color: '#f97316', icon: 'wrench', sortOrder: 8 },
  { name: 'Security', color: '#ef4444', icon: 'shield', sortOrder: 9 },
  { name: 'Research', color: '#6366f1', icon: 'flask', sortOrder: 10 },
  { name: 'Projects', color: '#06b6d4', icon: 'clipboard', sortOrder: 11 },
  { name: 'Marketing', color: '#d946ef', icon: 'megaphone', sortOrder: 12 },
];

async function main() {
  const orgId = process.env.ACTION_PLAN_ORG_ID;
  const orgName = process.env.ACTION_PLAN_ORG_NAME;

  if (!orgId || !orgName) {
    console.error(
      '[Seed] Set ACTION_PLAN_ORG_ID and ACTION_PLAN_ORG_NAME env vars before running.'
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.tenant.findUnique({
      where: { organizationId: orgId },
    });

    if (existing) {
      console.log(`[Seed] Tenant already exists for org ${orgId} — skipping tenant creation`);
    } else {
      const tenant = await prisma.tenant.create({
        data: {
          organizationId: orgId,
          organizationCode: orgId,
          organizationName: orgName,
        },
      });
      console.log(`[Seed] Tenant created: ${tenant.id} for org "${orgName}"`);
    }

    let created = 0;
    for (const cat of DEFAULT_CATEGORIES) {
      const found = await prisma.category.findFirst({
        where: { organizationId: orgId, name: cat.name },
      });
      if (!found) {
        await prisma.category.create({
          data: { organizationId: orgId, ...cat },
        });
        created++;
      }
    }
    console.log(`[Seed] Categories seeded: ${created} created, ${DEFAULT_CATEGORIES.length - created} skipped (already exist)`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
