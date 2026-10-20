import { env } from '../config/env';

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

/** Browser-reachable IAM origin (school logos live at /uploads on apex). */
export function browserIamOrigin(): string {
  if (env.NODE_ENV === 'production') {
    const configured = process.env.IAM_PUBLIC_ORIGIN?.trim().replace(/\/$/, '');
    if (configured) return configured;
    return 'https://shuleplus.rw';
  }
  return env.IAM_API_URL.replace(/\/api\/v1\/?$/, '') || 'http://localhost:3001';
}

/** Browser-reachable MiniWebsite API origin (module image uploads). */
export function browserModuleOrigin(): string {
  return env.PUBLIC_BASE_URL.replace(/\/$/, '');
}

/** Rewrite dev/loopback asset hosts saved in DB to public URLs browsers can load. */
export function rewriteStoredAssetHost(url: string): string {
  let out = url.trim();
  if (!LOCAL_HOST.test(out)) return out;

  // IAM auth-api / legacy dev IAM
  if (/:(3001|4001)(\/|$)/.test(out)) {
    return out.replace(LOCAL_HOST, browserIamOrigin());
  }
  // MiniWebsite dev API
  if (/:(3055|4026)(\/|$)/.test(out)) {
    return out.replace(LOCAL_HOST, browserModuleOrigin());
  }
  return out;
}

/** Auth API origin for server-side IAM calls (loopback in production). */
export function iamPublicOrigin(): string {
  return env.IAM_API_URL.replace(/\/api\/v1\/?$/, '') || 'http://localhost:3001';
}

/** Turn relative IAM `/uploads/...` paths into browser-loadable URLs. */
export function resolveExternalAssetUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  let trimmed = rewriteStoredAssetHost(url.trim());
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const origin = browserIamOrigin();
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

/** Resolve module-hosted uploads (website-api /uploads/...). */
export function resolveModuleAssetUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  let trimmed = rewriteStoredAssetHost(url.trim());
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const origin = browserModuleOrigin();
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

/** Prefer module URL, fall back to IAM branding path. */
export function resolveAnyAssetUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.includes('website-api.') || /:(3055|4026)\//.test(trimmed)) {
    return resolveModuleAssetUrl(trimmed);
  }
  return resolveExternalAssetUrl(trimmed);
}
