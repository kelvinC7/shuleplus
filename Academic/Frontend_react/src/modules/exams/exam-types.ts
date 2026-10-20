export type ExamLifecycle = 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
export type ExamSlotStatus = 'SCHEDULED' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
export type ExamAttendanceState =
  | 'NOT_ARRIVED'
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'EXITED';
export type SeatingStrategy = 'CLASS_TOGETHER' | 'MIXED' | 'ANTI_CHEAT';

export interface ExamRoom {
  name: string;
  capacity: number;
  rows?: number;
  cols?: number;
}

export interface ExamTimeSlot {
  code: string;
  label: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface ExamDay {
  date: string;
  morning: boolean;
  afternoon: boolean;
  evening?: boolean;
}

export interface InvigilatorSettings {
  assignmentMode: 'AUTO' | 'MANUAL';
  dailyRotation: boolean;
  rotationFrequency: 'SESSION' | 'DAY' | 'TWO_DAYS' | 'CUSTOM';
  maxDutiesPerDay: number;
  maxConsecutiveSessions: number;
  minBreakSessions: number;
  avoidSameRoom: boolean;
  balanceDuties: boolean;
  autoReplaceAbsent: boolean;
  avoidOwnClass: boolean;
  avoidOwnSubject: boolean;
  invigilatorsPerRoom: number;
  lateGraceMinutes: number;
}

export interface ExamCatalogClass {
  classId: string;
  className: string;
  studentCount: number;
  courseCount: number;
  courses: Array<{ subjectName: string; durationMinutes: number; teacherName?: string; isMajor: boolean }>;
}

export interface ExamCatalog {
  classes: ExamCatalogClass[];
  totalStudents: number;
  warning?: string;
  academicYear?: string;
  term?: string;
}

export interface ExamSessionClass {
  id: string;
  classId: string;
  className: string;
  studentCount: number;
  selected: boolean;
}

export interface ExamSessionCourse {
  id: string;
  classId: string;
  subjectName: string;
  durationMinutes: number;
  selected: boolean;
  isMajor: boolean;
}

export interface ExamSeat {
  id: string;
  studentId: string;
  studentCode: string;
  fullName: string;
  className: string;
  roomName: string;
  seatCode: string;
  rowLabel: string;
  colIndex: number;
  scheduleId: string;
}

export interface ExamDuty {
  id: string;
  scheduleId: string | null;
  examDate: string;
  slotCode: string;
  roomName: string;
  invigilatorId: string;
  invigilatorName: string;
  mode: 'AUTO' | 'MANUAL' | 'LOCKED';
  locked: boolean;
  checkedInAt?: string | null;
}

export interface ExamAttendance {
  id: string;
  studentId: string;
  studentCode: string;
  fullName: string;
  className: string;
  roomName: string;
  seatCode?: string | null;
  status: ExamAttendanceState;
  checkInAt?: string | null;
  submitAt?: string | null;
  exitAt?: string | null;
  method?: 'MANUAL' | 'QR' | 'RFID' | null;
  lateMinutes: number;
  earlyReason?: string | null;
}

export interface ExamConflict {
  id: string;
  type: string;
  severity: 'ERROR' | 'WARNING';
  message: string;
  resolved: boolean;
  details?: unknown;
}

export interface ExamSchedule {
  id: string;
  classId: string;
  className: string;
  subjectName: string;
  examDate: string;
  slotCode: string;
  startTime: string;
  endTime: string;
  status: ExamSlotStatus;
  rooms: Array<{ name: string; capacity?: number; studentCount: number }>;
  studentCount: number;
  seats?: ExamSeat[];
  duties?: ExamDuty[];
  attendances?: ExamAttendance[];
  kpis?: { present: number; late: number; absent: number; submitted: number; total: number };
}

export interface ExamSession {
  id: string;
  name: string;
  academicYear: string;
  term: string;
  examType: string;
  startDate: string;
  endDate: string;
  generateAutomatically: boolean;
  status: ExamLifecycle;
  maxExamsPerDay: number;
  majorGapSessions: number;
  rooms: ExamRoom[];
  timeSlots: ExamTimeSlot[];
  days: ExamDay[];
  invigilatorSettings: InvigilatorSettings;
  readinessScore: number;
  publishedAt?: string | null;
  classes: ExamSessionClass[];
  courses: ExamSessionCourse[];
  schedules: ExamSchedule[];
  seats?: ExamSeat[];
  conflicts: ExamConflict[];
  duties: ExamDuty[];
  _count?: { schedules: number; conflicts: number; classes: number };
}

export interface ExamDashboard {
  sessions: number;
  published: number;
  live: number;
  openConflicts: number;
  sessionsList: ExamSession[];
}

export interface ExamReports {
  attendance: Array<{
    className: string;
    subjectName: string;
    examDate: string;
    slotCode: string;
    total: number;
    present: number;
    late: number;
    absent: number;
    submitted: number;
  }>;
  invigilators: Array<{
    name: string;
    roomName: string;
    date: string;
    slotCode: string;
    mode: string;
    checkedInAt?: string | null;
  }>;
  audits: Array<{ id: string; action: string; message: string; actorId?: string | null; createdAt: string }>;
}
