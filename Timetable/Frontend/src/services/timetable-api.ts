import { api } from './api';
import type {
  CourseConfig,
  ClassConfigDetail,
  ClassConfigListItem,
  ClassCourseRow,
  CoverageItem,
  DashboardOverview,
  DashboardSummary,
  ExtraActivity,
  GenerateResult,
  SchoolSchedule,
  TeacherAssignment,
  TeacherOption,
  TeacherProfile,
  TimetableConflict,
  TimetableRow,
} from '@/types';

export const timetableApi = {
  dashboard: () => api.get<{ data: DashboardSummary }>('/dashboard'),
  dashboardOverview: (params: { term: string; academic_year: string; date?: string }) =>
    api.get<{ data: DashboardOverview }>('/dashboard/overview', { params }),
  listTimetable: (params: Record<string, string>) =>
    api.get<{ data: TimetableRow[] }>('/timetable', { params }),
  createTimetable: (
    data: Omit<TimetableRow, 'id' | 'isExtraActivity' | 'extraActivityId'>,
  ) => api.post<{ data: TimetableRow }>('/timetable', data),
  updateTimetable: (id: string, data: Partial<TimetableRow>) =>
    api.put<{ data: TimetableRow }>(`/timetable/${id}`, data),
  swapTimetable: (sourceId: string, targetId: string) =>
    api.post<{ data: { source: TimetableRow; target: TimetableRow } }>('/timetable/swap', {
      sourceId,
      targetId,
    }),
  deleteTimetable: (id: string) => api.delete(`/timetable/${id}`),

  getSchedule: (term: string, academicYear: string) =>
    api.get<{ data: SchoolSchedule }>('/timetable-system/schedule', {
      params: { term, academic_year: academicYear },
    }),
  updateSchedule: (data: Partial<SchoolSchedule> & { term: string; academicYear: string }) =>
    api.put<{ data: SchoolSchedule }>('/timetable-system/schedule', data),

  listTeacherProfiles: () => api.get<{ data: TeacherProfile[] }>('/timetable-system/teacher-profiles'),
  upsertTeacherProfiles: (profiles: Partial<TeacherProfile>[]) =>
    api.put('/timetable-system/teacher-profiles', { profiles }),
  deleteTeacherProfile: (teacherUserId: string) =>
    api.delete(`/timetable-system/teacher-profiles/${encodeURIComponent(teacherUserId)}`),
  saveTeacherWithAccount: (body: {
    profile: Partial<TeacherProfile>;
    account?: {
      password?: string;
      requirePasswordChange?: boolean;
      sendCredentialsEmail?: boolean;
    };
  }) => api.post<{ data: TeacherProfile }>('/timetable-system/teacher-profiles/save', body),
  checkTeacherIdentifier: (body: { email?: string; phone?: string; excludeUserId?: string }) =>
    api.post<{ data: { available: boolean; field?: string; message?: string } }>(
      '/timetable-system/teacher-profiles/check-identifier',
      body
    ),
  resetTeacherPassword: (
    teacherUserId: string,
    body?: { password?: string; sendCredentialsEmail?: boolean }
  ) =>
    api.post(`/timetable-system/teacher-profiles/${encodeURIComponent(teacherUserId)}/reset-password`, body),
  disableTeacherAccount: (teacherUserId: string) =>
    api.post(`/timetable-system/teacher-profiles/${encodeURIComponent(teacherUserId)}/disable-account`),
  enableTeacherAccount: (teacherUserId: string) =>
    api.post(`/timetable-system/teacher-profiles/${encodeURIComponent(teacherUserId)}/enable-account`),

  listCourseConfig: () => api.get<{ data: CourseConfig[] }>('/timetable-system/course-config'),
  createCourseConfig: (data: Partial<CourseConfig> & { subjectName: string }) =>
    api.post<{ data: CourseConfig }>('/timetable-system/course-config', data),
  updateCourseConfigById: (id: string, data: Partial<CourseConfig> & { newSubjectName?: string }) =>
    api.put(`/timetable-system/course-config/id/${encodeURIComponent(id)}`, data),
  deleteCourseConfigById: (id: string) =>
    api.delete(`/timetable-system/course-config/id/${encodeURIComponent(id)}`),
  upsertCourseConfig: (subjectName: string, data: Partial<CourseConfig>) =>
    api.put(`/timetable-system/course-config/${encodeURIComponent(subjectName)}`, data),
  deleteCourseConfig: (subjectName: string) =>
    api.delete(`/timetable-system/course-config/${encodeURIComponent(subjectName)}`),

  listAssignments: (params: Record<string, string>) =>
    api.get<{ data: TeacherAssignment[] }>('/teacher-assignments', { params }),
  assignmentsOverview: (term: string, academicYear: string) =>
    api.get('/teacher-assignments/overview', { params: { term, academic_year: academicYear } }),
  createAssignment: (data: Omit<TeacherAssignment, 'id' | 'status'>) =>
    api.post<{ data: TeacherAssignment }>('/teacher-assignments', data),
  updateAssignment: (id: string, data: Partial<TeacherAssignment>) =>
    api.put(`/teacher-assignments/${id}`, data),
  archiveAssignment: (id: string) => api.post(`/teacher-assignments/${id}/archive`),
  deleteAssignment: (id: string) => api.delete(`/teacher-assignments/${id}`),
  bulkAssignments: (rows: Omit<TeacherAssignment, 'id' | 'status'>[]) =>
    api.post<{ data: TeacherAssignment[] }>('/teacher-assignments/bulk', { rows }),

  listClassConfig: (params: Record<string, string>) =>
    api.get<{ data: ClassConfigListItem[] }>('/class-config', { params }),
  getClassConfig: (className: string, term: string, academicYear: string) =>
    api.get<{ data: ClassConfigDetail }>(`/class-config/${encodeURIComponent(className)}`, {
      params: { term, academic_year: academicYear },
    }),
  copyClassConfig: (body: {
    fromClass: string;
    toClasses: string[];
    term: string;
    academicYear: string;
  }) => api.post('/class-config/copy', body),
  classConfigTeachers: (term: string, academicYear: string, subject?: string) =>
    api.get<{ data: TeacherOption[] }>('/class-config/teachers', {
      params: { term, academic_year: academicYear, ...(subject ? { subject } : {}) },
    }),

  workload: (term: string, academicYear: string) =>
    api.get('/timetable-system/workload', { params: { term, academic_year: academicYear } }),
  classCoverage: (term: string, academicYear: string, className?: string) =>
    api.get<{ data: { coverage: CoverageItem[]; summary: { percent: number } } }>(
      '/timetable-system/class-coverage',
      { params: { term, academic_year: academicYear, class: className } }
    ),
  generate: (data: { classes: string[]; term: string; academicYear: string }) =>
    api.post<{ data: GenerateResult }>('/timetable-system/generate', data),
  apply: (data: { classes: string[]; term: string; academicYear: string; placements?: unknown[] }) =>
    api.post('/timetable-system/apply', data),
  regenerate: (data: { classes: string[]; term: string; academicYear: string }) =>
    api.post('/timetable-system/regenerate', data),
  autoComplete: (data: { classes: string[]; term: string; academicYear: string }) =>
    api.post<{ data: GenerateResult & { message: string } }>('/timetable-system/auto-complete', data),
  fillGaps: (data: { classes: string[]; term: string; academicYear: string }) =>
    api.post<{
      data: {
        mode: 'preview' | 'persisted';
        filled: number;
        placements: unknown[];
        coverage: CoverageItem[];
        issues: GenerateResult['issues'];
        issueSummary?: GenerateResult['issueSummary'];
        message: string;
        classes: string[];
      };
    }>('/timetable-system/fill-gaps', data),
  clearTimetables: (data: { term: string; academicYear: string; classes?: string[] }) =>
    api.post('/timetable-system/clear-timetables', data),
  confirmClassTimetable: (data: { className: string; term: string; academicYear: string }) =>
    api.post<{ data: { id: string; lessonCount: number; confirmedAt: string } }>(
      '/timetable-system/confirm-class',
      data,
    ),

  conflictCenter: (term: string, academicYear: string) =>
    api.get<{ data: { total: number; conflicts: TimetableConflict[]; byType: Record<string, number> } }>(
      '/timetable-system/conflict-center',
      { params: { term, academic_year: academicYear } }
    ),
  autoFix: (term: string, academicYear: string) =>
    api.post('/timetable-system/auto-fix', { term, academicYear }),
  suggestPlacementSlots: (body: {
    className: string;
    subjectName: string;
    teacherUserId: string;
    teacherName: string;
    term: string;
    academicYear: string;
    room?: string;
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
  }) =>
    api.post<{
      data: {
        selectedSlot: { ok: boolean; conflicts: TimetableConflict[] };
        suggestions: Array<{
          dayOfWeek: string;
          startTime: string;
          endTime: string;
          periodLabel: string | null;
          score: number;
        }>;
      };
    }>('/timetable-system/suggest-slots', body),

  listExtraActivities: (term: string, academicYear: string) =>
    api.get<{ data: ExtraActivity[] }>('/timetable-system/extra-activities', {
      params: { term, academic_year: academicYear },
    }),
  validateExtraActivityBatch: (data: {
    days: string[];
    classNames?: string[] | null;
    startTime: string;
    endTime: string;
    term: string;
    academicYear: string;
    capacity?: number;
    excludeId?: string;
  }) =>
    api.post<{
      data: {
        valid: boolean;
        conflicts: import('@/types').ExtraPlacementConflict[];
        advice?: string;
        placementCount: number;
      };
    }>('/timetable-system/extra-activities/validate-batch', data),
  createExtraActivity: (
    data: Partial<ExtraActivity> & {
      term: string;
      academicYear: string;
      sync?: boolean;
      days?: string[];
      classNames?: string[] | null;
    }
  ) =>
    api.post<{
      data:
        | ExtraActivity
        | { created: number; activities: ExtraActivity[]; message: string };
    }>('/timetable-system/extra-activities', data),
  updateExtraActivity: (id: string, data: Partial<ExtraActivity> & { sync?: boolean }) =>
    api.put(`/timetable-system/extra-activities/${id}`, data),
  deleteExtraActivity: (id: string) => api.delete(`/timetable-system/extra-activities/${id}`),
  syncExtraActivity: (id: string) => api.post(`/timetable-system/extra-activities/${id}/sync`),

  seedDemo: () => api.post('/timetable-system/seed-demo'),

  // Smart Timetable (live ops)
  smartSettingsGet: () => api.get<{ data: SmartSettings }>('/smart/settings'),
  smartSettingsPut: (body: Partial<SmartSettings>) =>
    api.put<{ data: SmartSettings }>('/smart/settings', body),
  smartClassrooms: () => api.get<{ data: SmartClassroom[] }>('/smart/classrooms'),
  smartClassroomUpsert: (body: Partial<SmartClassroom> & { name: string; roomNumber: string }) =>
    api.post<{ data: SmartClassroom }>('/smart/classrooms', body),
  liveMonitor: (params?: { term?: string; academicYear?: string }) =>
    api.get<{ data: LiveMonitorData }>('/smart/live/monitor', { params }),
  liveHistory: (params?: LiveHistoryParams) =>
    api.get<{ data: LiveHistoryData }>('/smart/live/history', { params }),
  livePeriodReplay: (params: {
    date: string;
    periodLabel: string;
    term?: string;
    academicYear?: string;
  }) => api.get<{ data: LivePeriodReplayData }>('/smart/live/replay', { params }),
  classQrList: () => api.get<{ data: ClassQrRecord[] }>('/smart/class-qr'),
  classQrSync: () => api.post<{ data: { synced: number; classes: ClassQrRecord[] } }>('/smart/class-qr/sync'),
  academicSettingsGet: () =>
    api.get<{ data: AcademicSettingsData; meta?: { source?: string; warning?: string } }>(
      '/settings/academic'
    ),
  academicSettingsPut: (body: Partial<AcademicSettingsData>) =>
    api.put<{ data: AcademicSettingsData; meta?: { source?: string } }>('/settings/academic', body),
  academicClasses: (term?: string, academicYear?: string) =>
    api.get<{ data: { source: string; classes: AcademicClassOption[] } }>('/smart/academic/classes', {
      params: {
        ...(term ? { term } : {}),
        ...(academicYear ? { academic_year: academicYear } : {}),
      },
    }),
  academicStudents: (params: { classId?: string; className?: string; academicYear?: string }) =>
    api.get<{ data: { source: string; students: AcademicStudentOption[] } }>('/smart/academic/students', {
      params,
    }),
};

