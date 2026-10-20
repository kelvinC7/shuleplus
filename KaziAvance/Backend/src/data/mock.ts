export type InstallmentStatus = "Paid" | "Upcoming" | "Pending";

export const employee = {
  id: "EMP-24091",
  fullName: "Jean de Dieu",
  department: "Operations",
  position: "Field Coordinator",
  company: "ShulePlus Group",
  status: "Active",
  yearsOfService: 4,
  lastLogin: "2026-07-08T09:52:00.000Z",
  photoUrl: "https://i.pravatar.cc/200?img=18",
  verificationStatus: "Verified",
  profileCompletion: 92,
  creditScore: 742,
  advanceEligibility: "Eligible",
  riskLevel: "Low"
};

export const financialSummary = {
  salary: {
    gross: 950000,
    net: 780000,
    currentMonth: 780000
  },
  advance: {
    availableLimit: 600000,
    maxEligibleAmount: 500000,
    outstandingBalance: 140000,
    remainingEligibility: 360000
  },
  repayment: {
    monthlyDeduction: 70000,
    remainingInstallments: 2,
    nextDeductionDate: "2026-07-28",
    estimatedCompletionDate: "2026-08-28"
  }
};

export const eligibility = {
  score: 86,
  status: "Eligible",
  reasons: [
    "Permanent Employee",
    "Salary above minimum threshold",
    "Passed probation",
    "No overdue repayments"
  ]
};

export const activeAdvance = {
  advanceId: "ADV-2026-0094",
  approvedAmount: 240000,
  disbursedAmount: 235000,
  approvalDate: "2026-05-29",
  interestRate: 4.5,
  repaymentPeriodMonths: 4,
  currentBalance: 140000,
  completionPercent: 42,
  status: "Active",
  agreementUrl: "/documents/agreement-adv-2026-0094.pdf"
};

export const installments: Array<{
  name: string;
  amount: number;
  date: string;
  status: InstallmentStatus;
}> = [
  { name: "Installment 1", amount: 70000, date: "2026-06-28", status: "Paid" },
  { name: "Installment 2", amount: 70000, date: "2026-07-28", status: "Paid" },
  { name: "Installment 3", amount: 70000, date: "2026-08-28", status: "Upcoming" },
  { name: "Installment 4", amount: 70000, date: "2026-09-28", status: "Pending" }
];

export const salaryHistory = [
  { month: "Apr 2026", gross: 950000, tax: 110000, deductions: 35000, advanceDeduction: 0, net: 805000 },
  { month: "May 2026", gross: 950000, tax: 110000, deductions: 35000, advanceDeduction: 0, net: 805000 },
  { month: "Jun 2026", gross: 950000, tax: 110000, deductions: 35000, advanceDeduction: 70000, net: 735000 },
  { month: "Jul 2026", gross: 950000, tax: 110000, deductions: 35000, advanceDeduction: 70000, net: 735000 }
];

export const advanceHistory = [
  {
    requestNo: "REQ-2026-001",
    amount: 300000,
    date: "2026-01-10",
    status: "Completed",
    approvedBy: "Finance Officer A",
    processingTime: "2 days"
  },
  {
    requestNo: "REQ-2026-017",
    amount: 240000,
    date: "2026-05-21",
    status: "Active",
    approvedBy: "Finance Officer B",
    processingTime: "1 day"
  }
];

export const workflowTimeline = [
  { step: "Submitted", date: "2026-05-21", time: "09:21", officer: "Employee", comments: "Request created." },
  { step: "HR Review", date: "2026-05-21", time: "13:05", officer: "HR Officer", comments: "Employment verified." },
  { step: "Finance Review", date: "2026-05-22", time: "09:14", officer: "Finance Analyst", comments: "Affordability check passed." },
  { step: "Manager Approval", date: "2026-05-22", time: "14:35", officer: "Line Manager", comments: "Approved with standard terms." },
  { step: "Disbursement", date: "2026-05-23", time: "10:10", officer: "Finance Ops", comments: "Funds sent to primary account." },
  { step: "Completed", date: "-", time: "-", officer: "-", comments: "Pending final installment." }
];

export const notifications = [
  { id: "N-1", type: "Advance approved", time: "1h ago", channel: "Push", read: false },
  { id: "N-2", type: "Repayment reminder", time: "2d ago", channel: "Email", read: true },
  { id: "N-3", type: "Upcoming deduction", time: "3d ago", channel: "SMS", read: false }
];
