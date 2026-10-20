import { LoanStatus, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { structureService } from './structure.service';
import { seedService } from './seed.service';

export type LoanFrequency = 'MONTHLY' | 'BI_WEEKLY' | 'WEEKLY' | 'QUARTERLY';
export type LoanDisbursement = 'PAY_SCHOOL_DIRECTLY' | 'MOBILE_MONEY' | 'BANK';

const FREQUENCIES: LoanFrequency[] = ['MONTHLY', 'BI_WEEKLY', 'WEEKLY', 'QUARTERLY'];
const DISBURSEMENTS: LoanDisbursement[] = ['PAY_SCHOOL_DIRECTLY', 'MOBILE_MONEY', 'BANK'];

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

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
  schedule: Array<{ due: string; amount: number }>;
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

  const schedule: Array<{ due: string; amount: number }> = [];
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

function maskAccount(accountNumber: string): string {
  const digits = accountNumber.replace(/\s/g, '');
  return `****${digits.slice(-4)}`;
}

function normalizePhone(phone: string): string {
  const raw = String(phone ?? '').replace(/[^\d+]/g, '');
  return raw.replace(/^\+?250/, '0').replace(/^(\d{9})$/, '0$1');
}

class LoanService {
  async listTypes(organizationId: string) {
    await seedService.ensureLoanTypes(organizationId);
    const types = await prisma.loanType.findMany({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return types.map((t) => ({
      code: t.code,
      name: t.name,
      description: t.description,
      minAmount: num(t.minAmount),
      maxAmount: num(t.maxAmount),
      interestRatePct: num(t.interestRatePct),
      processingFee: num(t.processingFee),
      minPeriodMonths: t.minPeriodMonths,
      maxPeriodMonths: t.maxPeriodMonths,
    }));
  }

  async submit(organizationId: string, body: Record<string, unknown>) {
    if (!organizationId) throw new AppError(400, 'organizationId is required');

    const type = await prisma.loanType.findFirst({
      where: { organizationId, code: 'SCHOOL_FEES_LOAN', isActive: true },
    });
    if (!type) throw new AppError(400, 'School Fees Loan is not available for this organization');

    const frequency = String(body.frequency ?? '').toUpperCase() as LoanFrequency;
    if (!FREQUENCIES.includes(frequency)) throw new AppError(400, 'Invalid repayment frequency');

    const disbursement = String(body.disbursement ?? '').toUpperCase() as LoanDisbursement;
    if (!DISBURSEMENTS.includes(disbursement)) throw new AppError(400, 'Invalid disbursement method');

    const academicYear = String(body.academicYear ?? '').trim();
    const term = String(body.term ?? '').trim();
    const studentCode = body.studentCode ? String(body.studentCode).trim() : '';
    const studentId = body.studentId ? String(body.studentId).trim() : '';
    const studentName = String(body.studentName ?? '').trim();
    const className = body.className ? String(body.className).trim() : '';
    if (!academicYear || !term) throw new AppError(400, 'academicYear and term are required');
    if (!studentCode && !studentId && !studentName) {
      throw new AppError(400, 'Student information is required');
    }

    const resolved = await structureService.resolveStudentFees({
      organizationId,
      academicYear,
      term,
      className: className || undefined,
      studentCode: studentCode || undefined,
      studentId: studentId || undefined,
      studentName: studentName || undefined,
      autoBill: true,
    });
    if (!resolved.found) {
      throw new AppError(422, 'No active fee structure was found for this student and period');
    }

    const outstanding = Math.round(resolved.remaining);
    const principal = Math.round(Number(body.principal) || 0);
    if (principal <= 0) throw new AppError(400, 'Loan amount must be positive');
    if (outstanding > 0 && principal > outstanding + 0.01) {
      throw new AppError(400, `Loan amount cannot exceed the outstanding fees balance of ${outstanding.toLocaleString()} RWF`);
    }
    if (principal < num(type.minAmount)) {
      throw new AppError(400, `The minimum loan amount is ${num(type.minAmount).toLocaleString()} RWF`);
    }
    if (principal > num(type.maxAmount)) {
      throw new AppError(400, `The maximum loan amount is ${num(type.maxAmount).toLocaleString()} RWF`);
    }

    const periodMonths = Math.round(Number(body.periodMonths) || 0);
    if (periodMonths < type.minPeriodMonths || periodMonths > type.maxPeriodMonths) {
      throw new AppError(400, `Loan period must be between ${type.minPeriodMonths} and ${type.maxPeriodMonths} months`);
    }

    // disbursement details — never store PINs / CVVs / full card numbers
    const phone = disbursement === 'MOBILE_MONEY' ? normalizePhone(String(body.phone ?? '')) : null;
    if (disbursement === 'MOBILE_MONEY' && !/^07\d{8}$/.test(phone ?? '')) {
      throw new AppError(400, 'A valid Rwandan phone number is required for Mobile Money disbursement');
    }
    const maskedAccount =
      disbursement === 'BANK' ? maskAccount(String(body.accountNumber ?? '')) : null;
    if (disbursement === 'BANK' && !maskedAccount) {
      throw new AppError(400, 'A bank account number is required');
    }
    const bankName = disbursement === 'BANK' ? String(body.bankName ?? '').trim() : null;
    const accountHolder = disbursement === 'BANK' ? String(body.accountHolder ?? '').trim() || null : null;

    const guarantorName = String(body.guarantorName ?? '').trim();
    const guarantorPhone = normalizePhone(String(body.guarantorPhone ?? ''));
    const guarantorRelation = String(body.guarantorRelation ?? '').trim();
    const purpose = String(body.purpose ?? '').trim() || 'Pay outstanding school fees';

    const plan = computeLoanSchedule({
      principal,
      interestRatePct: num(type.interestRatePct),
      processingFee: num(type.processingFee),
      periodMonths,
      frequency,
    });

    const count = await prisma.loanApplication.count({ where: { organizationId } });
    const applicationNumber = `LNR-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const application = await prisma.loanApplication.create({
      data: {
        organizationId,
        applicationNumber,
        loanTypeId: type.id,
        studentId: studentId || studentCode || 'PUBLIC-APPLICANT',
        studentCode: studentCode || studentId || 'PUBLIC-APPLICANT',
        studentName: studentName || 'Applicant',
        className: className || resolved.className || null,
        academicYear,
        term,
        billId: resolved.billId ?? null,
        principal,
        interest: Math.round(plan.interest),
        processingFee: Math.round(num(type.processingFee)),
        totalPayable: Math.round(plan.totalPayable),
        periodMonths,
        frequency,
        installmentAmount: plan.installmentAmount,
        disbursement,
        phone,
        bankName,
        accountNumberMasked: maskedAccount,
        accountHolder,
        guarantorName: guarantorName || null,
        guarantorPhone: guarantorPhone || null,
        guarantorRelation: guarantorRelation || null,
        purpose,
        schedule: plan.schedule,
        status: LoanStatus.UNDER_REVIEW,
      },
      include: { loanType: true },
    });

    return {
      applicationNumber,
      status: application.status,
      principal: num(application.principal),
      interest: num(application.interest),
      processingFee: num(application.processingFee),
      totalPayable: num(application.totalPayable),
      periodMonths: application.periodMonths,
      frequency: application.frequency,
      installmentAmount: num(application.installmentAmount),
      disbursement: application.disbursement,
      outstanding,
      schedule: plan.schedule,
    };
  }

  async status(applicationNumber: string) {
    const application = await prisma.loanApplication.findFirst({
      where: { applicationNumber },
      include: { loanType: true },
    });
    if (!application) throw new AppError(404, 'Loan application not found');

    return {
      applicationNumber: application.applicationNumber,
      studentName: application.studentName,
      className: application.className,
      principal: num(application.principal),
      interest: num(application.interest),
      processingFee: num(application.processingFee),
      totalPayable: num(application.totalPayable),
      periodMonths: application.periodMonths,
      frequency: application.frequency,
      installmentAmount: num(application.installmentAmount),
      disbursement: application.disbursement,
      status: application.status,
      appliedAt: application.appliedAt,
      schedule: application.schedule as Array<{ due: string; amount: number }> | null,
    };
  }
}

export const loanService = new LoanService();
