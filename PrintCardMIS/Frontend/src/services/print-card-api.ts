import { api } from '@/services/api';
import { iamApi } from '@/services/iam-api';

export type CardStatus =
  | 'NOT_PRINTED'
  | 'PRINTING'
  | 'PRINTED'
  | 'PARTIALLY_PRINTED'
  | 'REPRINT_REQUIRED'
  | 'REPRINTED';

export type PersonKind = 'STUDENT' | 'STAFF';

export type PrintCardSchool = {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  poBox?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  organizationCode?: string | null;
  status: string;
};

export type PrintCardClass = {
  id: string;
  name: string;
  stream?: string | null;
  category?: string | null;
  label: string;
};

export type CardRecord = {
  id: string;
  organizationId: string;
  personKind: PersonKind;
  personId: string;
  personCode: string;
  fullName: string;
  photoUrl?: string | null;
  className?: string | null;
  educationLevel?: string | null;
  role?: string | null;
  department?: string | null;
  gender?: string | null;
  academicYear?: string | null;
  status: CardStatus;
  printCount: number;
  lastPrintedAt?: string | null;
  lastPrintedBy?: string | null;
  lastBatchNumber?: string | null;
};

export type PrintBatch = {
  id: string;
  organizationId: string;
  batchNumber: string;
  personKind: PersonKind;
  status: string;
  totalCards: number;
  successCount: number;
  failedCount: number;
  createdBy: string;
  createdByEmail?: string | null;
  printerName?: string | null;
  confirmedAt?: string | null;
  createdAt: string;
  items?: PrintBatchItem[];
  _count?: { items: number };
};

export type PrintBatchItem = {
  id: string;
  batchId: string;
  cardRecordId: string;
  sortOrder: number;
  printType: 'ORIGINAL' | 'REPRINT';
  result: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  failureReason?: string | null;
  cardRecord?: CardRecord;
};

export type CardStats = {
  total: number;
  notPrinted: number;
  printed: number;
  reprintRequired: number;
  reprinted: number;
  selected: number;
};

export type LocationOption = { id: string; name: string };

export type SessionSummary = {
  userId: string;
  email: string;
  organizationId: string;
  roles: string[];
  isSuperAdmin: boolean;
  isPrintCardOperator?: boolean;
  canSelectSchools?: boolean;
};

export type ReprintReason =
  | 'LOST'
  | 'DAMAGED'
  | 'STORED'
  | 'INCORRECT_INFORMATION'
  | 'OTHER';

export type ReprintRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PRINTED'
  | 'COMPLETED';

export type ReprintRequest = {
  id: string;
  organizationId: string;
  cardRecordId: string;
  personKind: PersonKind;
  reason: ReprintReason;
  description?: string | null;
  status: ReprintRequestStatus;
  requestedBy: string;
  requestedByEmail?: string | null;
  reviewedBy?: string | null;
  reviewedByEmail?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  cardRecord?: CardRecord;
};

export async function fetchSession() {
  const { data } = await api.get<{ success: boolean; data: SessionSummary }>('/session');
  return data.data;
}

export async function fetchSchools(params?: Record<string, string | undefined>) {
  const { data } = await api.get<{ success: boolean; data: PrintCardSchool[] }>('/schools', { params });
  return data.data;
}

export async function fetchSchoolClasses(organizationId: string) {
  const { data } = await api.get<{ success: boolean; data: PrintCardClass[] }>(
    `/schools/${organizationId}/classes`
  );
  return data.data ?? [];
}

export async function fetchStudents(organizationId: string, params?: Record<string, string | undefined>) {
  const { data } = await api.get<{ success: boolean; data: CardRecord[] }>(
    `/schools/${organizationId}/students`,
    { params }
  );
  return data.data;
}

export async function fetchStaff(organizationId: string, params?: Record<string, string | undefined>) {
  const { data } = await api.get<{ success: boolean; data: CardRecord[] }>(
    `/schools/${organizationId}/staff`,
    { params }
  );
  return data.data;
}

export async function fetchStats(organizationId: string, kind: PersonKind) {
  const { data } = await api.get<{ success: boolean; data: CardStats }>('/stats', {
    params: { organizationId, kind },
  });
  return data.data;
}

