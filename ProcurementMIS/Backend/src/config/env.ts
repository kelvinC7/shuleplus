import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3030', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  /** Must match IAM MODULE_PROVISIONING_KEY / PLATFORM_SERVICE_KEY */
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3031',
  /**
   * Public frontend origin used in QR verification links. Falls back to the
   * first configured CORS origin so existing deployments keep working.
   */
  PUBLIC_APP_URL:
    (process.env.PUBLIC_APP_URL ??
      (process.env.CORS_ORIGIN ?? 'http://localhost:3031').split(',')[0])
      .trim()
      .replace(/\/+$/, ''),
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  /** InventoryMIS service-to-service API (item catalogue for Excel imports). */
  INVENTORY_API_URL: process.env.INVENTORY_API_URL ?? 'http://localhost:4011/api',
  INVENTORY_SERVICE_KEY:
    process.env.INVENTORY_SERVICE_KEY ??
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'procurement-mis',
} as const;
