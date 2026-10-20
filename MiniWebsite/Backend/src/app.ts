import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { uploadDir } from './config/paths';
import routes from './routes';
import siteRoutes from './routes/site.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.use('/uploads', express.static(uploadDir));

  const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
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
          env.NODE_ENV !== 'production' &&
          /^http:\/\/localhost:(3000|3054)$/.test(origin)
        ) {
          return callback(null, origin);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));

  // Public school websites are served at the app root: /<school-slug>
  app.use(siteRoutes);

  app.use(env.API_PREFIX, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
