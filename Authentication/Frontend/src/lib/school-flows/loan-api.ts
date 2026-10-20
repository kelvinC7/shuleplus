import { SCHOOL_FEES_API } from './api-config';

export type LoanType = {
  code: string;
  name: string;
  description: string | null;
  minAmount: number;
  maxAmount: number;
  interestRatePct: number;
  processingFee: number;
  minPeriodMonths: number;
  maxPeriodMonths: number;
};

export type LoanFrequency = 'MONTHLY' | 'BI_WEEKLY' | 'WEEKLY' | 'QUARTERLY';
export type LoanDisbursement = 'PAY_SCHOOL_DIRECTLY' | 'MOBILE_MONEY' | 'BANK';

export type ScheduleRow = { due: string; amount: number };

export type SubmitLoanInput = {
  organizationId?: string | null;
  studentId?: string | null;
  studentCode?: string | null;
  studentName?: string;
  academicYear: string;
  term: string;
  className?: string | null;
  principal: number;
  periodMonths: number;
  frequency: LoanFrequency;
  disbursement: LoanDisbursement;
  phone?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorRelation?: string;
  purpose?: string;
};

export type LoanApplication = {
  applicationNumber: string;
  status: string;
  principal: number;
  interest: number;
  processingFee: number;
  totalPayable: number;
  periodMonths: number;
  frequency: LoanFrequency;
  installmentAmount: number;
  disbursement: LoanDisbursement;
  outstanding: number;
  schedule: ScheduleRow[];
};

export type LoanStatusData = {
  applicationNumber: string;
  studentName: string;
  className: string | null;
  principal: number;
  interest: number;
  processingFee: number;
  totalPayable: number;
  periodMonths: number;
  frequency: LoanFrequency;
  installmentAmount: number;
  disbursement: LoanDisbursement;
  status: string;
  appliedAt: string;
  schedule: ScheduleRow[] | null;
};

/** Available loan types (School Fees Loan) for a school. */
export async function fetchLoanTypes(organizationId: string): Promise<LoanType[]> {
  try {
    const res = await fetch(`${SCHOOL_FEES_API}/public/loans/types?organizationId=${encodeURIComponent(organizationId)}`);
    if (!res.ok) return [];
    const body = (await res.json()) as { success: boolean; data: LoanType[] };
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

/** Submit a loan application. */
export async function submitLoanApplication(
  input: SubmitLoanInput,
): Promise<LoanApplication> {
  const res = await fetch(`${SCHOOL_FEES_API}/public/loans/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = (await res.json()) as { success: boolean; data: LoanApplication; message?: string };
  if (!res.ok || !body.success) {
    throw new Error(body?.message ?? 'We could not submit your loan application. Please try again.');
  }
  return body.data;
}

/** Poll a loan application status by its application number. */
export async function getLoanApplicationStatus(applicationNumber: string): Promise<LoanStatusData> {
  const res = await fetch(
    `${SCHOOL_FEES_API}/public/loans/${encodeURIComponent(applicationNumber)}/status`,
  );
  const body = (await res.json()) as { success: boolean; data: LoanStatusData };
  return body.data;
}

/** Client-side repayment schedule, mirroring the SchoolFeesPortal loan service. */
export function computeLoanSchedule(input: {
  principal: number;
  interestRatePct: number;
  processingFee: number;
  periodMonths: number;
  frequency: LoanFrequency;
}): {
  interest: number;
  totalPayable: number;
  installmentAmount: number;
  installments: number;
  schedule: ScheduleRow[];
} {
  const { principal, interestRatePct, processingFee } = input;
  const periodMonthsInt = Math.max(1, Math.round(input.periodMonths));
  const monthsPerInstallment =
    input.frequency === 'WEEKLY'
      ? 1 / 4.345
      : input.frequency === 'BI_WEEKLY'
        ? 2 / 4.345
        : input.frequency === 'QUARTERLY'
          ? 3
          : 1;

  const interest = (principal * interestRatePct) / 100;
  const totalPayable = principal + interest + processingFee;
  const numInstallments = Math.max(1, Math.ceil(periodMonthsInt / monthsPerInstallment));
  const installmentAmount = totalPayable / numInstallments;

  const schedule: ScheduleRow[] = [];
  let cursor = new Date();
  for (let i = 0; i < numInstallments; i++) {
    if (input.frequency === 'WEEKLY') cursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
    else if (input.frequency === 'BI_WEEKLY')
      cursor = new Date(cursor.getTime() + 14 * 24 * 60 * 60 * 1000);
    else if (input.frequency === 'QUARTERLY') cursor = new Date(cursor.setMonth(cursor.getMonth() + 3));
    else cursor = new Date(cursor.setMonth(cursor.getMonth() + 1));
    schedule.push({ due: cursor.toISOString().slice(0, 10), amount: Math.round(installmentAmount) });
  }

  return {
    interest,
    totalPayable,
    installmentAmount: Math.round(installmentAmount),
    installments: numInstallments,
    schedule,
  };
}
