import axios from 'axios';
import { api } from './api';
import type { Circular, DashboardSummary, NotificationItem, SchoolProfile, Template, WizardFormState } from '@/types';

const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3012/api';

export async function fetchDashboard(): Promise<DashboardSummary> {
  const { data } = await api.get<{ data: DashboardSummary }>('/dashboard');
  return data.data;
}

export async function fetchSchoolInfo(): Promise<{
  profile: SchoolProfile;
  feeScope: { feeScope: string; schoolKind: string };
  classes: Array<{ label: string; educationLevel: string }>;
  branding?: {
    logoUrl?: string | null;
    signatureUrl?: string | null;
    stampUrl?: string | null;
    otherLogoUrl?: string | null;
  };
  leaders?: Array<{ name: string; role: string; phone?: string; email?: string }>;
  contact?: { email?: string; phone?: string; website?: string; address?: string } | null;
  schoolCategory?: string | null;
  documentDescriptionTemplate?: {
    includeSchoolDescription: boolean;
    descriptionLines: string[];
  } | null;
}> {
  const { data } = await api.get('/babyeyi/school-info');
  return data.data;
}

export async function fetchNesaLimit(params: {
  level: string;
  term: string;
  category?: string;
  district?: string;
  ownershipType?: string;
  feeTargetStudents?: string;
  academicYear?: string;
  educationLevel?: string;
  studentType?: string;
}) {
  const { data } = await api.get('/babyeyi/nesa-limit', {
    params: {
      level: params.level,
      term: params.term,
      category: params.category,
      district: params.district,
      ownershipType: params.ownershipType,
      feeTargetStudents: params.feeTargetStudents,
      academicYear: params.academicYear,
      educationLevel: params.educationLevel,
      studentType: params.studentType,
      classLabel: params.level,
    },
  });
  return data.data as {
    limit: number | null;
    applies?: boolean;
    tuitionMaxRwf?: number | null;
    generalAssemblyMaxRwf?: number | null;
    totalMaxRwf?: number | null;
    source: string;
    reason?: string;
    policies?: Array<Record<string, unknown>>;
  };
}

export async function fetchAcademicClasses() {
  const { data } = await api.get('/babyeyi/academic-classes');
  return data.data as {
    source: 'student-management';
    classes: Array<{
      id?: string;
      name?: string;
      stream?: string | null;
      label: string;
      educationLevel?: string;
    }>;
  };
}

export async function fetchRequirementsCatalog() {
  const { data } = await api.get('/babyeyi/student-requirements-catalog');
  return data.data as Array<{ id: string; name: string; description?: string; quantity: string }>;
}

export async function fetchCirculars(params?: Record<string, string>) {
  const { data } = await api.get<{ data: Circular[] }>('/babyeyi', { params });
  return data.data;
}

export async function fetchCircular(id: string) {
  const { data } = await api.get<{ data: Circular }>(`/babyeyi/${id}`);
  return data.data;
}

export async function createCircular(form: WizardFormState, status = 'DRAFT') {
  const fd = buildFormData(form, status);
  const { data } = await api.post<{ data: Circular }>('/babyeyi', fd);
  return data.data;
}

export async function updateCircular(id: string, form: WizardFormState, status?: string) {
  const fd = buildFormData(form, status);
  const { data } = await api.put<{ data: Circular }>(`/babyeyi/${id}`, fd);
  return data.data;
}

export async function deleteCircular(id: string) {
  await api.delete(`/babyeyi/${id}`);
}

export async function duplicateCircular(id: string) {
  const { data } = await api.post<{ data: Circular }>(`/babyeyi/${id}/duplicate`);
  return data.data;
}

export async function publishCircular(id: string) {
  const { data } = await api.post<{ data: Circular }>(`/babyeyi/${id}/publish`);
  return data.data;
}

export interface HinduraPatch {
  parentMessage?: string;
  payments?: Array<{ index: number; name: string }>;
  requirements?: Array<{ index: number; item?: string; description?: string }>;
  otherInfos?: Array<{ index: number; item: string }>;
  classReqs?: Array<{ index: number; item: string }>;
  leaders?: Array<{ index: number; role: string }>;
}

