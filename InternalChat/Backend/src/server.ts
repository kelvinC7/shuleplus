import http from 'node:http';
import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { initSocket } from './socket';

async function bootstrap(): Promise<void> {
  await prisma.$connect();
  const server = http.createServer(app);
  initSocket(server);
  server.listen(env.PORT, () => {
    console.log(`[internal-chat] listening on :${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[internal-chat] failed to start', err);
  process.exit(1);
});
