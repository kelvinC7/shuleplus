import type {
  ActiveAdvanceRow,
  AdminDashboardData,
  AdminEmployee,
  AdvanceRequestRow,
  AuditLogRow,
  NotificationRow,
  OrgPolicies,
  RepaymentRow,
} from "./types";

const DEMO_EMPLOYEES: AdminEmployee[] = [
  {
    id: "1",
    employeeCode: "EMP-001",
    fullName: "Jean Baptiste Nkurunziza",
    department: "Finance",
    position: "Accountant",
    netSalary: 850000,
    eligibilityStatus: "Eligible",
    advanceEligibility: "Eligible",
    salarySource: "kaziavance",
    activeAdvance: 0,
    accountStatus: "Active",
    hasLogin: true,
    maxAdvanceAmount: 400000,
    maxSalaryPercent: 50,
    maxActiveAdvances: 1,
    repaymentPeriod: 3,
    waitingPeriod: 30,
    requireDocuments: false,
  },
  {
    id: "2",
    employeeCode: "EMP-002",
    fullName: "Marie Claire Uwase",
    department: "Human Resources",
    position: "HR Officer",
    netSalary: 720000,
    eligibilityStatus: "Eligible",
    advanceEligibility: "Eligible",
    salarySource: "kaziavance",
    activeAdvance: 250000,
    accountStatus: "Active",
    hasLogin: true,
    maxAdvanceAmount: 350000,
    maxSalaryPercent: 50,
    maxActiveAdvances: 1,
    repaymentPeriod: 4,
    waitingPeriod: 30,
    requireDocuments: true,
  },
  {
    id: "3",
    employeeCode: "EMP-003",
    fullName: "Patrick Habimana",
    department: "IT",
    position: "Systems Analyst",
    netSalary: 950000,
    eligibilityStatus: "Blocked",
    advanceEligibility: "Disabled",
    salarySource: "kaziavance",
    activeAdvance: 0,
    accountStatus: "Active",
    hasLogin: false,
    maxAdvanceAmount: 0,
    maxSalaryPercent: 0,
    maxActiveAdvances: 0,
    repaymentPeriod: 0,
    waitingPeriod: 90,
    requireDocuments: true,
  },
  {
    id: "4",
    employeeCode: "EMP-004",
    fullName: "Grace Mukamana",
    department: "Operations",
    position: "Team Lead",
    netSalary: 680000,
    eligibilityStatus: "Suspended",
    advanceEligibility: "Disabled",
    salarySource: "invalid",
    activeAdvance: 180000,
    accountStatus: "Inactive",
    hasLogin: true,
    maxAdvanceAmount: 300000,
    maxSalaryPercent: 40,
    maxActiveAdvances: 1,
    repaymentPeriod: 3,
    waitingPeriod: 60,
    requireDocuments: false,
  },
  {
    id: "5",
    employeeCode: "EMP-005",
    fullName: "Eric Nshimiyimana",
    department: "Sales",
    position: "Sales Executive",
    netSalary: 600000,
    eligibilityStatus: "Eligible",
    advanceEligibility: "Eligible",
    salarySource: "kaziavance",
    activeAdvance: 0,
    accountStatus: "Active",
    hasLogin: true,
    maxAdvanceAmount: 300000,
    maxSalaryPercent: 50,
    maxActiveAdvances: 1,
    repaymentPeriod: 3,
    waitingPeriod: 30,
    requireDocuments: false,
  },
];

const DEMO_REQUESTS: AdvanceRequestRow[] = [
  {
    id: "r1",
    requestNumber: "ADV-2026-0142",
    employeeName: "Marie Claire Uwase",
    employeeCode: "EMP-002",
    amount: 300000,
    purpose: "Medical emergency",
    requestDate: "2026-07-10",
    netSalary: 720000,
    availableLimit: 360000,
    status: "Pending",
  },
  {
    id: "r2",
    requestNumber: "ADV-2026-0141",
    employeeName: "Eric Nshimiyimana",
    employeeCode: "EMP-005",
    amount: 200000,
    purpose: "School fees",
    requestDate: "2026-07-09",
    netSalary: 600000,
    availableLimit: 300000,
    status: "Under Review",
  },
  {
    id: "r3",
    requestNumber: "ADV-2026-0138",
    employeeName: "Jean Baptiste Nkurunziza",
    employeeCode: "EMP-001",
    amount: 400000,
    purpose: "Home repair",
    requestDate: "2026-07-05",
    netSalary: 850000,
    availableLimit: 425000,
    status: "Approved",
  },
  {
    id: "r4",
    requestNumber: "ADV-2026-0135",
    employeeName: "Patrick Habimana",
    employeeCode: "EMP-003",
    amount: 500000,
    purpose: "Personal",
    requestDate: "2026-07-02",
    netSalary: 950000,
    availableLimit: 0,
    status: "Rejected",
  },
];

const DEMO_ACTIVE: ActiveAdvanceRow[] = [
  {
    id: "a1",
    employeeName: "Marie Claire Uwase",
    employeeCode: "EMP-002",
    approvedAmount: 250000,
    remainingBalance: 125000,
    monthlyDeduction: 62500,
    startDate: "2026-05-01",
    endDate: "2026-08-01",
    progressPercent: 50,
  },
  {
    id: "a2",
    employeeName: "Grace Mukamana",
    employeeCode: "EMP-004",
    approvedAmount: 180000,
    remainingBalance: 90000,
    monthlyDeduction: 45000,
    startDate: "2026-06-01",
    endDate: "2026-09-01",
    progressPercent: 50,
  },
];

