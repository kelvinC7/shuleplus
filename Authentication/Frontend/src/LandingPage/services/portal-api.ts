/** Public Student Management + Babyeyi + ShuleKit APIs for the landing payment portal. */

function isHostedLanding(): boolean {
  if (typeof window === 'undefined') return false;
  return /(^|\.)shuleplus\.rw$/i.test(window.location.hostname);
}

/** Prefer production APIs on shuleplus.rw even if a bad localhost URL was baked at build time. */
function resolvePublicApi(
  envVal: string | undefined,
  localDefault: string,
  prodDefault: string
): string {
  const raw = (envVal ?? '').replace(/\/$/, '');
  if (isHostedLanding()) {
    if (!raw || /localhost|127\.0\.0\.1/i.test(raw)) return prodDefault;
    return raw;
  }
  return raw || localDefault;
}

const STUDENT_MANAGEMENT_API = resolvePublicApi(
  process.env.NEXT_PUBLIC_STUDENT_MANAGEMENT_API_URL ??
    process.env.NEXT_PUBLIC_STUDENT_MGMT_API_URL,
  'http://localhost:3052/api',
  'https://studentmanagement-api.shuleplus.rw/api'
);
const IAM_PUBLIC_API = resolvePublicApi(
  process.env.NEXT_PUBLIC_API_URL,
  'http://localhost:3001/api/v1',
  'https://shuleplus.rw/api/v1'
);
const BABYEYI_API = resolvePublicApi(
  process.env.NEXT_PUBLIC_BABYEYI_API_URL,
  'http://localhost:3012/api',
  'https://babyeyi-api.shuleplus.rw/api'
);
const SCHOOL_FEES_API = resolvePublicApi(
  process.env.NEXT_PUBLIC_SCHOOL_FEES_API_URL,
  'http://localhost:3014/api',
  // fees-api.shuleplus.rw has no public DNS record; fees.shuleplus.rw/api
  // reaches the same fees-api:4004 via the portal's Next.js /api rewrites.
  'https://fees.shuleplus.rw/api'
);
const SHULEKIT_API = resolvePublicApi(
  process.env.NEXT_PUBLIC_SHULEKIT_API_URL,
  'http://localhost:3038/api',
  'https://materials-api.shuleplus.rw/api'
);
const MINI_WEBSITE_API = resolvePublicApi(
  process.env.NEXT_PUBLIC_MINI_WEBSITE_API_URL,
  'http://localhost:3055/api',
  'https://website-api.shuleplus.rw/api'
);

