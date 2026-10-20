import http from 'node:http';
import { createApp } from './app';
import { env, logIntegrationUrls } from './config/env';
import { prisma } from './config/database';
import { initTeacherChatSocket } from './realtime/teacher-chat.socket';

const app = createApp();
const httpServer = http.createServer(app);

async function start() {
  await prisma.$connect();
  initTeacherChatSocket(httpServer);
  httpServer.listen(env.PORT, () => {
    console.log(`[ParentMIS] API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(`[ParentMIS] Chat socket on http://localhost:${env.PORT}/socket.io`);
    console.log(
      `[ParentMIS] Service auth: x-service-key required (key prefix: ${env.SERVICE_API_KEY.slice(0, 4)}…)`
    );
    logIntegrationUrls();
  });
}

start().catch((error) => {
  console.error('[ParentMIS] Failed to start:', error);
  process.exit(1);
});
