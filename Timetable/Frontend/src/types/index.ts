export type TimetableTab =
  | 'teachers'
  | 'courses'
  | 'schedule'
  | 'generator'
  | 'timetable'
  | 'conflicts';

export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export interface DashboardSummary {
  organizationId: string;
  organizationName?: string;
  term: string;
  academicYear: string;
  kpis: {
    assignments: number;
    timetableRows: number;
    teachers: number;
    courses: number;
    classes: number;
    conflicts: number;
    coveragePercent: number;
  };
  alerts: {
    noSchedule: boolean;
    hasConflicts: boolean;
    incompleteCoverage: boolean;
  };
  coverage: { totalExpected: number; totalPlaced: number; percent: number };
  conflictBreakdown: Record<string, number>;
}

export interface TeacherAssignment {
  id: string;
  teacherUserId: string;
  teacherName: string;
  className: string;
  subjectName: string;
  periodsPerWeek: number;
  defaultCourseMarks?: number | null;
  room?: string | null;
  schedulingOverrides?: Record<string, unknown>;
  term: string;
  academicYear: string;
  status: string;
}

export type ClassConfigStatus = 'ready' | 'incomplete' | 'missing';

export interface ClassConfigListItem {
  className: string;
  classId: string | null;
  level: string;
  stream: string | null;
  section: string | null;
  studentCount: number;
  courseCount: number;
  teacherCount: number;
  totalPeriods: number;
  readinessPercent: number;
  status: ClassConfigStatus;
}

export interface ClassCourseRow {
  id: string;
  subjectName: string;
  courseCode: string;
  periodsPerWeek: number;
  defaultCourseMarks: number | null;
  teacherUserId: string;
  teacherName: string;
  room: string | null;
  structure: string;
  preferredTime: string;
  status: 'ready' | 'warning' | 'missing';
  schedulingOverrides: Record<string, unknown>;
  defaults: {
    periodsPerWeek: number;
    structure: string;
    roomRequirement: string;
    preferredRoom: string | null;
  };
}

export interface ClassConfigDetail {
  className: string;
  level: string;
  stream: string | null;
  section: string | null;
  studentCount: number;
  courses: ClassCourseRow[];
  summary: {
    courseCount: number;
    teacherCount: number;
    totalPeriods: number;
    labPeriods: number;
    doublePreferences: number;
    readinessPercent: number;
    status: ClassConfigStatus;
  };
  alerts: Array<{ severity: 'error' | 'warning'; message: string }>;
  readiness: {
    courses: { ok: boolean; label: string };
    teachers: { ok: boolean; label: string };
    periods: { ok: boolean; label: string };
    rooms: { ok: boolean; label: string };
    conflicts: { ok: boolean; label: string };
  };
}

export interface TeacherOption {
  teacherUserId: string;
  teacherName: string;
  maxPeriods: number;
  weeklyPeriods: number;
  availability: 'available' | 'high' | 'overloaded';
  recommended: boolean;
  subjects: string[];
  classes: string[];
}

export type TeacherLoginMethod = 'email' | 'phone' | 'both';

export interface TeacherAccountStatus {
  userId: string;
  email: string;
  phone: string | null;
  status: string;
  lastLoginAt: string | null;
  portalEnabled: boolean;
  loginMethod: TeacherLoginMethod;
}

export interface TeacherProfile {
  id: string;
  teacherUserId: string;
  teacherName: string;
  position?: string | null;
  employeeNumber?: string | null;
  maxPeriodsPerDay: number;
  availableDays: string[];
  preferredSlots: unknown[];
  unavailableSlots: unknown[];
  rfidUid?: string | null;
  portalEnabled?: boolean;
  loginMethod?: TeacherLoginMethod;
  loginEmail?: string | null;
  loginPhone?: string | null;
  account?: TeacherAccountStatus | null;
}

export type LessonDuration = 'SINGLE' | 'DOUBLE' | 'FLEXIBLE';
export type DoublePeriodMode = 'PREFER' | 'REQUIRE';
export type DoublePeriodPattern = 'ANY' | 'ONCE' | 'TWICE';
export type RoomRequirement = 'ANY' | 'PREFER_LAB' | 'REQUIRE_LAB';
export type SchedulingImportance = 'NORMAL' | 'IMPORTANT' | 'CRITICAL';

export interface CourseSchedulingRules {
  lessonDuration: LessonDuration;
  doublePeriodMode: DoublePeriodMode;
  doublePeriodPattern: DoublePeriodPattern;
  roomRequirement: RoomRequirement;
  preferredLabRoom?: string | null;
  preferredRoom?: string | null;
  preferPreferredRoom?: boolean;
  preferredDays?: string[];
  preferredPeriods?: string[];
  schedulingImportance?: SchedulingImportance;
}

export interface CourseConfig {
  id: string;
  subjectName: string;
  courseCode?: string | null;
  codeMode?: 'AUTOMATIC' | 'MANUAL';
  color?: string | null;
  priority: number;
  periodsPerWeek: number;
  requiresLab: boolean;
  prefersDoublePeriod: boolean;
  timePreference: 'ANY' | 'MORNING' | 'AFTERNOON' | 'CUSTOM';
  customWindowStart?: string | null;
  customWindowEnd?: string | null;
  schedulingRules?: CourseSchedulingRules | Record<string, unknown>;
  /** When false, course is treated as non-core on report cards. Default true. */
  isCore?: boolean;
}

