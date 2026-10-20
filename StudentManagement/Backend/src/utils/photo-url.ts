import { env } from '../config/env';

/** Turn stored `/uploads/...` paths into browser-reachable absolute URLs. */
export function resolvePhotoUrl(photo: string | null | undefined): string | null {
  if (!photo?.trim()) return null;
  const value = photo.trim();
  if (/^(data:|blob:)/i.test(value)) return value;

  const base = env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const uploadsIdx = value.indexOf('/uploads/');
  if (uploadsIdx >= 0) {
    return `${base}${value.slice(uploadsIdx)}`;
  }

  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith('/') ? `${base}${value}` : `${base}/${value}`;
}

/** Keep relative paths in DB even when the client round-trips an absolute URL. */
export function normalizePhotoPath(photo: string | null | undefined): string | null {
  if (!photo?.trim()) return null;
  const value = photo.trim();
  if (!/^https?:/i.test(value)) return value;

  const base = env.PUBLIC_BASE_URL.replace(/\/$/, '');
  if (value.startsWith(`${base}/`)) {
    return value.slice(base.length);
  }

  const uploadsIdx = value.indexOf('/uploads/');
  if (uploadsIdx >= 0) return value.slice(uploadsIdx);

  return value;
}

export function withResolvedStudentPhoto<T extends { studentPhoto?: string | null }>(student: T): T {
  if (!student.studentPhoto) return student;
  return {
    ...student,
    studentPhoto: resolvePhotoUrl(student.studentPhoto),
  };
}
