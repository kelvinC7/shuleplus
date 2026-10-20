import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const app = createApp();
let server: ReturnType<typeof app.listen> | undefined;

async function shutdown(signal: string) {
  console.log(`[Babyeyi Wizard] ${signal} received — closing server and database connections`);
  await new Promise<void>((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });
  await prisma.$disconnect();
  process.exit(0);
}

async function start() {
  await prisma.$connect();
  server = app.listen(env.PORT, () => {
    console.log(`[Babyeyi Wizard] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(
      `[Babyeyi Wizard] Service auth: x-service-key required (key prefix: ${env.SERVICE_API_KEY.slice(0, 4)}…)`
    );
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

start().catch((error) => {
  console.error('[Babyeyi Wizard] Failed to start:', error);
  process.exit(1);
});
