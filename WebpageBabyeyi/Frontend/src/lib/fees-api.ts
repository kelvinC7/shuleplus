/** Base URL of the WebpageBabyeyi backend (3099) which proxies to SchoolFeesPortal. */
const BABYEYI_API = process.env.NEXT_PUBLIC_BABYEYI_API_URL ?? 'http://localhost:3099/api';

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
  provider?: 'MTN' | 'AIRTEL';
  phone?: string;
  cardNumber?: string;
  cardHolder?: string;
  expiry?: string;
  cvv?: string;
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

export type CircularPaymentLine = {
  id: string;
  name: string;
  amount: number;
  payChannel?: string | null;
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
};

/** Approved Babyeyi circular fee lines (fallback when School Fees has no ACTIVE structure). */
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
  const res = await fetch(`${BABYEYI_API}/circulars?${q}`);
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: PublicCircular;
  };
  if (!res.ok || !body.data) {
    throw new Error(body.message ?? `Circular not found (${res.status})`);
  }
  return body.data;
}

/** School-account lines from a circular (excludes supplier / other channels). */
export function schoolAccountPaymentsFromCircular(circular: PublicCircular): CircularPaymentLine[] {
  return circular.payments.filter(
    (p) => (p.payChannel ?? 'school').toLowerCase() === 'school',
  );
}

/** Active fee structure from the School Fees Portal (via WebpageBabyeyi proxy). */
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
    const res = await fetch(`${BABYEYI_API}/fees/student-fees?${q}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { success: boolean; data: StudentFeesStructure };
    return body.data?.found ? body.data : null;
  } catch {
    return null;
  }
}

export async function initiateStudentFeePayment(
  input: InitiatePublicPaymentInput,
): Promise<PublicPaymentInitiated> {
  const res = await fetch(`${BABYEYI_API}/fees/payments/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = (await res.json()) as { success: boolean; data: PublicPaymentInitiated };
  return body.data;
}

export async function getPublicPaymentStatus(reference: string): Promise<PublicPaymentStatus> {
  const res = await fetch(
    `${BABYEYI_API}/fees/payments/${encodeURIComponent(reference)}/status`,
  );
  const body = (await res.json()) as { success: boolean; data: PublicPaymentStatus };
  return body.data;
}