export async function createPrintBatch(body: {
  organizationId: string;
  personKind: PersonKind;
  cardRecordIds: string[];
  asReprint?: boolean;
}) {
  const { data } = await api.post<{ success: boolean; data: PrintBatch }>('/print-batches', body);
  return data.data;
}

export async function fetchPrintBatch(batchId: string, organizationId: string) {
  const { data } = await api.get<{ success: boolean; data: PrintBatch }>(`/print-batches/${batchId}`, {
    params: { organizationId },
  });
  return data.data;
}

export async function startPrintBatch(batchId: string, organizationId: string) {
  const { data } = await api.post<{ success: boolean; data: PrintBatch }>(
    `/print-batches/${batchId}/start`,
    {},
    { params: { organizationId } }
  );
  return data.data;
}

export async function confirmPrintBatch(
  batchId: string,
  body: {
    organizationId: string;
    printerName?: string;
    allSuccess?: boolean;
    items?: Array<{ itemId: string; success: boolean; failureReason?: string }>;
  }
) {
  const { data } = await api.post<{ success: boolean; data: PrintBatch }>(
    `/print-batches/${batchId}/confirm`,
    body
  );
  return data.data;
}

export async function cancelPrintBatch(batchId: string, organizationId: string) {
  const { data } = await api.post<{ success: boolean; data: PrintBatch }>(
    `/print-batches/${batchId}/cancel`,
    {},
    { params: { organizationId } }
  );
  return data.data;
}

export async function removeBatchItem(batchId: string, itemId: string, organizationId: string) {
  const { data } = await api.delete<{ success: boolean; data: PrintBatch }>(
    `/print-batches/${batchId}/items/${itemId}`,
    { params: { organizationId } }
  );
  return data.data;
}

export async function fetchPrintQueue(organizationId?: string) {
  const { data } = await api.get<{ success: boolean; data: PrintBatch[] }>('/print-batches/queue', {
    params: organizationId ? { organizationId } : {},
  });
  return data.data;
}

export async function fetchPrintHistory(organizationId?: string) {
  const { data } = await api.get<{ success: boolean; data: PrintBatch[] }>('/print-batches/history', {
    params: organizationId ? { organizationId } : {},
  });
  return data.data;
}

export async function cardAction(
  cardRecordId: string,
  organizationId: string,
  action: 'MARK_DAMAGED' | 'MARK_LOST' | 'CANCEL_REPRINT'
) {
  const { data } = await api.post<{ success: boolean; data: CardRecord }>(
    `/card-records/${cardRecordId}/action`,
    { action },
    { params: { organizationId } }
  );
  return data.data;
}

export async function fetchCardEvents(cardRecordId: string, organizationId: string) {
  const { data } = await api.get<{ success: boolean; data: unknown[] }>(
    `/card-records/${cardRecordId}/events`,
    { params: { organizationId } }
  );
  return data.data;
}

export async function fetchReprintRequests(params?: {
  organizationId?: string;
  status?: ReprintRequestStatus;
  personKind?: PersonKind;
  reason?: ReprintReason;
}) {
  const { data } = await api.get<{ success: boolean; data: ReprintRequest[] }>('/reprint-requests', {
    params,
  });
  return data.data;
}

export async function createReprintRequest(body: {
  organizationId: string;
  cardRecordId: string;
  reason: ReprintReason;
  description?: string;
}) {
  const { data } = await api.post<{ success: boolean; data: ReprintRequest }>('/reprint-requests', body);
  return data.data;
}

export async function reviewReprintRequest(
  requestId: string,
  action: 'APPROVE' | 'REJECT',
  rejectionReason?: string
) {
  const { data } = await api.post<{ success: boolean; data: ReprintRequest }>(
    `/reprint-requests/${requestId}/review`,
    { action, rejectionReason }
  );
  return data.data;
}

export async function completeReprintRequest(requestId: string) {
  const { data } = await api.post<{ success: boolean; data: ReprintRequest }>(
    `/reprint-requests/${requestId}/complete`,
    {}
  );
  return data.data;
}

export async function fetchProvinces() {
  const { data } = await iamApi.get<{ success: boolean; data: LocationOption[] }>(
    '/public/locations/provinces'
  );
  return data.data;
}

export async function fetchDistricts(provinceId: string) {
  const { data } = await iamApi.get<{ success: boolean; data: LocationOption[] }>(
    `/public/locations/provinces/${provinceId}/districts`
  );
  return data.data;
}

