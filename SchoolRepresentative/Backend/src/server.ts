import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const app = createApp();

async function start() {
  await prisma.$connect();
  app.listen(env.PORT, () => {
    console.log(`[DirectorConsole] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(
      `[DirectorConsole] Auth: IAM Bearer JWT (live)${env.ALLOW_DEMO ? ' | demo mode allowed when unauthenticated' : ''}`
    );
    console.log(`[DirectorConsole] Upstream IAM: ${env.IAM_API_URL}`);
  });
}

start().catch((error) => {
  console.error('[DirectorConsole] Failed to start:', error);
  process.exit(1);
});