export interface AcademicClassOption {
  id: string;
  name: string;
  stream?: string | null;
  label: string;
  category?: string | null;
}

export interface AcademicStudentOption {
  id: string;
  studentCode: string;
  fullName: string;
  gender?: string | null;
  className?: string | null;
  stream?: string | null;
  rollNumber?: string | null;
  photoUrl?: string | null;
}

export interface SmartSettings {
  id: string;
  organizationId: string;
  graceMinutesOnTime: number;
  lateThresholdMinutes: number;
  veryLateThresholdMinutes: number;
  qrRequired: boolean;
  gpsRequired: boolean;
  autoCloseAfterEnd: boolean;
  reminderEnabled: boolean;
  liveRefreshSeconds: number;
  notifyHeadOfStudies: boolean;
  notifyDeputyHead: boolean;
  notifyDepartmentHead: boolean;
  alertLateEnabled: boolean;
  alertMissingCheckInEnabled: boolean;
  alertMissingCheckOutEnabled: boolean;
  alertEarlyDepartureEnabled: boolean;
  missingCheckInAfterMinutes: number;
  attendanceEarlyOpenMinutes: number;
  attendanceEditAfterMinutes: number;
}

export interface SmartClassroom {
  id: string;
  name: string;
  building: string | null;
  floor: string | null;
  roomNumber: string;
  qrCode: string;
  sourceClassId?: string | null;
  classLabel?: string | null;
  capacity: number | null;
  active: boolean;
}

