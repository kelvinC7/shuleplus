import fs from 'fs';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { startExtractionWorker } from './services/job-queue.service';

const app = createApp();

async function start() {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
  await prisma.$connect();
  startExtractionWorker();
  app.listen(env.PORT, () => {
    console.log(
      `[CurriculumIntelligence] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`
    );
  });
}

start().catch((error) => {
  console.error('[CurriculumIntelligence] Failed to start:', error);
  process.exit(1);
});
