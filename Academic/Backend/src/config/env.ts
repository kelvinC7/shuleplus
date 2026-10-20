import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3003', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  /** Must match IAM MODULE_PROVISIONING_KEY / PLATFORM_SERVICE_KEY */
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  /** Comma-separated origins (Academic FE + IAM landing). */
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ?? 'http://localhost:3004,http://localhost:3000',
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? '3003'}`,
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'academic',
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  /** Browser-reachable IAM origin for logos/signatures (prod: https://shuleplus.rw). */
  IAM_PUBLIC_ORIGIN: process.env.IAM_PUBLIC_ORIGIN?.trim() || '',
  STUDENT_MANAGEMENT_API_URL: process.env.STUDENT_MANAGEMENT_API_URL ?? 'http://localhost:3052/api',
  /** Browser-reachable Student Management origin for student photos in report cards. */
  STUDENT_MANAGEMENT_PUBLIC_URL: process.env.STUDENT_MANAGEMENT_PUBLIC_URL?.trim() || '',
  TIMETABLE_API_URL: process.env.TIMETABLE_API_URL ?? 'http://localhost:3010/api',
  SCHOOL_FEES_API_URL: process.env.SCHOOL_FEES_API_URL ?? 'http://localhost:3014/api',
  /** TichaPortal BFF — teacher permissions & round roll call (prod PM2 ticha-api :4003). */
  TICHA_PORTAL_API_URL:
    process.env.TICHA_PORTAL_API_URL ??
    process.env.TEACHER_PORTAL_URL ??
    'http://localhost:4000/api',
} as const;
