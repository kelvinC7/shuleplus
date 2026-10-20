const BABYEYI_API = process.env.NEXT_PUBLIC_BABYEYI_API_URL ?? 'http://localhost:3099/api';

export interface AdmissionDocumentDef {
  id: string;
  name: string;
  required: boolean;
  transferOnly?: boolean;
  levels?: string[];
}

export interface AdmissionConfig {
  enabled: boolean;
  applicationDeadline: string | null;
  estimatedFee: number | null;
  availablePlaces: Record<string, number>;
  requiredDocuments: AdmissionDocumentDef[];
  termsUrl: string | null;
  privacyUrl: string | null;
  welcomeMessage: string | null;
  organizationId: string;
  organizationName: string;
  educationLevels: string[];
  aLevelCombinations: string[];
  tvetTrades: string[];
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

export interface AdmissionDocumentUpload {
  id: string;
  fileName?: string;
  contentBase64?: string;
  mimeType?: string;
  url?: string;
  previewUrl?: string;
}

export interface AdmissionApplication {
  id: string;
  applicationNumber: string;
  organizationId: string;
  organizationName: string | null;
  status: string;
  statusIndex: number;
  draftToken: string | null;
  admissionLevel: string;
  classApplying: string;
  academicYear: string;
  termOfEntry: string;
  boardingPreference: string;
  studentGender: string;
  previousSchool: string | null;
  preferredCombination: string | null;
  admissionType: string;
  studentDetails: Record<string, unknown>;
  parentDetails: Record<string, unknown>;
  documents: AdmissionDocumentUpload[];
  schoolNotes: string | null;
  interviewAt: string | null;
  submittedAt: string | null;
  studentName: string | null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BABYEYI_API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const json = (await res.json().catch(() => null)) as { success?: boolean; data?: T; message?: string };
  if (!res.ok) {
    throw new Error(json?.message ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

export function checkAdmissionsEnabled(organizationId: string): Promise<{ enabled: boolean }> {
  return apiFetch(`/admissions/check?organizationId=${encodeURIComponent(organizationId)}`);
}

export function fetchAdmissionConfig(organizationId: string): Promise<AdmissionConfig> {
  return apiFetch(`/admissions/config?organizationId=${encodeURIComponent(organizationId)}`);
}

export function submitAdmissionApplication(body: Record<string, unknown>): Promise<AdmissionApplication> {
  return apiFetch('/admissions/submit', { method: 'POST', body: JSON.stringify(body) });
}

export function saveAdmissionDraft(body: Record<string, unknown>): Promise<{ draftToken: string; application: AdmissionApplication }> {
  return apiFetch('/admissions/draft', { method: 'POST', body: JSON.stringify(body) });
}

export function trackAdmissionApplication(applicationNumber: string): Promise<AdmissionApplication> {
  return apiFetch(`/admissions/track/${encodeURIComponent(applicationNumber)}`);
}

export const EDUCATION_LEVEL_ORDER = ['Nursery', 'Primary', 'O-Level', 'A-Level', 'TVET'] as const;

export function normalizeEducationLevels(levels: string[]): string[] {
  const set = new Set(levels.map((l) => l.trim()).filter(Boolean));
  return EDUCATION_LEVEL_ORDER.filter((l) => set.has(l));
}

export function levelUsesClassPicker(level: string): boolean {
  return level === 'Nursery' || level === 'Primary' || level === 'O-Level';
}

export function levelUsesCombinationPicker(level: string): boolean {
  return level === 'A-Level';
}

export function levelUsesTvetPicker(level: string): boolean {
  return level === 'TVET';
}

export const CLASSES_BY_LEVEL: Record<string, string[]> = {
  Nursery: ['Baby Class', 'Middle Class', 'Top Class'],
  Primary: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
  'O-Level': ['S1', 'S2', 'S3'],
};

export const ADMISSION_STATUS_FLOW = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'DOCUMENTS_VERIFICATION',
  'ASSESSMENT_INTERVIEW',
  'ADMISSION_APPROVED',
  'FEE_PAYMENT',
  'ENROLLED',
] as const;

export const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  DOCUMENTS_VERIFICATION: 'Documents Verification',
  ASSESSMENT_INTERVIEW: 'Assessment / Interview',
  ADMISSION_APPROVED: 'Admission Approved',
  FEE_PAYMENT: 'Fee Payment',
  ENROLLED: 'Enrolled',
  REJECTED: 'Rejected',
};

export const MAX_DOC_BYTES = 5 * 1024 * 1024;
export const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

export function formatRwf(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `${new Intl.NumberFormat('en-RW').format(amount)} Frw`;
}
