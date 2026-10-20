/** Resolve IAM-uploaded asset paths (`/uploads/...`) to a browser URL. */
export function resolvePublicAssetUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  const iamApi =
    process.env.NEXT_PUBLIC_IAM_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001/api/v1';
  const origin = iamApi.replace(/\/api\/v1\/?$/, '') || 'http://localhost:3001';
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

export async function loadImageDataUrl(url: string | null | undefined): Promise<string | null> {
  const resolved = resolvePublicAssetUrl(url);
  if (!resolved) return null;
  if (resolved.startsWith('data:')) return resolved;
  try {
    const res = await fetch(resolved);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('image read failed'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
