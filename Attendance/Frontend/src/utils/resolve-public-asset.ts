/** Auth API origin for static uploads (logos from onboarding). */
export function getAuthAssetOrigin(): string {
  const apiBase =
    process.env.NEXT_PUBLIC_IAM_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001/api/v1';
  return apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '') || 'http://localhost:3001';
}

/** Turn `/uploads/...` into a browser-loadable URL (same as Authentication onboarding). */
export function resolvePublicAssetUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  const origin = getAuthAssetOrigin();
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}
