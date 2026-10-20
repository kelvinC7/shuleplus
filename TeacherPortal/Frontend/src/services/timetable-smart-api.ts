import { api } from './api';
import type {
  AttendanceHistoryRow,
  AttendancePayload,
  AttendanceSubmitResult,
  CheckInHistoryRow,
  Classroom,
  CompleteLessonInput,
  LessonSession,
  LiveMonitorData,
  QrCheckInResult,
  SmartAttendanceRow,
  TeacherScheduleData,
  TeacherTodayData,
} from '@/types/smart-timetable';

function unwrap<T>(payload: { success?: boolean; data: T }): T {
  return payload.data;
}

/** All timetable smart calls go through Teacher Portal backend (service-key proxy to Timetable). */
export async function fetchTeacherToday(params?: {
  term?: string;
  academicYear?: string;
  date?: string;
}): Promise<TeacherTodayData> {
  const { data } = await api.get<{ success: boolean; data: TeacherTodayData }>(
    '/timetable/teacher/today',
    { params }
  );
  return unwrap(data);
}

export async function fetchTeacherSchedule(
  view: 'daily' | 'weekly' = 'weekly',
  params?: { term?: string; academicYear?: string; className?: string; day?: string; course?: string }
): Promise<TeacherScheduleData> {
  const { data } = await api.get<{ success: boolean; data: TeacherScheduleData }>(
    '/timetable/teacher/schedule',
    { params: { view, ...params } }
  );
  return unwrap(data);
}

export async function fetchAcademicSettings(): Promise<{
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}> {
  const { data } = await api.get<{
    success: boolean;
    data: {
      academicYears: string[];
      terms: string[];
      currentAcademicYear: string | null;
      currentTerm: string | null;
    };
  }>('/timetable/academic-settings');
  return unwrap(data);
}

export async function startLesson(body: {
  timetableId: string;
  qrCode?: string;
  skipQr?: boolean;
}): Promise<LessonSession> {
  const { data } = await api.post<{ success: boolean; data: LessonSession }>(
    '/timetable/lessons/start',
    body
  );
  return unwrap(data);
}

export async function scanClassroomQr(qrCode: string): Promise<QrCheckInResult> {
  const { data } = await api.post<{ success: boolean; data: QrCheckInResult }>(
    '/timetable/lessons/scan-qr',
    { qrCode, device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : undefined }
  );
  return unwrap(data);
}

export async function fetchCheckInHistory(params?: {
  term?: string;
  academicYear?: string;
  date?: string;
  limit?: number;
}): Promise<CheckInHistoryRow[]> {
  const { data } = await api.get<{ success: boolean; data: CheckInHistoryRow[] }>(
    '/timetable/teacher/check-in-history',
    { params }
  );
  return unwrap(data);
}

export async function fetchLessonAttendance(sessionId: string): Promise<AttendancePayload> {
  const { data } = await api.get<{ success: boolean; data: AttendancePayload }>(
    `/timetable/lessons/${sessionId}/attendance`
  );
  return unwrap(data);
}

export async function saveLessonAttendance(
  sessionId: string,
  rows: Array<{
    studentCode: string;
    fullName: string;
    gender?: string | null;
    className?: string | null;
    stream?: string | null;
    rollNumber?: string | null;
    photoUrl?: string | null;
    status: string;
    reason?: string | null;
    arrivalTime?: string | null;
    minutesLate?: number | null;
    notes?: string | null;
  }>,
  submit = false
): Promise<AttendanceSubmitResult> {
  const { data } = await api.post<{ success: boolean; data: AttendanceSubmitResult }>(
    `/timetable/lessons/${sessionId}/attendance`,
    { rows, submit }
  );
  return unwrap(data);
}

export async function fetchAttendanceHistory(params?: {
  term?: string;
  academicYear?: string;
  limit?: number;
}): Promise<AttendanceHistoryRow[]> {
  const { data } = await api.get<{ success: boolean; data: AttendanceHistoryRow[] }>(
    '/timetable/teacher/attendance-history',
    { params }
  );
  return unwrap(data);
}

export async function completeLesson(
  sessionId: string,
  body: CompleteLessonInput
): Promise<LessonSession> {
  const { data } = await api.post<{ success: boolean; data: LessonSession }>(
    `/timetable/lessons/${sessionId}/complete`,
    body
  );
  return unwrap(data);
}

export async function fetchLiveMonitor(): Promise<LiveMonitorData> {
  throw new Error('Live monitor is not available in Teacher Portal');
}

export async function fetchClassrooms(): Promise<Classroom[]> {
  throw new Error('Classroom list is not available in Teacher Portal');
}

export function smartApiError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}
