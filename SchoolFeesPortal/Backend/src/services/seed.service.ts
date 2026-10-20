import { prisma } from '../config/database';

const CATEGORIES = [
  { code: 'TUITION', name: 'Tuition Fees' },
  { code: 'FEEDING', name: 'Feeding Fees' },
  { code: 'TRANSPORT', name: 'Transport Fees' },
  { code: 'UNIFORM', name: 'Uniform Fees' },
  { code: 'REGISTRATION', name: 'Registration Fees' },
  { code: 'EXAM', name: 'Examination Fees' },
  { code: 'OTHER', name: 'Other Charges' },
];

export class SeedService {
  /** Creates default fee categories only — no demo students, bills, or payments. */
  async ensureFeeCategories(organizationId: string) {
    if (!organizationId) return;
    try {
      await prisma.feeCategory.createMany({
        data: CATEGORIES.map((c) => ({
          organizationId,
          code: c.code,
          name: c.name,
          description: `${c.name} for school fee structures`,
        })),
        skipDuplicates: true,
      });
    } catch (err) {
      console.error('[School Fees] ensureFeeCategories failed:', err);
    }
  }

  /** @deprecated Use ensureFeeCategories — demo seed data is no longer provisioned. */
  async seedTenantData(organizationId: string) {
    await this.ensureFeeCategories(organizationId);
  }

  /** Creates the default School Fees Loan type only. */
  async ensureLoanTypes(organizationId: string) {
    if (!organizationId) return;
    try {
      await prisma.loanType.createMany({
        data: [
          {
            organizationId,
            code: 'SCHOOL_FEES_LOAN',
            name: 'School Fees Loan',
            description:
              'Borrow to clear your child\u2019s outstanding school fees and pay back in flexible installments.',
            minAmount: 50000,
            maxAmount: 2000000,
            interestRatePct: 10,
            processingFee: 5000,
            minPeriodMonths: 1,
            maxPeriodMonths: 12,
          },
        ],
        skipDuplicates: true,
      });
    } catch (err) {
      console.error('[School Fees] ensureLoanTypes failed:', err);
    }
  }
}

export const seedService = new SeedService();