export interface SchoolSchedule {
  id: string;
  dayStart: string;
  dayEnd: string;
  periodDurationMinutes: number;
  periodCount?: number;
  transitionMinutes?: number;
  durationMode?: 'UNIFORM' | 'CUSTOM';
  periodSlots?: PeriodSlotDefinition[];
  activeDays: string[];
  breaks: Array<BreakDefinition | { start: string; end: string; label?: string }>;
  term: string;
  academicYear: string;
}

export type ScheduleSlotType =
  | 'LESSON'
  | 'BREAK'
  | 'LUNCH'
  | 'ASSEMBLY'
  | 'ACTIVITY'
  | 'EXAMINATION'
  | 'MEETING'
  | 'CLUB';

export interface BreakDefinition {
  id: string;
  label: string;
  durationMinutes: number;
  /** @deprecated Prefer startTime/endTime */
  afterPeriod?: number;
  startTime?: string;
  endTime?: string;
  slotType: ScheduleSlotType;
  appliesEveryDay?: boolean;
}

export interface PeriodSlotDefinition {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  slotType: ScheduleSlotType;
  isBreak: boolean;
}

export interface TimetableRow {
  id: string;
  className: string;
  subjectName: string;
  teacherUserId: string;
  teacherName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  term: string;
  academicYear: string;
  isExtraActivity?: boolean;
  extraActivityId?: string | null;
}

export interface ExtraActivity {
  id: string;
  name: string;
  className?: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  capacity: number;
  synced: boolean;
  term?: string;
  academicYear?: string;
}

export interface ExtraPlacementConflict {
  dayOfWeek: string;
  className: string;
  startTime: string;
  endTime: string;
  reason: 'lesson_overlap' | 'break' | 'outside_day' | 'invalid_range';
  message: string;
  advice: string;
  conflictingLessons: Array<{
    subjectName: string;
    teacherName: string;
    className: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }>;
}

export interface CoverageItem {
  className: string;
  subjectName: string;
  teacherName: string;
  expected: number;
  placed: number;
  complete: boolean;
}

export interface TimetableConflict {
  type: string;
  message: string;
  rowId?: string;
  details: Record<string, unknown>;
}

export interface SchedulingIssue {
  type: string;
  severity: 'error' | 'warning';
  className: string;
  subjectName: string;
  message: string;
  details: Record<string, unknown>;
}

export interface GenerateIssueSummary {
  total: number;
  incomplete: number;
  topBlockers: Array<{ blocker: string; count: number }>;
}

export interface TeacherLoadOverloaded {
  teacherUserId: string;
  teacherName: string;
  expectedPeriods: number;
  maxWeeklyPeriods: number;
  surplus: number;
}

export interface TeacherLoadReport {
  slotsPerWeek: number;
  teachersChecked: number;
  overloaded: TeacherLoadOverloaded[];
  canFullySchedule: boolean;
}

export interface AutoCompleteMeta {
  fillTotal: number;
  displaced: number;
  teacherLoad: TeacherLoadReport;
}

export interface GenerateResult {
  placements: TimetableRow[];
  coverage: CoverageItem[];
  issues?: SchedulingIssue[];
  issueSummary?: GenerateIssueSummary;
  autoComplete?: AutoCompleteMeta;
  message?: string;
  slotCount: number;
  classes: string[];
}

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const TERMS = ['Term 1', 'Term 2', 'Term 3'] as const;

export function currentAcademicYear(): string {
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

export interface DashboardOverview {
  organizationId: string;
  organizationName?: string;
  context: {
    academicYear: string;
    academicYearLabel: string;
    term: string;
    weekNumber: number;
    date: string;
    dayName: string;
    formattedDate: string;
  };
  kpis: {
    todaysPeriods: number;
    teachersTeaching: { active: number; total: number };
    activeClasses: number;
    lessonsToday: number;
    conflicts: number;
    lessonCoveragePercent: number;
  };
  currentPeriod: {
    periodLabel: string;
    startTime: string;
    endTime: string;
    className: string;
    subjectName: string;
    teacherName: string;
    room: string | null;
    minutesRemaining: number;
  } | null;
  nextPeriod: {
    periodLabel: string;
    startTime: string;
    endTime: string;
    className: string;
    subjectName: string;
    teacherName: string;
    room: string | null;
  } | null;
  todaySchedule: Array<{
    id: string;
    period: string;
    time: string;
    className: string;
    subjectName: string;
    teacherName: string;
    teacherUserId: string;
    room: string | null;
    status: 'completed' | 'running' | 'upcoming' | 'late' | 'missed';
  }>;
  teacherWorkload: Array<{
    teacherUserId: string;
    teacherName: string;
    today: number;
    week: number;
    status: 'normal' | 'high' | 'heavy';
  }>;
  classActivity: Array<{
    className: string;
    today: number;
    completed: number;
    remaining: number;
  }>;
  alerts: Array<{
    id: string;
    type: string;
    count: number;
    message: string;
    severity: 'warning' | 'error' | 'info';
    href?: string;
  }>;
  lessonCoverage: {
    scheduled: number;
    conducted: number;
    late: number;
    missed: number;
    percent: number;
  };
  subjectDistribution: Array<{ subjectName: string; count: number }>;
  teacherAttendance: {
    scheduled: number;
    onTime: number;
    late: number;
    absent: number;
  };
}
