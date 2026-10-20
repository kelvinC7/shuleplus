import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3009', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3010',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'teacher-portal',
  DEFAULT_NET_SALARY_RWF: parseInt(process.env.DEFAULT_NET_SALARY_RWF ?? '500000', 10),
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  TIMETABLE_API_URL: process.env.TIMETABLE_API_URL ?? 'http://localhost:3010/api',
  STUDENT_MANAGEMENT_API_URL:
    process.env.STUDENT_MANAGEMENT_API_URL ??
    process.env.ACADEMIC_API_URL ??
    'http://localhost:3052/api',
  ATTENDANCE_API_URL: process.env.ATTENDANCE_API_URL ?? 'http://localhost:3024/api',
  STUDENT_DISCIPLINE_API_URL:
    process.env.STUDENT_DISCIPLINE_API_URL ?? 'http://localhost:3032/api',
  ACADEMIC_API_URL: process.env.ACADEMIC_API_URL ?? 'http://localhost:3003/api',
} as const;
