import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3072', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ?? 'http://localhost:3073,http://localhost:3000',
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? '3072'}`,
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'deo-mis',
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  STUDENT_MANAGEMENT_API_URL:
    process.env.STUDENT_MANAGEMENT_API_URL ?? 'http://localhost:3052/api',
  ATTENDANCE_API_URL: process.env.ATTENDANCE_API_URL ?? 'http://localhost:3024/api',
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL ?? '',
  NOTIFICATION_SERVICE_API_KEY:
    process.env.NOTIFICATION_SERVICE_API_KEY ??
    process.env.SERVICE_API_KEY ??
    'dev-service-key',
} as const;
