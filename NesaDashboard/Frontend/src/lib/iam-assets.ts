/** Browser URL for IAM-hosted uploads (`/uploads/...`). */
export function resolveIamAssetUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const apiBase =
    process.env.NEXT_PUBLIC_IAM_API_URL ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '/api/v1') ??
    'http://localhost:3001/api/v1';
  const origin = apiBase.replace(/\/api\/v1\/?$/, '') || 'http://localhost:3001';
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}