export type LookupParent = {
  role: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

export type LookupStudent = {
  id: string;
  organizationId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender?: string | null;
  studentUid: string;
  shuleCode?: string | null;
  studentCode: string | null;
  sdmCode: string | null;
  registrationNumber: string | null;
  photoUrl: string | null;
  status: string;
  schoolName: string;
  schoolCode?: string | null;
  organizationCode?: string | null;
  district?: string | null;
  province?: string | null;
  sector?: string | null;
  className: string | null;
  classLabel: string | null;
  classId: string | null;
  educationLevel?: string | null;
  academicYear: string | null;
  term: string | null;
  parents: LookupParent[];
  outstandingBalance: number | null;
  lastPayment: { amount: number; date: string; reference: string } | null;
};

export type LookupStaff = {
  id: string;
  organizationId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  position: string;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  status: string;
  schoolName: string;
  schoolCode?: string | null;
  schoolLogoUrl?: string | null;
  schoolPhone?: string | null;
  schoolEmail?: string | null;
  district?: string | null;
  source?: 'iam' | 'hr';
};

export type CircularPaymentLine = {
  id: string;
  name: string;
  amount: number;
  payChannel?: string | null;
};

export type CircularRequirementLine = {
  id: string;
  name: string;
  description?: string | null;
  quantity?: string | null;
  price: number;
};

export type PublicCircular = {
  id: string;
  organizationId: string;
  academicYear: string;
  term: string;
  className: string;
  status: string;
  totalFee: number;
  parentMessage: string | null;
  payments: CircularPaymentLine[];
  requirements: CircularRequirementLine[];
};

export type CircularOptions = {
  academicYears: string[];
  terms: string[];
  count: number;
};

type StandardKitItem = {
  id?: string;
  title: string;
  description?: string | null;
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  sourceItemKey?: string | null;
};

type StandardKit = {
  id: string;
  organizationId?: string | null;
  academicYear?: string;
  term?: string;
  className?: string;
  babyeyiCircularId?: string | null;
  totalAmount?: number | string;
  items?: StandardKitItem[];
};

async function parseJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (body as { message?: string })?.message ||
      (body as { error?: string })?.error ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

function normalizeKey(s: string | null | undefined): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseCircularQuantity(raw: string | number | null | undefined): number {
  if (raw == null || raw === '') return 1;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : 1;
  const match = String(raw).match(/[\d]+(?:\.\d+)?/);
  const n = match ? Number(match[0]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function kitUnitPrice(item: StandardKitItem): number {
  return Number(item.unitPrice ?? 0) || 0;
}

function pickStandardKit(kits: StandardKit[], circular: PublicCircular): StandardKit | null {
  if (!kits.length) return null;
  const byCircular = kits.find((k) => k.babyeyiCircularId && k.babyeyiCircularId === circular.id);
  if (byCircular) return byCircular;

  const year = normalizeKey(circular.academicYear);
  const term = normalizeKey(circular.term);
  const cls = normalizeKey(circular.className);

  const scored = kits
    .map((k) => {
      let score = 0;
      if (year && normalizeKey(k.academicYear) === year) score += 4;
      if (term && normalizeKey(k.term) === term) score += 3;
      if (cls && normalizeKey(k.className) === cls) score += 5;
      else if (cls && normalizeKey(k.className).includes(cls)) score += 2;
      return { k, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.k ?? kits[0] ?? null;
}

function findKitItem(items: StandardKitItem[], name: string): StandardKitItem | undefined {
  const key = normalizeKey(name);
  if (!key) return undefined;
  const exact = items.find((i) => normalizeKey(i.title) === key);
  if (exact) return exact;
  return items.find((i) => {
    const t = normalizeKey(i.title);
    return t.includes(key) || key.includes(t);
  });
}

/**
 * Price = Super Admin standard-kit unit price × quantity from the Babyeyi circular requirement.
 */
export function enrichRequirementsFromStandardKit(
  circular: PublicCircular,
  kits: StandardKit[]
): PublicCircular {
  const kit = pickStandardKit(kits, circular);
  const items = kit?.items ?? [];
  if (!items.length) return circular;

  const requirements = circular.requirements.map((r) => {
    const item = findKitItem(items, r.name);
    const unit = item ? kitUnitPrice(item) : 0;
    const qty = parseCircularQuantity(r.quantity);

    if (unit > 0) {
      return {
        ...r,
        quantity: String(qty),
        price: unit * qty,
        description: r.description || item?.description || null,
      };
    }

    // No kit unit price — keep circular line total if school already set one
    if (r.price > 0) return r;
    return r;
  });

  // If circular names never matched kit prices, fall back to kit lines (kit qty × unit)
  const priced = requirements.filter((r) => r.price > 0).length;
  if (priced === 0 && items.some((i) => kitUnitPrice(i) > 0)) {
    return {
      ...circular,
      requirements: items.map((item, index) => {
        const unit = kitUnitPrice(item);
        const qty = parseCircularQuantity(item.quantity);
        return {
          id: `kit-${kit!.id}-${index}`,
          name: String(item.title || 'Item'),
          description: item.description ? String(item.description) : null,
          quantity: String(qty),
          price: unit * qty,
        };
      }),
    };
  }

  return { ...circular, requirements };
}

export type SchoolMiniWebsite = {
  organizationId: string;
  organizationName: string;
  slug: string;
  title: string;
  publicUrl: string;
};

export async function fetchSchoolMiniWebsite(
  organizationId: string
): Promise<SchoolMiniWebsite | null> {
  const url = `${MINI_WEBSITE_API}/public/schools/lookup?organizationId=${encodeURIComponent(organizationId.trim())}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  const body = await parseJson<{ success: boolean; data: SchoolMiniWebsite }>(res);
  return body.data ?? null;
}

export async function lookupStudentByCode(code: string): Promise<LookupStudent> {
  const url = `${STUDENT_MANAGEMENT_API}/public/students/lookup?code=${encodeURIComponent(code.trim())}`;
  const res = await fetch(url);
  const body = await parseJson<{ success: boolean; data: LookupStudent }>(res);
  return body.data;
}

export async function lookupStaffByCode(code: string): Promise<LookupStaff> {
  const url = `${IAM_PUBLIC_API}/public/staff/lookup?code=${encodeURIComponent(code.trim())}`;
  const res = await fetch(url);
  const body = await parseJson<{ success: boolean; data: LookupStaff }>(res);
  return body.data;
}

export async function fetchCircularOptions(
  organizationId: string,
  classLabel?: string | null
): Promise<CircularOptions> {
  const params = new URLSearchParams({ organizationId });
  if (classLabel) params.set('class', classLabel);
  const res = await fetch(`${BABYEYI_API}/public/circulars/options?${params}`);
  const body = await parseJson<{ success: boolean; data: CircularOptions }>(res);
  return body.data;
}

export async function fetchStandardKits(params: {
  organizationId: string;
  academicYear?: string;
  term?: string;
  className?: string | null;
}): Promise<StandardKit[]> {
  const q = new URLSearchParams({ organizationId: params.organizationId });
  if (params.academicYear) q.set('academicYear', params.academicYear);
  if (params.term) q.set('term', params.term);
  if (params.className) q.set('className', params.className);
  try {
    const res = await fetch(`${SHULEKIT_API}/public/standard-kits?${q}`);
    const body = await parseJson<{ success: boolean; data: StandardKit[] }>(res);
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    // Retry without year/term/class — formats often differ (2026-2027 vs 2026/2027)
    try {
      const res = await fetch(
        `${SHULEKIT_API}/public/standard-kits?organizationId=${encodeURIComponent(params.organizationId)}`
      );
      const body = await parseJson<{ success: boolean; data: StandardKit[] }>(res);
      return Array.isArray(body.data) ? body.data : [];
    } catch {
      return [];
    }
  }
}

export type StudentFeeLine = {
  id: string;
  name: string;
  amount: number;
  required: boolean;
  source?: string;
};

export type StudentFeesStructure = {
  found: boolean;
  structureId?: string;
  structureName?: string;
  academicYear?: string;
  term?: string;
  className?: string | null;
  billId?: string | null;
  billNumber?: string | null;
  fees: StudentFeeLine[];
  total: number;
  paid: number;
  remaining: number;
};

/** Active fee structure from School Fees Portal (preferred over raw Babyeyi circular). */
export async function fetchStudentFeesStructure(params: {
  organizationId: string;
  academicYear: string;
  term: string;
  className?: string | null;
  studentCode?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  autoBill?: boolean;
}): Promise<StudentFeesStructure | null> {
  const q = new URLSearchParams({
    organizationId: params.organizationId,
    academicYear: params.academicYear,
    term: params.term,
  });
  if (params.className) q.set('className', params.className);
  if (params.studentCode) {
    q.set('studentCode', params.studentCode);
    if (params.autoBill !== false) q.set('autoBill', '1');
  }
  if (params.studentId) q.set('studentId', params.studentId);
  if (params.studentName) q.set('studentName', params.studentName);
  try {
    const res = await fetch(`${SCHOOL_FEES_API}/public/student-fees?${q}`);
    if (!res.ok) return null;
    const body = await parseJson<{ success: boolean; data: StudentFeesStructure }>(res);
    return body.data?.found ? body.data : null;
  } catch {
    return null;
  }
}

export async function fetchPublicCircular(params: {
  organizationId: string;
  academicYear: string;
  term: string;
  classLabel?: string | null;
}): Promise<PublicCircular> {
  const q = new URLSearchParams({
    organizationId: params.organizationId,
    academicYear: params.academicYear,
    term: params.term,
  });
  if (params.classLabel) q.set('class', params.classLabel);
  const res = await fetch(`${BABYEYI_API}/public/circulars?${q}`);
  const body = await parseJson<{ success: boolean; data: PublicCircular }>(res);
  const circular = body.data;

  const kits = await fetchStandardKits({
    organizationId: params.organizationId,
    academicYear: params.academicYear,
    term: params.term,
    className: params.classLabel || circular.className,
  });

  return enrichRequirementsFromStandardKit(circular, kits);
}

export function studentWizardContext(student: LookupStudent) {
  return {
    name: student.fullName,
    fullName: student.fullName,
    school: student.schoolName,
    studentClass: student.className ?? '—',
    organizationId: student.organizationId,
    classLabel: student.classLabel,
    preferredYear: student.academicYear,
    preferredTerm: student.term,
    studentUid: student.studentUid,
    id: student.id,
    studentCode: student.studentCode ?? student.sdmCode ?? student.registrationNumber ?? null,
  };
}

/** Best code to re-run a public student lookup (ShuleCode / SDMS). */
export function studentLookupCode(student: LookupStudent): string {
  return (
    student.studentUid?.trim() ||
    student.sdmCode?.trim() ||
    student.studentCode?.trim() ||
    ''
  );
}

/* ------------------------------------------------------------------ */
/* Public payments (landing-page fee wizard → School Fees Portal)      */
/* ------------------------------------------------------------------ */

export type PublicPayMethod = 'MOMO' | 'CARD' | 'BANK';

export type InitiatePublicPaymentInput = {
  organizationId?: string | null;
  studentId?: string | null;
  studentCode?: string | null;
  studentName?: string;
  academicYear: string;
  term: string;
  className?: string | null;
  amount: number;
  method: PublicPayMethod;
  /** MOMO */
  provider?: 'MTN' | 'AIRTEL';
  phone?: string;
  /** CARD — PAN/CVV are never stored server-side; last4 only for reference. */
  cardNumber?: string;
  cardHolder?: string;
  expiry?: string;
  cvv?: string;
  /** BANK */
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  payerName?: string;
  allowOverpay?: boolean;
  lines?: Array<{ name: string; amount: number }>;
};

export type PublicPaymentInitiated = {
  reference: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  paymentNumber: string;
  amount: number;
  method: string;
  provider: string | null;
  autoConfirmSeconds: number | null;
};

export type PublicPaymentStatus = {
  reference: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | string;
  paymentNumber: string;
  amount: number;
  method: string;
  receiptNumber: string | null;
};

export async function initiateStudentFeePayment(
  input: InitiatePublicPaymentInput
): Promise<PublicPaymentInitiated> {
  const res = await fetch(`${SCHOOL_FEES_API}/public/payments/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await parseJson<{ success: boolean; data: PublicPaymentInitiated }>(res);
  return body.data;
}

export async function getPublicPaymentStatus(reference: string): Promise<PublicPaymentStatus> {
  const res = await fetch(
    `${SCHOOL_FEES_API}/public/payments/${encodeURIComponent(reference)}/status`
  );
  const body = await parseJson<{ success: boolean; data: PublicPaymentStatus }>(res);
  return body.data;
}
