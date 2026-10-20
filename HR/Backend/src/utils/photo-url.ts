import { env } from '../config/env';

/** Turn stored `/uploads/...` paths into browser-reachable absolute URLs. */
export function resolveStaffPhotoUrl(photo: string | null | undefined): string | null {
  if (!photo?.trim()) return null;
  const value = photo.trim();
  if (/^(data:|blob:)/i.test(value)) return value;

  const base = (process.env.PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}`).replace(/\/$/, '');
  const uploadsIdx = value.indexOf('/uploads/');
  if (uploadsIdx >= 0) return `${base}${value.slice(uploadsIdx)}`;
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith('/') ? `${base}${value}` : `${base}/${value}`;
}
