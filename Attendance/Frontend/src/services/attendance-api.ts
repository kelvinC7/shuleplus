import { api, type ApiEnvelope } from '@/services/api';

export const attendanceApi = {
  tenantEnsure: (body?: { organizationName?: string; organizationCode?: string }) =>
    api.post<ApiEnvelope<unknown>>('/tenant/ensure', body ?? {}),

  dashboard: () => api.get<ApiEnvelope<DashboardData>>('/dashboard'),
  liveMonitor: (params?: AttendanceFilterParams) =>
    api.get<ApiEnvelope<LiveMonitorData>>('/live-monitor', { params }),

  settingsGet: () => api.get<ApiEnvelope<AttendanceSettings>>('/settings'),
  settingsPut: (body: Partial<AttendanceSettings>) =>
    api.put<ApiEnvelope<AttendanceSettings>>('/settings', body),

  scheduleRulesSummary: () =>
    api.get<
      ApiEnvelope<{
        total: number;
        active: number;
        classRules: number;
        weekdayRules: number;
        dateOverrides: number;
        rules: AttendanceScheduleRule[];
      }>
    >('/schedule-rules/summary'),
  scheduleRuleClasses: () => api.get<ApiEnvelope<ScheduleRuleClass[]>>('/schedule-rules/classes'),
  createScheduleRule: (body: ScheduleRuleInput) =>
    api.post<ApiEnvelope<{ rule: AttendanceScheduleRule; warnings: string[] }>>('/schedule-rules', body),
  updateScheduleRule: (id: string, body: Partial<ScheduleRuleInput>) =>
    api.put<ApiEnvelope<{ rule: AttendanceScheduleRule; warnings: string[] }>>(`/schedule-rules/${id}`, body),
  setScheduleRuleActive: (id: string, isActive: boolean) =>
    api.patch<ApiEnvelope<AttendanceScheduleRule>>(`/schedule-rules/${id}/active`, { isActive }),

  cards: (params?: { status?: string; q?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: RfidCard[]; total: number; page: number; totalPages: number }>(
      '/cards',
      { params }
    ),
  devices: () => api.get<ApiEnvelope<RfidDevice[]>>('/devices'),
  deleteDevice: (id: string) => api.delete<ApiEnvelope<{ id: string; deleted: boolean }>>(`/devices/${id}`),
  createCard: (body: Record<string, unknown>) =>
    api.post<ApiEnvelope<RfidCard>>('/cards', body),
  bulkCards: (rows: Record<string, unknown>[]) =>
    api.post<ApiEnvelope<{ imported: number; failed: number }>>('/cards/bulk', { rows }),
  updateCardStatus: (id: string, status: string, reason?: string) =>
    api.patch<ApiEnvelope<RfidCard>>(`/cards/${id}/status`, { status, reason }),
  cardHistory: (id: string) => api.get<ApiEnvelope<unknown[]>>(`/cards/${id}/history`),
  replaceCard: (id: string, reason?: string) =>
    api.post<ApiEnvelope<unknown>>(`/cards/${id}/replace`, { reason }),
  replacements: () => api.get<ApiEnvelope<CardReplacement[]>>('/card-replacements'),

  tap: (body: { cardNumber: string; deviceCode?: string; direction?: 'ENTRY' | 'EXIT' }) =>
    api.post<ApiEnvelope<TapResult>>('/tap', body),
  attendance: (
    params?: AttendanceFilterParams & {
      status?: string;
      department?: string;
      staffRole?: string;
      checkoutStatus?: string;
      punctuality?: string;
      sortBy?: string;
      sortDir?: string;
      page?: number;
      limit?: number;
    }
  ) => api.get<ApiEnvelope<PagedResult<AttendanceRecord>>>('/attendance', { params }),
  attendanceSummary: (params?: AttendanceFilterParams & Record<string, string | number | undefined>) =>
    api.get<
      ApiEnvelope<{
        present: number;
        late: number;
        missingCheckout: number;
        absent: number;
        total: number;
      }>
    >('/attendance/summary', { params }),
  attendanceFilterOptions: () =>
    api.get<
      ApiEnvelope<{
        classes: string[];
        departments: string[];
        staffRoles: string[];
        sources?: { studentManagement?: boolean; hrIam?: boolean };
      }>
    >('/attendance/filter-options'),
  attendanceDetail: (id: string) =>
    api.get<
      ApiEnvelope<{
        record: AttendanceRecord;
        timeline: AttendanceTimelineEvent[];
        timezone: string;
      }>
    >(`/attendance/${id}/detail`),
  academicContext: () => api.get<ApiEnvelope<AcademicContext>>('/academic-context'),
  analytics: (params?: AttendanceFilterParams & { personType?: string }) =>
    api.get<ApiEnvelope<AnalyticsData>>('/analytics', { params }),
  notifyAbsent: () => api.post<ApiEnvelope<{ notified: number }>>('/attendance/notify-absent'),

  notifications: () => api.get<ApiEnvelope<ParentNotification[]>>('/notifications'),

  permissions: (status?: string) =>
    api.get<ApiEnvelope<PermissionRequest[]>>('/permissions', { params: status ? { status } : undefined }),
  createPermission: (body: Record<string, unknown>) =>
    api.post<ApiEnvelope<PermissionRequest>>('/permissions', body),
  approvePermission: (id: string, note?: string) =>
    api.post<ApiEnvelope<PermissionRequest>>(`/permissions/${id}/approve`, { note }),
  rejectPermission: (id: string, note?: string) =>
    api.post<ApiEnvelope<PermissionRequest>>(`/permissions/${id}/reject`, { note }),

  alerts: () => api.get<ApiEnvelope<SecurityAlert[]>>('/alerts'),
  resolveAlert: (id: string) => api.post<ApiEnvelope<unknown>>(`/alerts/${id}/resolve`),
  auditLogs: () => api.get<ApiEnvelope<AuditLog[]>>('/audit-logs'),
  reportsSummary: () => api.get<ApiEnvelope<ReportsSummary>>('/reports/summary'),

  peopleStudents: (params?: AttendanceFilterParams & { q?: string; className?: string; page?: number; limit?: number }) =>
    api.get<ApiEnvelope<StudentsOverview>>('/people/students', { params }),
  peopleStaff: (params?: AttendanceFilterParams & { q?: string; page?: number; limit?: number }) =>
    api.get<ApiEnvelope<StaffOverview>>('/people/staff', { params }),
  peopleStaffRankings: (params?: AttendanceFilterParams) =>
    api.get<ApiEnvelope<StaffRankingsOverview>>('/people/staff/rankings', { params }),
  peopleStudentsClassPerformance: (params?: AttendanceFilterParams) =>
    api.get<ApiEnvelope<ClassPerformanceOverview>>('/people/students/class-performance', { params }),
  peopleStudentsByClass: (params?: AttendanceFilterParams & { className: string }) =>
    api.get<ApiEnvelope<ClassStudentsOverview>>('/people/students/by-class', { params }),
  peopleIntegrations: () => api.get<ApiEnvelope<IntegrationsStatus>>('/people/integrations'),
  studentProfile: (id: string) => api.get<ApiEnvelope<StudentPerson>>(`/people/students/${id}`),
  staffProfile: (id: string) => api.get<ApiEnvelope<StaffPerson>>(`/people/staff/${id}`),
  studentPerformance: (id: string, params?: AttendanceFilterParams) =>
    api.get<ApiEnvelope<PersonPerformanceDetail>>(`/people/students/${id}/performance`, { params }),
  staffPerformance: (id: string, params?: AttendanceFilterParams) =>
    api.get<ApiEnvelope<PersonPerformanceDetail>>(`/people/staff/${id}/performance`, { params }),
};

export interface DashboardRecentTap {
  id: string;
  studentName: string;
  studentCode?: string | null;
  className?: string | null;
  status: string;
  direction: string;
  entryTime?: string | null;
  exitTime?: string | null;
  lessonDate: string;
  personType?: 'STUDENT' | 'STAFF';
}

export interface DashboardData {
  organizationName: string;
  academicYear: string;
  term: string;
  kpis: Record<string, number>;
  recentTaps: DashboardRecentTap[];
}

export interface LiveMonitorData extends DashboardData {
  devices: RfidDevice[];
  permissions: PermissionRequest[];
  alerts: SecurityAlert[];
  movement: AttendanceRecord[];
  refreshedAt: string;
  filterPeriod?: string;
}

export type ScheduleRuleScope = 'SCHOOL' | 'CLASS';
export type ScheduleRuleRecurrence = 'EVERY_DAY' | 'WEEKDAYS' | 'SPECIFIC_DATE';

export interface ScheduleRuleClass {
  id: string;
  name: string;
  stream?: string | null;
  label: string;
}

export interface AttendanceScheduleRule {
  id: string;
  organizationId: string;
  name: string;
  scope: ScheduleRuleScope;
  className?: string | null;
  recurrence: ScheduleRuleRecurrence;
  weekdays: string[];
  specificDate?: string | null;
  schoolStarts?: string | null;
  lateStarts?: string | null;
  schoolEnds?: string | null;
  staffStarts?: string | null;
  staffEnds?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  reason?: string | null;
  isActive: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleRuleInput = {
  name: string;
  scope: ScheduleRuleScope;
  className?: string | null;
  recurrence: ScheduleRuleRecurrence;
  weekdays?: string[];
  specificDate?: string | null;
  schoolStarts?: string | null;
  lateStarts?: string | null;
  schoolEnds?: string | null;
  staffStarts?: string | null;
  staffEnds?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  reason?: string | null;
  isActive?: boolean;
};

export interface AttendanceSettings {
  id: string;
  organizationId: string;
  enableEntry: boolean;
  enableExit: boolean;
  enableLateDetection: boolean;
  enableParentNotify: boolean;
  enableSms: boolean;
  enableEmail: boolean;
  enableWhatsapp: boolean;
  enablePush: boolean;
  enableWeekend: boolean;
  enableHoliday: boolean;
  enableTeacherNotify: boolean;
  enableAutoReports: boolean;
  schoolStarts: string;
  lateStarts: string;
  schoolEnds: string;
  maxExitTime: string;
  weekendStart: string;
  attendanceClosingTime: string;
  graceMinutes: number;
  academicYear: string;
  term: string;
  schoolName?: string | null;
}

export interface RfidCard {
  id: string;
  cardNumber: string;
  status: string;
  studentName?: string | null;
  studentCode?: string | null;
  className?: string | null;
  level?: string | null;
  isTemporary?: boolean;
  qrPayload?: string | null;
  usageCount?: number;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
}

export interface CardReplacement {
  id: string;
  status: string;
  reason?: string | null;
  oldCard?: RfidCard;
  createdAt: string;
}

export interface RfidDevice {
  id: string;
  deviceCode: string;
  name: string;
  location: string;
  gateName?: string | null;
  apiKey?: string | null;
  status: string;
  direction: string;
  batteryPercent?: number | null;
  signalQuality?: string | null;
  studentsToday?: number;
  lastSeenAt?: string | null;
  firmwareVersion?: string | null;
}

export interface AttendanceDisplayFields {
  attendanceStatus: string;
  punctuality: string;
  checkoutStatus: string;
  primaryBadge: string;
  expectedArrival: string;
  expectedDeparture: string;
}

export interface AttendanceRecord {
  id: string;
  studentName: string;
  studentCode?: string | null;
  className?: string | null;
  level?: string | null;
  cardNumber?: string | null;
  deviceCode?: string | null;
  gateName?: string | null;
  status: string;
  direction: string;
  entryTime?: string | null;
  exitTime?: string | null;
  durationMins?: number | null;
  lessonDate: string;
  photoUrl?: string | null;
  personType?: 'STUDENT' | 'STAFF';
  department?: string | null;
  staffRole?: string | null;
  groupLabel?: string | null;
  attendanceStatus?: string;
  punctuality?: string;
  checkoutStatus?: string;
  primaryBadge?: string;
  expectedArrival?: string | null;
  expectedDeparture?: string | null;
  scheduleRuleName?: string | null;
  display?: AttendanceDisplayFields;
  parentSms?: {
    status: string;
    detail: string;
    sentAt?: string;
  };
}

export interface AttendanceTimelineEvent {
  id: string;
  kind: string;
  label: string;
  at: string;
  detail?: string | null;
  meta?: Record<string, unknown>;
}

export interface AttendanceFilterParams {
  date?: string;
  from?: string;
  to?: string;
  academicYear?: string;
  term?: string;
  q?: string;
  className?: string;
  personType?: string;
  page?: number;
  limit?: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PersonPerformanceDetail {
  period: { from: string; to: string; label: string };
  dailyTrend: Array<{ date: string; present: number; late: number; absent: number; total: number }>;
  statusBreakdown: Array<{ label: string; value: number; color: string }>;
  entryCompare: {
    studentAvg: string | null;
    classAvg: string | null;
    deltaMinutes: number | null;
  } | null;
  totalEvents: number;
}

export interface TermDateRange {
  start: string;
  end: string;
}

export interface AcademicContext {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
  termDates?: Record<string, TermDateRange>;
}

export interface PerformanceStats {
  presentDays: number;
  /** Full-term Mon–Fri count (rate denominator). */
  expectedDays: number;
  rate: number;
  termElapsed: number;
  termTotalDays?: number;
  elapsedWeekdays?: number;
  weekendPresentDays?: number;
}

export interface AttendanceSlice {
  id: string;
  status: string;
  entryTime?: string | null;
  exitTime?: string | null;
  gateName?: string | null;
  deviceCode?: string | null;
  cardNumber?: string | null;
  durationMins?: number | null;
}

export interface AnalyticsData {
  period: { from: string; to: string; label: string };
  expectedSchoolDays: number;
  kpis: {
    totalRecords: number;
    present: number;
    late: number;
    absent: number;
    uniqueStudents: number;
    uniqueStaff: number;
    studentAttendanceRate: number;
    staffAttendanceRate: number;
  };
  dailyTrend: Array<{ date: string; present: number; late: number; absent: number; total: number }>;
  byClass: Array<{ label: string; present: number; total: number; rate: number }>;
  byPersonType: Array<{ label: string; present: number; total: number; unique: number }>;
  statusBreakdown: Array<{ label: string; value: number; color: string }>;
}

export interface StudentPerson {
  id: string;
  studentCode: string | null;
  fullName: string;
  className?: string | null;
  photoUrl?: string | null;
  rfidUid?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  personType: 'STUDENT';
  todayStatus: string;
  attendance: AttendanceSlice | null;
  performance?: PerformanceStats;
}

export interface StaffPerson {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  department?: string | null;
  employeeNumber?: string | null;
  photoUrl?: string | null;
  rfidUid?: string | null;
  source: string;
  isTeacher: boolean;
  personType: 'STAFF';
  todayStatus: string;
  attendance: AttendanceSlice | null;
  performance?: PerformanceStats;
  schedule?: {
    todayClasses: number;
    currentLesson: string | null;
    currentClass: string | null;
    nextLesson: string | null;
  } | null;
}

export interface StudentsOverview {
  source: string;
  period?: { from: string; to: string; label: string };
  total: number;
  present: number;
  late: number;
  absent: number;
  rows: StudentPerson[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface StaffOverview {
  source: string;
  period?: { from: string; to: string; label: string };
  sources?: {
    hr: { reachable: boolean; count: number };
    iam: { reachable: boolean; count: number };
    timetable: { reachable: boolean; count: number };
  };
  total: number;
  checkedIn: number;
  late: number;
  absent: number;
  inside: number;
  rows: StaffPerson[];
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface StaffRankingsOverview {
  period?: { from: string; to: string; label: string };
  total: number;
  rows: StaffPerson[];
}

export interface ClassPerformanceRow {
  className: string;
  studentCount: number;
  avgRate: number;
  presentDays: number;
  expectedDays: number;
}

export interface ClassPerformanceOverview {
  period?: { from: string; to: string; label: string };
  classes: ClassPerformanceRow[];
}

export interface ClassStudentsOverview {
  period?: { from: string; to: string; label: string };
  className: string;
  total: number;
  rows: StudentPerson[];
}

export interface IntegrationHealth {
  configured?: boolean;
  reachable: boolean;
  url?: string | null;
  module?: string;
}

export interface IntegrationsStatus {
  studentManagement: IntegrationHealth;
  hr: IntegrationHealth | null;
  iam: IntegrationHealth | null;
  timetable: IntegrationHealth | null;
}

export interface TapResult {
  access: string;
  direction: string;
  notification: string;
  student: {
    name: string;
    code?: string | null;
    className?: string | null;
    level?: string | null;
    cardNumber: string;
    source?: 'smart_access' | 'local';
    personType?: 'STUDENT' | 'STAFF';
  };
  record: AttendanceRecord;
  parentSms?: {
    status: 'SENT' | 'FAILED' | 'SKIPPED';
    detail: string;
    phones: number;
  };
}

export interface ParentContact {
  id: string;
  studentName: string;
  studentCode?: string | null;
  className?: string | null;
  parentName: string;
  relationship: string;
  phone?: string | null;
  email?: string | null;
  isEmergency?: boolean;
}

export interface ParentNotification {
  id: string;
  studentName: string;
  channel: string;
  title: string;
  message: string;
  status: string;
  sentAt?: string | null;
  createdAt: string;
}

export interface PermissionRequest {
  id: string;
  studentName: string;
  className?: string | null;
  type: string;
  reason?: string | null;
  forDate: string;
  status: string;
}

export interface SecurityAlert {
  id: string;
  severity: string;
  title: string;
  message: string;
  resolved: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType?: string | null;
  detail?: string | null;
  createdAt: string;
}

export interface ReportsSummary {
  daily: Array<{ status: string; _count: number }>;
  weekly: Array<{ lessonDate: string; _count: number }>;
  byClass: Array<{ className: string | null; _count: number }>;
  lateToday: number;
}
