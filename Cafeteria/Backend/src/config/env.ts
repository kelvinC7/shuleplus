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
  PORT: parseInt(process.env.PORT ?? '3043', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3042',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'cafeteria',
  INVENTORY_API_URL: process.env.INVENTORY_API_URL ?? 'http://localhost:3044/api',
  INVENTORY_SERVICE_KEY: process.env.INVENTORY_SERVICE_KEY ?? 'dev-service-key',
} as const;
