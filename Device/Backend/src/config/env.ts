import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3062', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3063',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'device',
  STUDENT_MANAGEMENT_API_URL:
    process.env.STUDENT_MANAGEMENT_API_URL ?? 'http://localhost:3052/api',
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL ?? '',
  MQTT_USERNAME: process.env.MQTT_USERNAME ?? '',
  MQTT_PASSWORD: process.env.MQTT_PASSWORD ?? '',
  MQTT_TOPIC_PREFIX: process.env.MQTT_TOPIC_PREFIX ?? 'shuleplus/rfid',
} as const;
