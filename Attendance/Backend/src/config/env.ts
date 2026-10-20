import path from "path";
import dotenv from "dotenv";

// Always load Backend/.env (PM2 cwd / stale env can otherwise keep wrong keys)
const backendEnvCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../..", ".env"),
];
for (const envPath of backendEnvCandidates) {
  dotenv.config({ path: envPath, override: true });
}

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function firstEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "3024", 10),
  API_PREFIX: process.env.API_PREFIX ?? "/api",
  DATABASE_URL: requireEnv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5433/attendance_rfid_db"
  ),
  JWT_ACCESS_SECRET: requireEnv(
    "JWT_ACCESS_SECRET",
    "dev-access-secret-change-in-production-32chars"
  ),
  SERVICE_API_KEY:
    firstEnv("SERVICE_API_KEY", "PLATFORM_SERVICE_KEY") || "dev-service-key",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3025",
  MODULE_SLUG: process.env.MODULE_SLUG ?? "attendance",
  STUDENT_MANAGEMENT_API_URL: process.env.STUDENT_MANAGEMENT_API_URL ?? "",
  /** Production ParentMIS API is on :4015 (not local :3048) */
  PARENT_MIS_API_URL:
    firstEnv("PARENT_MIS_API_URL") || "http://localhost:4015/api",
  IAM_API_URL: process.env.IAM_API_URL ?? "http://localhost:3001/api/v1",
  HR_API_URL: process.env.HR_API_URL ?? "http://localhost:3005/api",
  TIMETABLE_API_URL: process.env.TIMETABLE_API_URL ?? "http://localhost:3010/api",
  NOTIFICATION_SERVICE_URL:
    firstEnv("NOTIFICATION_SERVICE_URL") ||
    "http://localhost:4001/api/v1/notifications",
  /**
   * Must match Auth MODULE_PROVISIONING_KEY / PLATFORM_SERVICE_KEY.
   * Ignore literal "dev-service-key" when a real SERVICE key exists.
   */
  SMS_API_URL: firstEnv("SMS_API_URL") || "https://afrobulksms.com/api/sent/compose",
  SMS_API_KEY: firstEnv("SMS_API_KEY"),
  SMS_SENDER_ID: firstEnv("SMS_SENDER_ID") || "edupoto",
  SMS_FROM_NUMBER: firstEnv("SMS_FROM_NUMBER"),
  NOTIFICATION_SERVICE_API_KEY: (() => {
    const explicit = firstEnv("NOTIFICATION_SERVICE_API_KEY");
    const shared = firstEnv(
      "SERVICE_API_KEY",
      "PLATFORM_SERVICE_KEY",
      "MODULE_PROVISIONING_KEY"
    );
    if (explicit && explicit !== "dev-service-key") return explicit;
    if (shared && shared !== "dev-service-key") return shared;
    return explicit || shared || "dev-service-key";
  })(),
} as const;

export function logAttendanceDatabaseTarget() {
  try {
    const u = new URL(env.DATABASE_URL.replace(/^postgresql:/, "http:"));
    console.log(
      `[Attendance] Database ${u.hostname}:${u.port || "5432"}${u.pathname} (from ${process.cwd()})`
    );
  } catch {
    console.log("[Attendance] Database DATABASE_URL configured");
  }
}

export function logAttendanceIntegrations() {
  logAttendanceDatabaseTarget();
  console.log("[Attendance] Integration URLs:");
  console.log(`  NOTIFICATION_SERVICE_URL=${env.NOTIFICATION_SERVICE_URL}`);
  console.log(
    `  NOTIFICATION_SERVICE_API_KEY=${env.NOTIFICATION_SERVICE_API_KEY.slice(0, 8)}…`
  );
  console.log(`  PARENT_MIS_API_URL=${env.PARENT_MIS_API_URL}`);
  console.log(
    `  STUDENT_MANAGEMENT_API_URL=${env.STUDENT_MANAGEMENT_API_URL || "(empty)"}`
  );
}
