export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export interface DashboardSummary {
  organizationId: string;
  organizationName: string;
  status: string;
  totalCases: number;
  openCases: number;
  closedCases: number;
  highSeverityCases: number;
  casesThisMonth: number;
}

export type MarkType = 'REWARD' | 'DEDUCTION';

export interface DisciplineMark {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  category: string;
  type: MarkType;
  points: number;
  status: string;
  isDefault: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarkStats {
  total: number;
  active: number;
  rewards: number;
  deductions: number;
}

export interface CaseStats {
  total: number;
  thisMonth: number;
  pending: number;
  resolved: number;
  pointsDeducted: number;
}

export interface DisciplineOrgSettings {
  defaultMaxScore: number;
  defaultStartingScore: number;
  autoInitializeStudents: boolean;
  initializedStudents?: number;
  totalMarks?: number;
}

export interface InitializeStudentsResult {
  created: number;
  skipped: number;
  total: number;
  message?: string;
}

export interface AcademicSettingsData {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

export interface SmClass {
  id: string;
  name: string;
  stream?: string | null;
  label: string;
  category?: string | null;
}

export interface SmStudent {
  id: string;
  studentCode: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  gender?: string | null;
  photoUrl?: string | null;
  classId?: string | null;
  className?: string | null;
  stream?: string | null;
  rollNumber?: string | null;
  status?: string;
}

export interface SmParent {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  role?: string;
  students?: Array<{
    studentId?: string;
    studentCode?: string | null;
    studentName?: string | null;
    className?: string | null;
    role?: string;
  }>;
}

export interface StudentDisciplineProfile {
  studentId: string;
  studentCode?: string | null;
  studentName?: string | null;
  className?: string | null;
  currentScore: number;
  maxScore: number;
  totalCases: number;
  casesThisTerm: number;
  initialized: boolean;
}

export interface ScorePreview {
  scoreBefore: number;
  scoreAfter: number;
  exceedsAvailable: boolean;
  clampedToZero: boolean;
}

export interface DisciplineCase {
  id: string;
  organizationId: string;
  caseNumber: string;
  studentId?: string | null;
  studentCode?: string | null;
  studentName: string;
  className: string;
  classId?: string | null;
  academicYear?: string | null;
  markId?: string | null;
  markName?: string | null;
  customCaseName?: string | null;
  category: string;
  severity: string;
  status: string;
  incidentDate: string;
  incidentTime?: string | null;
  location?: string | null;
  description?: string | null;
  appliedPoints?: number | null;
  defaultPoints?: number | null;
  scoreBefore?: number | null;
  scoreAfter?: number | null;
  actionsTaken?: string[];
  actionNotes?: string | null;
  notifyParent?: boolean;
  notifyMethods?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  mark?: DisciplineMark | null;
}

export interface PermissionStats {
  total: number;
  pendingApproval: number;
  approvedToday: number;
  currentlyOut: number;
  returned: number;
  overdue: number;
}

export interface PermissionEvent {
  id: string;
  organizationId: string;
  permissionId: string;
  eventType: string;
  actorName?: string | null;
  actorRole?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface PermissionRequest {
  id: string;
  organizationId: string;
  referenceNumber: string;
  studentId: string;
  studentCode?: string | null;
  studentName: string;
  className: string;
  classId?: string | null;
  academicYear?: string | null;
  term?: string | null;
  permissionType: string;
  customType?: string | null;
  reason: string;
  destination?: string;
  destinationAddress?: string | null;
  scanCode?: string;
  departureDate: string;
  departureTime: string;
  expectedReturnDate: string;
  expectedReturnTime: string;
  durationMinutes?: number | null;
  leavingWith: string;
  guardianName?: string | null;
  guardianRelationship?: string | null;
  guardianPhone?: string | null;
  authorizedPersonName?: string | null;
  authorizedPersonRelationship?: string | null;
  authorizedPersonPhone?: string | null;
  authorizedPersonId?: string | null;
  requestedBy: string;
  requestedByName?: string | null;
  approvalChain?: string[] | null;
  status: string;
  actualDepartureAt?: string | null;
  actualReturnAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  events?: PermissionEvent[];
  isOverdue?: boolean;
  isCurrentlyOut?: boolean;
  overdueMinutes?: number;
  displayStatus?: string;
}

export interface Gate {
  id: string;
  organizationId: string;
  name: string;
  code?: string | null;
  location?: string | null;
  status: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GateOfficer {
  id: string;
  organizationId: string;
  gateId?: string | null;
  userId?: string | null;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  pin?: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  gate?: Gate | null;
}

export interface GateLog {
  id: string;
  organizationId: string;
  gateId: string;
  permissionId?: string | null;
  studentId: string;
  studentCode?: string | null;
  studentName: string;
  className?: string | null;
  eventType: string;
  method: string;
  officerId?: string | null;
  officerName?: string | null;
  expectedTime?: string | null;
  actualTime: string;
  varianceMinutes?: number | null;
  varianceLabel?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  gate?: Gate | null;
  officer?: GateOfficer | null;
}

export interface GateDashboardData {
  gate: Gate | null;
  stats: {
    studentsOutside: number;
    expectedBackToday: number;
    overdue: number;
    checkedOutToday: number;
    returnedToday: number;
    pendingExit: number;
    logsToday: number;
  };
}

export interface GateScanResult {
  code: string;
  permission: PermissionRequest | null;
  exitValidation: { allowed: boolean; checks: Array<{ key: string; passed: boolean; message: string }>; reason?: string };
  suggestedAction: 'checkout' | 'checkin' | 'denied';
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function signedMarkPoints(type: MarkType, points: number) {
  const abs = Math.abs(points);
  return type === 'REWARD' ? abs : -abs;
}

export function canAdjustDisciplineMarks(roles?: string[]) {
  return (roles ?? []).some((r) =>
    ['ORGANIZATION_ADMIN', 'SCHOOL_MANAGER', 'DISCIPLINE_OFFICER', 'organization_admin'].includes(r)
  );
}

export function scoreLabel(score: number, maxScore = 100) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (pct >= 80) return 'Good';
  if (pct >= 60) return 'Fair';
  if (pct >= 40) return 'Watch';
  return 'Critical';
}
