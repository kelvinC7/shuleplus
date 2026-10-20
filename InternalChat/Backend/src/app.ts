import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { uploadDir } from './config/paths';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { router } from './routes';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
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
