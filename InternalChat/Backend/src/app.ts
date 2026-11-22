import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { uploadDir } from './config/paths';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { router } from './routes';

export const app = express();

app.use(helmet());
const configuredOrigins = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const shuleplusOrigin = /^https:\/\/([a-z0-9-]+\.)*shuleplus\.rw(?::\d+)?$/i;
const capacitorOrigin =
  /^(capacitor:\/\/localhost|ionic:\/\/localhost|https?:\/\/localhost(:\d+)?)$/i;
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (configuredOrigins.includes('*') || configuredOrigins.includes(origin)) {
        return callback(null, origin);
      }
      if (shuleplusOrigin.test(origin) || capacitorOrigin.test(origin)) {
        return callback(null, origin);
      }
      if (
        env.NODE_ENV !== 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, origin);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.use(env.API_PREFIX, router);
app.use('/uploads', express.static(uploadDir));
app.use('/chat-fab.js', express.static('public/chat-fab.js', { setHeaders: (res) => res.setHeader('Access-Control-Allow-Origin', '*') }));

app.use(notFoundHandler);
app.use(errorHandler);
