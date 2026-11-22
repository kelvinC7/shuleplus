const isLocalOrigin = (value) =>
  /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?\/?$/i.test(String(value || ''));

export function resolveTeacherPhotoUrl(photo) {
  if (!photo) return null;
  const s = String(photo).trim();
  if (!s) return null;
  if (s.startsWith('blob:') || s.startsWith('data:')) {
    return s;
  }

  const apiOrigin = (
    import.meta.env.VITE_TP_API_URL ||
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? 'https://ticha-api.shuleplus.rw' : '')
  )
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '');
  const hostedOrigin = isLocalOrigin(apiOrigin) ? '' : apiOrigin;

  // Absolute /uploads URLs may embed a stale/other-host origin (e.g. localhost:3000).
  // Serve them from the hosted API instead of requesting that host.
  const uploadsIdx = s.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    const rel = s.slice(uploadsIdx);
    if (hostedOrigin) return `${hostedOrigin}${rel}`;
    return rel;
  }

  if (/^https?:\/\//i.test(s)) return s;

  const path = s.startsWith('/') ? s : `/${s}`;
  if (hostedOrigin) return `${hostedOrigin}${path}`;
  return path;
}

export function teacherDisplayName(teacher) {
  if (!teacher) return 'Teacher';
  const full = [teacher.first_name, teacher.last_name].filter(Boolean).join(' ').trim();
  return full || teacher.full_name || teacher.name || 'Teacher';
}

export function teacherInitials(teacher) {
  if (!teacher) return '?';
  const first = (teacher.first_name || '')[0] || '';
  const last = (teacher.last_name || '')[0] || '';
  const pair = `${first}${last}`.toUpperCase();
  if (pair) return pair;
  return teacherDisplayName(teacher).slice(0, 2).toUpperCase() || '?';
}
