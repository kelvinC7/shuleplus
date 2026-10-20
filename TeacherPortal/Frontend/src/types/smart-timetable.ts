export type LessonPhase = 'past' | 'current' | 'upcoming' | string;

export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'EXCUSED'
  | 'SICK'
  | 'SCHOOL_ACTIVITY';

export type AttendanceEditMode = 'live' | 'past_edit' | 'readonly' | 'locked';

export interface AttendanceAccess {
  phase: 'upcoming' | 'current' | 'past';
  locked: boolean;
  lockReason: string | null;
  opensAt: string | null;
  minutesRemaining: number | null;
  canEdit: boolean;
  editMode: AttendanceEditMode;
  available: boolean;
}

export interface SmartLesson {
  timetableId: string;
  className: string;
  stream: string | null;
  subjectName: string;
  teacherUserId: string;
  teacherName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
  term: string;
  academicYear: string;
  periodLabel: string | null;
  phase: LessonPhase;
  lessonStatus: string;
  punctuality: string;
  qrVerified: boolean;
  attendanceDone: boolean;
  attendanceSubmittedAt?: string | null;
  attendanceReference?: string | null;
  sessionId: string | null;
  scannedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  topic: string | null;
}

export type PeriodTransitionAction = 'free' | 'move' | 'double_continue';

export interface PeriodTransition {
  minutesRemaining: number;
  nextAction: PeriodTransitionAction;
  message: string;
  isDoublePeriod: boolean;
  doublePeriodContinues: boolean;
  alertAtMinutes: number[];
}

export interface TeacherTodayData {
  date: string;
  dayOfWeek: string;
  kpis: {
    todayClasses: number;
    currentPeriod: string | null;
    nextLesson: string | null;
    lessonsCompleted: number;
    classesRunning: number;
    pendingAttendance: number;
    checkedIn?: number;
    lateArrivals?: number;
    notCheckedIn?: number;
  };
  current: SmartLesson | null;
  next: SmartLesson | null;
  lessons: SmartLesson[];
  periodTransition?: PeriodTransition | null;
}

export interface ScheduleSlot {
  id: string;
  className: string;
  subjectName: string;
  teacherName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
}

export interface SchedulePeriodSlot {
  name: string;
  startTime: string;
  endTime: string;
}

export type TeacherScheduleData =
  | TeacherTodayData
  | {
      view: string;
      byDay: Record<string, ScheduleSlot[]>;
      total: number;
      classes?: string[];
      courses?: string[];
      days?: string[];
      periodSlots?: SchedulePeriodSlot[];
    };

export interface LessonSession {
  id: string;
  timetableId: string;
  status: string;
  punctuality: string;
  qrVerified: boolean;
  attendanceDone: boolean;
  attendanceSubmittedAt?: string | null;
  attendanceReference?: string | null;
  periodLabel?: string | null;
  topic?: string | null;
  notes?: string | null;
  homework?: string | null;
  className?: string;
  subjectName?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  teacherName?: string;
  room?: string | null;
}

export interface Classroom {
  id: string;
  name: string;
  building: string | null;
  floor: string | null;
  roomNumber: string;
  qrCode: string;
  capacity: number | null;
  active: boolean;
}

export type QrCheckInCode =
  | 'SUCCESS'
  | 'ALREADY_CHECKED_IN'
  | 'WRONG_CLASSROOM'
  | 'TOO_EARLY'
  | 'NO_ASSIGNMENT'
  | 'INVALID_QR';

export interface QrLessonSummary {
  timetableId: string;
  subjectName: string;
  className: string;
  room: string | null;
  startTime: string;
  endTime: string;
  periodLabel: string;
  academicYear: string;
  term: string;
}

export interface QrCheckInResult {
  ok: boolean;
  code: QrCheckInCode;
  message: string;
  classroom?: Classroom;
  lesson?: QrLessonSummary;
  session?: LessonSession | null;
  punctuality?: string;
  minutesLate?: number;
  checkedInAt?: string;
  opensAt?: string;
  currentTime?: string;
  expected?: QrLessonSummary;
  scanned?: { id: string; name: string; roomNumber: string; qrCode: string };
}

export interface CheckInHistoryRow {
  sessionId: string;
  date: string;
  periodLabel: string | null;
  className: string;
  subjectName: string;
  room: string | null;
  startTime: string;
  endTime: string;
  checkedInAt: string | null;
  punctuality: string;
  qrVerified: boolean;
  minutesLate: number;
  term: string | null;
  academicYear: string | null;
}

export interface SmartAttendanceRow {
  id: string | null;
  studentCode: string;
  fullName: string;
  gender?: string | null;
  className?: string;
  stream?: string | null;
  rollNumber?: string | null;
  photoUrl?: string | null;
  status: AttendanceStatus | string;
  reason?: string | null;
  arrivalTime?: string | null;
  minutesLate?: number | null;
  notes?: string | null;
  markedAt?: string | null;
}

export interface AttendancePayload {
  session: LessonSession & {
    className: string;
    subjectName: string;
    scheduledStart: string;
    scheduledEnd: string;
  };
  rows: SmartAttendanceRow[];
  demo: boolean;
  source?: 'saved' | 'academic' | 'demo';
  access: AttendanceAccess;
  studentCount: number;
  rosterMeta?: {
    classId: string | null;
    classLabel: string;
    matched: boolean;
    source?: string;
  };
}

export interface AttendanceSubmitResult {
  rows: SmartAttendanceRow[];
  session: LessonSession;
  reference: string | null;
  submittedAt: string | null;
}

export interface AttendanceHistoryRow {
  sessionId: string;
  date: string;
  periodLabel: string | null;
  className: string;
  subjectName: string;
  startTime: string;
  endTime: string;
  reference: string | null;
  submittedAt: string | null;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  term: string | null;
  academicYear: string | null;
}

export interface CompleteLessonInput {
  topic?: string;
  objectives?: string;
  notes?: string;
  homework?: string;
  resourcesUsed?: string;
  nextLessonPlan?: string;
  draft?: boolean;
}

export interface LiveMonitorData {
  refreshedAt: string;
  refreshSeconds: number;
  kpis: {
    classesRunningNow: number;
    teachersPresent: number;
    teachersLate: number;
    teachersMissing: number;
    lessonsCompleted: number;
    lessonsPending: number;
    attendanceCompletion: number;
    activeQrScans: number;
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
}
