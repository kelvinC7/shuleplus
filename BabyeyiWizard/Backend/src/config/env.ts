import path from 'path';
import dotenv from 'dotenv';

// PM2 --update-env can cache a stale DATABASE_URL; module .env must win in production.
dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });

/** Prisma rejects quoted URLs like `"postgresql://…"` from PM2/.env. */
function unquoteEnv(key: string) {
  const raw = process.env[key];
  if (raw == null) return;
  let v = raw.trim();
  for (let i = 0; i < 4; i++) {
    const next = v.replace(/^["'`“”‘’]+/, '').replace(/["'`“”‘’]+$/, '').trim();
    if (next === v) break;
    v = next;
  }
  process.env[key] = v;
}

unquoteEnv('DATABASE_URL');
unquoteEnv('PORT');

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

/** Cap Prisma pool size — many ShulePlus modules share one Postgres host. */
function withConnectionLimit(url: string, limit = 2): string {
  const normalized = url.replace(/connection_limit=\d+/i, `connection_limit=${limit}`);
  if (/connection_limit=/i.test(normalized)) return normalized;
  const sep = normalized.includes('?') ? '&' : '?';
  return `${normalized}${sep}connection_limit=${limit}`;
}

const databaseUrl = withConnectionLimit(requireEnv('DATABASE_URL'));
process.env.DATABASE_URL = databaseUrl;

const databaseLog = databaseUrl.replace(/\/\/[^@]+@/, '//***@');
if (process.env.NODE_ENV === 'production') {
  console.log(`[Babyeyi Wizard] DATABASE_URL=${databaseLog}`);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3012', 10),
  API_PREFIX: process.env.API_PREFIX ?? '/api',
  DATABASE_URL: databaseUrl,
  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-production-32chars'),
  SERVICE_API_KEY:
    process.env.SERVICE_API_KEY ??
    process.env.PLATFORM_SERVICE_KEY ??
    'dev-service-key',
  /** Comma-separated origins (Babyeyi FE + IAM landing). */
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3013,http://localhost:3000',
  MODULE_SLUG: process.env.MODULE_SLUG ?? 'babyeyi',
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? 'uploads',
  VERIFY_PUBLIC_URL:
    process.env.VERIFY_PUBLIC_URL && !/localhost|127\.0\.0\.1/i.test(process.env.VERIFY_PUBLIC_URL)
      ? process.env.VERIFY_PUBLIC_URL.replace(/\/$/, '')
      : process.env.NODE_ENV === 'production' ||
          (process.env.CORS_ORIGIN ?? '').includes('shuleplus.rw')
        ? 'https://babyeyi.shuleplus.rw/verify'
        : 'http://localhost:3013/verify',
  IAM_API_URL: process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1',
  /** Public-facing IAM origin for resolving branding assets cross-origin (no trailing slash). */
  IAM_ORIGIN:
    process.env.IAM_ORIGIN?.replace(/\/+$/, '') ||
    (process.env.IAM_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/api\/v1\/?$/, ''),
  NESA_API_URL: process.env.NESA_API_URL ?? 'http://localhost:3018/api',
  /** Student Management module — classes, students, education levels. */
  STUDENT_MANAGEMENT_API_URL:
    process.env.STUDENT_MANAGEMENT_API_URL ?? 'http://localhost:3052/api',
  /** @deprecated Use STUDENT_MANAGEMENT_API_URL */
  ACADEMIC_API_URL: process.env.ACADEMIC_API_URL ?? 'http://localhost:3003/api',
  PUBLIC_API_URL: process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? '3012'}/api`,
  /**
   * Auto-translation of circular narrative content (EN -> RW/FR).
   * MyMemory is primary because it is the only free provider that actually covers
   * Kinyarwanda (`rw`) — LibreTranslate's public language list has no `rw` model at all.
   * LibreTranslate is kept as a fallback (mainly useful for French / low-confidence results).
   */
  TRANSLATION_ENABLED: process.env.TRANSLATION_ENABLED !== '0',
  MYMEMORY_URL: process.env.MYMEMORY_URL ?? 'https://api.mymemory.translated.net/get',
  MYMEMORY_EMAIL: process.env.MYMEMORY_EMAIL ?? '',
  LIBRETRANSLATE_URL: process.env.LIBRETRANSLATE_URL ?? 'https://libretranslate.com/translate',
  LIBRETRANSLATE_API_KEY: process.env.LIBRETRANSLATE_API_KEY ?? '',
} as const;
