import { env } from '../config/env';

export type TimetableTeacherProfile = {
  teacherUserId: string;
  teacherName: string;
  loginEmail?: string | null;
  loginPhone?: string | null;
  portalEnabled?: boolean;
};

type ApiList<T> = { success?: boolean; data?: T[] };

function baseUrl() {
  return env.TIMETABLE_API_URL.replace(/\/$/, '');
}

async function timetableGet<T>(path: string, organizationId: string) {
  const qs = new URLSearchParams({ organizationId });
  const response = await fetch(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}?${qs}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': env.SERVICE_API_KEY,
      'x-source-service': 'student-management',
    },
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as T;
}

export async function fetchTimetableTeacherProfiles(
  organizationId: string
): Promise<TimetableTeacherProfile[]> {
  const body = await timetableGet<ApiList<TimetableTeacherProfile>>(
    '/internal/teacher-profiles',
    organizationId
  );
  return Array.isArray(body?.data) ? body.data : [];
}
