import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { connectRedis } from './config/redis';
import { seedDefaultTemplates } from './bootstrap/seed-templates';

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('[DB] PostgreSQL connected');

    try {
      await connectRedis();
      console.log('[Redis] Connected');
    } catch {
      console.warn('[Redis] Not available — OTP will fail without Redis');
    }

    await seedDefaultTemplates();

    const app = createApp();
    app.listen(env.PORT, () => {
      console.log(`[Server] Notification Service on http://localhost:${env.PORT}`);
      console.log(`[API]    ${env.API_PREFIX}`);
      if (env.SWAGGER_ENABLED) {
        console.log(`[Swagger] http://localhost:${env.PORT}${env.SWAGGER_PATH}`);
      }
    });
  } catch (error) {
    console.error('[Fatal] Failed to start notification service:', error);
    process.exit(1);
  }
}

bootstrap();
