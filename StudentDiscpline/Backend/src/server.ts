import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const app = createApp();

async function start() {
  await prisma.$connect();
  if (!(prisma as { disciplineCase?: unknown }).disciplineCase) {
    console.warn(
      '[StudentDiscipline] Prisma client missing DisciplineCase model — stop the server, run npm run prisma:generate, then restart.'
    );
  }
  app.listen(env.PORT, () => {
    console.log(`[StudentDiscipline] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(
      `[StudentDiscipline] Service auth: x-service-key required (key prefix: ${env.SERVICE_API_KEY.slice(0, 4)}…)`
    );
  });
}

start().catch((error) => {
  console.error('[StudentDiscipline] Failed to start:', error);
  process.exit(1);
});
