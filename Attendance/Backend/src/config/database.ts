import { PrismaClient } from "../generated/prisma";
import { env } from "./env";

/** Explicit URL so PM2/stale process env cannot silently use another Postgres. */
export const prisma = new PrismaClient({
  datasources: { db: { url: env.DATABASE_URL } },
});
