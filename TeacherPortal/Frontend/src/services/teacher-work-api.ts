import { api } from './api';

function unwrap<T>(payload: { success?: boolean; data: T }): T {
  return payload.data;
}

export type MyAttendanceSummary = {
  workingDays: number;
  present: number;
  onTime: number;
  late: number;
  absent: number;
  approvedPermission: number;
  attendanceRate: number;
  lessonCheckIns: number;
  punctuality: { onTimePct: number; latePct: number; absentPct: number; permissionPct: number };
  workingHours: { expectedHours: number; workedHours: number; unit: string };
};

export type MyAttendanceDay = {
  date: string;
  dayName: string;
  morningCheckIn: string | null;
  eveningCheckOut: string | null;
  morningStatus: string;
  eveningStatus: string;
  dayStatus: string;
  minutesLateMorning: number;
  workedHours: string;
  source: string;
};

export type PermissionRequest = {
  id: string;
  reference: string;
  permissionType: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  details: string | null;
  status: string;
  timeline: Array<{ status: string; at: string; note?: string | null }>;
  rejectReason: string | null;
  createdAt: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  eventType: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  description: string | null;
  organizer: string | null;
  participants: string | null;
  allDay: boolean;
};

export async function fetchMyAttendanceSummary(params?: {
  month?: number;
  year?: number;
  term?: string;
  academicYear?: string;
}) {
  const { data } = await api.get<{ success: boolean; data: MyAttendanceSummary }>('/my-attendance/summary', {
    params,
  });
  return unwrap(data);
}

export async function fetchMyAttendanceToday() {
  const { data } = await api.get<{ success: boolean; data: MyAttendanceDay & { schoolStart: string; dateLabel: string } }>(
    '/my-attendance/today'
  );
  return unwrap(data);
}

export async function fetchMyAttendanceHistory(params?: {
  month?: number;
  year?: number;
  status?: string;
}) {
  const { data } = await api.get<{ success: boolean; data: MyAttendanceDay[] }>('/my-attendance/history', {
    params,
  });
  return unwrap(data);
}

export async function submitAttendanceCorrection(body: {
  attendanceDate: string;
  correctionType: string;
  expectedTime?: string;
  reason: string;
}) {
  const { data } = await api.post('/my-attendance/corrections', body);
  return unwrap(data);
}

export async function fetchPermissionSummary() {
  const { data } = await api.get<{ success: boolean; data: { total: number; pending: number; approved: number; rejected: number } }>(
    '/permissions/summary'
  );
  return unwrap(data);
}

export async function fetchPermissionTypes() {
  const { data } = await api.get<{ success: boolean; data: string[] }>('/permissions/types');
  return unwrap(data);
}

export async function fetchPermissions(params?: { status?: string; type?: string }) {
  const { data } = await api.get<{ success: boolean; data: PermissionRequest[] }>('/permissions', { params });
  return unwrap(data);
}

export async function createPermissionRequest(body: {
  permissionType: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason: string;
  details?: string;
  attachmentName?: string;
  academicYear?: string;
  term?: string;
}) {
  const { data } = await api.post<{ success: boolean; data: PermissionRequest }>('/permissions', body);
  return unwrap(data);
}

export async function fetchCalendarEvents(params?: {
  start?: string;
  end?: string;
  eventType?: string;
  academicYear?: string;
  term?: string;
  myEventsOnly?: boolean;
}) {
  const { data } = await api.get<{ success: boolean; data: CalendarEvent[] }>('/calendar/events', { params });
  return unwrap(data);
}

export function workApiError(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}
