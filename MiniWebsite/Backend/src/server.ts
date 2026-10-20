import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { sitesDir } from './config/paths';
import fs from 'node:fs';

const app = createApp();

async function start() {
  const db = process.env.DATABASE_URL ?? '';
  const safe = db.replace(/:([^:@/]+)@/, ':****@');
  console.log(`[MiniWebsite] DATABASE_URL=${safe || '(empty)'}`);
  await prisma.$connect();
  // Fail fast if module tables missing (wrong DB / migrations not applied)
  await prisma.$queryRaw`SELECT 1 FROM tenants LIMIT 1`.catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `MiniWebsite DB missing module tables (tenants/school_websites). ` +
        `Check DATABASE_URL points at mini_website_db with schema applied. Underlying: ${msg.slice(0, 180)}`
    );
  });
  fs.mkdirSync(sitesDir, { recursive: true });
  app.listen(env.PORT, () => {
    console.log(`[MiniWebsite] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(`[MiniWebsite] Public school sites at http://localhost:${env.PORT}/<school-slug>`);
    console.log(
      `[MiniWebsite] Service auth: x-service-key required (key prefix: ${env.SERVICE_API_KEY.slice(0, 4)}…)`
    );
  });
}

start().catch((error) => {
  console.error('[MiniWebsite] Failed to start:', error);
  process.exit(1);
});
