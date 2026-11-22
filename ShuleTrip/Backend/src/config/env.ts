import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

const governmentRolesRaw = process.env.GOVERNMENT_ROLES ?? 'super_admin,district_education_officer,sector_education_inspector';

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3076', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3077,http://localhost:3000',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'shule-trip',
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  STUDENT_MANAGEMENT_API_URL: process.env.STUDENT_MANAGEMENT_API_URL ?? 'http://localhost:3052/api',
  GOVERNMENT_ROLES: governmentRolesRaw.split(',').map((r) => r.trim()).filter(Boolean),
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? 'uploads',
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL ?? '',
  NOTIFICATION_SERVICE_API_KEY:
    process.env.NOTIFICATION_SERVICE_API_KEY ?? process.env.SERVICE_API_KEY ?? 'dev-service-key',
  SHULETRIP_PUBLIC_LOGIN_URL: process.env.SHULETRIP_PUBLIC_LOGIN_URL ?? 'http://localhost:3077/login',
  PARENTMIS_API_URL: process.env.PARENTMIS_API_URL ?? 'http://localhost:3048/api',
} as const;
