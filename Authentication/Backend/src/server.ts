import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { connectRedis } from './config/redis';
import { bootstrapPlatform } from './bootstrap/platform';

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('[DB] PostgreSQL connected');

    await bootstrapPlatform();

    try {
      await connectRedis();
      console.log('[Redis] Connected');
    } catch {
      console.warn('[Redis] Not available — session cache disabled');
    }

    const app = createApp();

    app.listen(env.PORT, () => {
      console.log(`[Server] ShulePlus IAM running on http://localhost:${env.PORT}`);
      console.log(`[API]    ${env.API_PREFIX}`);
      if (env.SWAGGER_ENABLED) {
        console.log(`[Swagger] http://localhost:${env.PORT}${env.SWAGGER_PATH}`);
      }
    });
  } catch (error) {
    console.error('[Fatal] Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
