/** Resolve student photo paths for production (static FE host has no /uploads proxy). */
export function resolveStudentPhotoUrl(photo?: string | null): string | null {
  if (!photo?.trim()) return null;
  const value = photo.trim();
  if (/^(data:|blob:)/i.test(value)) return value;

  const apiOrigin = (import.meta.env.VITE_API_URL ?? 'http://localhost:3052/api')
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '');

  const uploadsIdx = value.indexOf('/uploads/');
  if (uploadsIdx >= 0) {
    return `${apiOrigin}${value.slice(uploadsIdx)}`;
  }

  if (/^https?:\/\//i.test(value)) return value;
  if (import.meta.env.DEV) return value;

  return value.startsWith('/') ? `${apiOrigin}${value}` : `${apiOrigin}/${value}`;
}
