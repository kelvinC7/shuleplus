export const CA_FINANCE = '/chief-accountant/finance';
export const CA_SCHOOL_FEES = `${CA_FINANCE}/school-fees`;

export const CA_SCHOOL_FEES_LINKS = [
  { href: `${CA_SCHOOL_FEES}/dashboard`, label: 'Fees dashboard' },
  { href: `${CA_SCHOOL_FEES}/structures`, label: 'Fee structures' },
  { href: `${CA_SCHOOL_FEES}/student-accounts`, label: 'Student fee accounts' },
  { href: `${CA_SCHOOL_FEES}/invoices`, label: 'Invoices' },
  { href: `${CA_SCHOOL_FEES}/requirements`, label: 'Bills & requirements' },
  { href: `${CA_SCHOOL_FEES}/transactions`, label: 'Payment transactions' },
  { href: `${CA_SCHOOL_FEES}/reconciliation`, label: 'Fee reconciliation' },
] as const;

/** Legacy revenue URLs → current finance routes */
export const CA_REVENUE_REDIRECTS: Record<string, string> = {
  '/chief-accountant/revenue/school-fees': `${CA_SCHOOL_FEES}/dashboard`,
  '/chief-accountant/revenue/structures': `${CA_SCHOOL_FEES}/structures`,
  '/chief-accountant/revenue/students': `${CA_SCHOOL_FEES}/student-accounts`,
  '/chief-accountant/revenue/bills': `${CA_SCHOOL_FEES}/invoices`,
  '/chief-accountant/revenue/transactions': `${CA_SCHOOL_FEES}/transactions`,
  '/chief-accountant/revenue/analytics': `${CA_SCHOOL_FEES}/dashboard`,
  '/chief-accountant/revenue/reconciliation': `${CA_SCHOOL_FEES}/reconciliation`,
};
