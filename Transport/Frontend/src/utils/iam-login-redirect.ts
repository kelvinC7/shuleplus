const MODULE_SLUG = process.env.NEXT_PUBLIC_MODULE_SLUG ?? 'transport';

export function getIamBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_IAM_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function buildIamLoginUrl(options?: { reason?: 'missing' | 'expired' }): string {
  const base = getIamBaseUrl();
  const url = new URL(`${base}/login`);
  url.searchParams.set('module', MODULE_SLUG);
  if (options?.reason) url.searchParams.set('from', 'transport-pwa');
  return url.toString();
}

export function redirectToIamLogin(options?: { reason?: 'missing' | 'expired' }): void {
  if (typeof window === 'undefined') return;
  const target = buildIamLoginUrl(options);
  if (window.location.href === target) return;
  window.location.assign(target);
}

export function isSessionAuthError(error: string | null | undefined): boolean {
  return /expired|invalid|missing access token|session|token/i.test(error ?? '');
}
