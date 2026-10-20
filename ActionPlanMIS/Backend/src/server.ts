import path from 'path';
import fs from 'fs';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { actionPlanService } from './services/action-plan.service';

const app = createApp();

async function start() {
  fs.mkdirSync(path.resolve(env.UPLOAD_DIR), { recursive: true });
  await prisma.$connect();
  await actionPlanService.seedOfficialTemplatesForAllTenants();
  app.listen(env.PORT, () => {
    console.log(`[ActionPlan Module] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(
      `[ActionPlan Module] Service auth: x-service-key required (key prefix: ${env.SERVICE_API_KEY.slice(0, 4)}…)`
    );
  });
}

start().catch((error) => {
  console.error('[ActionPlan Module] Failed to start:', error);
  process.exit(1);
});
