import path from 'path';
import dotenv from 'dotenv';

// Always load Backend/.env (wins over stale PM2 env for module URLs)
dotenv.config({ path: path.resolve(__dirname, '../..', '.env'), override: true });

function firstOf(...keysAndFallback: string[]): string {
  const fallback = keysAndFallback[keysAndFallback.length - 1] ?? '';
  const keys = keysAndFallback.slice(0, -1);
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value.replace(/\/$/, '');
  }
  return fallback.replace(/\/$/, '');
}

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

/**
 * ParentMIS talks to other modules via these URLs (server-side only).
 * On production, redeploy-module.sh sets localhost:<port> so calls stay on-box.
 * Public https://*-api.shuleplus.rw/api URLs also work if set manually.
 *
 * Academics / marks → STUDENT_MANAGEMENT_API_URL (not ACADEMIC_API_URL).
 * Setting ACADEMIC_API_URL alone does nothing for ParentMIS grades.
 */
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3048', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  /** Must match IAM MODULE_PROVISIONING_KEY / PLATFORM_SERVICE_KEY */
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY?.trim() ||
    process.env.PLATFORM_SERVICE_KEY?.trim() ||
    'dev-service-key',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3049',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'parentmis',

  /** IAM — org academic year/term from Authentication admin */
  IAM_API_URL: firstOf('IAM_API_URL', 'AUTH_API_URL', 'http://localhost:3001/api/v1'),

  ATTENDANCE_API_URL: firstOf('ATTENDANCE_API_URL', 'http://localhost:3024/api'),

  /** Live class timetable + period attendance from Timetable module */
  TIMETABLE_API_URL: firstOf('TIMETABLE_API_URL', 'http://localhost:3010/api'),

  /** Profiles, PIN login, academics/marks proxy */
  STUDENT_MANAGEMENT_API_URL: firstOf(
    'STUDENT_MANAGEMENT_API_URL',
    'STUDENTMANAGEMENT_API_URL',
    'SM_API_URL',
    'http://localhost:3052/api'
  ),

  /**
   * Browser-facing Student Management origin for photos (/uploads/...).
   * When STUDENT_MANAGEMENT_API_URL is localhost, parents' browsers cannot load
   * those URLs — use the public API host instead.
   */
  STUDENT_MANAGEMENT_PUBLIC_URL: firstOf(
    'STUDENT_MANAGEMENT_PUBLIC_URL',
    'NEXT_PUBLIC_STUDENT_MGMT_API_URL',
    'https://studentmanagement-api.shuleplus.rw'
  ),

  /** Fee statements / payments */
  SCHOOL_FEES_API_URL: firstOf(
    'SCHOOL_FEES_API_URL',
    'FEES_API_URL',
    'SCHOOLFEES_API_URL',
    'SCHOOL_FEES_PORTAL_API_URL',
    'http://localhost:3014/api'
  ),

  CANTEEN_API_URL: firstOf('CANTEEN_API_URL', 'CAFETERIA_API_URL', 'http://localhost:4013/api'),

  SHULEKIT_API_URL: firstOf('SHULEKIT_API_URL', 'MATERIALS_API_URL', 'http://localhost:4021/api'),

  DISCIPLINE_API_URL: firstOf(
    'DISCIPLINE_API_URL',
    'STUDENT_DISCIPLINE_API_URL',
    'STUDENTDISCIPLINE_API_URL',
    'http://localhost:4019/api'
  ),

  TRANSPORT_API_URL: firstOf('TRANSPORT_API_URL', 'http://localhost:3064/api'),

  PUBLIC_SITE_URL: firstOf('PUBLIC_SITE_URL', 'https://shuleplus.rw'),

  /** Teacher assessments & published marks (TichaPortal / Academic module). */
  ACADEMIC_API_URL: firstOf('ACADEMIC_API_URL', 'ACADEMIC_MODULE_API_URL', 'http://localhost:3003/api'),
} as const;

export function logIntegrationUrls() {
  const rows: Array<[string, string]> = [
    ['STUDENT_MANAGEMENT_API_URL', env.STUDENT_MANAGEMENT_API_URL],
    ['SCHOOL_FEES_API_URL', env.SCHOOL_FEES_API_URL],
    ['ATTENDANCE_API_URL', env.ATTENDANCE_API_URL],
    ['TIMETABLE_API_URL', env.TIMETABLE_API_URL],
    ['DISCIPLINE_API_URL', env.DISCIPLINE_API_URL],
    ['CANTEEN_API_URL', env.CANTEEN_API_URL],
    ['SHULEKIT_API_URL', env.SHULEKIT_API_URL],
    ['TRANSPORT_API_URL', env.TRANSPORT_API_URL],
    ['PUBLIC_SITE_URL', env.PUBLIC_SITE_URL],
  ];
  rows.push(['IAM_API_URL', env.IAM_API_URL]);
  rows.push(['ACADEMIC_API_URL', env.ACADEMIC_API_URL]);
  console.log('[ParentMIS] Integration URLs:');
  for (const [key, value] of rows) {
    console.log(`  ${key}=${value}`);
  }
}
