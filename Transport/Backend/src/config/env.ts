import dotenv from "dotenv";

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "3064", 10),
  API_PREFIX: process.env.API_PREFIX ?? "/api",
  DATABASE_URL: requireEnv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/transport_db"
  ),
  JWT_ACCESS_SECRET: requireEnv(
    "JWT_ACCESS_SECRET",
    "dev-access-secret-change-in-production-32chars"
  ),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ?? process.env.PLATFORM_SERVICE_KEY ?? "dev-service-key",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3065",
  MODULE_SLUG: process.env.MODULE_SLUG ?? "transport",
  STUDENT_MANAGEMENT_API_URL: process.env.STUDENT_MANAGEMENT_API_URL ?? "",
  PARENT_MIS_API_URL: process.env.PARENT_MIS_API_URL ?? "",
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL ?? "",
  NOTIFICATION_SERVICE_API_KEY:
    process.env.NOTIFICATION_SERVICE_API_KEY ??
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    "",
  INTERNAL_CHAT_API_URL: process.env.INTERNAL_CHAT_API_URL ?? "",
  IAM_API_URL: process.env.IAM_API_URL ?? "http://localhost:3001/api/v1",
  /** OpenStreetMap-compatible routing (OSRM). Use your own instance in production. */
  OSRM_URL: process.env.OSRM_URL ?? "https://router.project-osrm.org",
  /** Nominatim or compatible geocoder (self-host recommended at scale). */
  NOMINATIM_URL: process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org",
  /** Required by Nominatim usage policy — include contact email in production. */
  MAP_HTTP_USER_AGENT:
    process.env.MAP_HTTP_USER_AGENT ?? "ShulePlus-Transport/1.0 (school transport; contact: admin@localhost)",
} as const;
