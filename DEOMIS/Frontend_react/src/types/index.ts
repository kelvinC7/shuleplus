export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export type SchoolStatus = 'normal' | 'monitoring' | 'attention' | 'offline';

export type OnboardingBadge = 'ready' | 'no_attendance' | 'no_students' | 'partial';

export interface SchoolRecord {
  id: string;
  name: string;
  code: string;
  sectorName?: string;
  onboarding?: OnboardingBadge;
  morningCompliant?: boolean;
  coordinatesSource?: 'gps' | 'fallback';
  students: number;
  studentsPresent: number;
  studentsAbsent: number;
  staffTotal: number;
  staffPresent: number;
  studentAttendancePct: number;
  staffAttendancePct: number;
  status: SchoolStatus;
  firstAttendanceTime: string | null;
  lastSync: string | null;
  deviceOnline: boolean;
  internetOnline: boolean;
  alertCount: number;
  lateArrivals: number;
  reporting: boolean;
  flags: string[];
}

export interface AttendanceInsight {
  headline: string;
  deltaPct: number;
  affectedSchools: number;
  affectedLevels: string[];
  dataCompletenessPct: number;
  deviceProblems: number;
  followUpRequired: boolean;
}

export interface CommandDashboard {
  organizationName: string;
  sector: string;
  date: string;
  totalSchools: number;
  totalStudents: number;
  totalStaff: number;
  studentsPresent: number;
  studentsAbsent: number;
  staffPresent: number;
  staffAbsent: number;
  lateArrivals: number;
  attendancePercentage: number;
  staffAttendancePercentage: number;
  schoolsNotReporting: number;
  schoolsRequiringAttention: number;
  insight: AttendanceInsight;
  notifications: Array<{ id: string; level: string; title: string; message: string; at: string }>;
  morningSummary: {
    timeLabel: string;
    normal: number;
    monitoring: number;
    attention: number;
    compliant?: number;
    notCompliant?: number;
    notReporting?: number;
  };
  autoRefreshSeconds?: number;
  morningCutoffTime?: string;
}

export interface SeiSettings {
  morningCutoffTime?: string;
  autoRefreshSeconds?: number;
  reportSchedule?: { enabled?: boolean; email?: string; hourLocal?: number; lastSentDate?: string };
  notificationRules?: { smsEnabled?: boolean; emailEnabled?: boolean };
}

export interface DashboardSummary extends CommandDashboard {}

export interface SchoolMapPoint {
  id: string;
  name: string;
  status: SchoolStatus;
  lat: number;
  lng: number;
  studentAttendancePct: number;
  staffAttendancePct: number;
  deviceOnline: boolean;
  lastSync: string | null;
  alerts: number;
}

export interface FollowUpCase {
  id: string;
  caseNumber: string;
  schoolId: string;
  schoolName: string;
  issue: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'ACTION_REQUIRED' | 'RESOLVED' | 'CLOSED' | string;
  assignedTo: string | null;
  followUpDate: string | null;
  createdAt: string;
}

export interface SchoolVisit {
  id: string;
  schoolId: string;
  schoolName: string;
  startedAt: string;
  completedAt: string | null;
  observations?: Record<string, unknown>;
  report?: Record<string, unknown>;
}