export async function fetchSectors(districtId: string) {
  const { data } = await iamApi.get<{ success: boolean; data: LocationOption[] }>(
    `/public/locations/districts/${districtId}/sectors`
  );
  return data.data;
}

export function cardStatusLabel(status: CardStatus): string {
  const map: Record<CardStatus, string> = {
    NOT_PRINTED: 'Not Printed',
    PRINTING: 'Printing',
    PRINTED: 'Printed',
    PARTIALLY_PRINTED: 'Partially Printed',
    REPRINT_REQUIRED: 'Reprint Requested',
    REPRINTED: 'Reprinted',
  };
  return map[status] ?? status;
}

export function cardStatusTone(status: CardStatus): string {
  if (status === 'NOT_PRINTED') return 'bg-slate-100 text-slate-700';
  if (status === 'PRINTED' || status === 'REPRINTED') return 'bg-emerald-100 text-emerald-800';
  if (status === 'PRINTING') return 'bg-blue-100 text-blue-800';
  if (status === 'REPRINT_REQUIRED') return 'bg-amber-100 text-amber-900';
  return 'bg-orange-100 text-orange-800';
}

export function formatPrintDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export type PhotoImportJobStatus =
  | 'QUEUED'
  | 'ANALYZING'
  | 'READY'
  | 'IMPORTING'
  | 'COMPLETED'
  | 'FAILED';

export type PhotoImportRowStatus =
  | 'MATCHED'
  | 'MISSING'
  | 'UNKNOWN'
  | 'DUPLICATE'
  | 'INVALID'
  | 'SKIPPED'
  | 'IMPORTED'
  | 'FAILED';

export type PhotoImportStats = {
  excelRows: number;
  photosInZip: number;
  matched: number;
  missing: number;
  unknown: number;
  duplicate: number;
  invalid: number;
  skipped: number;
  imported: number;
  failed: number;
  processed: number;
};

export type PhotoImportRow = {
  id: string;
  photoId?: string | null;
  studentId?: string | null;
  studentCode?: string | null;
  studentName?: string | null;
  status: PhotoImportRowStatus;
  fileName?: string | null;
  message?: string | null;
  hasExistingPhoto: boolean;
};

export type PhotoImportJob = {
  id: string;
  organizationId: string;
  status: PhotoImportJobStatus;
  photoIdRegex: string;
  existingPhotoPolicy: 'ONLY_MISSING' | 'REPLACE';
  stats?: PhotoImportStats | null;
  errorMessage?: string | null;
  createdByEmail?: string | null;
  confirmedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  rows?: PhotoImportRow[];
  buckets?: Record<PhotoImportRowStatus, PhotoImportRow[]>;
};

export async function createPhotoImportJob(
  form: FormData,
  onUploadProgress?: (percent: number) => void
) {
  const { data } = await api.post<{ success: boolean; data: PhotoImportJob }>('/photo-import/jobs', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600_000,
    onUploadProgress: (event) => {
      if (!onUploadProgress || !event.total) return;
      const pct = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onUploadProgress(pct);
    },
  });
  return data.data;
}

export async function fetchPhotoImportJobs(organizationId: string) {
  const { data } = await api.get<{ success: boolean; data: PhotoImportJob[] }>('/photo-import/jobs', {
    params: { organizationId },
  });
  return data.data;
}

export async function fetchPhotoImportJob(jobId: string, organizationId: string) {
  const { data } = await api.get<{ success: boolean; data: PhotoImportJob }>(`/photo-import/jobs/${jobId}`, {
    params: { organizationId },
  });
  return data.data;
}

export async function confirmPhotoImportJob(
  jobId: string,
  organizationId: string,
  existingPhotoPolicy: 'ONLY_MISSING' | 'REPLACE' = 'ONLY_MISSING'
) {
  const { data } = await api.post<{ success: boolean; data: PhotoImportJob }>(
    `/photo-import/jobs/${jobId}/confirm`,
    { existingPhotoPolicy },
    { params: { organizationId } }
  );
  return data.data;
}

export function photoImportReportUrl(jobId: string, organizationId: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3093/api';
  return `${base.replace(/\/$/, '')}/photo-import/jobs/${jobId}/report.xlsx?organizationId=${encodeURIComponent(organizationId)}`;
}
