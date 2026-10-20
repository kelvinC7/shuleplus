import { prisma } from '../src/config/database';
import { seedService } from '../src/services/seed.service';

async function main() {
  await seedService.seedRequirementCatalog();
  await seedService.seedNesaLimits();
  await seedService.seedSystemTemplates();
  console.log('Global seed data complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
