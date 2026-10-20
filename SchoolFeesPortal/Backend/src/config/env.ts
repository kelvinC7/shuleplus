import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3014', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv(
    'JWT_ACCESS_SECRET',
    'dev-access-secret-change-in-production-32chars'
  ),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ?? process.env.PLATFORM_SERVICE_KEY ?? 'dev-service-key',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3015',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'school-fees',
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? 'uploads',
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  BABYEYI_API_URL: process.env.BABYEYI_API_URL ?? 'http://localhost:3012/api',
  STUDENT_MANAGEMENT_API_URL:
    process.env.STUDENT_MANAGEMENT_API_URL ?? 'http://localhost:3052/api',
  NOTIFICATION_SERVICE_URL:
    process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002/api/notifications',
  NOTIFICATION_SERVICE_API_KEY:
    process.env.NOTIFICATION_SERVICE_API_KEY ?? 'change-me-notification-service-key',
  PARENT_MIS_API_URL: process.env.PARENT_MIS_API_URL ?? 'http://localhost:3048/api',
  ACADEMIC_API_URL: process.env.ACADEMIC_API_URL ?? 'http://localhost:3003/api',
  PAYMENT_PORTAL_URL: process.env.PAYMENT_PORTAL_URL ?? 'http://localhost:3000/pay-fees',
  FEES_PORTAL_URL: process.env.FEES_PORTAL_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:3015',
} as const;

export function receiptPublicUrl(receiptNumber: string) {
  return `${env.FEES_PORTAL_URL.replace(/\/$/, '')}/r/${encodeURIComponent(receiptNumber)}`;
}
