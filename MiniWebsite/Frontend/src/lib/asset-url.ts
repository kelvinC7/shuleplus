const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:3055/api').replace(/\/api\/?$/, '');
const IAM_ORIGIN = (import.meta.env.VITE_IAM_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

function rewriteStoredAssetHost(url: string): string {
  if (!LOCAL_HOST.test(url)) return url;
  if (/:(3001|4001)(\/|$)/.test(url)) {
    return url.replace(LOCAL_HOST, IAM_ORIGIN);
  }
  if (/:(3055|4026)(\/|$)/.test(url)) {
    return url.replace(LOCAL_HOST, API_BASE);
  }
  return url;
}

/** Resolve stored asset paths / dev URLs for display in the browser. */
export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  let trimmed = rewriteStoredAssetHost(url.trim());
  if (/^https?:\/\//.test(trimmed) || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const origin = trimmed.includes('website-api') || trimmed.startsWith('/uploads/')
    ? API_BASE
    : IAM_ORIGIN;
  return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}