/** "Hindura" — manual Kinyarwanda content override for a circular's translated fields. */
export async function patchContentI18nRw(id: string, patch: HinduraPatch) {
  const { data } = await api.patch<{ data: Circular }>(`/babyeyi/${id}/content-i18n/rw`, patch);
  return data.data;
}

/** Forces a fresh EN -> RW/FR machine translation of narrative fields. */
export async function regenerateTranslations(id: string) {
  const { data } = await api.post<{ data: Circular }>(`/babyeyi/${id}/regenerate-translations`);
  return data.data;
}

export async function generateQr(id: string) {
  const { data } = await api.get(`/babyeyi/${id}/qrcode`);
  return data.data as {
    qr_code_url: string;
    qr_code_data_url: string;
    qr_view_url: string;
    qr_hash: string;
  };
}

export async function fetchApprovals() {
  const { data } = await api.get('/approvals');
  return data.data;
}

export async function actOnApproval(id: string, stage: string, action: string, notes?: string) {
  const { data } = await api.post(`/babyeyi/${id}/approve`, { stage, action, notes });
  return data.data;
}

export async function fetchAnalytics() {
  const { data } = await api.get('/analytics');
  return data.data;
}

export async function fetchTemplates() {
  const { data } = await api.get<{ data: Template[] }>('/templates');
  return data.data;
}

export async function fetchAssets() {
  const { data } = await api.get('/assets');
  return data.data;
}

export async function uploadAsset(file: File, assetType: string) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('asset_type', assetType);
  const { data } = await api.post('/babyeyi/upload-asset', fd);
  const payload = data.data as { filePath?: string; url?: string; assetType?: string };
  const path = payload.url || payload.filePath || '';
  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3012/api').replace(/\/$/, '');
  const absolute =
    path.startsWith('http') || path.startsWith('data:')
      ? path
      : path
        ? `${apiBase}${path.startsWith('/') ? path : `/${path}`}`
        : '';
  return { ...payload, url: absolute };
}

export async function fetchNotifications() {
  const { data } = await api.get<{ data: NotificationItem[] }>('/notifications');
  return data.data;
}

export async function markNotificationRead(id: string) {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await api.patch('/notifications/read-all');
}

export async function fetchVersions(circularId: string) {
  const { data } = await api.get(`/babyeyi/${circularId}/versions`);
  return data.data;
}

export async function restoreVersion(circularId: string, versionId: string) {
  const { data } = await api.post(`/babyeyi/${circularId}/versions/${versionId}/restore`);
  return data.data;
}

export async function fetchCollaboration(circularId?: string) {
  const { data } = await api.get('/collaboration', { params: circularId ? { circular_id: circularId } : {} });
  return data.data;
}

export async function fetchSettings() {
  const { data } = await api.get('/settings');
  return data.data;
}

export async function fetchAcademicSettings() {
  const { data } = await api.get<{ data: unknown }>('/academic-settings');
  return data.data;
}

export async function updateAcademicSettings(payload: {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}) {
  const { data } = await api.put('/academic-settings', payload);
  return data.data;
}

export async function updateSettings(payload: Record<string, unknown>) {
  const { data } = await api.put('/settings', payload);
  return data.data;
}

export async function saveDocumentDescriptionTemplate(payload: {
  includeSchoolDescription: boolean;
  descriptionLines: string[];
}) {
  const lines = payload.descriptionLines.map((line) => line.trim()).filter(Boolean);
  return updateSettings({
    settings: {
      documentDescriptionTemplate: {
        includeSchoolDescription: payload.includeSchoolDescription,
        descriptionLines: lines,
      },
    },
  });
}

export async function bulkAction(action: string, ids: string[]) {
  const { data } = await api.post('/babyeyi/bulk', { action, ids });
  return data.data;
}

export async function addComment(circularId: string, content: string) {
  const { data } = await api.post(`/babyeyi/${circularId}/comments`, { content });
  return data.data;
}

export async function recordCircularDownload(id: string) {
  const { data } = await api.get(`/babyeyi/${id}/pdf`);
  return data.data as Circular;
}

