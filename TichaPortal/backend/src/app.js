const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const env = require('./lib/env');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const timetableRoutes = require('./routes/timetable');

const app = express();
app.set('trust proxy', 1);

const configuredOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
const shuleplusOrigin = /^https:\/\/([a-z0-9-]+\.)*shuleplus\.rw(?::\d+)?$/i;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (configuredOrigins.includes('*') || configuredOrigins.includes(origin)) {
        return callback(null, origin);
      }
      if (shuleplusOrigin.test(origin)) return callback(null, origin);
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, origin);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-service-key', 'x-source-service'],
  })
);
app.use(express.json({ limit: "12mb" }));

// ensure db file exists
const dbFile = process.env.DB_FILE || path.join(__dirname,'data','db.json');
if (!fs.existsSync(dbFile)) {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  fs.writeFileSync(dbFile, JSON.stringify({ users: [], timetable: [], homeworkAssignments: [] }, null, 2));
}

const { teacherWorkRouter } = require('./routes/teacherWork');
const { homeworkRouter } = require('./routes/homework');
const { teacherServicesRouter } = require('./routes/teacherServices');
const { teacherLocalRouter } = require('./routes/teacherLocal');
const { teacherProfileRouter } = require('./routes/teacherProfile');
const { mountKaziProxy } = require('./routes/kaziProxy');
const { tenantRouter } = require('./routes/tenant');
const { curriculumRouter } = require('./routes/curriculum');
const { configuredUpstreams } = require('./lib/moduleApis');

const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const health = (_req, res) =>
  res.json({
    ok: true,
    service: 'tichaportal-backend',
    module: 'teacher-portal',
    frontend: env.FRONTEND_URL,
    upstreams: configuredUpstreams(),
  });
app.get('/health', health);
app.get('/api/health', health);

app.use('/api', tenantRouter);

app.use('/api', teacherProfileRouter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/timetable', timetableRoutes);
mountKaziProxy(app);
app.use('/api', teacherServicesRouter);
app.use('/api', teacherLocalRouter);
app.use('/api', teacherWorkRouter);
app.use('/api', homeworkRouter);
app.use('/api', curriculumRouter);

app.get('/', (req,res)=> res.json({ ok: true, service: 'tichaportal-backend' }));

module.exports = app;
