import dotenv from 'dotenv';

dotenv.config();

/** Prisma rejects quoted URLs like `"postgresql://…"` from PM2/.env. */
function unquoteEnv(key: string) {
  const raw = process.env[key];
  if (raw == null) return;
  let v = raw.trim();
  for (let i = 0; i < 4; i++) {
    const next = v.replace(/^["'`“”‘’]+/, '').replace(/["'`“”‘’]+$/, '').trim();
    if (next === v) break;
    v = next;
  }
  process.env[key] = v;
}

unquoteEnv('DATABASE_URL');

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3001', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api/v1',

  DATABASE_URL: requireEnv('DATABASE_URL'),

  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',

  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production-32chars'),
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY ?? '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY ?? '30d',

  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS ?? '5', 10),
  LOCKOUT_DURATION_MINUTES: parseInt(process.env.LOCKOUT_DURATION_MINUTES ?? '15', 10),
  SESSION_INACTIVITY_MINUTES: parseInt(process.env.SESSION_INACTIVITY_MINUTES ?? '30', 10),

  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  FRONTEND_URL: process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  /** Public IAM API URL for developer gateway (e.g. https://shuleplus.rw/api/v1). See developer-public-url.ts */
  PUBLIC_API_URL: process.env.PUBLIC_API_URL?.trim() || process.env.IAM_PUBLIC_API_URL?.trim() || '',

  SWAGGER_ENABLED: process.env.SWAGGER_ENABLED !== 'false',
  SWAGGER_PATH: process.env.SWAGGER_PATH ?? '/api/docs',

  ROOT_ADMIN_EMAIL: process.env.ROOT_ADMIN_EMAIL ?? '',
  ROOT_ADMIN_PASSWORD: process.env.ROOT_ADMIN_PASSWORD ?? '',
  ROOT_ADMIN_FIRST_NAME: process.env.ROOT_ADMIN_FIRST_NAME ?? 'ISHIMWE',
  ROOT_ADMIN_LAST_NAME: process.env.ROOT_ADMIN_LAST_NAME ?? 'Theoneste',
  ROOT_ADMIN_PHONE: process.env.ROOT_ADMIN_PHONE ?? '',

  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? '587', 10),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  SMTP_FROM: process.env.SMTP_FROM ?? 'ShulePlus <noreply@shuleplus.com>',

  SMS_API_URL: process.env.SMS_API_URL?.trim() || 'https://afrobulksms.com/api/sent/compose',
  SMS_API_KEY: process.env.SMS_API_KEY?.trim() ?? '',
  SMS_FROM_NUMBER: process.env.SMS_FROM_NUMBER?.trim() ?? '',
  SMS_SENDER_ID: process.env.SMS_SENDER_ID?.trim() || 'edupoto',

  /** Set explicitly to enable; empty = IAM sends email directly (or logs link in dev). */
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL?.trim() ?? '',
  NOTIFICATION_SERVICE_API_KEY: process.env.NOTIFICATION_SERVICE_API_KEY ?? '',

  /**
   * Secret IAM sends as x-service-key when calling module POST /api/tenant/create.
   * Must match each microservice's SERVICE_API_KEY / PLATFORM_SERVICE_KEY.
   * Do NOT reuse NOTIFICATION_SERVICE_API_KEY — keep module keys separate.
   */
  STUDENT_MANAGEMENT_API_URL: process.env.STUDENT_MANAGEMENT_API_URL ?? 'http://localhost:3052/api',
  HR_API_URL: process.env.HR_API_URL ?? 'http://localhost:3005/api',
  TIMETABLE_API_URL: process.env.TIMETABLE_API_URL ?? 'http://localhost:3010/api',
  STUDENT_DISCIPLINE_API_URL: process.env.STUDENT_DISCIPLINE_API_URL ?? 'http://localhost:3032/api',
  ATTENDANCE_API_URL: process.env.ATTENDANCE_API_URL ?? 'http://localhost:3024/api',
  PLATFORM_SERVICE_KEY: process.env.PLATFORM_SERVICE_KEY ?? 'dev-service-key',
  MODULE_PROVISIONING_KEY:
    process.env.MODULE_PROVISIONING_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',

  /** Sandbox org UUID — defaults to live ST THEO SCHOOL (Organization Admin + Student Management). */
  DEVELOPER_SANDBOX_ORGANIZATION_ID:
    process.env.DEVELOPER_SANDBOX_ORGANIZATION_ID?.trim() ||
    'b4e8c3c3-b510-44e1-9f92-696e2a1506f3',

  SCHOOL_FEES_API_URL: process.env.SCHOOL_FEES_API_URL ?? 'http://localhost:3014/api',
  BABYEYI_WIZARD_API_URL: process.env.BABYEYI_WIZARD_API_URL ?? 'http://localhost:3012/api',
  WEBPAGE_BABYEYI_API_URL: process.env.WEBPAGE_BABYEYI_API_URL ?? 'http://localhost:3099/api',
  PAYROLL_API_URL: process.env.PAYROLL_API_URL ?? 'http://localhost:3026/api',
  KAZI_API_URL: process.env.KAZI_API_URL ?? 'http://localhost:4400',
  TICHA_PORTAL_API_URL: process.env.TICHA_PORTAL_API_URL ?? 'http://localhost:4000/api',

  /** Flag file nginx checks to serve the maintenance page (production default). */
  NGINX_MAINTENANCE_FLAG_PATH: process.env.NGINX_MAINTENANCE_FLAG_PATH ?? '/var/www/shuleplus/maintenance/ON',
  /** Optional script invoked as: script enable|disable (must reload nginx on the server). */
  NGINX_MAINTENANCE_SCRIPT: process.env.NGINX_MAINTENANCE_SCRIPT ?? '',
} as const;
