import { api } from './api';
import type {
  ApiResponse,
  ConsoleContext,
  OverviewData,
  BriefingData,
  ApprovalItem,
  ApprovalList,
  StudentsData,
  StaffData,
  HrData,
  AcademicsData,
  AttendanceData,
  DisciplineData,
  FeesData,
  BudgetData,
  NotificationsData,
  IncidentsData,
  TeachingNowData,
  TimetableData,
  MarksData,
  AttendanceReportData,
  ClassAttendanceData,
  TransportData,
  LiveCampusData,
  BroadcastsData,
  BroadcastRow,
  ParentsData,
  MessagesData,
  CircularsData,
  CircularItem,
  ServicesData,
  TasksData,
  TaskItem,
  MeetingsData,
  MeetingItem,
  AuditData,
  SearchData,
  ReportsData,
  RequestsData,
  BranchesData,
  Incident,
} from '@/types';

export interface ScopeParams {
  organizationId?: string;
  academicYear?: string;
  term?: string;
  className?: string;
  course?: string;
}

function normalizeScopeParams(params?: ScopeParams | string): ScopeParams | undefined {
  if (!params) return undefined;
  if (typeof params === 'string') return { organizationId: params || undefined };
  return params;
}

async function get<T>(url: string, params?: object): Promise<T> {
  const { data } = await api.get<ApiResponse<T>>(url, { params });
  lastMeta = data.meta;
  return data.data;
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.post<ApiResponse<T>>(url, body);
  return data.data;
}

async function patch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.patch<ApiResponse<T>>(url, body);
  return data.data;
}

/** Response meta (data mode) for the current request — set by each fetch. */
let lastMeta: { mode?: 'live' | 'demo' } | undefined;
export function getLastMeta() {
  return lastMeta;
}

export const consoleApi = {
  context: () => get<ConsoleContext>('/context'),

  overview: (scope: ScopeParams) => get<OverviewData>('/overview', scope),
  briefing: (scope: ScopeParams) => get<BriefingData>('/briefing', scope),

  branches: (scope: ScopeParams) => get<BranchesData>('/branches', scope),
  branch: (id: string) => get<Record<string, unknown>>(`/branches/${id}`),

  approvals: (params: Record<string, unknown>) => get<ApprovalList>('/approvals', params),
  approval: (id: string) => get<ApprovalItem>(`/approvals/${id}`),
  decide: (id: string, body: { action: string; reason?: string; comment?: string }) =>
    post<{ decisionId: string; status: string; reference: string }>(`/approvals/${id}/decision`, body),

  students: (params: Record<string, unknown>) => get<StudentsData>('/students', params),
  student: (id: string) => get<Record<string, unknown>>(`/students/${id}`),
  staff: (params: Record<string, unknown>) => get<StaffData>('/staff', params),
  hr: (scope: ScopeParams) => get<HrData>('/hr', scope),

  academics: (params?: ScopeParams) => get<AcademicsData>('/academics', params),
  marks: (params: Record<string, unknown>) => get<MarksData>('/academics/marks', params),
  attendance: (params?: ScopeParams | string) => get<AttendanceData>('/attendance', normalizeScopeParams(params)),
  discipline: (params?: ScopeParams | string) => get<DisciplineData>('/discipline', normalizeScopeParams(params)),

  fees: (scope: ScopeParams) => get<FeesData>('/fees', scope),
  budget: (params?: ScopeParams | string) => get<BudgetData>('/budget', normalizeScopeParams(params)),

  notifications: (params?: Record<string, unknown>) => get<NotificationsData>('/notifications', params),
  markNotificationRead: (id: string) => post<{ id: string; read: boolean }>(`/notifications/${id}/read`),
  markAllNotificationsRead: () => post<{ read: boolean }>('/notifications/read-all'),

  incidents: (params?: Record<string, unknown>) => get<IncidentsData>('/incidents', params),
  createIncident: (body: Record<string, unknown>) => post<Incident>('/incidents', body),
  updateIncident: (id: string, body: Record<string, unknown>) =>
    patch<Incident>(`/incidents/${id}`, body),

  teachingNow: (params?: Record<string, unknown>) => get<TeachingNowData>('/teaching-now', params),
  assignCover: (body: Record<string, unknown>) =>
    post<Record<string, unknown>>('/teaching-now/cover', body),
  timetable: (params?: Record<string, unknown>) => get<TimetableData>('/timetable', params),
  attendanceReport: (params: Record<string, unknown>) => get<AttendanceReportData>('/attendance/report', params),
  classAttendance: (params: Record<string, unknown>) =>
    get<ClassAttendanceData>('/teaching-now/class-attendance', params),

  transport: () => get<TransportData>('/transport'),
  liveCampus: (params?: ScopeParams | string) => get<LiveCampusData>('/live-campus', normalizeScopeParams(params)),

  broadcasts: () => get<BroadcastsData>('/communication/broadcasts'),
  sendBroadcast: (body: Record<string, unknown>) => post<BroadcastRow>('/communication/broadcasts', body),
  parents: () => get<ParentsData>('/communication/parents'),
  messages: () => get<MessagesData>('/communication/chats'),
  circulars: (params?: Record<string, unknown>) => get<CircularsData>('/communication/circulars', params),
  createCircular: (body: Record<string, unknown>) => post<CircularItem>('/communication/circulars', body),

  services: () => get<ServicesData>('/services'),

  tasks: (params?: object) => get<TasksData>('/tasks', params),
  createTask: (body: Record<string, unknown>) => post<TaskItem>('/tasks', body),
  updateTask: (id: string, body: Record<string, unknown>) => patch<TaskItem>(`/tasks/${id}`, body),

  meetings: (params?: Record<string, unknown>) => get<MeetingsData>('/meetings', params),
  createMeeting: (body: Record<string, unknown>) => post<MeetingItem>('/meetings', body),
  updateMeeting: (id: string, body: Record<string, unknown>) => patch<MeetingItem>(`/meetings/${id}`, body),

  audit: (params: Record<string, unknown>) => get<AuditData>('/audit', params),

  search: (q: string) => get<SearchData>('/search', { q }),

  reports: () => get<ReportsData>('/reports'),
  generateReport: (body: Record<string, unknown>) =>
    post<Record<string, unknown>>('/reports/generate', body),

  requests: (params?: Record<string, unknown>) => get<RequestsData>('/requests', params),
  decideRequest: (id: string, body: Record<string, unknown>) =>
    post<Record<string, unknown>>(`/requests/${id}/decision`, body),
};
