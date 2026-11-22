import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3080', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api/director',
  /** Must match IAM JWT_ACCESS_SECRET */
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ??
    'dev-access-secret-change-in-production-32chars',
  /** Must match IAM MODULE_PROVISIONING_KEY */
  SERVICE_API_KEY: process.env.SERVICE_API_KEY ?? 'dev-service-key',
  DATABASE_URL: process.env.DATABASE_URL ?? 'file:./director-console.db',
  /** IAM backend - live integration source for school data */
  IAM_API_URL: (process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/$/, ''),
  /** Module service APIs (service-to-service, x-service-key) */
  STUDENT_MANAGEMENT_API_URL: (
    process.env.STUDENT_MANAGEMENT_API_URL ?? 'http://localhost:3052/api'
  ).replace(/\/$/, ''),
  ACADEMIC_API_URL: (process.env.ACADEMIC_API_URL ?? 'http://localhost:3003/api').replace(/\/$/, ''),
  TIMETABLE_API_URL: (process.env.TIMETABLE_API_URL ?? 'http://localhost:3010/api').replace(/\/$/, ''),
  ATTENDANCE_API_URL: (process.env.ATTENDANCE_API_URL ?? 'http://localhost:3024/api').replace(/\/$/, ''),
  /** ParentMIS - transport change/issue requests (service-to-service) */
  PARENTMIS_API_URL: (process.env.PARENTMIS_API_URL ?? 'http://localhost:3048/api').replace(/\/$/, ''),
  /** ProcurementMIS - purchase request approvals (service-to-service) */
  PROCUREMENT_API_URL: (process.env.PROCUREMENT_API_URL ?? 'http://localhost:3030/api').replace(/\/$/, ''),
  /**
   * When true and no IAM token is present, the API serves a seeded demo
   * dataset (St Matthew's prototype figures) so the portal is reviewable.
   * The response meta always reports mode: "demo" and the UI labels it.
   */
  ALLOW_DEMO: (process.env.ALLOW_DEMO ?? 'true') === 'true',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3081',
  MODULE_SLUG: 'director-console',
} as const;
