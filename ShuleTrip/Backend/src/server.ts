import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { ensurePortalSeedUsers } from './services/portal-auth.service';

const app = createApp();

async function start() {
  await prisma.$connect();
  await ensurePortalSeedUsers();
  app.listen(env.PORT, () => {
    console.log(`[ShuleTrip] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
  });
}

start().catch((error) => {
  console.error('[ShuleTrip] Failed to start:', error);
  process.exit(1);
});
