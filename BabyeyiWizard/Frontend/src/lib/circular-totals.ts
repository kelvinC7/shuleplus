import type { PaymentLine, RequirementLine } from '@/types';

/**
 * Bank-payable total — only "babyeyi" channel fees are collected via bank/on the
 * document's payment instructions. Rows with no pay_channel are treated as
 * "babyeyi" so older circulars keep summing the same way they always did.
 */
export function calcBankTotal(payments: PaymentLine[]): number {
  return payments
    .filter((p) => (p.pay_channel ?? 'babyeyi') === 'babyeyi')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

/** Sum of fee lines marked "Paid to School Account". */
export function calcSchoolPaymentsTotal(payments: PaymentLine[]): number {
  return payments
    .filter((p) => p.pay_channel === 'school')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

/** Sum of requirement line costs marked "Paid to School Account". */
export function calcSchoolRequirementsTotal(requirements: RequirementLine[]): number {
  return requirements
    .filter((r) => r.pay_channel === 'school')
    .reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
}

/** "Total Paid at School Account" — fees + requirements paid at the school office, not via bank. */
export function calcPaidAtSchoolTotal(payments: PaymentLine[], requirements: RequirementLine[]): number {
  return calcSchoolPaymentsTotal(payments) + calcSchoolRequirementsTotal(requirements);
}

/** Parent-facing total for lists — bank fees plus anything marked Paid to School Account. */
export function calcCircularGrandTotal(payments: PaymentLine[], requirements: RequirementLine[]): number {
  return calcBankTotal(payments) + calcPaidAtSchoolTotal(payments, requirements);
}
