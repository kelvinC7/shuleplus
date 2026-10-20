import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import routes from './routes';
import developerRoutes from './routes/developer.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  const shuleplusOrigin =
    /^https:\/\/([a-z0-9-]+\.)*shuleplus\.rw(?::\d+)?$/i;
  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser / same-origin tools (no Origin header)
        if (!origin) return callback(null, true);
        if (corsOrigins.includes('*') || corsOrigins.includes(origin)) {
          return callback(null, origin);
        }
        // Production landing + module frontends on *.shuleplus.rw
        if (shuleplusOrigin.test(origin)) {
          return callback(null, origin);
        }
        // Dev convenience: IAM landing + module frontends (Print Card :3092, ParentMIS, etc.)
        if (
          env.NODE_ENV !== 'production' &&
          /^http:\/\/localhost:\d+$/.test(origin)
        ) {
          return callback(null, origin);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '25mb' }));

  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

  /** Versioned API alias — /api/v1 mirrors /api for developer documentation alignment */
  app.use('/api/v1', routes);
  app.use(env.API_PREFIX, routes);

  /** Developer documentation API — server-protected, requires Developer Portal session */
  app.use('/developer/api', developerRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
