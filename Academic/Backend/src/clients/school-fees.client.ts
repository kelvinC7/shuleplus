import { env } from '../config/env';

export type ExamEligibilityStatus =
  | 'AUTO_ALLOWED'
  | 'MANUALLY_ALLOWED'
  | 'NOT_ALLOWED'
  | 'MANUALLY_BLOCKED'
  | 'NOT_ON_LIST'
  | 'NO_LIST';

export type ExamEligibilityLookup = {
  published: boolean;
  allowed: boolean;
  status: ExamEligibilityStatus | string;
  financialStatus?: string;
  balance?: number;
  reason?: string | null;
  note?: string | null;
  reference?: string | null;
  studentName?: string;
  studentCode?: string;
  className?: string;
  versionLabel?: string | null;
  examName?: string;
  message?: string;
  students?: Array<{
    studentId: string;
    studentCode: string;
    allowed: boolean;
    status: string;
    financialStatus?: string;
    balance?: number;
    reason?: string | null;
  }>;
};

const OPEN: ExamEligibilityLookup = {
  published: false,
  allowed: true,
  status: 'NO_LIST',
  message: 'No published examination list for this class yet.',
};

async function feesFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${env.SCHOOL_FEES_API_URL.replace(/\/$/, '')}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': env.SERVICE_API_KEY,
      'x-source-service': 'academic',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`School Fees ${res.status}: ${text}`);
  }
  const json: any = await res.json();
  return (json.data ?? json) as T;
}

export async function lookupExamEligibility(params: {
  organizationId: string;
  academicYear?: string;
  term?: string;
  className?: string;
  examName?: string;
  studentId?: string;
  studentCode?: string;
}): Promise<ExamEligibilityLookup> {
  try {
    return await feesFetch<ExamEligibilityLookup>('/service/examination-eligibility', {
      organizationId: params.organizationId,
      academicYear: params.academicYear ?? '',
      term: params.term ?? '',
      className: params.className ?? '',
      examName: params.examName ?? '',
      studentId: params.studentId ?? '',
      studentCode: params.studentCode ?? '',
    });
  } catch (err) {
    console.warn('[exam-eligibility] Fees lookup unavailable, allowing until a published list exists', err);
    return OPEN;
  }
}

export function examEligibilityAllowed(row: { allowed?: boolean; status?: string } | undefined) {
  if (!row) return true;
  return row.allowed === true;
}
