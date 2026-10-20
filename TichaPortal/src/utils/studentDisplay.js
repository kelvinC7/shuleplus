import api from '../services/api';

function apiOrigin() {
  const raw =
    import.meta.env.VITE_TP_API_URL ||
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? 'https://ticha-api.shuleplus.rw/api' : api.defaults.baseURL || '');
  return String(raw).replace(/\/api\/?$/, '').replace(/\/$/, '');
}

/** Student Management returns absolute URLs; legacy rows may be relative /uploads paths. */
export function resolveStudentPhotoUrl(photo) {
  if (!photo) return null;
  const s = String(photo).trim();
  if (!s) return null;
  if (/^(blob:|data:|https?:)/i.test(s)) return s;

  const path = s.startsWith('/') ? s : `/${s}`;
  const origin = apiOrigin();

  if (path.includes('/uploads/')) {
    const uploadsIdx = path.indexOf('/uploads/');
    const rel = path.slice(uploadsIdx);
    if (/^https?:\/\//i.test(s)) return s;
    if (origin) return `${origin}${rel}`;
    return rel;
  }

  if (origin) return `${origin}${path}`;
  return path;
}

export function studentInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
