export function getAuthAssetOrigin(): string {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_IAM_API_URL ??
    "http://localhost:3001/api/v1";
  return apiBase.replace(/\/api\/v1\/?$/, "") || "http://localhost:3001";
}

export function resolvePublicAssetUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = String(url).trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const origin = getAuthAssetOrigin();
  return trimmed.startsWith("/") ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

export async function loadImageDataUrl(
  url: string | null | undefined,
): Promise<string | null> {
  const resolved = resolvePublicAssetUrl(url);
  if (!resolved) return null;
  if (resolved.startsWith("data:")) return resolved;
  try {
    const res = await fetch(resolved);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("image read failed"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
