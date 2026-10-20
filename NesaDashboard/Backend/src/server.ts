import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

function start() {
  app.listen(env.PORT, () => {
    console.log(`[NESA Dashboard] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(
      `[NESA Dashboard] Service auth: x-service-key required (key prefix: ${env.SERVICE_API_KEY.slice(0, 4)}…)`
    );
  });
}

try {
  start();
} catch (error) {
  console.error('[NESA Dashboard] Failed to start:', error);
  process.exit(1);
}
