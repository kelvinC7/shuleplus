import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const app = createApp();

async function start() {
  await prisma.$connect();
  app.listen(env.PORT, () => {
    console.log(`[StudentManagement] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(
      `[StudentManagement] Service auth: x-service-key required (key prefix: ${env.SERVICE_API_KEY.slice(0, 4)}…)`
    );
  });
}

start().catch((error) => {
  console.error('[StudentManagement] Failed to start:', error);
  process.exit(1);
});
