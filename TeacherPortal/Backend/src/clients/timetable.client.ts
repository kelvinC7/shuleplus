import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

const base = () => env.TIMETABLE_API_URL.replace(/\/$/, '');

async function timetableServiceFetch<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | undefined> }
): Promise<T> {
  const url = new URL(`${base()}${path.startsWith('/') ? path : `/${path}`}`);
  if (init?.query) {
    for (const [key, value] of Object.entries(init.query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, value);
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'teacher-portal',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new AppError(503, 'Timetable service is unavailable');
  }

  const body = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: T;
  };

  if (!response.ok) {
    throw new AppError(response.status, body.message ?? 'Timetable service request failed');
  }

  return body.data as T;
}

export function fetchTeacherToday(params: {
  organizationId: string;
  teacherUserId: string;
  email?: string;
  term?: string;
  academicYear?: string;
  date?: string;
}) {
  return timetableServiceFetch<unknown>('/internal/teacher/today', {
    query: {
      organizationId: params.organizationId,
      teacherUserId: params.teacherUserId,
      email: params.email,
      term: params.term,
      academicYear: params.academicYear,
      date: params.date,
    },
  });
}

export function fetchTeacherSchedule(params: {
  organizationId: string;
  teacherUserId: string;
  email?: string;
  term?: string;
  academicYear?: string;
  view?: string;
  className?: string;
  day?: string;
  course?: string;
}) {
  return timetableServiceFetch<unknown>('/internal/teacher/schedule', {
    query: {
      organizationId: params.organizationId,
      teacherUserId: params.teacherUserId,
      email: params.email,
      term: params.term,
      academicYear: params.academicYear,
      view: params.view,
      className: params.className,
      day: params.day,
      course: params.course,
    },
  });
}

export function startLesson(body: Record<string, unknown>) {
  return timetableServiceFetch<unknown>('/internal/lessons/start', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function scanClassroomQr(body: Record<string, unknown>) {
  return timetableServiceFetch<unknown>('/internal/lessons/scan-qr', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchLessonAttendance(
  organizationId: string,
  sessionId: string,
  teacherUserId: string,
  email?: string
) {
  return timetableServiceFetch<unknown>(`/internal/lessons/${sessionId}/attendance`, {
    query: { organizationId, teacherUserId, email },
  });
}

export function fetchAttendanceHistory(params: {
  organizationId: string;
  teacherUserId: string;
  email?: string;
  term?: string;
  academicYear?: string;
  limit?: number;
}) {
  return timetableServiceFetch<unknown>('/internal/teacher/attendance-history', {
    query: {
      organizationId: params.organizationId,
      teacherUserId: params.teacherUserId,
      email: params.email,
      term: params.term,
      academicYear: params.academicYear,
      limit: params.limit?.toString(),
    },
  });
}

export function saveLessonAttendance(
  organizationId: string,
  teacherUserId: string,
  sessionId: string,
  rows: unknown[],
  submit?: boolean,
  email?: string
) {
  return timetableServiceFetch<unknown>(`/internal/lessons/${sessionId}/attendance`, {
    method: 'POST',
    body: JSON.stringify({ organizationId, teacherUserId, rows, submit, email }),
  });
}

export function fetchCheckInHistory(params: {
  organizationId: string;
  teacherUserId: string;
  email?: string;
  term?: string;
  academicYear?: string;
  date?: string;
  limit?: number;
}) {
  return timetableServiceFetch<unknown>('/internal/teacher/check-in-history', {
    query: {
      organizationId: params.organizationId,
      teacherUserId: params.teacherUserId,
      email: params.email,
      term: params.term,
      academicYear: params.academicYear,
      date: params.date,
      limit: params.limit?.toString(),
    },
  });
}

export function completeLesson(
  organizationId: string,
  teacherUserId: string,
  sessionId: string,
  body: Record<string, unknown>
) {
  return timetableServiceFetch<unknown>(`/internal/lessons/${sessionId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ organizationId, teacherUserId, ...body }),
  });
}

export function fetchTeacherAccountProfile(params: {
  organizationId: string;
  teacherUserId: string;
  email?: string;
}) {
  return timetableServiceFetch<{
    teacherUserId: string;
    teacherName: string;
    loginEmail: string | null;
    loginPhone: string | null;
    portalEnabled: boolean;
    loginMethod: string;
    emailMatched: boolean;
  } | null>('/internal/teacher/account-profile', {
    query: {
      organizationId: params.organizationId,
      teacherUserId: params.teacherUserId,
      email: params.email,
    },
  });
}

export type TimetableAssignment = {
  id: string;
  teacherUserId: string;
  teacherName: string;
  className: string;
  subjectName: string;
  periodsPerWeek: number;
  room?: string | null;
  term: string;
  academicYear: string;
};

export function fetchTeacherAssignments(
  organizationId: string,
  teacherUserId: string,
  opts?: { term?: string; academicYear?: string }
) {
  return timetableServiceFetch<TimetableAssignment[]>('/internal/teacher/assignments', {
    query: {
      organizationId,
      teacherUserId,
      term: opts?.term,
      academicYear: opts?.academicYear,
    },
  }).then((data) => (Array.isArray(data) ? data : []));
}
