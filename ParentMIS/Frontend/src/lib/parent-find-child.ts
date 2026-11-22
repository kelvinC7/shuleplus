import { STUDENT_MGMT_API } from '@/lib/parent-auth-api';

const SCHOOL_FEES_API =
  process.env.NEXT_PUBLIC_SCHOOL_FEES_API_URL?.replace(/\/$/, '') || 'http://localhost:3014/api';
const BABYEYI_API =
  process.env.NEXT_PUBLIC_BABYEYI_API_URL?.replace(/\/$/, '') ||
  (process.env.NODE_ENV === 'production'
    ? 'https://babyeyi-api.shuleplus.rw/api'
    : 'http://localhost:3012/api');

export type FeeLine = { item: string; billed: number; paid: number };

export type FoundChild = {
  name: string;
  cls: string;
  sdms: string;
  schoolName: string;
  organizationId: string;
  academicYear: string | null;
  term: string | null;
  nextCls: string;
  feeLines: FeeLine[];
};

export const PAY_METHODS = [
  { id: 'MTN MoMo', hint: 'Prompt on your phone', mobile: true },
  { id: 'Airtel Money', hint: 'Prompt on your phone', mobile: true },
  { id: 'Bank transfer', hint: 'Use school reference', mobile: false },
  { id: 'Card', hint: 'Visa / Mastercard', mobile: false },
] as const;

export const BABYEYI_LANGS = [
  { code: 'EN', name: 'English' },
  { code: 'RW', name: 'Kinyarwanda' },
  { code: 'FR', name: 'French' },
] as const;

type LookupStudent = {
  id: string;
  organizationId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  studentUid: string;
  shuleCode?: string | null;
  studentCode: string | null;
  sdmCode: string | null;
  schoolName: string;
  className: string | null;
  classLabel: string | null;
  academicYear: string | null;
  term: string | null;
  outstandingBalance: number | null;
};

type StudentFeesStructure = {
  found: boolean;
  structureName?: string;
  academicYear?: string;
  term?: string;
  fees: { id: string; name: string; amount: number }[];
  total: number;
  paid: number;
  remaining: number;
};

export type PublicCircularOptions = {
  grouped: { academicYear: string; terms: string[] }[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
};

export type PublicCircularSummary = {
  id: string;
  academicYear: string;
  term: string;
  className: string;
  classes: unknown;
  status: 'APPROVED' | 'PUBLISHED';
};

async function fetchPublicBabyeyi<T>(path: string): Promise<T> {
  const res = await fetch(`${BABYEYI_API}${path}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || `Babyeyi service request failed (${res.status})`);
  return body.data as T;
}

export async function fetchPublicCircularOptions(
  organizationId: string,
  classLabel: string,
): Promise<PublicCircularOptions> {
  const query = new URLSearchParams({ organizationId, class: classLabel });
  return fetchPublicBabyeyi<PublicCircularOptions>(`/public/circulars/options?${query}`);
}

export async function findApprovedPublicCircular(
  organizationId: string,
  academicYear: string,
  term: string,
  classLabel: string,
): Promise<PublicCircularSummary | null> {
  const query = new URLSearchParams({ organizationId, academicYear, term });
  const response = await fetchPublicBabyeyi<PublicCircularSummary[]>(
    `/public/circulars/list?${query}`,
  );
  const normalize = (value: string) => value.trim().toLowerCase();
  const classNeedle = normalize(classLabel);
  const matchesClass = (circular: PublicCircularSummary) => {
    if (!classNeedle || classNeedle === '—') return true;
    const names = [circular.className, ...(Array.isArray(circular.classes) ? circular.classes : [])]
      .filter((name): name is string => typeof name === 'string')
      .map(normalize);
    return names.some((name) => name && (name === classNeedle || name.includes(classNeedle) || classNeedle.includes(name)));
  };
  return response.find(matchesClass) ?? null;
}

export function publicCircularPrintUrl(circular: PublicCircularSummary, organizationId: string, lang: string): string {
  const query = new URLSearchParams({ organizationId, lang: lang.toLowerCase(), autoprint: '0' });
  return `${BABYEYI_API}/public/circulars/${encodeURIComponent(circular.id)}/print?${query}`;
}

async function lookupStudent(code: string): Promise<LookupStudent | null> {
  const res = await fetch(
    `${STUDENT_MGMT_API}/public/students/lookup?code=${encodeURIComponent(code.trim())}`
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.data) return null;
  return body.data as LookupStudent;
}

async function fetchStudentFeesStructure(student: LookupStudent): Promise<StudentFeesStructure | null> {
  const year = student.academicYear?.trim();
  const term = student.term?.trim();
  if (!year || !term) return null;

  const q = new URLSearchParams({
    organizationId: student.organizationId,
    academicYear: year,
    term,
  });
  const className = student.className ?? student.classLabel;
  if (className) q.set('className', className);
  const studentCode = student.studentCode ?? student.sdmCode ?? student.studentUid;
  if (studentCode) {
    q.set('studentCode', studentCode);
    q.set('autoBill', '1');
  }
  q.set('studentId', student.id);
  q.set('studentName', student.fullName);

  try {
    const res = await fetch(`${SCHOOL_FEES_API}/public/student-fees?${q}`);
    if (!res.ok) return null;
    const body = await res.json().catch(() => ({}));
    const data = body?.data as StudentFeesStructure | undefined;
    return data?.found ? data : null;
  } catch {
    return null;
  }
}

function feeLinesFromStructure(structure: StudentFeesStructure): FeeLine[] {
  const totalBilled = structure.total > 0 ? structure.total : structure.fees.reduce((s, f) => s + f.amount, 0);
  const paid = Math.min(structure.paid, totalBilled);

  if (structure.fees.length === 0) {
    if (totalBilled <= 0 && structure.remaining <= 0) return [];
    return [
      {
        item: structure.structureName?.trim() || 'School fees',
        billed: totalBilled || structure.remaining + paid,
        paid,
      },
    ];
  }

  return structure.fees.map((f) => ({
    item: f.name,
    billed: f.amount,
    paid: totalBilled > 0 ? Math.round(paid * (f.amount / totalBilled)) : 0,
  }));
}

function feeLinesFromOutstanding(student: LookupStudent): FeeLine[] {
  const balance = student.outstandingBalance;
  if (balance == null || balance <= 0) return [];
  return [{ item: 'Outstanding balance', billed: balance, paid: 0 }];
}

export async function findChild(query: string): Promise<FoundChild | null> {
  const code = query.trim();
  if (!code) return null;

  const student = await lookupStudent(code);
  if (!student) return null;

  const feesStructure = await fetchStudentFeesStructure(student);

  let feeLines: FeeLine[] = [];
  if (feesStructure) {
    feeLines = feeLinesFromStructure(feesStructure);
  } else {
    feeLines = feeLinesFromOutstanding(student);
  }

  const cls = student.className ?? student.classLabel ?? '—';
  const sdms = student.sdmCode ?? student.studentCode ?? student.studentUid ?? '—';

  return {
    name: student.fullName,
    cls,
    sdms,
    schoolName: student.schoolName,
    organizationId: student.organizationId,
    academicYear: student.academicYear,
    term: student.term,
    nextCls: cls,
    feeLines,
  };
}

export function balanceOf(child: FoundChild): number {
  return child.feeLines.reduce((sum, line) => sum + Math.max(0, line.billed - line.paid), 0);
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function rwf(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')} RWF`;
}
