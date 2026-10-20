import path from 'path';
import dotenv from 'dotenv';

// Always load Backend/.env (avoid cwd / BOM surprises when starting the service)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3051', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3050',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'canteen',
  ACADEMIC_API_URL: process.env.ACADEMIC_API_URL ?? 'http://localhost:3003/api',
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  IAM_URL: process.env.IAM_URL ?? 'http://localhost:3000',
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? '3051'}`,
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? path.resolve(__dirname, '../../public/uploads'),
} as const;
