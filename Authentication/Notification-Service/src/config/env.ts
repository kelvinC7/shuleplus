import 'dotenv/config';

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3002', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api/notifications',
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  SERVICE_API_KEY: process.env.SERVICE_API_KEY ?? '',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? '587', 10),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  SMTP_FROM: process.env.SMTP_FROM ?? 'ShulePlus <noreply@shuleplus.com>',
  SMS_API_URL: process.env.SMS_API_URL?.trim() || 'https://afrobulksms.com/api/sent/compose',
  SMS_API_KEY: process.env.SMS_API_KEY?.trim() ?? '',
  SMS_FROM_NUMBER: process.env.SMS_FROM_NUMBER?.trim() ?? '',
  SMS_SENDER_ID: process.env.SMS_SENDER_ID?.trim() || 'edupoto',
  PUSH_PROVIDER: process.env.PUSH_PROVIDER ?? 'console',
  OTP_TTL_SECONDS: parseInt(process.env.OTP_TTL_SECONDS ?? '600', 10),

  SWAGGER_ENABLED: process.env.SWAGGER_ENABLED !== 'false',
  SWAGGER_PATH: process.env.SWAGGER_PATH ?? '/api/docs',
};
