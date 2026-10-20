/**
 * Point Academic catalog URLs at Frontend_react (Vite) on :3004
 * and Academic Backend on :3003.
 *
 * Run from Authentication/Backend:
 *   node scripts/set-academic-urls.js
 */
const { PrismaClient } = require('../src/generated/prisma');

const FRONTEND_URL = 'http://localhost:3004';
const BACKEND_URL = 'http://localhost:3003';

async function main() {
  const prisma = new PrismaClient();
  const slugs = ['academic', 'academic-1'];

  for (const slug of slugs) {
    const existing = await prisma.platformModule.findUnique({ where: { slug } });
    if (!existing) {
      console.log(`Skip missing slug: ${slug}`);
      continue;
    }
    const updated = await prisma.platformModule.update({
      where: { slug },
      data: {
        frontendUrl: FRONTEND_URL,
        backendUrl: BACKEND_URL,
        healthCheckUrl: '/api/health',
        isEnabled: true,
      },
    });
    console.log('Updated:', {
      slug: updated.slug,
      frontendUrl: updated.frontendUrl,
      backendUrl: updated.backendUrl,
    });
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
