import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3032', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  /** Must match IAM MODULE_PROVISIONING_KEY / PLATFORM_SERVICE_KEY */
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3033',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'student-discipline',
  STUDENT_MANAGEMENT_API_URL: process.env.STUDENT_MANAGEMENT_API_URL ?? 'http://localhost:3052/api',
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3001/api/v1/notifications',
  NOTIFICATION_SERVICE_API_KEY:
    process.env.NOTIFICATION_SERVICE_API_KEY ??
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  /** ParentMIS webhook receiver for parent notifications */
  PARENTMIS_WEBHOOK_URL: process.env.PARENTMIS_WEBHOOK_URL ?? 'http://localhost:3016/api/webhooks/discipline',
  PARENTMIS_SERVICE_KEY: process.env.PARENTMIS_SERVICE_KEY ?? 'dev-service-key',
} as const;
