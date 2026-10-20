export type EligibilityStatus = "Eligible" | "Blocked" | "Suspended" | "Disabled";
export type AdvanceEligibilityStatus =
  | "Eligible"
  | "Salary Missing"
  | "Net Salary Missing"
  | "Payroll Sync Required"
  | "Not Eligible"
  | "Advance Outstanding"
  | "Disabled";
export type SalarySourceKind = "payroll" | "kaziavance" | "missing" | "invalid";
export type AccountStatus = "Active" | "Inactive";
export type RequestStatus =
  | "Pending"
  | "Under Review"
  | "Approved"
  | "Rejected"
  | "Disbursed"
  | "Completed";

export interface AdminEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
  email?: string;
  phone?: string | null;
  photoUrl?: string | null;
  department: string;
  position: string;
  netSalary: number;
  grossSalary?: number;
  allowances?: number;
  deductions?: number;
  taxAmount?: number;
  yearsOfService?: number;
  hireDate?: string | null;
  eligibilityStatus: EligibilityStatus;
  advanceEligibility?: AdvanceEligibilityStatus;
  salarySource?: SalarySourceKind;
  salaryUpdatedAt?: string | null;
  salaryUpdateReason?: string | null;
  payrollStatus?: string | null;
  availableAdvance?: number;
  eligibilityRule?: string;
  payrollEnabled?: boolean;
  employmentStatus?: string;
  activeAdvance: number;
  accountStatus: AccountStatus;
  hasLogin: boolean;
  iamUserId?: string | null;
  lastLoginAt?: string | null;
  maxAdvanceAmount?: number;
  maxSalaryPercent?: number;
  maxActiveAdvances?: number;
  repaymentPeriod?: number;
  waitingPeriod?: number;
  requireDocuments?: boolean;
  allowAdvance?: boolean;
  directorySources?: Array<"timetable" | "hr" | "iam">;
}

export interface EmployeeAccount {
  iamUserId: string | null;
  email: string;
  status: string;
  lastLoginAt: string | null;
  modules: string[];
  hasLogin: boolean;
}

export interface EmployeeProfile {
  employee: AdminEmployee;
  account: EmployeeAccount;
  advances: Array<{
    id: string;
    requestNumber: string;
    amount: number;
    status: string;
    purpose: string;
    requestDate: string;
    remainingBalance: number | null;
  }>;
  payrollRecords: Array<{
    monthLabel: string;
    netSalary: number;
    grossSalary: number;
    deductions?: number;
    allowances?: number;
    source?: string;
    status?: string;
    payrollDate?: string;
    reason?: string | null;
  }>;
  hasHrIntegration: boolean;
  hasPayrollIntegration?: boolean;
}

export interface LoginActionResult {
  iamUserId?: string;
  email?: string;
  tempPassword?: string | null;
  emailSent?: boolean;
  message: string;
}

export interface AdvanceRequestRow {
  id: string;
  requestNumber: string;
  employeeName: string;
  employeeCode: string;
  employeePhone?: string | null;
  department?: string;
  amount: number;
  repaymentMonths?: number;
  purpose: string;
  purposeType?: string;
  description?: string | null;
  signatureFile?: string | null;
  signatureName?: string | null;
  signatureMimeType?: string | null;
  requestDate: string;
  createdAt?: string;
  netSalary: number;
  availableLimit: number;
  monthlyDeduction?: number | null;
  remainingBalance?: number | null;
  status: RequestStatus;
  reviewComment?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  disbursedAt?: string | null;
  employeeEmail?: string | null;
  position?: string;
  timeline?: { step: string; date: string | null; done: boolean }[];
}

export interface RequestsWorkspace {
  summary: {
    total: number;
    pending: number;
    approved: number;
    active: number;
    rejected: number;
    cancelled: number;
    completed: number;
    thisMonth: number;
    overdue: number;
    approvalRate: number;
    recoveryRate: number;
    averageAmount: number;
  };
  monthlyRequests: { label: string; value: number }[];
  activities: { id: string; text: string; at: string; relative: string }[];
  upcomingRecoveries: Array<{
    id: string;
    employeeName: string;
    amount: number;
    dueDate: string;
    requestNumber: string;
  } | null>;
  nearCompletion: Array<{
    id: string;
    employeeName: string;
    remainingBalance: number;
    requestNumber: string;
  }>;
  overdueList: Array<{
    id: string;
    employeeName: string;
    remainingBalance: number;
    requestNumber: string;
  }>;
  departments: string[];
  purposeTypes: string[];
  data: AdvanceRequestRow[];
}

export interface ActiveAdvanceRow {
  id: string;
  employeeName: string;
  employeeCode: string;
  approvedAmount: number;
  remainingBalance: number;
  monthlyDeduction: number;
  startDate: string;
  endDate: string;
  progressPercent: number;
}

export type RepaymentStatus =
  | "Upcoming"
  | "Active"
  | "Completed"
  | "Overdue"
  | "Failed"
  | "Partial Payment"
  | "Payroll Deducted"
  | "Manual Payment"
  | "Cancelled"
  | "Suspended"
  | "On Track";

export interface RepaymentScheduleItem {
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: string;
  monthLabel: string;
  paidAmount: number;
}

export interface RepaymentRow {
  id: string;
  requestNumber?: string;
  employeeName: string;
  employeeCode?: string;
  department?: string;
  purpose?: string;
  purposeType?: string;
  advanceAmount: number;
  paidAmount: number;
  remainingAmount: number;
  monthlyDeduction?: number;
  installmentAmount?: number;
  nextDeductionDate: string;
  status: RepaymentStatus | string;
  progressPercent?: number;
  paymentMethod?: string;
  schedule?: RepaymentScheduleItem[];
}

