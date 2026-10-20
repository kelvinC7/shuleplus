const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  const row = await prisma.platformModule.update({
    where: { slug: 'action-plan' },
    data: {
      frontendUrl: 'http://localhost:3035',
      backendUrl: 'http://localhost:3034',
      healthCheckUrl: '/api/health',
      isEnabled: true,
    },
  });
  console.log('OK', row.slug, row.frontendUrl, row.backendUrl);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
