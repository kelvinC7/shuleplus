import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();
const rows = await prisma.tenant.findMany({
  include: { trips: { select: { reference: true, status: true, currentStageKey: true } } },
});
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
