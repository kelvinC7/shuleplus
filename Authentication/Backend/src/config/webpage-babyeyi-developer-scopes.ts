/**
 * WebpageBabyeyi BFF API scopes — mirrors WebpageBabyeyi/Backend routes (public proxies).
 */

export interface DeveloperScopeEndpoint {
  method: string;
  path: string;
  summary: string;
  permission?: string;
}

export interface DeveloperScopeDef {
  key: string;
  label: string;
  endpoints: DeveloperScopeEndpoint[];
}

export const WEBPAGE_BABYEYI_SCOPES: DeveloperScopeDef[] = [
  {
    key: 'webpage.read',
    label: 'Read BFF Public APIs',
    endpoints: [
      { method: 'GET', path: '/health', summary: 'BFF health & upstream status' },
      { method: 'GET', path: '/school-registrations', summary: 'School directory' },
      { method: 'GET', path: '/locations/provinces', summary: 'List provinces' },
      { method: 'GET', path: '/locations/provinces/{provinceId}/districts', summary: 'List districts' },
      { method: 'GET', path: '/locations/districts/{districtId}/sectors', summary: 'List sectors' },
      { method: 'GET', path: '/locations/sectors/{sectorId}/cells', summary: 'List cells' },
      { method: 'GET', path: '/locations/cells/{cellId}/villages', summary: 'List villages' },
      { method: 'GET', path: '/babyeyi/lookup', summary: 'Babyeyi API lookup (GET)' },
      { method: 'POST', path: '/babyeyi/lookup', summary: 'Babyeyi API lookup (POST)' },
    ],
  },
  {
    key: 'student.search',
    label: 'Student Lookup (BFF)',
    endpoints: [{ method: 'GET', path: '/students/lookup', summary: 'Student lookup by code' }],
  },
  {
    key: 'fees.read',
    label: 'Fees via BFF',
    endpoints: [
      { method: 'GET', path: '/fees/student-fees', summary: 'Student fee structure (BFF)' },
      { method: 'GET', path: '/fees/loans/types', summary: 'Loan types (BFF)' },
      { method: 'GET', path: '/fees/loans/{applicationNumber}/status', summary: 'Loan status (BFF)' },
    ],
  },
  {
    key: 'payment.create',
    label: 'Payments via BFF',
    endpoints: [
      { method: 'POST', path: '/fees/payments/initiate', summary: 'Initiate payment (BFF)' },
      { method: 'POST', path: '/fees/loans/applications', summary: 'Submit loan application (BFF)' },
    ],
  },
  {
    key: 'payment.read',
    label: 'Payment Status via BFF',
    endpoints: [
      { method: 'GET', path: '/fees/payments/{reference}/status', summary: 'Payment status (BFF)' },
      { method: 'GET', path: '/fees/receipts/{receiptNumber}', summary: 'Receipt (BFF)' },
    ],
  },
  {
    key: 'babyeyi.read',
    label: 'Circulars via BFF',
    endpoints: [
      { method: 'GET', path: '/circulars/options', summary: 'Circular options (BFF)' },
      { method: 'GET', path: '/circulars', summary: 'Get circular (BFF)' },
      { method: 'GET', path: '/circulars/list', summary: 'List circulars (BFF)' },
      { method: 'GET', path: '/circulars/{id}/print', summary: 'Print circular (BFF)' },
    ],
  },
  {
    key: 'authentication.read',
    label: 'Admissions via BFF',
    endpoints: [
      { method: 'GET', path: '/admissions/check', summary: 'Admissions open check (BFF)' },
      { method: 'GET', path: '/admissions/config', summary: 'Admissions config (BFF)' },
      { method: 'GET', path: '/admissions/track/{applicationNumber}', summary: 'Track application (BFF)' },
    ],
  },
  {
    key: 'authentication.write',
    label: 'Submit Admissions via BFF',
    endpoints: [
      { method: 'POST', path: '/admissions/submit', summary: 'Submit admission (BFF)' },
      { method: 'POST', path: '/admissions/draft', summary: 'Save admission draft (BFF)' },
    ],
  },
];

export function webpageBabyeyiPermissionConfig() {
  return {
    label: 'Webpage Babyeyi (BFF)',
    permissions: WEBPAGE_BABYEYI_SCOPES.map(({ key, label, endpoints }) => ({
      key,
      label,
      endpoints,
    })),
  };
}
