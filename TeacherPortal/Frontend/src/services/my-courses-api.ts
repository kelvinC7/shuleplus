import { api } from './api';

function unwrap<T>(payload: { success?: boolean; data: T }): T {
  return payload.data;
}

export type MyCourseAssignment = {
  subjectName: string;
  className: string;
  classId?: string | null;
  classLabel?: string;
  periodsPerWeek: number;
  room: string | null;
  term: string;
  academicYear: string;
};

export type MyCourseGroup = {
  subjectName: string;
  totalPeriods: number;
  classes: Array<{ className: string; classId?: string | null; periodsPerWeek: number; room: string | null }>;
};

export type MyCoursesResponse = {
  linked: boolean;
  teacherName: string | null;
  assignments: MyCourseAssignment[];
  grouped: MyCourseGroup[];
  totalPeriods: number;
};

export function myCoursesApiError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return msg;
  }
  return fallback;
}

export async function fetchMyCourses(params?: { term?: string; academicYear?: string }) {
  const { data } = await api.get<{ success: boolean; data: MyCoursesResponse }>('/my-courses', { params });
  return unwrap(data);
}
