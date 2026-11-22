import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { corsOriginCallback } from './config/cors';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: corsOriginCallback(env.CORS_ORIGIN, env.NODE_ENV),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));

  app.use(env.API_PREFIX, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
