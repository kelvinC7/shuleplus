const LOCAL_FEES_API = 'http://localhost:3014/api';
const LOCAL_IAM_API = 'http://localhost:3001/api/v1';

function isProductionHost(hostname: string): boolean {
  return hostname === 'shuleplus.rw' || hostname.endsWith('.shuleplus.rw');
}

function isLocalEnvUrl(url: string | undefined): boolean {
  return !url || /localhost|127\.0\.0\.1/.test(url);
}

/** Resolve School Fees API base URL — same-origin /api on production (Next rewrite → PM2 backend). */
export function resolveFeesApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (typeof window === 'undefined') {
    return fromEnv && !isLocalEnvUrl(fromEnv) ? fromEnv : LOCAL_FEES_API;
  }

  const host = window.location.hostname;
  if (isProductionHost(host)) {
    // Browser calls fees.shuleplus.rw/api/* — proxied to localhost:4004 by next.config rewrites.
    return '/api';
  }

  return fromEnv ?? LOCAL_FEES_API;
}

/** Resolve IAM API for token refresh on production hosts. */
export function resolveIamApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_IAM_API_URL?.trim();
  if (typeof window === 'undefined') {
    return fromEnv && !isLocalEnvUrl(fromEnv) ? fromEnv : LOCAL_IAM_API;
  }

  const host = window.location.hostname;
  if (isProductionHost(host)) {
    return 'https://shuleplus.rw/api/v1';
  }

  return fromEnv ?? LOCAL_IAM_API;
}