export interface ClassQrRecord extends SmartClassroom {}

export interface AcademicSettingsData {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
  termDates?: Record<string, { start: string; end: string }>;
}

export interface LiveMonitorData {
  refreshedAt: string;
  refreshSeconds: number;
  day: string;
  currentTime: string;
  kpis: {
    classesRunningNow: number;
    teachersPresent: number;
    teachersLate: number;
    teachersMissing: number;
    lessonsCompleted: number;
    lessonsPending: number;
    attendanceCompletion: number;
    activeQrScans: number;
    onTime: number;
    late: number;
    missing: number;
    upcoming: number;
    activeClasses: number;
    roomsOccupied: number;
    totalRooms: number;
  };
  cards: Array<{
    sessionId: string;
    teacherName: string;
    subject: string;
    className: string;
    classroom: string | null;
    building?: string | null;
    startTime: string;
    scanTime: string | null;
    punctuality: string;
    attendanceDone: boolean;
    status: string;
    qrVerified: boolean;
  }>;
  grid: Array<{
    period: string;
    time: string;
    classroom: string;
    subject: string;
    teacher: string;
    qrVerified: boolean;
    attendance: string;
    status: string;
    punctuality: string;
    sessionId: string | null;
    timetableId: string;
  }>;
  mapRooms: LiveMapRoom[];
  currentPeriod: {
    label: string;
    startTime: string;
    endTime: string;
    progressPercent: number;
  } | null;
  periodTimeline: Array<{
    label: string;
    startTime: string;
    endTime: string;
    isCurrent: boolean;
    isPast: boolean;
  }>;
  alerts: LiveAlert[];
  needsAttention: { missing: number; late: number; conflicts: number };
  teachers: LiveTeacherRow[];
  courses: LiveCourseGroup[];
  buildings: string[];
  floors: string[];
  settings: {
    graceMinutesOnTime: number;
    liveRefreshSeconds: number;
    lateThresholdMinutes: number;
    missingCheckInAfterMinutes: number;
    alertLateEnabled: boolean;
    alertMissingCheckInEnabled: boolean;
    alertMissingCheckOutEnabled: boolean;
    alertEarlyDepartureEnabled: boolean;
    notifyHeadOfStudies: boolean;
    notifyDeputyHead: boolean;
    notifyDepartmentHead: boolean;
  };
}

