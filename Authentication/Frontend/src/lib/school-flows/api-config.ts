/** Public API base URLs — aligned with LandingPage portal-api. */

function isHostedLanding(): boolean {
  if (typeof window === 'undefined') return false;
  return /(^|\.)shuleplus\.rw$/i.test(window.location.hostname);
}

function resolvePublicApi(
  envVal: string | undefined,
  localDefault: string,
  prodDefault: string
): string {
  const raw = (envVal ?? '').replace(/\/$/, '');
  if (isHostedLanding()) {
    if (!raw || /localhost|127\.0\.0\.1/i.test(raw)) return prodDefault;
    return raw;
  }
  return raw || localDefault;
}

export const BABYEYI_API = resolvePublicApi(
  process.env.NEXT_PUBLIC_BABYEYI_API_URL,
  'http://localhost:3012/api',
  'https://babyeyi-api.shuleplus.rw/api'
);

export const SCHOOL_FEES_API = resolvePublicApi(
  process.env.NEXT_PUBLIC_SCHOOL_FEES_API_URL,
  'http://localhost:3014/api',
  'https://fees.shuleplus.rw/api'
);

/** WebpageBabyeyi backend proxy (lookup + optional legacy routes). */
export const BABYEYI_WEB_API = resolvePublicApi(
  process.env.NEXT_PUBLIC_BABYEYI_WEB_API_URL ?? process.env.NEXT_PUBLIC_WEBPAGE_BABYEYI_API_URL,
  'http://localhost:3099/api',
  'https://babyeyi-api.shuleplus.rw/api'
);
