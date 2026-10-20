export function resolveTeacherPhotoUrl(photo) {
  if (!photo) return null;
  const s = String(photo).trim();
  if (!s) return null;
  if (s.startsWith('blob:') || s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://')) {
    return s;
  }
  const path = s.startsWith('/') ? s : `/${s}`;
  const apiOrigin = (
    import.meta.env.VITE_TP_API_URL ||
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? 'https://ticha-api.shuleplus.rw' : '')
  )
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '');
  if (path.startsWith('/uploads')) {
    if (apiOrigin && !import.meta.env.DEV) return `${apiOrigin}${path}`;
    return path;
  }
  if (apiOrigin) return `${apiOrigin}${path}`;
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
