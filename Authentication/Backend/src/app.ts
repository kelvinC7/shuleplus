import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import routes from './routes';
import { apiRateLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      // Allow Auth Frontend (and modules) to preview /uploads branding images cross-origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  const configuredOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  const shuleplusOrigin = /^https:\/\/([a-z0-9-]+\.)*shuleplus\.rw(?::\d+)?$/i;

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (configuredOrigins.includes('*') || configuredOrigins.includes(origin)) {
          return callback(null, origin);
        }
        // Module frontends + apex refresh tokens from *.shuleplus.rw
        if (shuleplusOrigin.test(origin)) {
          return callback(null, origin);
        }
        if (
          env.NODE_ENV === 'development' &&
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          return callback(null, origin);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-service-key', 'x-source-service'],
    })
  );
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(apiRateLimiter);

  const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
  app.use('/uploads', express.static(uploadRoot));

  if (env.SWAGGER_ENABLED) {
    app.use(
      env.SWAGGER_PATH,
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'ShulePlus IAM API Docs',
        customCss: '.swagger-ui .topbar { display: none }',
        swaggerOptions: {
          persistAuthorization: true,
          docExpansion: 'list',
          filter: true,
        },
      })
    );

    app.get(`${env.SWAGGER_PATH}.json`, (_req, res) => {
      res.json(swaggerSpec);
    });
  }

  app.use(env.API_PREFIX, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
