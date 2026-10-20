import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { attachLiveWebSocket } from './live/live-socket';

const app = createApp();
const server = http.createServer(app);

async function start() {
  await prisma.$connect();
  attachLiveWebSocket(server);
  server.listen(env.PORT, () => {
    console.log(`[Timetable] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(
      `[Timetable] Service auth: x-service-key required (key prefix: ${env.SERVICE_API_KEY.slice(0, 4)}…)`
    );
  });
}

start().catch((error) => {
  console.error('[Timetable] Failed to start:', error);
  process.exit(1);
});
