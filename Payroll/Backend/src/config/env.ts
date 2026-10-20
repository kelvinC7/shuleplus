import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3026', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-in-production-32chars',
  SERVICE_API_KEY: process.env.SERVICE_API_KEY ?? process.env.PLATFORM_SERVICE_KEY ?? 'dev-service-key',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3008',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'payroll',
  HR_API_URL: process.env.HR_API_URL ?? 'http://localhost:3005/api',
  HR_INTEGRATION_ENABLED: process.env.HR_INTEGRATION_ENABLED !== 'false',
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  TEACHER_PORTAL_URL: process.env.TEACHER_PORTAL_URL ?? 'http://localhost:3009',
  /** KaziAdvance backend (salary advance deductions on run payroll) */
  KAZI_API_URL: process.env.KAZI_API_URL ?? 'http://localhost:4400',
  KAZI_INTEGRATION_ENABLED: process.env.KAZI_INTEGRATION_ENABLED !== 'false',
};
