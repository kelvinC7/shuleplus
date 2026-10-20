import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';

createApp().listen(env.PORT, async () => {
  await prisma.$connect();
  console.log(`[Payroll Module] API http://localhost:${env.PORT}${env.API_PREFIX}`);
});
