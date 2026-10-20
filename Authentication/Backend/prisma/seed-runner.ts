import { PrismaClient } from '../src/generated/prisma';
import { ensureRootAdmin, seedSchool } from './seed';
import { seedRwandaLocations } from './seeds/rwanda-locations';
import { seedActionPlanAccess } from './seeds/action-plan-access';
import { seedSectorMisAccess } from './seeds/sector-mis-access';
import { seedDeoMisAccess } from './seeds/deo-mis-access';

const prisma = new PrismaClient();

ensureRootAdmin(prisma)
  .then(() => seedRwandaLocations(prisma))
  .then(() => seedActionPlanAccess(prisma))
  .then(() => seedSectorMisAccess(prisma))
  .then(() => seedDeoMisAccess(prisma))
  .then(() => seedSchool(prisma))
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
