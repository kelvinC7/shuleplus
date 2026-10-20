/**
 * Predefined sandbox test scenarios — ST THEO SCHOOL live data (organization 04001).
 */
import { env } from './env';

/** Real student from ST THEO SCHOOL Student Management UI */
export const SANDBOX_SAMPLE_STUDENT_CODE = '04001042426';
export const SANDBOX_SAMPLE_ACADEMIC_YEAR = '2025-2026';
export const SANDBOX_SAMPLE_TERM = 'Term 1';

export const SANDBOX_TEST_SCENARIOS = [
  {
    id: 'sm-list-students',
    label: 'List Students',
    description: 'List students in ST THEO SCHOOL (1099+ records).',
    moduleSlug: 'student-management',
    method: 'GET',
    path: '/students',
    query: { academicYear: SANDBOX_SAMPLE_ACADEMIC_YEAR },
    expectedStatus: 200,
  },
  {
    id: 'student-found',
    label: 'Student Found',
    description: 'Lookup real ST THEO student by code.',
    moduleSlug: 'student-management',
    method: 'GET',
    path: '/public/students/lookup',
    query: { code: SANDBOX_SAMPLE_STUDENT_CODE },
    expectedStatus: 200,
  },
  {
    id: 'student-not-found',
    label: 'Student Not Found',
    description: 'Lookup with invalid code returns 404.',
    moduleSlug: 'student-management',
    method: 'GET',
    path: '/public/students/lookup',
    query: { code: 'INVALID-CODE-999' },
    expectedStatus: 404,
  },
  {
    id: 'fees-balance',
    label: 'Student Fees',
    description: 'Fee structure for a real ST THEO student.',
    moduleSlug: 'school-fees',
    method: 'GET',
    path: '/public/student-fees',
    query: {
      studentCode: SANDBOX_SAMPLE_STUDENT_CODE,
      academicYear: SANDBOX_SAMPLE_ACADEMIC_YEAR,
      term: SANDBOX_SAMPLE_TERM,
    },
    queryKeys: ['studentCode', 'organizationId', 'academicYear', 'term'],
    expectedStatus: 200,
  },
  {
    id: 'fees-dashboard',
    label: 'Fees Dashboard',
    description: 'School fees admin dashboard for ST THEO SCHOOL.',
    moduleSlug: 'school-fees',
    method: 'GET',
    path: '/dashboard',
    expectedStatus: 200,
  },
  {
    id: 'fees-outstanding',
    label: 'Outstanding Fees',
    description: 'Outstanding balances for ST THEO SCHOOL.',
    moduleSlug: 'school-fees',
    method: 'GET',
    path: '/outstanding',
    expectedStatus: 200,
  },
  {
    id: 'fees-loan-types',
    label: 'Loan Types',
    description: 'Available school fees loan products.',
    moduleSlug: 'school-fees',
    method: 'GET',
    path: '/public/loans/types',
    queryKeys: ['organizationId'],
    expectedStatus: 200,
  },
  {
    id: 'payment-success',
    label: 'Initiate Payment',
    description: 'Start sandbox MoMo payment for real student.',
    moduleSlug: 'school-fees',
    method: 'POST',
    path: '/public/payments/initiate',
    body: {
      studentCode: SANDBOX_SAMPLE_STUDENT_CODE,
      amount: 5000,
      method: 'MOMO',
      phone: '0780000001',
      academicYear: SANDBOX_SAMPLE_ACADEMIC_YEAR,
      term: SANDBOX_SAMPLE_TERM,
    },
    expectedStatus: 201,
  },
  {
    id: 'babyeyi-options',
    label: 'Babyeyi Options',
    description: 'Circular academic years/terms for ST THEO SCHOOL.',
    moduleSlug: 'babyeyi-wizard',
    method: 'GET',
    path: '/public/circulars/options',
    queryKeys: ['organizationId'],
    expectedStatus: 200,
  },
  {
    id: 'babyeyi-list',
    label: 'List Circulars',
    description: 'Approved Babyeyi circulars for ST THEO SCHOOL.',
    moduleSlug: 'babyeyi-wizard',
    method: 'GET',
    path: '/public/circulars/list',
    queryKeys: ['organizationId'],
    expectedStatus: 200,
  },
  {
    id: 'babyeyi-documents',
    label: 'Babyeyi Documents',
    description: 'All Babyeyi documents (admin view) for ST THEO SCHOOL.',
    moduleSlug: 'babyeyi-wizard',
    method: 'GET',
    path: '/babyeyi',
    expectedStatus: 200,
  },
  {
    id: 'webpage-health',
    label: 'BFF Health',
    description: 'WebpageBabyeyi BFF health and upstream status.',
    moduleSlug: 'webpage-babyeyi',
    method: 'GET',
    path: '/health',
    expectedStatus: 200,
  },
  {
    id: 'webpage-lookup',
    label: 'BFF Student Lookup',
    description: 'Student lookup via babyeyi.rw BFF.',
    moduleSlug: 'webpage-babyeyi',
    method: 'GET',
    path: '/students/lookup',
    query: { code: SANDBOX_SAMPLE_STUDENT_CODE },
    expectedStatus: 200,
  },
  {
    id: 'webpage-fees',
    label: 'BFF Student Fees',
    description: 'Fee lookup via babyeyi.rw BFF.',
    moduleSlug: 'webpage-babyeyi',
    method: 'GET',
    path: '/fees/student-fees',
    query: {
      studentCode: SANDBOX_SAMPLE_STUDENT_CODE,
      academicYear: SANDBOX_SAMPLE_ACADEMIC_YEAR,
      term: SANDBOX_SAMPLE_TERM,
    },
    queryKeys: ['studentCode', 'organizationId', 'academicYear', 'term'],
    expectedStatus: 200,
  },
  {
    id: 'webpage-circulars',
    label: 'BFF Circular Options',
    description: 'Circular options via babyeyi.rw BFF.',
    moduleSlug: 'webpage-babyeyi',
    method: 'GET',
    path: '/circulars/options',
    queryKeys: ['organizationId'],
    expectedStatus: 200,
  },
  {
    id: 'webpage-schools',
    label: 'BFF School Directory',
    description: 'Registered schools via babyeyi.rw BFF.',
    moduleSlug: 'webpage-babyeyi',
    method: 'GET',
    path: '/school-registrations',
    expectedStatus: 200,
  },
  {
    id: 'auth-health',
    label: 'IAM Health Check',
    description: 'Verify Authentication module is reachable.',
    moduleSlug: 'authentication',
    method: 'GET',
    path: '/health',
    expectedStatus: 200,
  },
  {
    id: 'invalid-auth',
    label: 'Invalid Authentication',
    description: 'Call protected route without valid token — expect 401.',
    moduleSlug: 'student-management',
    method: 'GET',
    path: '/students',
    authMode: 'none',
    expectGatewayError: true,
    expectedStatus: 401,
  },
] as const;

