import dotenv from "dotenv";

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

const NODE_ENV = process.env.NODE_ENV ?? "development";
const isProduction = NODE_ENV === "production";

export const env = {
  NODE_ENV,
  PORT: parseInt(process.env.PORT ?? "3051", 10),
  API_PREFIX: process.env.API_PREFIX ?? "/api",
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_ACCESS_SECRET: requireEnv(
    "JWT_ACCESS_SECRET",
    "dev-access-secret-change-in-production-32chars",
  ),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    "dev-service-key",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3050",
  MODULE_SLUG: process.env.MODULE_SLUG ?? "school-uniform",
  IAM_API_URL: (
    process.env.IAM_API_URL ??
    (isProduction ? "http://localhost:4001/api/v1" : "http://localhost:3001/api/v1")
  ).replace(/\/$/, ""),
  /** Student Management is the canonical student roster source. */
  STUDENT_MANAGEMENT_API_URL: (
    process.env.STUDENT_MANAGEMENT_API_URL ??
    process.env.ACADEMIC_API_URL ??
    (isProduction ? "http://localhost:4024/api" : "http://localhost:3052/api")
  ).replace(/\/$/, ""),
  /** @deprecated Use STUDENT_MANAGEMENT_API_URL */
  ACADEMIC_API_URL: (process.env.ACADEMIC_API_URL ?? "").replace(/\/$/, ""),
} as const;
