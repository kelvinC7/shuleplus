import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const c = await p.actionPlanTemplate.count();
console.log('template count', c);
await p.$disconnect();
