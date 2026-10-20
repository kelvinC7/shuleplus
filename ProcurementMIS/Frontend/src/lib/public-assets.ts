export async function loadImageDataUrl(url?: string | null): Promise<string | null> {
  const src = (url ?? '').trim();
  if (!src) return null;
  if (src.startsWith('data:')) return src;
  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