const DEMO_REPAYMENTS: RepaymentRow[] = [
  {
    id: "p1",
    employeeName: "Marie Claire Uwase",
    advanceAmount: 250000,
    paidAmount: 125000,
    remainingAmount: 125000,
    nextDeductionDate: "2026-08-01",
    status: "On Track",
  },
  {
    id: "p2",
    employeeName: "Grace Mukamana",
    advanceAmount: 180000,
    paidAmount: 90000,
    remainingAmount: 90000,
    nextDeductionDate: "2026-07-15",
    status: "Overdue",
  },
];

const DEMO_AUDIT: AuditLogRow[] = [
  { id: "l1", user: "iconicinnovatorz@gmail.com", action: "Request Approved", target: "ADV-2026-0138", timestamp: "2026-07-05 14:32" },
  { id: "l2", user: "iconicinnovatorz@gmail.com", action: "Employee Blocked", target: "Patrick Habimana", timestamp: "2026-07-04 09:15" },
  { id: "l3", user: "iconicinnovatorz@gmail.com", action: "Policy Changed", target: "Max Advance %", timestamp: "2026-07-01 11:00" },
  { id: "l4", user: "iconicinnovatorz@gmail.com", action: "Login Enabled", target: "Eric Nshimiyimana", timestamp: "2026-06-28 16:45" },
];

const DEMO_NOTIFICATIONS: NotificationRow[] = [
  { id: "n1", title: "New advance request", message: "Marie Claire Uwase submitted ADV-2026-0142 for 300,000 RWF.", type: "info", read: false, createdAt: "2026-07-10 08:30" },
  { id: "n2", title: "Repayment overdue", message: "Grace Mukamana missed the July deduction.", type: "warning", read: false, createdAt: "2026-07-12 07:00" },
  { id: "n3", title: "Request approved", message: "ADV-2026-0138 was approved for Jean Baptiste.", type: "success", read: true, createdAt: "2026-07-05 14:32" },
];

const DEMO_POLICIES: OrgPolicies = {
  maxAdvancePercent: 50,
  defaultRepaymentPeriod: 3,
  minEmploymentMonths: 6,
  waitingPeriodDays: 30,
  maxActiveAdvances: 1,
  autoApprove: false,
  requireManagerApproval: true,
  requireFinanceApproval: true,
  requireDocuments: false,
};

export function getDashboardData(): AdminDashboardData {
  return {
    kpis: {
      totalEmployees: 48,
      eligibleEmployees: 41,
      approvedAccessEmployees: 41,
      blockedEmployees: 4,
      pendingRequests: 7,
      approvedRequests: 23,
      rejectedRequests: 5,
      activeAdvances: 12,
      completedAdvances: 18,
      cancelledRequests: 2,
      outstandingBalance: 4850000,
      disbursedThisMonth: 2100000,
      recoveredThisMonth: 980000,
      disbursedAllTime: 9200000,
      recoveredAllTime: 4350000,
      remainingBalance: 4850000,
      recoveryRate: 47,
      payrollSuccessRate: 47,
      failedRecoveries: 3,
      overduePayments: 3,
      requestsToday: 1,
      requestsThisWeek: 4,
      requestsThisMonth: 9,
      requestsLastMonth: 14,
    },
    monthlyRequests: [
      { label: "Jan", value: 8 },
      { label: "Feb", value: 12 },
      { label: "Mar", value: 15 },
      { label: "Apr", value: 11 },
      { label: "May", value: 18 },
      { label: "Jun", value: 14 },
      { label: "Jul", value: 9 },
    ],
    approvalRate: {
      approved: [
        { label: "Jan", value: 6 },
        { label: "Feb", value: 10 },
        { label: "Mar", value: 12 },
        { label: "Apr", value: 8 },
        { label: "May", value: 15 },
        { label: "Jun", value: 11 },
        { label: "Jul", value: 5 },
      ],
      rejected: [
        { label: "Jan", value: 2 },
        { label: "Feb", value: 2 },
        { label: "Mar", value: 3 },
        { label: "Apr", value: 3 },
        { label: "May", value: 3 },
        { label: "Jun", value: 3 },
        { label: "Jul", value: 4 },
      ],
    },
    outstandingTrend: [
      { label: "Jan", value: 3200000 },
      { label: "Feb", value: 3800000 },
      { label: "Mar", value: 4100000 },
      { label: "Apr", value: 3900000 },
      { label: "May", value: 4500000 },
      { label: "Jun", value: 4700000 },
      { label: "Jul", value: 4850000 },
    ],
    departmentUsage: [
      { label: "Finance", value: 12, color: "#fcb038" },
      { label: "HR", value: 8, color: "#14b8a6" },
      { label: "IT", value: 6, color: "#a78bfa" },
      { label: "Sales", value: 10, color: "#000435" },
      { label: "Operations", value: 7, color: "#f59e0b" },
    ],
    hasHrIntegration: true,
    hasPayrollIntegration: true,
  };
}

export function getEmployees(): AdminEmployee[] {
  return DEMO_EMPLOYEES;
}

export function getAdvanceRequests(): AdvanceRequestRow[] {
  return DEMO_REQUESTS;
}

export function getActiveAdvances(): ActiveAdvanceRow[] {
  return DEMO_ACTIVE;
}

export function getRepayments(): RepaymentRow[] {
  return DEMO_REPAYMENTS;
}

export function getAuditLogs(): AuditLogRow[] {
  return DEMO_AUDIT;
}

export function getNotifications(): NotificationRow[] {
  return DEMO_NOTIFICATIONS;
}

export function getPolicies(): OrgPolicies {
  return { ...DEMO_POLICIES };
}
