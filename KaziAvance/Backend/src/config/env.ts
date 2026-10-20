import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

/**
 * PM2 runs `node dist/index.js`, so __dirname is Backend/dist/config.
 * `../../.env` from there is KaziAvance/.env (wrong) — Backend/.env never loads,
 * Prisma throws Missing DATABASE_URL, and kazi-api crash-loops.
 */
function resolveEnvPath() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, "../../.env"),
  ];
  for (const envFile of candidates) {
    const dir = path.dirname(envFile);
    if (!fs.existsSync(envFile) || !fs.existsSync(path.join(dir, "package.json"))) continue;
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")) as {
        name?: string;
      };
      if (pkg.name === "kaziavance-backend") return envFile;
    } catch {
      /* try next */
    }
  }
  return candidates.find((p) => fs.existsSync(p)) ?? path.resolve(process.cwd(), ".env");
}

const envPath = resolveEnvPath();
dotenv.config({ path: envPath, override: true });

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key} (looked in ${envPath})`);
  }
  return value.trim();
}

function portFromEnv() {
  const raw = String(process.env.PORT ?? "4400").replace(/['"]/g, "").trim();
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 4400;
}

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error(`Missing DATABASE_URL (looked in ${envPath}). kazi-api cannot start.`);
}

export const env = {
  PORT: portFromEnv(),
  JWT_ACCESS_SECRET: requireEnv("JWT_ACCESS_SECRET", "dev-jwt-secret"),
  MODULE_SLUG: (process.env.MODULE_SLUG ?? "kaziavance").replace(/^"|"$/g, "").trim(),
  /** Must match IAM MODULE_PROVISIONING_KEY / PLATFORM_SERVICE_KEY */
  SERVICE_API_KEY: process.env.SERVICE_API_KEY ?? "dev-service-key",
  ENABLE_LOCAL_LOGIN: process.env.ENABLE_LOCAL_LOGIN === "true",
  PAYROLL_API_URL: process.env.PAYROLL_API_URL ?? "",
  PAYROLL_API_KEY: process.env.PAYROLL_API_KEY ?? "",
  IAM_API_URL: (process.env.IAM_API_URL ?? "http://localhost:3001/api/v1").replace(/\/$/, ""),
  HR_API_URL: (process.env.HR_API_URL ?? "").replace(/\/$/, ""),
  TIMETABLE_API_URL: (process.env.TIMETABLE_API_URL ?? "http://localhost:3010/api").replace(/\/$/, ""),
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? "uploads"
};

// eslint-disable-next-line no-console
console.log(
  `[KaziAdvance env] loaded ${envPath} | PORT=${env.PORT} | JWT_ACCESS_SECRET length=${env.JWT_ACCESS_SECRET.length} | MODULE_SLUG=${env.MODULE_SLUG}`
);
