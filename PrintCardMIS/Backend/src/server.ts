import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const app = createApp();

async function start() {
  await prisma.$connect();
  app.listen(env.PORT, () => {
    console.log(`[PrintCardMIS] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
  });
}

start().catch((error) => {
  console.error('[PrintCardMIS] Failed to start:', error);
  process.exit(1);
});
