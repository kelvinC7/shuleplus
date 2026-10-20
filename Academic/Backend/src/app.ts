import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import routes from './routes';
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
        // Dev convenience: IAM landing + Academic React FE
        if (
          env.NODE_ENV !== 'production' &&
          /^http:\/\/localhost:(3000|3004)$/.test(origin)
        ) {
          return callback(null, origin);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));

  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
  app.use(env.API_PREFIX, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
