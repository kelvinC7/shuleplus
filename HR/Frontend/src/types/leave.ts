/**
 * Shared types for the Leave Management module.
 * Mirrors the shape of the existing `Department` type conventions in `@/types`.
 */

export type LeaveCategory = 'STATUTORY' | 'ORGANIZATION';

export type StatutoryLeaveType =
  | 'Annual Leave'
  | 'Sick Leave'
  | 'Maternity Leave'
  | 'Paternity Leave'
  | 'Compassionate Leave'
  | 'Public Holiday'
  | 'Authorized Absence';

export type OrganizationLeaveType =
  | 'Study Leave'
  | 'Training Leave'
  | 'Examination Leave'
  | 'Marriage Leave'
  | 'Adoption Leave'
  | 'Unpaid Leave'
  | 'Sabbatical Leave'
  | 'Volunteer Leave'
  | 'Religious Leave'
  | 'Emergency Leave'
  | 'Work From Home Leave'
  | 'Half Day Leave'
  | 'Compensatory Leave'
  | 'Special Leave'
  | 'Birthday Leave'
  | 'Jury/Court Leave'
  | 'Other';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type LeavePriority = 'Normal' | 'Urgent' | 'Critical';

export type CompassionateEvent =
  | 'Death of Spouse'
  | 'Death of Child'
  | 'Death of Father'
  | 'Death of Mother'
  | 'Death of Parent-in-law'
  | 'Death of Brother/Sister'
  | 'Death of Grandparent'
  | 'Marriage'
  | 'Childbirth'
  | 'Other';

export interface LeaveKpis {
  totalEmployees: number;
  onLeaveToday: number;
  pendingRequests: number;
  approvedThisMonth: number;
  rejectedRequests: number;
  balanceAlerts: number;
  returningToday: number;
  upcomingLeave: number;
  annualLeaveUsed: number;
  sickLeaveUsed: number;
}

export interface LeaveRequestRow {
  id: string;
  employeeId: string;
  employeeName: string;
  avatarUrl?: string | null;
  department: string;
  leaveType: string;
  leaveCategory: LeaveCategory;
  startDate: string;
  endDate: string;
  workingDays: number;
  status: LeaveStatus;
  approver: string;
  balanceAfter: number;
  priority: LeavePriority;
}

export interface LeaveFilters {
  search: string;
  department: string;
  branch: string;
  leaveType: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  manager: string;
  employmentType: string;
}

export interface LeavePolicy {
  id: string;
  leaveType: string;
  category: LeaveCategory;
  paid: boolean;
  maxDays: number;
  carryForward: boolean;
  genderRestriction: 'ANY' | 'MALE' | 'FEMALE';
  eligibleDepartments: string[];
  minYearsOfService: number;
  approvalWorkflow: string[];
  requiredDocuments: string[];
  active: boolean;
}

export const STATUTORY_LEAVE_TYPES: StatutoryLeaveType[] = [
  'Annual Leave',
  'Sick Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Compassionate Leave',
  'Public Holiday',
  'Authorized Absence',
];

export const ORGANIZATION_LEAVE_TYPES: OrganizationLeaveType[] = [
  'Study Leave',
  'Training Leave',
  'Examination Leave',
  'Marriage Leave',
  'Adoption Leave',
  'Unpaid Leave',
  'Sabbatical Leave',
  'Volunteer Leave',
  'Religious Leave',
  'Emergency Leave',
  'Work From Home Leave',
  'Half Day Leave',
  'Compensatory Leave',
  'Special Leave',
  'Birthday Leave',
  'Jury/Court Leave',
  'Other',
];

export const COMPASSIONATE_EVENTS: { event: CompassionateEvent; days: number }[] = [
  { event: 'Death of Spouse', days: 5 },
  { event: 'Death of Child', days: 5 },
  { event: 'Death of Father', days: 5 },
  { event: 'Death of Mother', days: 5 },
  { event: 'Death of Parent-in-law', days: 3 },
  { event: 'Death of Brother/Sister', days: 3 },
  { event: 'Death of Grandparent', days: 2 },
  { event: 'Marriage', days: 3 },
  { event: 'Childbirth', days: 2 },
  { event: 'Other', days: 1 },
];