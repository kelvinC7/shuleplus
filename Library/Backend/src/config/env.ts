import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3060', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET'),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3061',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'library',
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? 'uploads',
  STUDENT_MANAGEMENT_URL: process.env.STUDENT_MANAGEMENT_URL ?? 'http://localhost:3052/api',
  HR_API_URL: process.env.HR_API_URL ?? 'http://localhost:3005/api',
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  TEACHER_PORTAL_URL: process.env.TEACHER_PORTAL_URL ?? 'http://localhost:3009/api',
} as const;
