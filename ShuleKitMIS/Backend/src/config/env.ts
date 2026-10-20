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
  PORT: parseInt(process.env.PORT ?? '3038', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  /** Directory where uploaded images are stored and served from /uploads. */
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? 'uploads',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  /** Must match IAM MODULE_PROVISIONING_KEY / PLATFORM_SERVICE_KEY */
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  /** Master-data source for students + parents (Student Management module). */
  STUDENT_MANAGEMENT_API_URL:
    process.env.STUDENT_MANAGEMENT_API_URL ?? (process.env.NODE_ENV === 'production' ? 'http://localhost:4024/api' : 'http://localhost:3052/api'),
  /** @deprecated Use STUDENT_MANAGEMENT_API_URL */
  ACADEMIC_API_URL: process.env.ACADEMIC_API_URL ?? 'http://localhost:3003/api',
  /** Babyeyi NESA circulars (service-auth). */
  BABYEYI_API_URL: process.env.BABYEYI_API_URL ?? 'http://localhost:3012/api',
  /** IAM for district/school listings (optional). */
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  /** Flat fee charged when a kit is delivered home (FRW). */
  HOME_DELIVERY_FEE: parseFloat(process.env.HOME_DELIVERY_FEE ?? '2500'),
  /** Comma-separated origins (ShuleKit FE + IAM landing). */
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3039,http://localhost:3000',
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? '3038'}`,
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'shulekit-mis',
} as const;
