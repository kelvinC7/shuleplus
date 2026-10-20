import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { startReportScheduler } from './services/report-scheduler.service';

const app = createApp();

async function start() {
  await prisma.$connect();
  startReportScheduler();
  app.listen(env.PORT, () => {
    console.log(`[SectorMIS] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(
      `[SectorMIS] Service auth: x-service-key required (key prefix: ${env.SERVICE_API_KEY.slice(0, 4)}…)`
    );
  });
}

start().catch((error) => {
  console.error('[SectorMIS] Failed to start:', error);
  process.exit(1);
});
