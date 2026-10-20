import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

/** Comma-separated origins, e.g. Timetable FE + Teacher Portal FE */
function parseCorsOrigins(raw: string | undefined, fallback: string): string | string[] {
  const value = (raw ?? fallback).trim();
  const list = value
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (list.length === 0) return fallback;
  return list.length === 1 ? list[0] : list;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3010', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/timetable_db'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  /** Timetable UI (:3011) and Teacher Portal (:3012) both call this API */
  CORS_ORIGIN: parseCorsOrigins(
    process.env.CORS_ORIGIN,
    'http://localhost:3011,http://localhost:5173,http://localhost:3017'
  ),
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'timetable',
  /** Student Management API — classes and students for config class / generator */
  STUDENT_MANAGEMENT_API_URL:
    process.env.STUDENT_MANAGEMENT_API_URL ??
    process.env.ACADEMIC_API_URL ??
    'http://localhost:4024/api',
  /** @deprecated use STUDENT_MANAGEMENT_API_URL — kept for older .env files */
  ACADEMIC_API_URL:
    process.env.STUDENT_MANAGEMENT_API_URL ??
    process.env.ACADEMIC_API_URL ??
    'http://localhost:4024/api',
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  HR_API_URL: process.env.HR_API_URL ?? 'http://localhost:3005/api',
} as const;
