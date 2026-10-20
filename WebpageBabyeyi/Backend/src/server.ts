import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { env } from './config';
import routes from './routes';
import babyeyiRoutes from './routes/babyeyi.routes';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const allowed = env.CORS_ORIGIN.split(',').map((o) => o.trim());
      if (allowed.includes('*') || allowed.includes(origin)) {
        return callback(null, origin);
      }
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, origin);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Views for server-rendered Babyeyi lookup
app.set('views', path.resolve(__dirname, 'views'));
app.set('view engine', 'ejs');

// Server-rendered babyeyi pages
app.use('/', babyeyiRoutes);

app.use('/api', routes);

app.listen(env.PORT, () => {
  console.log(`[webpage-backend] listening on http://localhost:${env.PORT}`);
  console.log(`[webpage-backend] StudentManagement → ${env.STUDENT_MANAGEMENT_URL}`);
  console.log(`[webpage-backend] BabyeyiWizard    → ${env.BABYEYI_WIZARD_URL}`);
});
