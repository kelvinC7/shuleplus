import path from 'node:path';
import dotenv from 'dotenv';

/** Always load Backend/.env (override PM2 empty/stale DATABASE_URL). */
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath, override: true });

/** Prisma rejects quoted URLs like `"postgresql://…"` from PM2/.env. */
function unquoteEnv(key: string) {
  const raw = process.env[key];
  if (raw == null) return;
  let v = raw.trim();
  for (let i = 0; i < 4; i++) {
    const next = v.replace(/^["'`“”‘’]+/, '').replace(/["'`“”‘’]+$/, '').trim();
    if (next === v) break;
    v = next;
  }
  process.env[key] = v;
}

unquoteEnv('DATABASE_URL');

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key} (looked in ${envPath})`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3055', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  /** Directory where uploaded attachments are stored and served from /uploads. */
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? 'uploads',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  /** Must match IAM MODULE_PROVISIONING_KEY / PLATFORM_SERVICE_KEY */
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  /** IAM for the org member directory (service-to-service, internal endpoints). */
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  /** HR module backend URL — used to fetch teachers for the chat member directory. */
  HR_API_URL: process.env.HR_API_URL ?? 'http://localhost:3005/api',
  /** StudentManagement module backend URL — used to fetch parents for the chat member directory. */
  STUDENT_MGMT_API_URL: process.env.STUDENT_MGMT_API_URL ?? 'http://localhost:3052/api',
  /** Timetable module backend URL — used to fetch teachers for the chat member directory. */
  TIMETABLE_API_URL: process.env.TIMETABLE_API_URL ?? 'http://localhost:3010/api',
  /** Comma-separated origins (Chat FE + IAM landing). */
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3054,http://localhost:3000',
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? '3055'}`,
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'chat',
  /** Max size of a base64 attachment upload (bytes). */
  MAX_ATTACHMENT_BYTES: parseInt(process.env.MAX_ATTACHMENT_BYTES ?? '10485760', 10),
} as const;