export type LiveRoomStatus =
  | 'ON_TIME'
  | 'LATE'
  | 'MISSING'
  | 'UPCOMING'
  | 'COMPLETED'
  | 'FREE';

export interface LiveMapRoom {
  id: string;
  label: string;
  className: string;
  subject: string | null;
  teacher: string | null;
  building: string;
  floor: string;
  status: LiveRoomStatus;
  periodLabel: string | null;
  startTime: string | null;
  endTime: string | null;
  minutesLate: number | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  timetableId: string | null;
  sessionId: string | null;
  qrVerified: boolean;
  attendanceDone: boolean;
}

export interface LiveAlert {
  id: string;
  type: 'CHECK_IN' | 'LATE' | 'MISSING' | 'MISSING_CHECKOUT' | 'EARLY_DEPARTURE';
  at: string;
  message: string;
  room: string;
  className: string;
  subject: string;
  teacher: string;
  mapKey: string;
}

export interface LiveTeacherRow {
  teacher: string;
  className: string;
  subject: string;
  room: string;
  status: LiveRoomStatus;
  minutesLate: number | null;
  timetableId: string;
}

export interface LiveCourseGroup {
  subject: string;
  classes: Array<{
    className: string;
    room: string;
    teacher: string;
    status: LiveRoomStatus;
    minutesLate: number | null;
  }>;
}

