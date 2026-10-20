import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export function createApp() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  const corsOrigins = String(env.CORS_ORIGIN)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const shuleplusOrigin = /^https:\/\/([a-z0-9-]+\.)*shuleplus\.rw(?::\d+)?$/i;
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (corsOrigins.includes('*') || corsOrigins.includes(origin)) {
          return callback(null, origin);
        }
        if (shuleplusOrigin.test(origin)) {
          return callback(null, origin);
        }
        if (
          process.env.NODE_ENV !== 'production' &&
          /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
        ) {
          return callback(null, origin);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(env.API_PREFIX, routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