export interface RepaymentsWorkspace {
  summary: {
    totalActive: number;
    outstandingBalance: number;
    recoveredThisMonth: number;
    upcomingCount: number;
    overdueCount: number;
    recoveryRate: number;
    completedCount: number;
    payrollRecoveries: number;
    manualRecoveries: number;
    failedRecoveries: number;
  };
  monthlyRecovery: { label: string; value: number }[];
  departmentOutstanding: { label: string; value: number; color: string }[];
  activities: { id: string; text: string; amount?: number; relative: string; at: string }[];
  upcomingList: Array<{
    id: string;
    employeeName: string;
    amount: number;
    dueDate: string;
    requestNumber: string;
  }>;
  failedList: Array<{
    id: string;
    employeeName: string;
    reason: string;
    remainingAmount: number;
    requestNumber: string;
  }>;
  departments: string[];
  purposeTypes: string[];
  data: RepaymentRow[];
}

export interface AuditLogRow {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  category?: "info" | "warning" | "success" | "danger";
  createdAt?: string;
}

export interface AuditWorkspace {
  summary: {
    total: number;
    today: number;
    thisWeek: number;
    uniqueUsers: number;
    approvals: number;
    policyChanges: number;
  };
  topActions: { label: string; value: number }[];
  daily: { label: string; value: number }[];
  users: string[];
  actions: string[];
  data: AuditLogRow[];
}

export interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "danger";
  read: boolean;
  createdAt: string;
  href?: string;
}

export interface NotificationsWorkspace {
  summary: {
    total: number;
    unread: number;
    critical: number;
    activity: number;
  };
  data: NotificationRow[];
}

export type ReportId = "requests" | "approved" | "rejected" | "active" | "repayment" | "usage";

export interface ReportsWorkspace {
  summary: {
    totalRequests: number;
    pending: number;
    approved: number;
    rejected: number;
    active: number;
    outstanding: number;
    disbursedThisMonth: number;
    recoveredThisMonth: number;
    approvalRate: number;
    recoveryRate: number;
    employees: number;
  };
  monthlyTrend: { label: string; requests: number; disbursed: number }[];
  departmentUsage: { label: string; value: number; color: string }[];
  catalogs: Record<
    ReportId,
    { id: ReportId; title: string; description: string; rowCount: number }
  >;
  datasets: {
    requests: Array<{
      id: string;
      requestNumber: string;
      employeeName: string;
      employeeCode: string;
      department: string;
      amount: number;
      repaymentMonths: number;
      purpose: string;
      status: string;
      requestDate: string;
      reviewComment: string;
      createdAt: string;
    }>;
    approved: Array<{
      id: string;
      requestNumber: string;
      employeeName: string;
      department: string;
      amount: number;
      status: string;
      approvedAt: string;
      disbursedAt: string;
      monthlyDeduction: number;
      remainingBalance: number;
    }>;
    rejected: Array<{
      id: string;
      requestNumber: string;
      employeeName: string;
      department: string;
      amount: number;
      purpose: string;
      rejectedAt: string;
      reason: string;
    }>;
    active: Array<{
      id: string;
      requestNumber: string;
      employeeName: string;
      department: string;
      approvedAmount: number;
      remainingBalance: number;
      monthlyDeduction: number;
      progressPercent: number;
      status: string;
      startDate: string;
    }>;
    repayment: Array<{
      id: string;
      requestNumber: string;
      employeeName: string;
      department: string;
      installmentNumber: number;
      amount: number;
      paidAmount: number;
      dueDate: string;
      paidAt: string;
      status: string;
    }>;
    usage: Array<{
      id: string;
      employeeName: string;
      employeeCode: string;
      department: string;
      eligibilityStatus: string;
      requestCount: number;
      totalRequested: number;
      activeBalance: number;
      completedCount: number;
      netSalary: number;
    }>;
  };
}

export interface AdminDashboardData {
  organizationName?: string;
  kpis: {
    totalEmployees: number;
    eligibleEmployees: number;
    approvedAccessEmployees: number;
    blockedEmployees: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    activeAdvances: number;
    completedAdvances: number;
    cancelledRequests: number;
    outstandingBalance: number;
    disbursedThisMonth: number;
    recoveredThisMonth: number;
    disbursedAllTime: number;
    recoveredAllTime: number;
    remainingBalance: number;
    recoveryRate: number;
    payrollSuccessRate: number;
    failedRecoveries: number;
    overduePayments: number;
    requestsToday: number;
    requestsThisWeek: number;
    requestsThisMonth: number;
    requestsLastMonth: number;
  };
  monthlyRequests: { label: string; value: number }[];
  approvalRate: { approved: { label: string; value: number }[]; rejected: { label: string; value: number }[] };
  outstandingTrend: { label: string; value: number }[];
  departmentUsage: { label: string; value: number; color: string }[];
  hasHrIntegration: boolean;
  hasPayrollIntegration: boolean;
}

export interface OrgPolicies {
  maxAdvancePercent: number;
  defaultRepaymentPeriod: number;
  minEmploymentMonths: number;
  waitingPeriodDays: number;
  maxActiveAdvances: number;
  autoApprove: boolean;
  requireManagerApproval: boolean;
  requireFinanceApproval: boolean;
  requireDocuments: boolean;
}
