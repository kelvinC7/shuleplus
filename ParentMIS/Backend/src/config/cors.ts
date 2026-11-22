/** Browser / Capacitor origins allowed in addition to CORS_ORIGIN. */
export const MOBILE_APP_ORIGINS = [
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
] as const;

const SHULEPLUS_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*shuleplus\.rw(?::\d+)?$/i;
const CAPACITOR_ORIGIN =
  /^(capacitor:\/\/localhost|https?:\/\/localhost(:\d+)?|ionic:\/\/localhost)$/i;
const DEV_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

/** Env vars that may hold a site URL whose origin should be allowed (web + PWA). */
const ORIGIN_ENV_KEYS = [
  'FRONTEND_URL',
  'PUBLIC_SITE_URL',
  'PUBLIC_BASE_URL',
  'FEES_PORTAL_URL',
  'PARENT_PORTAL_URL',
  'TEACHER_PORTAL_URL',
] as const;

export function parseOriginList(raw: string): string[] {
  return String(raw)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Origins parsed from module .env URL fields (scheme + host only). */
export function originsFromModuleEnv(): string[] {
  const out = new Set<string>();
  for (const key of ORIGIN_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (!value) continue;
    try {
      out.add(new URL(value).origin);
    } catch {
      // Not a full URL — ignore.
    }
  }
  return [...out];
}

export function buildAllowedOriginSet(configuredCsv: string): Set<string> {
  return new Set([
    ...parseOriginList(configuredCsv),
    ...originsFromModuleEnv(),
    ...MOBILE_APP_ORIGINS,
  ]);
}

export function isOriginAllowed(
  origin: string | undefined,
  configuredCsv: string,
  nodeEnv = process.env.NODE_ENV ?? 'development'
): boolean {
  if (!origin) return true;
  const configured = buildAllowedOriginSet(configuredCsv);
  if (configured.has('*') || configured.has(origin)) return true;
  if (SHULEPLUS_ORIGIN.test(origin)) return true;
  if (CAPACITOR_ORIGIN.test(origin)) return true;
  if (nodeEnv !== 'production' && DEV_LOCAL.test(origin)) return true;
  return false;
}

export type CorsCallback = (err: Error | null, allow?: boolean | string) => void;

export function corsOriginCallback(configuredCsv: string, nodeEnv?: string) {
  return (origin: string | undefined, callback: CorsCallback) => {
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin, configuredCsv, nodeEnv)) return callback(null, origin);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  };
}

export function socketIoCorsOrigin(configuredCsv: string, nodeEnv?: string) {
  return (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true);
    cb(null, isOriginAllowed(origin, configuredCsv, nodeEnv));
  };
}
