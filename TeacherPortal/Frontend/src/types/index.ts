export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
  position?: string | null;
}

export interface DashboardSummary {
  organizationId: string;
  organizationName: string;
  status: string;
  pendingAdvanceRequests: number;
  approvedAdvanceRequests: number;
  totalAdvanceRequests: number;
  todayLessons: number;
  studentsCount: number;
}

export interface ShuleAvanceEligibility {
  allowed: boolean;
  status?:
    | 'payroll_not_connected'
    | 'timetable_linked'
    | 'profile_not_linked'
    | 'advance_not_enabled'
    | 'salary_pending'
    | 'cap_reached'
    | 'ready';
  message: string | null;
  net_salary_rwf: number;
  max_percent: number;
  monthly_cap_rwf: number;
  monthly_requested_rwf: number;
  monthly_remaining_rwf: number;
  auto_approval_limit_rwf: number;
  auto_approval_remaining_rwf: number;
  ticha_avance_eligible?: boolean;
  payroll_module_enabled?: boolean;
  timetable_linked?: boolean;
  registration_via?: 'timetable' | 'payroll' | null;
}

export interface ShuleAvanceCatalogItem {
  id: string;
  slug: string;
  name: string;
  type: 'cashout' | 'service';
  description: string | null;
  icon: string | null;
}

export interface ShuleAvanceCatalog {
  cashout: ShuleAvanceCatalogItem[];
  services: ShuleAvanceCatalogItem[];
}

export interface ShuleAvanceRequest {
  id: string;
  userId: string;
  requestType: 'cashout' | 'service';
  serviceCategory: string | null;
  status: string;
  amountRwf: number;
  repaymentTermMonths: number;
  reason: string | null;
  autoApproved: boolean;
  createdAt: string;
  ticha_avance_eligible?: boolean;
}

export interface PayrollSummary {
  net_salary_rwf: number;
  currency: string;
  source: string;
  ticha_avance_eligible?: boolean;
  employee_number?: string | null;
  payroll_module_enabled?: boolean;
  synced_at?: string | null;
}

export type AdvanceRequestStatus =
  | 'pending_accountant'
  | 'sent_to_manager'
  | 'approved'
  | 'rejected_by_accountant'
  | 'rejected_by_manager';

export interface AvanceAccess {
  canFinance: boolean;
  canManager: boolean;
  canApprove: boolean;
  canManageApprovers: boolean;
  designatedRoles: ('manager' | 'accountant')[];
  isOrganizationAdmin: boolean;
}

export interface TeacherAccountProfile {
  userId: string;
  email: string;
  roles: string[];
  modules: string[];
  organizationId: string;
  organizationName: string;
  displayName: string | null;
  emailAligned: boolean;
  registrationPath: 'timetable' | 'payroll' | 'unlinked';
  teachingActive: boolean;
  timetable: {
    teacherUserId: string;
    teacherName: string;
    loginEmail: string | null;
    loginPhone: string | null;
    portalEnabled: boolean;
    loginMethod: string;
    emailMatched: boolean;
  } | null;
  salaryAdvance: {
    payrollModuleEnabled: boolean;
    linked: boolean;
    eligible: boolean;
    allowed: boolean;
    status?: ShuleAvanceEligibility['status'];
    message: string | null;
    netSalaryRwf: number;
    employeeNumber: string | null;
    syncedAt: string | null;
    source: string;
    timetableLinked?: boolean;
    registrationVia?: 'timetable' | 'payroll' | 'unlinked' | null;
  };
}

export interface ShuleAvanceApprover {
  id: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  role: 'manager' | 'accountant';
  isActive: boolean;
  createdAt: string;
}
