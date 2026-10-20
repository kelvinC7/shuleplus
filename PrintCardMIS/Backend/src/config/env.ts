import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3093', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3092',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'print-card',
  IAM_API_URL: requireEnv('IAM_API_URL', 'http://localhost:3001/api/v1'),
  STUDENT_MANAGEMENT_API_URL: requireEnv('STUDENT_MANAGEMENT_API_URL', 'http://localhost:3052/api'),
  HR_API_URL: requireEnv('HR_API_URL', 'http://localhost:3005/api'),
  TIMETABLE_API_URL: requireEnv('TIMETABLE_API_URL', 'http://localhost:3010/api'),
  /** Root for ZIP/Excel photo import jobs (incoming / processing / completed / failed). */
  IMPORT_ROOT: process.env.IMPORT_ROOT ?? path.resolve(process.cwd(), 'imports'),
  PHOTO_IMPORT_CONCURRENCY: parseInt(process.env.PHOTO_IMPORT_CONCURRENCY ?? '3', 10),
  PHOTO_IMPORT_ZIP_RETENTION_DAYS: parseInt(process.env.PHOTO_IMPORT_ZIP_RETENTION_DAYS ?? '7', 10),
} as const;
