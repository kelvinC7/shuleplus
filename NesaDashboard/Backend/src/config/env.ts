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
  DATABASE_URL: requireEnv(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/shuleplus_nesa?schema=public'
  ),
  JWT_ACCESS_SECRET: requireEnv(
    'JWT_ACCESS_SECRET',
    'dev-access-secret-change-in-production-32chars'
  ),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ?? process.env.PLATFORM_SERVICE_KEY ?? 'dev-service-key',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3015',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'nesa',
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  BABYEYI_API_URL: process.env.BABYEYI_API_URL ?? 'http://localhost:3012/api',
} as const;
