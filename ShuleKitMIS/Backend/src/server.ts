import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const app = createApp();

async function start() {
  const db = process.env.DATABASE_URL ?? '';
  const safe = db.replace(/:([^:@/]+)@/, ':****@');
  console.log(`[ShuleKitMIS] DATABASE_URL=${safe || '(empty)'}`);
  await prisma.$connect();
  // Fail fast if catalog tables missing (wrong DB / migrations not applied)
  await prisma.$queryRaw`SELECT 1 FROM product_categories LIMIT 1`.catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `ShuleKit DB missing catalog tables (product_categories/products). ` +
        `Check DATABASE_URL points at shulekit_mis_db with schema applied. Underlying: ${msg.slice(0, 180)}`
    );
  });
  app.listen(env.PORT, () => {
    console.log(`[ShuleKitMIS] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(
      `[ShuleKitMIS] Service auth: x-service-key required (key prefix: ${env.SERVICE_API_KEY.slice(0, 4)}…)`
    );
  });
}

start().catch((error) => {
  console.error('[ShuleKitMIS] Failed to start:', error);
  process.exit(1);
});
