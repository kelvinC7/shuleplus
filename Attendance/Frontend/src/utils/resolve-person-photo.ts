export type PersonPhotoKind = 'STUDENT' | 'STAFF';

function stripApiBase(url: string) {
  return url.replace(/\/api\/?$/, '').replace(/\/$/, '');
}

function moduleOrigin(kind: PersonPhotoKind): string {
  if (kind === 'STUDENT') {
    return stripApiBase(
      process.env.NEXT_PUBLIC_STUDENT_MANAGEMENT_API_URL ?? 'http://localhost:3052/api',
    );
  }
  return stripApiBase(process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1');
}

function staffPhotoOrigin(path: string) {
  const hr = stripApiBase(process.env.NEXT_PUBLIC_HR_API_URL ?? 'http://localhost:3007/api');
  const iam = stripApiBase(process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1');
  if (/\/uploads\/(users|avatars|profiles)/i.test(path) || path.startsWith('/uploads/')) {
    return iam;
  }
  return hr;
}

/** Turn relative SM / IAM / HR photo paths into absolute URLs for img src. */
export function resolvePersonPhotoUrl(
  photoUrl: string | null | undefined,
  kind: PersonPhotoKind = 'STUDENT',
): string {
  if (!photoUrl) return '';
  const trimmed = String(photoUrl).trim();
  if (!trimmed) return '';
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;

  const origin = kind === 'STUDENT' ? moduleOrigin('STUDENT') : staffPhotoOrigin(trimmed);
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}