/** Live ST THEO SCHOOL — same org as Organization Admin + Student Management UI (1099+ students). */
export const DEVELOPER_SANDBOX_SCHOOL = {
  organizationId: 'b4e8c3c3-b510-44e1-9f92-696e2a1506f3',
  organizationCode: '04001',
  name: 'ST THEO SCHOOL',
  slug: 'st-theo-school',
} as const;

/** Legacy IAM seed org (demo only — not the live school workspace). */
export const SAINT_THEO_SEED_ORG = {
  organizationId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  organizationCode: 'STTHEO',
  name: 'Saint Theo School',
  slug: 'saint-theo-school',
} as const;

/** @deprecated Use DEVELOPER_SANDBOX_SCHOOL */
export const SAINT_THEO_SCHOOL = DEVELOPER_SANDBOX_SCHOOL;

export function resolveSandboxOrganizationId(): string {
  const configured = env.DEVELOPER_SANDBOX_ORGANIZATION_ID?.trim();
  return configured || DEVELOPER_SANDBOX_SCHOOL.organizationId;
}

export const DEFAULT_PARTNER_MODULE_SLUGS = [
  'student-management',
  'school-fees',
  'babyeyi',
  'authentication',
  'webpage-babyeyi',
  'payroll',
  'kaziavance',
  'ticha-portal',
];
