import api from '../services/api';

const isLocalOrigin = (value) =>
  /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?\/?$/i.test(String(value || ''));

function apiOrigin() {
  const raw =
    import.meta.env.VITE_TP_API_URL ||
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? 'https://ticha-api.shuleplus.rw/api' : api.defaults.baseURL || '');
  const origin = String(raw).replace(/\/api\/?$/, '').replace(/\/$/, '');
  return isLocalOrigin(origin) ? '' : origin;
}

/** Student Management returns absolute URLs; legacy rows may be relative /uploads paths. */
export function resolveStudentPhotoUrl(photo) {
  if (!photo) return null;
  const s = String(photo).trim();
  if (!s) return null;
  if (/^(blob:|data:)/i.test(s)) return s;

  const origin = apiOrigin();

  // Absolute /uploads URLs may embed a stale/other-host origin (e.g. localhost:3000).
  // Serve them through the configured API origin instead of requesting that host.
  const uploadsIdx = s.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    const rel = s.slice(uploadsIdx);
    if (origin) return `${origin}${rel}`;
    return rel;
  }

  if (/^https?:\/\//i.test(s)) return s;

  const path = s.startsWith('/') ? s : `/${s}`;

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
