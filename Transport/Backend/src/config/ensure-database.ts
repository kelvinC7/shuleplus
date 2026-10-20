import { execFileSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";
import { PrismaClient } from "@prisma/client";
import { env } from "./env";

function backendRoot() {
  return path.resolve(__dirname, "../..");
}

function parseDatabaseUrl(url: string) {
  const u = new URL(url.replace(/^postgresql:/i, "http:"));
  const database = decodeURIComponent(u.pathname.replace(/^\//, "").split("?")[0] || "transport_db");
  return {
    host: u.hostname || "localhost",
    port: u.port ? Number(u.port) : 5432,
    user: decodeURIComponent(u.username || "postgres"),
    password: decodeURIComponent(u.password || ""),
    database,
  };
}

export async function ensureDatabase() {
  const parsed = parseDatabaseUrl(env.DATABASE_URL);
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(parsed.database)) {
    throw new Error(`Unsafe database name in DATABASE_URL: ${parsed.database}`);
  }

  const admin = new Client({
    host: parsed.host,
    port: parsed.port,
    user: parsed.user,
    password: parsed.password,
    database: "postgres",
  });

  try {
    await admin.connect();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not connect to PostgreSQL at ${parsed.host}:${parsed.port} as ${parsed.user}. ${message}`
    );
  }

  try {
    const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      parsed.database,
    ]);
    if (!rowCount) {
      await admin.query(`CREATE DATABASE "${parsed.database}"`);
      console.log(`Created PostgreSQL database "${parsed.database}"`);
    }
  } finally {
    await admin.end();
  }
}

export async function ensureSchema(prisma: PrismaClient) {
  const rows = await prisma.$queryRaw<{ exists: string | null }[]>`
    SELECT to_regclass('public.tenants')::text AS exists
  `;
  if (rows[0]?.exists) return;

  console.log("Applying Transport schema (first run)…");
  const bin =
    process.platform === "win32"
      ? path.join(backendRoot(), "node_modules", ".bin", "prisma.cmd")
      : path.join(backendRoot(), "node_modules", ".bin", "prisma");
  execFileSync(bin, ["db", "push", "--skip-generate"], {
    cwd: backendRoot(),
    stdio: "inherit",
    env: process.env,
  });
}
