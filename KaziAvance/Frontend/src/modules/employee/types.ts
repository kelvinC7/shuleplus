export type EmployeeDashboardData = {
  greeting: string;
  now: string;
  employee: {
    fullName: string;
    id: string;
    department: string;
    position: string;
    phone?: string | null;
    email?: string;
    company: string;
    status: string;
    yearsOfService: number;
    lastLogin: string;
    verificationStatus: string;
    profileCompletion: number;
    creditScore: number;
    advanceEligibility: string;
    riskLevel: string;
  };
  financialSummary: {
    salary: { gross: number; net: number; currentMonth: number };
    advance: {
      availableLimit: number;
      maxEligibleAmount: number;
      outstandingBalance: number;
      remainingEligibility: number;
    };
    repayment: {
      monthlyDeduction: number;
      remainingInstallments: number;
      nextDeductionDate: string;
      estimatedCompletionDate: string;
    };
  };
  eligibility: {
    score: number;
    status: string;
    reasons: string[];
  };
  activeAdvance: {
    advanceId: string;
    approvedAmount: number;
    disbursedAmount: number;
    approvalDate: string;
    interestRate: number;
    repaymentPeriodMonths: number;
    currentBalance: number;
    completionPercent: number;
    status: string;
    agreementUrl: string;
  };
  installments: Array<{
    name: string;
    amount: number;
    date: string;
    status: "Paid" | "Upcoming" | "Pending";
  }>;
  notifications: Array<{
    id: string;
    type: string;
    time: string;
    channel: string;
    read: boolean;
  }>;
};

export type CalculatorResult = {
  monthlyDeduction: number;
  interest: number;
  processingFee: number;
  netAmountToReceive: number;
  totalRepayment: number;
  firstDeductionDate: string;
  finalRepaymentDate: string;
  interestRate: number;
};

export const currency = (value: number) =>
  `${new Intl.NumberFormat("en-RW").format(value)} RWF`;

export const formatDate = (value: string) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

export const formatDateTime = (value: string) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};