/** Authenticated print HTML (Bearer). Opens in a new tab via blob URL. */
export async function openServerPrint(id: string, lang: string, autoprint = true) {
  const { data } = await api.get<string>(`/babyeyi/${id}/print`, {
    params: { lang, autoprint: autoprint ? '1' : '0' },
    responseType: 'text',
    headers: { Accept: 'text/html' },
    transformResponse: [(d) => d],
  });
  const blob = new Blob([data], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error('Popup blocked — allow popups to print');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function verifyCircular(docId: string, hash?: string) {
  // Public endpoint — do not require IAM session (parents scanning QR).
  const { data } = await axios.get(`${PUBLIC_API}/babyeyi/verify/${docId}`, {
    params: hash ? { h: hash } : {},
  });
  return data.data as VerifyPortalResult;
}

export async function reportSuspiciousDocument(
  docId: string,
  payload: { reason?: string; details?: string; reporterEmail?: string }
) {
  const { data } = await axios.post(`${PUBLIC_API}/babyeyi/verify/${docId}/report`, payload);
  return data.data as { ok: boolean; message: string };
}

export interface VerifyPortalResult {
  verified: boolean;
  authenticity: 'authentic' | 'pending' | 'invalid' | 'revoked' | 'hash_mismatch';
  securityStatus: string;
  trustScore: number;
  verifiedAt: string;
  circular: Circular & {
    activities?: Array<{ eventType: string; description: string; createdAt: string }>;
    approvals?: Array<{ stage: string; action: string; actedAt?: string }>;
  };
  school: (SchoolProfile & {
    contact?: { email?: string; phone?: string; website?: string; address?: string } | null;
  }) | null;
  organizationName?: string;
  feeCompliance: {
    totalFee: number;
    nesaLimit: number | null;
    withinLimit: boolean;
    limitPct: number | null;
    exceeded: boolean;
  };
  payments: Array<{ name?: string; amount?: number }>;
  securityChecks: Array<{ key: string; label: string; pass: boolean }>;
  timeline: Array<{
    key: string;
    label: string;
    at: string | null;
    done: boolean;
    current?: boolean;
  }>;
  authenticityDetails: {
    algorithm: string;
    hash: string | null;
    fullHash: string | null;
    generatedAt: string;
    verificationUrl: string;
  };
  verificationMeta: {
    lastVerified: string;
    country: string;
    verificationCount: number;
  };
  documentPreview?: {
    logoUrl: string | null;
    otherLogoUrl?: string | null;
    signatureUrl: string | null;
    stampUrl: string | null;
    qrDataUrl: string | null;
    portalHome: string;
  };
}

function buildFormData(form: WizardFormState, status?: string) {
  const fd = new FormData();
  fd.append('academic_year', form.academicYear);
  fd.append('term', form.term);
  fd.append('education_level', form.educationLevel);
  fd.append('class_name', form.className);
  fd.append('class', form.className);
  fd.append('classes', JSON.stringify(form.classes.length ? form.classes : [form.className]));
  fd.append('school_category', form.schoolCategory);
  fd.append('category', form.schoolCategory);
  fd.append('ownership_type', form.ownershipType);
  fd.append('fee_target_students', form.feeTargetStudents);
  fd.append('province', form.province);
  fd.append('district', form.district);
  fd.append('sector', form.sector);
  fd.append('language', form.language);
  fd.append('parent_message', form.parentMessage);
  fd.append('payments', JSON.stringify(form.payments));
  fd.append('requirements', JSON.stringify(form.requirements));
  fd.append('banks_json', JSON.stringify(form.banks));
  fd.append('classReqs', JSON.stringify(form.classReqs));
  fd.append('other_infos', JSON.stringify(form.otherInfos));
  fd.append('announcements', JSON.stringify(form.announcements));
  fd.append('include_announcements', String(form.includeAnnouncements));
  fd.append('include_school_description', String(form.includeSchoolDescription));
  fd.append('description_lines', JSON.stringify(form.descriptionLines));
  fd.append('leaders', JSON.stringify(form.leaders));
  fd.append('request_increase', String(form.requestIncrease));
  fd.append('increase_reason', form.increaseReason);
  fd.append('increase_desc', form.increaseDesc);
  if (status) fd.append('status', status);
  return fd;
}
