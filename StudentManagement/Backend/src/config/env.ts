import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3052', 10),
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
    process.env.CORS_ORIGIN ?? 'http://localhost:3053,http://localhost:3000',
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? '3052'}`,
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'student-management',
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  IAM_DEVELOPER_PORTAL_URL:
    process.env.IAM_DEVELOPER_PORTAL_URL ?? 'http://localhost:3000',
  /** Public API base for OpenAPI servers (production subdomain). */
  PUBLIC_API_BASE_URL: process.env.PUBLIC_API_BASE_URL ?? '',
  TIMETABLE_API_URL: process.env.TIMETABLE_API_URL ?? 'http://localhost:3010/api',
  HR_API_URL: process.env.HR_API_URL ?? 'http://localhost:3005/api',
} as const;
