import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '10mb' }));

  if (env.SWAGGER_ENABLED) {
    app.use(
      env.SWAGGER_PATH,
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'ShulePlus Notification Service API',
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
