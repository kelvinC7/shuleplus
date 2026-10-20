/**
 * Upsert NESA Dashboard into the platform module catalog.
 * Run: npx tsx prisma/seed-nesa.ts
 */
import { PrismaClient } from '../src/generated/prisma';

const NESA_MODULE = {
  slug: 'nesa',
  name: 'NESA Dashboard',
  shortName: 'NESA',
  category: 'Governance',
  version: '1.0.0',
  description: 'National Education Standards Authority console',
  isPremium: false,
  frontendUrl: 'http://localhost:3015',
  backendUrl: 'http://localhost:3014/api',
  healthCheckUrl: '/api/health',
};

async function main() {
  const prisma = new PrismaClient();
  try {
    const mod = await prisma.platformModule.upsert({
      where: { slug: NESA_MODULE.slug },
      update: {
        name: NESA_MODULE.name,
        shortName: NESA_MODULE.shortName,
        category: NESA_MODULE.category,
        version: NESA_MODULE.version,
        description: NESA_MODULE.description,
        frontendUrl: NESA_MODULE.frontendUrl,
        backendUrl: NESA_MODULE.backendUrl,
        healthCheckUrl: NESA_MODULE.healthCheckUrl,
      },
      create: NESA_MODULE,
    });
    console.log(`NESA module ready: ${mod.slug} → ${mod.frontendUrl}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