export interface LiveHistoryParams {
  term?: string;
  academicYear?: string;
  date?: string;
  className?: string;
  teacherName?: string;
  status?: string;
  limit?: number;
}

export interface LiveHistoryData {
  date: string;
  day: string;
  summary: {
    periods: number;
    onTime: number;
    late: number;
    missing: number;
    avgDelayMinutes: number;
    verificationRate: number;
  };
  rows: LiveHistoryRow[];
  teacherStats: Array<{
    teacher: string;
    total: number;
    onTime: number;
    late: number;
    missing: number;
    onTimeRate: number;
  }>;
  mapRooms: Array<{
    id: string;
    label: string;
    className: string;
    subject: string;
    teacher: string;
    status: LiveRoomStatus;
    periodLabel: string;
    startTime: string;
    endTime: string;
  }>;
}

export interface LiveHistoryRow {
  sessionId: string | null;
  timetableId: string;
  date: string;
  periodLabel: string;
  startTime: string;
  endTime: string;
  teacher: string;
  subject: string;
  className: string;
  room: string;
  checkIn: string | null;
  checkOut: string | null;
  durationMinutes: number | null;
  status: string;
  punctuality: string;
  qrVerified: boolean;
  scanDevice: string | null;
  studentsMarked: number;
}

export interface LivePeriodReplayData {
  date: string;
  day: string;
  periodLabel: string;
  startTime: string;
  endTime: string;
  events: Array<{
    at: string | null;
    isoAt: string;
    type: string;
    message: string;
    teacher?: string;
    room?: string;
    className?: string;
    subject?: string;
  }>;
  mapRooms: Array<{
    id: string;
    label: string;
    className: string;
    subject: string;
    teacher: string;
    status: LiveRoomStatus | string;
    periodLabel: string;
    startTime: string;
    endTime: string;
  }>;
}
