import axios, { type InternalAxiosRequestConfig } from 'axios';
import {
  captureTokenFromUrl,
  clearToken,
  getRefreshToken,
  getToken,
  isTokenExpired,
  notifySessionExpired,
  setToken,
} from '@/shared/auth-token';
import { apiErrorMessage, toast } from '@/lib/toast';
import type { AssessmentComponentCategory, ReportingStage } from '@/types';
import type {
  ReportAnalysisClassComparison,
  ReportAnalysisData,
  ReportAnalysisKind,
  ReportAnalysisSettings,
  ReportAnalysisStatus,
} from '@/types/report-analysis';
import type {
  NurseryClassRow,
  NurseryPerformanceBand,
  NurseryReport,
  NurseryReportKind,
  NurseryReportsResponse,
  NurserySettings,
  NurserySubjectRow,
  NurserySubjectsResponse,
  NurseryTemplateSettings,
} from '@/types/nursery';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3003/api';
const IAM_API_URL = import.meta.env.VITE_IAM_API_URL ?? 'http://localhost:3001/api/v1';

/** Long timeout for bulk import / preview (same pattern as other modules). */
const API_TIMEOUT_MS = 120_000;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

function requestPath(config?: InternalAxiosRequestConfig) {
  const url = `${config?.baseURL ?? ''}${config?.url ?? ''}`;
  return url.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/api/, '') || config?.url || '';
}

function isMutating(config?: InternalAxiosRequestConfig) {
  const method = (config?.method || 'get').toLowerCase();
  return method === 'post' || method === 'put' || method === 'patch' || method === 'delete';
}

function skipApiToast(config?: InternalAxiosRequestConfig) {
  if (!config || config.skipToast) return true;
  const path = requestPath(config);
  return /\/auth\/refresh(?:\?|$)/.test(path)
    || /\/upload\/photo(?:\?|$)/.test(path)
    || /\/import\/preview(?:\?|$)/.test(path);
}

function mutationSuccessMessage(method: string, path: string) {
  const m = method.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/\/exam-sessions\/[^/]+\/generate(?:\?|$)/, 'Examination timetable generated'],
    [/\/exam-sessions\/[^/]+\/seating(?:\?|$)/, 'Seating plan generated'],
    [/\/exam-sessions\/[^/]+\/seats\/move(?:\?|$)/, 'Student moved'],
    [/\/exam-sessions\/[^/]+\/invigilators\/room(?:\?|$)/, 'Room invigilators saved'],
    [/\/exam-sessions\/[^/]+\/invigilators\/override(?:\?|$)/, 'Invigilator updated'],
    [/\/exam-sessions\/[^/]+\/invigilators\/check-in(?:\?|$)/, 'Invigilator checked in'],
    [/\/exam-sessions\/[^/]+\/invigilators\/replace(?:\?|$)/, 'Invigilator replaced'],
    [/\/exam-sessions\/[^/]+\/invigilators(?:\?|$)/, 'Invigilation plan generated'],
    [/\/exam-sessions\/invigilator-staff(?:\?|$)/, 'Invigilator added'],
    [/\/exam-invigilator\/entry(?:\?|$)/, 'Attendance recorded'],
    [/\/exam-invigilator\/exit(?:\?|$)/, 'Exit recorded'],
    [/\/exam-sessions\/[^/]+\/move(?:\?|$)/, 'Exam moved'],
    [/\/exam-sessions\/[^/]+\/reschedule(?:\?|$)/, 'Exam rescheduled'],
    [/\/exam-sessions\/[^/]+\/publish(?:\?|$)/, 'Examination published'],
    [/\/exam-sessions\/[^/]+\/status(?:\?|$)/, 'Status updated'],
    [/\/exam-sessions\/[^/]+\/conflicts\/resolve-all(?:\?|$)/, 'All conflicts resolved'],
    [/\/exam-sessions\/[^/]+\/conflicts\/[^/]+\/resolve(?:\?|$)/, 'Conflict resolved'],
    [/\/exam-sessions\/[^/]+\/setup(?:\?|$)/, 'Examination setup saved'],
    [/\/exam-sessions\/schedules\/[^/]+\/start(?:\?|$)/, 'Attendance started'],
    [/\/exam-sessions\/attendance\/check-in(?:\?|$)/, 'Check-in recorded'],
    [/\/exam-sessions\/attendance\/submit(?:\?|$)/, 'Paper submitted'],
    [/\/exam-sessions\/attendance\/exit(?:\?|$)/, 'Exit recorded'],
    [/\/exam-sessions\/[^/]+(?:\?|$)/, m === 'delete' ? 'Examination deleted' : 'Examination updated'],
    [/\/exam-sessions(?:\?|$)/, m === 'delete' ? 'Examination deleted' : 'Examination created'],
    [/\/students\/import(?:\?|$)/, 'Students imported'],
    [/\/enrollments\/promote(?:\?|$)/, 'Student promoted'],
    [/\/marks\/bulk(?:\?|$)/, 'Marks saved'],
    [/\/assessment-templates\/[^/]+\/components\/sync(?:\?|$)/, 'Template components saved'],
    [/\/assessment-templates\/[^/]+\/assign(?:\?|$)/, 'Template assigned to class'],
    [/\/assignments\/[^/]+\/marks(?:\?|$)/, 'Marks saved'],
    [/\/assignments\/[^/]+\/calculate(?:\?|$)/, 'Results calculated'],
    [/\/assessments\/[^/]+\/marks(?:\?|$)/, 'Marks saved'],
    [/\/assessments\/[^/]+\/status(?:\?|$)/, 'Assessment status updated'],
    [/\/assessments\/[^/]+\/corrections(?:\?|$)/, 'Correction submitted'],
    [/\/grading\/grading-scale(?:\?|$)/, 'Grading scale saved'],
    [/\/grading\/corrections(?:\?|$)/, 'Correction reviewed'],
    [/\/competency\/templates(?:\?|$)/, m === 'delete' ? 'Template deleted' : m === 'post' ? 'Template created' : 'Template updated'],
    [/\/competency\/records(?:\?|$)/, 'Competency recorded'],
    [/\/sm\/students\/[^/]+\/status(?:\?|$)/, 'Student status updated'],
  ];
  for (const [pattern, message] of rules) {
    if (pattern.test(path)) return message;
  }
  const resource =
    /students/.test(path) ? 'Student'
    : /classes/.test(path) ? 'Class'
    : /subjects/.test(path) ? 'Subject'
    : /\/exams(?:\/|$)/.test(path) ? 'Examination'
    : /parents/.test(path) ? 'Parent'
    : /assessment-templates/.test(path) ? 'Template'
    : /assessments/.test(path) ? 'Assessment'
    : /assignments/.test(path) ? 'Assignment'
    : 'Record';
  if (m === 'delete') return `${resource} deleted`;
  if (m === 'post') return `${resource} saved`;
  return `${resource} updated`;
}

function notifyMutationSuccess(config?: InternalAxiosRequestConfig) {
  if (!isMutating(config) || skipApiToast(config)) return;
  toast.success(config?.toastSuccess || mutationSuccessMessage(config?.method || 'post', requestPath(config)));
}

function notifyMutationError(error: { config?: InternalAxiosRequestConfig; response?: { status?: number }; code?: string; message?: string }) {
  if (!isMutating(error.config) || skipApiToast(error.config)) return;
  if (error.response?.status === 401 || error.code === 'ERR_CANCELED') return;
  toast.error(error.config?.toastError || apiErrorMessage(error));
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post<{ data: { accessToken: string } }>(
      `${IAM_API_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 30_000 }
    );
    const accessToken = data.data.accessToken;
    setToken(accessToken);
    return accessToken;
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      clearToken();
      notifySessionExpired();
    }
    return null;
  }
}

async function ensureFreshToken(): Promise<string | null> {
  const token = getToken();
  if (token && !isTokenExpired()) return token;
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  const refreshed = await refreshPromise;
  return refreshed ?? token ?? null;
}

api.interceptors.request.use(async (config) => {
  captureTokenFromUrl();
  const token = await ensureFreshToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    notifyMutationSuccess(response.config);
    return response;
  },
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      notifySessionExpired();
      return Promise.reject(error);
    }
    notifyMutationError(error);
    return Promise.reject(error);
  }
);

export async function searchParents(q: string) {
  const res = await api.get('/parents/search', { params: { q } });
  return res.data.data;
}

export async function fetchNextStudentCode(academicYear?: string) {
  const res = await api.get('/students/next-code', {
    params: academicYear ? { academicYear } : undefined,
  });
  return res.data.data as {
    districtCode: string;
    orgCode: string;
    seq: string;
    year: string;
    code: string;
  };
}

export type ImportRowPayload = {
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  age?: string | number;
  sdmCode?: string;
  className?: string;
  fatherName?: string;
  motherName?: string;
  fatherPhone?: string;
  motherPhone?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  nationality?: string;
};

export type ImportPreviewRow = {
  row: number;
  status: 'ready' | 'duplicate' | 'invalid' | 'review';
  reason: string;
  matchStudentId?: string;
  willGenerateSdm?: boolean;
  willGenerateShuleCode?: boolean;
  firstName: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  age?: number;
  sdmCode?: string;
  className?: string;
  classId?: string;
  fatherName?: string;
  motherName?: string;
  fatherPhone?: string;
  motherPhone?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
};

export type ImportResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  generatedSdms: number;
  durationMs: number;
  errors: Array<{ row: number; message: string }>;
  students: Array<{ studentUid: string; name: string; sdmCode?: string }>;
};

export async function previewStudentImport(body: {
  academicYear: string;
  term?: string;
  rows: ImportRowPayload[];
}) {
  const res = await api.post('/students/import/preview', body, { timeout: API_TIMEOUT_MS });
  return res.data.data as {
    summary: {
      total: number;
      ready: number;
      duplicates: number;
      invalid: number;
      autoGenerateSdms: number;
      academicYear: string;
      term: string | null;
    };
    rows: ImportPreviewRow[];
  };
}

export async function importStudentsRows(body: {
  academicYear: string;
  term?: string;
  duplicateMode?: 'skip' | 'update';
  importValidOnly?: boolean;
  generateMissingSdms?: boolean;
  rows: ImportRowPayload[];
}) {
  const res = await api.post('/students/import', body, { timeout: API_TIMEOUT_MS });
  return res.data.data as ImportResult;
}

/** @deprecated Prefer importStudentsRows via the import wizard */
export async function importStudentsExcel(file: File, meta?: { academicYear: string; term?: string }) {
  const fd = new FormData();
  fd.append('file', file);
  if (meta?.academicYear) fd.append('academicYear', meta.academicYear);
  if (meta?.term) fd.append('term', meta.term);
  const res = await api.post('/students/import', fd, { timeout: API_TIMEOUT_MS });
  return res.data.data as ImportResult;
}

export async function createParent(data: {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  nationalId?: string;
  occupation?: string;
  address?: string;
}) {
  const res = await api.post('/parents', data);
  return res.data.data;
}

export async function listCombinations() {
  const res = await api.get('/combinations');
  return res.data.data;
}

export async function listClasses() {
  const res = await api.get('/classes');
  return res.data.data;
}

export async function listStudents() {
  const res = await api.get('/students');
  return res.data.data;
}

export async function getClassById(id: string) {
  const res = await api.get(`/classes/${id}`);
  return res.data.data;
}

export async function createClass(data: { name: string; stream?: string; category?: string; combinationId?: string }) {
  const res = await api.post('/classes', data);
  return res.data.data;
}

export async function updateClass(id: string, data: { name?: string; stream?: string; category?: string; combinationId?: string }) {
  const res = await api.put(`/classes/${id}`, data);
  return res.data.data;
}

export async function deleteClass(id: string) {
  const res = await api.delete(`/classes/${id}`);
  return res.data.data;
}

export async function listGrades() {
  const res = await api.get('/grades');
  return res.data.data;
}

export async function getGradeById(id: string) {
  const res = await api.get(`/grades/${id}`);
  return res.data.data;
}

export async function listSubjects(category?: string) {
  const params = category ? { category } : {};
  const res = await api.get('/subjects', { params });
  return res.data.data;
}

export async function getSubjectById(id: string) {
  const res = await api.get(`/subjects/${id}`);
  return res.data.data;
}

export async function createSubject(data: { name: string; code?: string; category?: string }) {
  const res = await api.post('/subjects', data);
  return res.data.data;
}

export async function updateSubject(id: string, data: { name?: string; code?: string; category?: string }) {
  const res = await api.put(`/subjects/${id}`, data);
  return res.data.data;
}

export async function deleteSubject(id: string) {
  const res = await api.delete(`/subjects/${id}`);
  return res.data.data;
}

export async function listSubjectCategories() {
  const res = await api.get('/subjects/categories');
  return res.data.data;
}

export async function listExams(filters?: { status?: string; academicYear?: string; type?: string }) {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.academicYear) params.academicYear = filters.academicYear;
  if (filters?.type) params.type = filters.type;
  const res = await api.get('/exams', { params });
  return res.data.data;
}

export async function getExamById(id: string) {
  const res = await api.get(`/exams/${id}`);
  return res.data.data;
}

export async function createExam(data: { name: string; type: string; academicYear: string; term?: string; startDate?: string; endDate?: string; status?: string; description?: string; totalMarks?: number; passingMarks?: number }) {
  const res = await api.post('/exams', data);
  return res.data.data;
}

export async function updateExam(id: string, data: { name?: string; type?: string; academicYear?: string; term?: string; startDate?: string; endDate?: string; status?: string; description?: string; totalMarks?: number; passingMarks?: number }) {
  const res = await api.put(`/exams/${id}`, data);
  return res.data.data;
}

export async function deleteExam(id: string, opts?: { skipToast?: boolean }) {
  const res = await api.delete(`/exams/${id}`, { skipToast: opts?.skipToast });
  return res.data.data;
}

export async function listExamAcademicYears() {
  const res = await api.get('/exams/academic-years');
  return res.data.data;
}

export async function getMarkStudents(classId: string, academicYear: string) {
  const res = await api.get('/marks/students', { params: { classId, academicYear } });
  return res.data.data;
}

export async function getMarksForEntry(examId: string, classId: string, subjectId: string) {
  const res = await api.get('/marks/entry', { params: { examId, classId, subjectId } });
  return res.data.data;
}

export async function bulkSaveMarks(data: { examId: string; classId: string; subjectId: string; marks: { studentId: string; score: number; remarks?: string }[] }) {
  const res = await api.post('/marks/bulk', data);
  return res.data.data;
}

export async function listMarksByExamAndClass(examId: string, classId: string) {
  const res = await api.get('/marks/by-exam-class', { params: { examId, classId } });
  return res.data.data;
}

export async function deleteMarkEntry(id: string) {
  const res = await api.delete(`/marks/${id}`);
  return res.data.data;
}

// ─── Assessment Templates ───────────────────────────────
export async function listAssessmentTemplates(filters?: { status?: string; academicYear?: string; term?: string; academicLevel?: string }) {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.academicYear) params.academicYear = filters.academicYear;
  if (filters?.term) params.term = filters.term;
  if (filters?.academicLevel) params.academicLevel = filters.academicLevel;
  const res = await api.get('/assessment-templates', { params });
  return res.data.data;
}

export async function getAssessmentTemplate(id: string) {
  const res = await api.get(`/assessment-templates/${id}`);
  return res.data.data;
}

export async function createAssessmentTemplate(data: {
  name: string;
  description?: string;
  academicLevel: string;
  academicYear: string;
  term: string;
  components: Array<{ name: string; code: string; description?: string; maxMark?: number; weightPercentage?: number; sortOrder?: number; required?: boolean; isActive?: boolean }>;
  defaultCourseMarks?: number;
}) {
  const res = await api.post('/assessment-templates', data);
  return res.data.data;
}

export async function updateAssessmentTemplate(
  id: string,
  data: {
    name?: string;
    description?: string;
    academicLevel?: string;
    academicYear?: string;
    term?: string;
    status?: string;
    defaultCourseMarks?: number;
  },
  opts?: { skipToast?: boolean }
) {
  const res = await api.put(`/assessment-templates/${id}`, data, { skipToast: opts?.skipToast });
  return res.data.data;
}

export async function syncAssessmentTemplateComponents(
  templateId: string,
  components: Array<{
    id?: string;
    name: string;
    code: string;
    weightPercentage: number;
    sortOrder: number;
    required?: boolean;
    isActive?: boolean;
    maxMark?: number;
    assessmentCategory?: AssessmentComponentCategory | null;
    reportingStage?: ReportingStage;
  }>,
  opts?: { skipToast?: boolean }
) {
  const res = await api.put(
    `/assessment-templates/${templateId}/components/sync`,
    { components },
    { skipToast: opts?.skipToast }
  );
  return res.data.data;
}

export async function approveAssessmentTemplate(id: string) {
  const res = await api.post(`/assessment-templates/${id}/approve`);
  return res.data.data;
}

export async function rejectAssessmentTemplate(id: string, reason?: string) {
  const res = await api.post(`/assessment-templates/${id}/reject`, reason ? { reason } : {});
  return res.data.data;
}

export async function deleteAssessmentTemplate(id: string, opts?: { skipToast?: boolean }) {
  const res = await api.delete(`/assessment-templates/${id}`, { skipToast: opts?.skipToast });
  return res.data.data;
}

export async function archiveAssessmentTemplate(id: string) {
  const res = await api.put(`/assessment-templates/${id}`, { status: 'ARCHIVED' });
  return res.data.data;
}

export async function addAssessmentTemplateComponent(
  templateId: string,
  data: {
    name: string;
    code: string;
    description?: string;
    weightPercentage?: number;
    maxMark?: number;
    sortOrder?: number;
    required?: boolean;
    isActive?: boolean;
    assessmentCategory?: AssessmentComponentCategory | null;
    reportingStage?: ReportingStage;
  }
) {
  const res = await api.post(`/assessment-templates/${templateId}/components`, data);
  return res.data.data;
}

export async function updateAssessmentTemplateComponent(
  componentId: string,
  data: {
    name?: string;
    code?: string;
    description?: string;
    weightPercentage?: number;
    maxMark?: number;
    sortOrder?: number;
    isActive?: boolean;
    required?: boolean;
    assessmentCategory?: AssessmentComponentCategory | null;
    reportingStage?: ReportingStage;
  }
) {
  const res = await api.put(`/assessment-templates/components/${componentId}`, data);
  return res.data.data;
}

export async function deleteAssessmentTemplateComponent(componentId: string) {
  const res = await api.delete(`/assessment-templates/components/${componentId}`);
  return res.data.data;
}

// ─── Template Assignments ───────────────────────────────
export async function listAssignments(filters?: { templateId?: string; classId?: string; academicYear?: string; term?: string }) {
  const params: Record<string, string> = {};
  if (filters?.templateId) params.templateId = filters.templateId;
  if (filters?.classId) params.classId = filters.classId;
  if (filters?.academicYear) params.academicYear = filters.academicYear;
  if (filters?.term) params.term = filters.term;
  const res = await api.get('/assignments', { params });
  return res.data.data;
}

export async function assignTemplateToClass(templateId: string, classId: string) {
  const res = await api.post(`/assessment-templates/${templateId}/assign`, { classId });
  return res.data.data;
}

export async function removeAssignment(assignmentId: string) {
  const res = await api.delete(`/assignments/${assignmentId}`);
  return res.data.data;
}

// ─── Marks Entry ────────────────────────────────────────
export async function enterComponentMarks(assignmentId: string, data: {
  subjectId: string;
  marks: Array<{ studentId: string; componentId: string; score: number; remarks?: string }>;
}) {
  const res = await api.post(`/assignments/${assignmentId}/marks`, data);
  return res.data.data;
}

export async function calculateResults(assignmentId: string) {
  const res = await api.post(`/assignments/${assignmentId}/calculate`);
  return res.data.data;
}

export async function getClassResults(assignmentId: string) {
  const res = await api.get(`/assignments/${assignmentId}/results`);
  return res.data.data;
}

// ─── Results & Report Cards ─────────────────────────────
export async function getStudentResults(params: { studentId: string; academicYear: string; term?: string }) {
  const res = await api.get('/results/student', { params });
  return res.data.data;
}

export async function getReportCard(params: { studentId: string; classId: string; academicYear: string; term?: string }) {
  const res = await api.get('/results/report-card', { params });
  return res.data.data;
}

export async function getGrowthData(params: { studentId: string; classId: string }) {
  const res = await api.get('/results/growth', { params });
  return res.data.data;
}

// ─── Grading Scales ─────────────────────────────────────
export async function listGradingScales(academicLevel?: string) {
  const params = academicLevel ? { academicLevel } : {};
  const res = await api.get('/results/grading-scales', { params });
  return res.data.data;
}

export async function createGradingScale(data: {
  name: string;
  academicLevel: string;
  grades: Array<{ minPercentage: number; maxPercentage: number; grade: string; description?: string; remarks?: string; sortOrder?: number }>;
}) {
  const res = await api.post('/results/grading-scales', data);
  return res.data.data;
}

// ─── Academic Settings ──────────────────────────────────
export interface AcademicReportFooterSettings {
  mode: 'head_teacher' | 'custom';
  roleLabel: string;
  selectedUserId?: string | null;
  selectedUserName?: string | null;
  selectedUserEmail?: string | null;
}

export interface AcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
  reportFooter?: AcademicReportFooterSettings | null;
}

const REPORT_FOOTER_STORAGE_KEY = 'academic-report-footer-settings';

export function getStoredReportFooterSettings(): AcademicReportFooterSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(REPORT_FOOTER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AcademicReportFooterSettings;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistReportFooterSettings(value: AcademicReportFooterSettings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(REPORT_FOOTER_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures silently.
  }
}

export async function getAcademicSettings() {
  const res = await api.get('/academic-settings');
  const data = (res.data.data ?? {}) as AcademicSettings;
  const stored = getStoredReportFooterSettings();
  if (stored) {
    data.reportFooter = { ...stored, ...(data.reportFooter ?? {}) };
  }
  return data;
}

export async function saveAcademicReportFooterSettings(data: AcademicReportFooterSettings) {
  const payload = {
    mode: data.mode,
    roleLabel: data.roleLabel?.trim() || 'Head Teacher',
    selectedUserId: data.selectedUserId ?? null,
    selectedUserName: data.selectedUserName ?? null,
    selectedUserEmail: data.selectedUserEmail ?? null,
  };

  persistReportFooterSettings(payload);

  const res = await api.put('/academic-settings/report-footer', payload);
  const saved = (res.data.data ?? payload) as AcademicReportFooterSettings;
  persistReportFooterSettings(saved);
  return saved;
}

export async function listAcademicStaffForReportFooter() {
  const res = await api.get('/academic-settings/report-footer/staff');
  return (res.data.data ?? []) as Array<{ id: string; name: string; email?: string; role?: string }>;
}

// ─── Actual Assessments ────────────────────────────────
export async function createAssessment(data: {
  templateId?: string;
  componentId?: string;
  subjectId: string;
  classId: string;
  title: string;
  description?: string;
  academicYear: string;
  term: string;
  assessmentDate?: string;
  maxMark: number;
  duration?: string;
}) {
  const res = await api.post('/assessments', data);
  return res.data.data;
}

export async function listAssessments(filters?: {
  status?: string;
  academicYear?: string;
  term?: string;
  subjectId?: string;
  classId?: string;
  componentId?: string;
  templateId?: string;
}) {
  const params: Record<string, string> = {};
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
  }
  const res = await api.get('/assessments', { params });
  return res.data.data;
}

export async function getAssessment(id: string) {
  const res = await api.get(`/assessments/${id}`);
  return res.data.data;
}

export async function updateAssessmentStatus(id: string, status: string) {
  const res = await api.put(`/assessments/${id}/status`, { status });
  return res.data.data;
}

export async function approveAssessment(id: string) {
  const res = await api.post(`/assessments/${id}/approve`);
  return res.data.data;
}

export async function rejectAssessment(id: string, reason?: string) {
  const res = await api.post(`/assessments/${id}/reject`, reason ? { reason } : {});
  return res.data.data;
}

export async function previewAssessmentCode(params: {
  subjectId?: string;
  subjectName?: string;
  classId?: string;
  className?: string;
  academicYear: string;
  term: string;
}) {
  const res = await api.get('/assessments/preview-code', { params });
  return res.data.data as { assessmentCode: string; title: string; sequence: number };
}

export async function getAssessmentStatistics(id: string) {
  const res = await api.get(`/assessments/${id}/statistics`);
  return res.data.data;
}

export async function deleteAssessment(id: string) {
  const res = await api.delete(`/assessments/${id}`);
  return res.data.data;
}

/** Admin: delete an assessment course together with all marks entered for it. */
export async function deleteAssessmentCourse(id: string) {
  const res = await api.delete(`/assessments/${id}/course`);
  return res.data.data;
}

/** Admin: remove all marks entered for an assessment; the course remains and reports recompute. */
export async function deleteAssessmentMarks(assessmentId: string) {
  const res = await api.delete(`/assessments/${assessmentId}/marks`);
  return res.data.data;
}

export async function getTeacherDashboard() {
  const res = await api.get('/assessments/teacher-dashboard');
  return res.data.data;
}

// ─── Assessment Marks ──────────────────────────────────
export async function getAssessmentMarks(assessmentId: string) {
  const res = await api.get(`/assessments/${assessmentId}/marks`);
  return res.data.data;
}

export async function enterAssessmentMarks(assessmentId: string, data: {
  marks: Array<{
    studentId: string;
    score?: number;
    markStatus?: string;
    remarks?: string;
    competencies?: any;
  }>;
}, opts?: { skipToast?: boolean }) {
  const res = await api.post(`/assessments/${assessmentId}/marks`, data, { skipToast: opts?.skipToast });
  return res.data.data;
}

export async function requestMarkCorrection(assessmentId: string, data: {
  studentId: string;
  currentScore: number;
  requestedScore: number;
  reason: string;
}) {
  const res = await api.post(`/assessments/${assessmentId}/corrections`, data);
  return res.data.data;
}

// ─── Grading Engine ────────────────────────────────────
export async function calculateCategoryResults(templateId: string, classId: string, subjectId: string) {
  const res = await api.get(`/grading/categories/${templateId}/${classId}/${subjectId}`);
  return res.data.data;
}

export async function calculateFinalResults(templateId: string, classId: string, subjectId: string) {
  const res = await api.post(`/grading/calculate-final/${templateId}/${classId}/${subjectId}`);
  return res.data.data;
}

export async function getClassReportSummaries(
  classId: string,
  academicYear: string,
  term?: string,
  reportKind?: 'standard' | 'midterm' | 'beginning'
) {
  const params: Record<string, string> = {};
  if (term) params.term = term;
  if (reportKind && reportKind !== 'standard') params.reportKind = reportKind;
  const res = await api.get(`/grading/report-card/class-summaries/${classId}/${academicYear}`, {
    params,
  });
  return res.data.data as {
    generatedAt: string;
    summaries: Array<{
      studentId: string;
      average: number;
      position: number;
      classSize: number;
      overallGrade: string | null;
      result: 'PASS' | 'FAIL' | '—';
      hasMarks: boolean;
      generatedAt: string;
    }>;
  };
}

export async function getReportCardV2(
  studentId: string,
  classId: string,
  academicYear: string,
  term?: string,
  includeTerms?: string[],
  reportKind?: 'standard' | 'midterm' | 'beginning'
) {
  const params: Record<string, string> = {};
  if (term) params.term = term;
  if (includeTerms?.length) params.includeTerms = includeTerms.join(',');
  if (reportKind && reportKind !== 'standard') params.reportKind = reportKind;
  const res = await api.get(`/grading/report-card/${studentId}/${classId}/${academicYear}`, { params });
  return res.data.data;
}

export async function publishReportCard(body: {
  studentId: string;
  classId: string;
  academicYear: string;
  term: string;
  reportKind?: 'standard' | 'midterm' | 'beginning';
  accessPolicy?: 'PAID_ONLY' | 'ALL_PARENTS';
}) {
  const res = await api.post('/grading/report-card/publish', body);
  return res.data.data;
}

export async function publishReportCardsForClass(body: {
  classId: string;
  academicYear: string;
  term: string;
  reportKind?: 'standard' | 'midterm' | 'beginning';
  accessPolicy?: 'PAID_ONLY' | 'ALL_PARENTS';
  studentIds?: string[];
  /** When provided, all class students are published: selected receive marks (ALL_PARENTS + notify), others published as Pay-to-view (PAID_ONLY). */
  selectedStudentIds?: string[];
  notifyInApp?: boolean;
  notifyPush?: boolean;
  includeReportLink?: boolean;
}) {
  const res = await api.post('/grading/report-card/publish-class', body);
  return res.data.data as {
    published: number;
    skipped: number;
    total: number;
    granted?: number;
    payToView?: number;
    errors: string[];
    accessPolicy?: string;
    batchId?: string;
  };
}

export async function listReportCardPublications(params: {
  academicYear?: string;
  term?: string;
  classId?: string;
  search?: string;
}) {
  const res = await api.get('/grading/report-card/publications', { params });
  return res.data.data;
}


export async function listAssessmentReportingStageRecords(params: {
  academicYear?: string;
  term?: string;
  classId?: string;
  stream?: string;
  subjectId?: string;
  componentId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  reportingStage?: string;
}) {
  const res = await api.get('/assessments/reporting-stage/records', { params });
  return res.data.data;
}

export async function bulkUpdateAssessmentReportingStage(body: {
  assessmentIds?: string[];
  markIds?: string[];
  reportingStage: 'BEGINNING_TERM' | 'MID_TERM' | 'TERM_FINAL' | 'UNASSIGNED';
  filters?: { academicYear?: string; term?: string; classId?: string };
}) {
  const res = await api.post('/assessments/reporting-stage/bulk-update', body);
  return res.data.data;
}

export async function getReportCardComments(params: {
  studentId: string;
  classId: string;
  academicYear: string;
  term?: string;
}) {
  const res = await api.get('/grading/report-card/comments', { params });
  return res.data.data;
}

export async function saveReportCardComments(body: {
  studentId: string;
  classId: string;
  academicYear: string;
  term?: string;
  classTeacherComment?: string | null;
  headTeacherComment?: string | null;
  role?: 'class' | 'head' | 'both';
}) {
  const res = await api.put('/grading/report-card/comments', body);
  return res.data.data;
}

export async function getReportCardSettings() {
  const res = await api.get('/grading/report-card/settings');
  return res.data.data;
}

export async function getReportAnalysis(params: {
  classId: string;
  academicYear: string;
  term?: string;
  reportKind: ReportAnalysisKind;
  status: ReportAnalysisStatus;
}): Promise<ReportAnalysisData> {
  const res = await api.get('/grading/report-analysis', { params });
  return res.data.data;
}

export async function getReportAnalysisComparison(params: {
  classIds: string[];
  academicYear: string;
  term?: string;
  reportKind: ReportAnalysisKind;
  status: ReportAnalysisStatus;
}): Promise<ReportAnalysisClassComparison> {
  const res = await api.get('/grading/report-analysis/comparison', {
    params: { ...params, classIds: params.classIds.join(',') },
  });
  return res.data.data;
}

export async function getReportAnalysisSettings(): Promise<ReportAnalysisSettings> {
  const res = await api.get('/academic-settings/report-analysis');
  return res.data.data;
}

export async function saveReportAnalysisSettings(body: ReportAnalysisSettings): Promise<ReportAnalysisSettings> {
  const res = await api.put('/academic-settings/report-analysis', body);
  return res.data.data;
}

export async function getTermlyGrowth(studentId: string, classId: string) {
  const res = await api.get(`/grading/growth/${studentId}/${classId}`);
  return res.data.data;
}

export async function getGradingScale(academicLevel: string) {
  const res = await api.get('/grading/grading-scale', { params: { academicLevel } });
  return res.data.data;
}

export async function listCourseDefaultMarks(params: {
  academicYear: string;
  term: string;
  classId?: string;
}) {
  const res = await api.get('/grading/course-default-marks', { params });
  return res.data.data ?? [];
}

export async function upsertCourseDefaultMarks(data: {
  classId?: string;
  subjectId?: string;
  className: string;
  subjectName: string;
  academicYear: string;
  term: string;
  defaultCourseMarks: number;
}) {
  const res = await api.put('/grading/course-default-marks', data);
  return res.data.data;
}

export type TimetableCourseCatalogRow = {
  id: string;
  subjectName: string;
  courseCode: string | null;
  isCore: boolean;
  periodsPerWeek: number;
  priority: number;
  color: string | null;
  requiresLab: boolean;
  prefersDoublePeriod: boolean;
};

export async function listTimetableCourseCatalog() {
  const res = await api.get('/timetable/course-config');
  return (res.data.data ?? []) as TimetableCourseCatalogRow[];
}

export async function upsertCourseDefaultMarksBySubject(data: {
  subjectName: string;
  academicYear: string;
  term: string;
  defaultCourseMarks: number;
}) {
  const res = await api.put('/grading/course-default-marks/by-subject', data);
  return res.data.data as {
    subjectName: string;
    defaultCourseMarks: number;
    classesMatched: number;
    classesUpdated: number;
    failures: string[];
  };
}

export async function upsertGradingScale(data: {
  name: string;
  academicLevel: string;
  grades: Array<{
    minPercentage: number;
    maxPercentage: number;
    grade: string;
    description?: string;
    remarks?: string;
  }>;
}) {
  const res = await api.post('/grading/grading-scale', data);
  return res.data.data;
}

export async function getAcademicDashboard(academicYear: string, term?: string) {
  const params: Record<string, string> = { academicYear };
  if (term) params.term = term;
  const res = await api.get('/grading/dashboard', { params });
  return res.data.data;
}

export async function getPendingCorrections(status = 'all') {
  const res = await api.get('/grading/corrections', { params: { status } });
  return res.data.data;
}

export async function reviewCorrection(requestId: string, data: { approved: boolean; reviewNotes?: string }) {
  const res = await api.put(`/grading/corrections/${requestId}`, data);
  return res.data.data;
}

export interface TeacherPermissionRow {
  id: string;
  teacher_name?: string;
  permission_type?: string;
  permission_type_other?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
  emergency_phone?: string;
  status?: string;
  created_at?: string;
  reviewed_at?: string | null;
  review_notes?: string | null;
}

export interface TeacherPermissionListResult {
  items: TeacherPermissionRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listTeacherPermissions(params?: {
  page?: number;
  limit?: number;
  status?: string;
  permission_type?: string;
  q?: string;
  date_from?: string;
  date_to?: string;
}) {
  const res = await api.get('/teacher-permissions', { params });
  return res.data.data as TeacherPermissionListResult;
}

export async function approveTeacherPermission(id: string, reviewNotes?: string) {
  const res = await api.post(`/teacher-permissions/${id}/approve`, { reviewNotes });
  return res.data.data;
}

export async function rejectTeacherPermission(id: string, reviewNotes?: string) {
  const res = await api.post(`/teacher-permissions/${id}/reject`, { reviewNotes });
  return res.data.data;
}

export interface RoundRollCallSummary {
  id: string;
  roll_label?: string;
  date?: string;
  class_name?: string;
  teacher_name?: string;
  present?: number;
  absent?: number;
  excused?: number;
  total?: number;
}

export interface RoundRollCallListResult {
  items: RoundRollCallSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RoundRollCallRosterRow {
  id: string;
  name?: string;
  adm?: string;
  status?: string;
  remarks?: string;
}

export interface RoundRollCallSessionDetail extends RoundRollCallSummary {
  roster?: RoundRollCallRosterRow[];
  stats?: { total: number; present: number; absent: number; excused: number };
}

export interface RoundRollCallAnalytics {
  totals: { sessions: number; present: number; absent: number; excused: number };
  byClass: Array<{
    class_name: string;
    present: number;
    absent: number;
    excused: number;
    rolls: number;
    learners: number;
  }>;
  byDay: Array<{ date: string; present: number; absent: number; excused: number; rolls: number }>;
}

export async function listRoundRollCalls(params?: {
  page?: number;
  limit?: number;
  class_name?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  academic_year?: string;
  q?: string;
}) {
  const res = await api.get('/round-roll-call', { params });
  return res.data.data as RoundRollCallListResult;
}

export async function getRoundRollCallSession(sessionId: string) {
  const res = await api.get(`/round-roll-call/sessions/${sessionId}`);
  return res.data.data as RoundRollCallSessionDetail;
}

export async function getRoundRollCallAnalytics(params?: {
  class_name?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  academic_year?: string;
}) {
  const res = await api.get('/round-roll-call/analytics', { params });
  return res.data.data as RoundRollCallAnalytics;
}

// ─── Competency-Based Assessment ─────────────────────────
export async function listCompetencyTemplates() {
  const res = await api.get('/competency/templates');
  return res.data.data;
}

export async function getCompetencyTemplate(id: string) {
  const res = await api.get(`/competency/templates/${id}`);
  return res.data.data;
}

export async function createCompetencyTemplate(data: { name: string; academicLevel: string; competencies: any; description?: string }) {
  const res = await api.post('/competency/templates', data);
  return res.data.data;
}

export async function updateCompetencyTemplate(id: string, data: { name?: string; academicLevel?: string; competencies?: any; description?: string }) {
  const res = await api.put(`/competency/templates/${id}`, data);
  return res.data.data;
}

export async function deleteCompetencyTemplate(id: string) {
  const res = await api.delete(`/competency/templates/${id}`);
  return res.data.data;
}

export async function recordStudentCompetency(data: {
  templateId: string;
  assessmentId?: string;
  studentId: string;
  subjectId?: string;
  competencies: any;
  academicYear: string;
  term: string;
  recordedBy?: string;
}) {
  const res = await api.post('/competency/records', data);
  return res.data.data;
}

export async function getStudentCompetencies(studentId: string, academicYear?: string, term?: string) {
  const params: Record<string, string> = {};
  if (academicYear) params.academicYear = academicYear;
  if (term) params.term = term;
  const res = await api.get(`/competency/records/student/${studentId}`, { params });
  return res.data.data;
}

export async function getClassCompetencies(templateId: string, academicYear: string, term: string) {
  const res = await api.get('/competency/records/class', { params: { templateId, academicYear, term } });
  return res.data.data;
}

// ─── StudentManagement Proxy ──────────────────────────────
export async function smListClasses() {
  const res = await api.get('/sm/classes');
  return res.data.data;
}

export async function smListStudents(params?: { classId?: string; className?: string; academicYear?: string; status?: string; search?: string }) {
  const res = await api.get('/sm/students', { params });
  return res.data.data;
}

export async function smListSubjects() {
  const res = await api.get('/sm/subjects');
  return res.data.data;
}

export type TimetableClassCourse = {
  id: string;
  subjectName: string;
  courseCode: string;
  periodsPerWeek: number;
  defaultCourseMarks?: number | null;
  teacherName: string;
  room: string | null;
  isCore?: boolean;
};

export type TimetableClassCatalog = {
  className: string;
  classId: string | null;
  level: string;
  stream: string | null;
  section: string | null;
  studentCount: number;
  courseCount: number;
  teacherCount: number;
  totalPeriods: number;
  readinessPercent: number;
  status: 'ready' | 'incomplete' | 'missing';
  courses: TimetableClassCourse[];
};

export async function listTimetableClassConfig(params?: { term?: string; academicYear?: string }) {
  const res = await api.get('/timetable/class-config', { params });
  return (res.data.data ?? []) as TimetableClassCatalog[];
}

export async function smGetStudentProfile(studentCode: string) {
  const res = await api.get('/sm/student-profile', { params: { studentCode } });
  return res.data.data;
}

export async function smUpdateStudentStatus(studentId: string, status: string, opts?: { skipToast?: boolean }) {
  const res = await api.patch(`/sm/students/${studentId}/status`, { status }, { skipToast: opts?.skipToast });
  return res.data.data;
}

export type MarksDemoPhase = 'quiz' | 'exam' | 'all';

export async function marksDemoStatus(classId?: string) {
  const res = await api.get('/dev/marks-demo/status', { params: classId ? { classId } : undefined, skipToast: true });
  return res.data.data as {
    enabled: boolean;
    assessmentCount: number;
    markRows: number;
    assessments: Array<{ id: string; title: string; term: string; academicYear: string }>;
  };
}

export async function marksDemoApply(body: {
  classId?: string;
  className?: string;
  academicYear: string;
  term: string;
  phase?: MarksDemoPhase;
}) {
  const res = await api.post('/dev/marks-demo/apply', body);
  return res.data.data as {
    className: string;
    subjects: string[];
    students: number;
    phase: MarksDemoPhase;
    assessmentsCreated: number;
    assessmentsUpdated: number;
  };
}

export async function marksDemoRemove(classId?: string) {
  const res = await api.delete('/dev/marks-demo', { params: classId ? { classId } : undefined });
  return res.data.data as { deletedAssessments: number };
}
// ─── Examination Timetable (class exam schedule) ────────────────────────
export type ExaminationSessionPeriod = 'MORNING' | 'AFTERNOON';

export type ClassExaminationSlotCourse = { id: string; slotId: string; courseName: string; subjectId?: string | null; courseCode?: string | null; teacherName?: string | null; };

export type ClassExaminationSlot = {
  id: string;
  timetableId: string;
  examDate: string;
  session: ExaminationSessionPeriod;
  sessionCode?: string;
  sessionName?: string;
  courseName: string;
  startTime: string;
  endTime: string;
  courses?: ClassExaminationSlotCourse[];
};

export type ExaminationSessionDefinition = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

export type ExaminationType = { id: string; organizationId: string; name: string; code?: string | null; status?: string; academicYear: string; term: string; description?: string | null; createdBy?: string | null; createdAt?: string; updatedAt?: string; };

export type ClassExaminationTimetable = {
  id: string;
  organizationId: string;
  examinationCode?: string | null;
  name?: string | null;
  examinationTypeId?: string | null;
  examinationType?: ExaminationType | null;
  classId: string;
  className: string;
  academicYear: string;
  term: string;
  startDate: string;
  endDate: string;
  excludeWeekends: boolean;
  sessions?: ExaminationSessionDefinition[];
  createdAt?: string;
  updatedAt?: string;
  slots: ClassExaminationSlot[];
};

export type ExaminationTimetableContext = {
  classId: string;
  className: string;
  academicYear: string;
  term: string;
  courses: Array<{ subjectName: string; courseCode?: string | null; teacherName?: string | null }>;
  examinationTypes?: ExaminationType[];
  timetable: ClassExaminationTimetable | null;
};

export async function getExaminationTimetableContext(params: { classId: string; academicYear: string; term: string; examinationTypeId?: string }) {
  const res = await api.get('/examination-timetables/context', { params });
  return res.data.data as ExaminationTimetableContext;
}

export async function listExaminationTypes(params?: { academicYear?: string; term?: string; name?: string; status?: string }) {
  const res = await api.get('/examination-timetables/types', { params });
  return (res.data.data ?? []) as ExaminationType[];
}

export async function createExaminationType(data: { name: string; code?: string; academicYear: string; term: string; description?: string; status?: string }) {
  const res = await api.post('/examination-timetables/types', data);
  return res.data.data as ExaminationType;
}

export async function updateExaminationType(id: string, data: { name?: string; code?: string | null; description?: string | null; academicYear?: string; term?: string; status?: string }) {
  const res = await api.put('/examination-timetables/types/' + id, data);
  return res.data.data as ExaminationType;
}

export async function deleteExaminationType(id: string) {
  const res = await api.delete('/examination-timetables/types/' + id);
  return res.data.data as { deleted: boolean; id: string };
}

export async function getExaminationType(id: string) {
  const res = await api.get('/examination-timetables/types/' + id);
  return res.data.data as ExaminationType & { counts?: { timetables: number; sessions: number; examinationLists: number } };
}

export type ExaminationTypeStats = { totalExaminationTypes: number; activeExaminationTypes: number; totalExaminationTimetables: number; totalExaminationSessions: number; totalExaminationLists: number; academicYearsCovered: number; };

export async function getExaminationTypeStats(params?: { academicYear?: string; term?: string; name?: string }) {
  const res = await api.get('/examination-timetables/types/stats', { params });
  return res.data.data as ExaminationTypeStats;
}

export type ExaminationTypeRow = { id: string; name: string; code: string | null; description: string | null; academicYear: string; term: string; status: string; createdBy: string | null; createdAt: string; numberOfTimetables: number; numberOfExaminationSessions: number; numberOfExaminationLists: number; };

export async function listExaminationTypeRows(params?: { academicYear?: string; term?: string; name?: string }) {
  const res = await api.get('/examination-timetables/types/rows', { params });
  return (res.data.data ?? []) as ExaminationTypeRow[];
}

export async function copyExaminationTimetable(id: string, data: { classId: string; className?: string; name?: string; academicYear?: string; term?: string; startDate?: string; endDate?: string; examinationTypeId?: string | null; excludeWeekends?: boolean; sessions?: ExaminationSessionDefinition[]; slots?: Array<{ examDate: string; session: ExaminationSessionPeriod; sessionCode?: string; sessionName?: string; courseName: string; courseNames?: string[]; startTime: string; endTime: string }>; }) {
  const res = await api.post('/examination-timetables/' + id + '/copy', data);
  return res.data.data as ClassExaminationTimetable;
}

export async function listExaminationTimetables(params?: { classId?: string; academicYear?: string; term?: string; examinationTypeId?: string }) {
  const res = await api.get('/examination-timetables', { params });
  return (res.data.data ?? []) as ClassExaminationTimetable[];
}

export async function getExaminationTimetable(id: string) {
  const res = await api.get(`/examination-timetables/${id}`);
  return res.data.data as ClassExaminationTimetable;
}

export type ExaminationTimetableProposal = {
  id?: string | null;
  examinationCode?: string | null;
  name?: string | null;
  classId: string;
  className?: string;
  academicYear: string;
  term: string;
  startDate: string;
  endDate: string;
  excludeWeekends: boolean;
  sessions?: ExaminationSessionDefinition[];
  slots: Array<{ examDate: string; session: ExaminationSessionPeriod; sessionCode?: string; sessionName?: string; courseName: string; courseNames?: string[]; courses?: Array<{ courseName: string; subjectId?: string | null; courseCode?: string | null; teacherName?: string | null }>; startTime: string; endTime: string }>;
  generated?: boolean;
  persisted?: boolean;
};

export async function generateExaminationTimetable(data: {
  classId: string;
  academicYear: string;
  term: string;
  examinationTypeId?: string;
  startDate: string;
  endDate: string;
  excludeWeekends?: boolean;
  sessions?: ExaminationSessionDefinition[];
}) {
  const res = await api.post('/examination-timetables/generate', data);
  return res.data.data as ExaminationTimetableProposal;
}

export async function saveExaminationTimetable(data: {
  id?: string;
  examinationCode?: string | null;
  name?: string;
  examinationTypeId?: string | null;
  classId: string;
  className?: string;
  academicYear: string;
  term: string;
  startDate: string;
  endDate: string;
  excludeWeekends?: boolean;
  sessions?: ExaminationSessionDefinition[];
  confirmImpact?: boolean;
  slots: Array<{ examDate: string; session: ExaminationSessionPeriod; sessionCode?: string; sessionName?: string; courseName: string; courseNames?: string[]; courses?: Array<{ courseName: string; subjectId?: string | null; courseCode?: string | null; teacherName?: string | null }>; startTime: string; endTime: string }>;
}) {
  if (data.id) {
    const res = await api.put(`/examination-timetables/${data.id}`, data);
    return res.data.data as ClassExaminationTimetable;
  }
  const res = await api.post('/examination-timetables', data);
  return res.data.data as ClassExaminationTimetable;
}

// ─── Examination Lists (room allocation) ────────────────────────────────
export type ExaminationDistributionMethod = 'KEEP_CLASS' | 'MIX_CLASSES';

export type ExaminationAllocation = {
  id: string;
  listId: string;
  roomId: string;
  studentId: string;
  studentCode?: string | null;
  studentName: string;
  classId: string;
  className: string;
  gender?: string | null;
};

export type ExaminationListRoom = {
  id: string;
  listId: string;
  sourceRoomId?: string | null;
  roomName: string;
  roomNumber?: string | null;
  capacity: number;
  isUniqueCapacity: boolean;
  sortOrder: number;
  allocations?: ExaminationAllocation[];
  _count?: { allocations: number };
};

export type ExaminationListClass = {
  id: string;
  listId: string;
  classId: string;
  className: string;
  studentCount: number;
};

export type ExaminationList = {
  id: string;
  organizationId: string;
  listCode?: string | null;
  examinationTimetableId?: string | null;
  examinationTypeId?: string | null;
  examinationCode?: string | null;
  examinationName?: string | null;
  academicYear: string;
  term: string;
  name?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  distributionMethod: ExaminationDistributionMethod;
  mixQuantity?: number | null;
  defaultCapacity: number;
  status: 'DRAFT' | 'GENERATED' | 'PUBLISHED';
  generatedAt?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  rooms: ExaminationListRoom[];
  classes: ExaminationListClass[];
  allocations?: ExaminationAllocation[];
  examinationTimetable?: { id: string; examinationCode?: string | null; examinationTypeId?: string | null; examinationType?: ExaminationType | null; name?: string | null; className?: string; startDate?: string; endDate?: string; slots?: any[] } | null;
  _count?: { allocations: number };
};

export type ExaminationListsDashboard = {
  stats: {
    totalStudents: number;
    totalExaminationRooms: number;
    totalStudentsAllocated: number;
    studentsNotAllocated: number;
    totalClassesParticipating: number;
    examinationListsGenerated?: number;
  };
  lists: ExaminationList[];
  latestList: ExaminationList | null;
  classCount: number;
};

export type ExaminationListsContext = {
  academicYear: string;
  term: string;
  rooms: Array<{ sourceRoomId: string; roomName: string; roomNumber?: string | null; capacity: number; building?: string | null; floor?: string | null; active: boolean; source?: string }>;
  classes: Array<{ id: string; name: string; stream?: string | null; label: string; studentCount: number }>;
  totalStudents: number;
  examinationTypes?: Array<{ id: string; name: string; academicYear: string; term: string }>;
  examinationTimetables?: Array<{ id: string; examinationCode?: string | null; examinationTypeId?: string | null; examinationTypeName?: string | null; name: string; classId: string; className: string; academicYear: string; term: string; startDate?: string | null; endDate?: string | null; slotCount?: number }>;
  selectedExamination?: { id: string; examinationCode?: string | null; examinationTypeId?: string | null; examinationTypeName?: string | null; name: string; classId: string; className: string; academicYear: string; term: string; startDate?: string | null; endDate?: string | null; slots?: Array<{ examDate: string; session: ExaminationSessionPeriod; sessionCode?: string; sessionName?: string; courseName: string; startTime: string; endTime: string }> } | null;
};

export async function getExaminationListsDashboard(params?: { academicYear?: string; term?: string; examinationTypeId?: string }) {
  const res = await api.get('/examination-lists/dashboard', { params });
  return res.data.data as ExaminationListsDashboard;
}

export async function getExaminationListsContext(params?: { academicYear?: string; term?: string; examinationTimetableId?: string; examinationTypeId?: string }) {
  const res = await api.get('/examination-lists/context', { params });
  return res.data.data as ExaminationListsContext;
}

export async function listExaminationLists(params?: { academicYear?: string; term?: string; examinationTimetableId?: string; examinationTypeId?: string }) {
  const res = await api.get('/examination-lists', { params });
  return (res.data.data ?? []) as ExaminationList[];
}

export async function getExaminationList(id: string) {
  const res = await api.get(`/examination-lists/${id}`);
  return res.data.data as ExaminationList;
}

export async function generateExaminationList(data: {
  examinationTimetableId?: string;
  examinationTypeId?: string;
  academicYear?: string;
  term?: string;
  name?: string;
  defaultCapacity?: number;
  rooms: Array<{ sourceRoomId?: string | null; roomName: string; roomNumber?: string | null; capacity: number; isUniqueCapacity?: boolean; selected?: boolean }>;
  participatingClassIds: string[];
  distributionMethod: ExaminationDistributionMethod;
  mixQuantity?: number | null;
}) {
  const res = await api.post('/examination-lists/generate', data);
  return res.data.data as ExaminationList;
}

export async function deleteExaminationList(id: string, opts?: { skipToast?: boolean; confirmImpact?: boolean }) {
  const res = await api.delete(`/examination-lists/${id}`, {
    skipToast: opts?.skipToast,
    params: opts?.confirmImpact ? { confirmImpact: 'true' } : undefined,
  });
  return res.data.data;
}

export async function moveExaminationListStudent(id: string, data: { allocationId: string; targetRoomId: string }) {
  const res = await api.post(`/examination-lists/${id}/move-student`, data);
  return res.data.data as ExaminationList;
}

export async function addExaminationListStudent(id: string, data: { roomId: string; studentId: string }) {
  const res = await api.post(`/examination-lists/${id}/allocations`, data);
  return res.data.data as ExaminationList;
}

export async function removeExaminationListAllocation(id: string, allocationId: string) {
  const res = await api.delete(`/examination-lists/${id}/allocations/${allocationId}`);
  return res.data.data as ExaminationList;
}

export async function getExaminationListAvailableStudents(id: string, q?: string) {
  const res = await api.get(`/examination-lists/${id}/available-students`, { params: { q } });
  return (res.data.data ?? []) as Array<{ id: string; studentCode?: string | null; fullName: string; classId: string; className: string; gender?: string | null }>;
}

export async function getExaminationListImpact(id: string) {
  const res = await api.get(`/examination-lists/${id}/impact`);
  return res.data.data as { listId: string; status: string; linkedInvigilatorAssignments: number; hasImpact: boolean; canDelete: boolean; canModify: boolean; warnings: string[] };
}

export async function publishExaminationList(id: string) {
  const res = await api.post(`/examination-lists/${id}/publish`);
  return res.data.data as ExaminationList;
}

export async function unpublishExaminationList(id: string) {
  const res = await api.post(`/examination-lists/${id}/unpublish`);
  return res.data.data as ExaminationList;
}

export async function getExaminationTimetableImpact(id: string) {
  const res = await api.get(`/examination-timetables/${id}/impact`);
  return res.data.data as { timetableId: string; linkedLists: number; linkedInvigilatorAssignments: number; hasImpact: boolean; warnings: string[] };
}

export async function deleteExaminationTimetable(id: string, confirmImpact = false) {
  const res = await api.delete(`/examination-timetables/${id}`, { params: { confirmImpact } });
  return res.data.data as { deleted: boolean; id: string };
}

// ─── Examination Invigilators ───────────────────────────────────────────
export type ExaminationInvigilatorTeacher = {
  id: string;
  name: string;
  email?: string | null;
  roles?: string[];
  modules?: string[];
  isTeacher?: boolean;
  active?: boolean;
};

export type ExaminationInvigilatorAssignment = {
  id: string;
  organizationId: string;
  examinationTimetableId?: string | null;
  examinationListId: string;
  examinationCode?: string | null;
  listCode?: string | null;
  roomId: string;
  roomName: string;
  roomNumber?: string | null;
  examDate: string;
  session: ExaminationSessionPeriod;
  sessionCode?: string;
  sessionName?: string;
  startTime?: string | null;
  endTime?: string | null;
  teacherUserId: string;
  teacherName: string;
  teacherEmail?: string | null;
  assignmentType: 'AUTOMATIC' | 'MANUAL';
  status: 'ASSIGNED' | 'PENDING' | 'CHECKED_IN' | 'REPLACED';
  notes?: string | null;
};

export type ExaminationInvigilatorCoverageRow = {
  examDate: string;
  session: ExaminationSessionPeriod;
  sessionCode?: string;
  sessionName?: string;
  startTime: string;
  endTime: string;
  roomId: string;
  roomName: string;
  roomNumber?: string | null;
  classNames: string[];
  required: number;
  assigned: number;
  status: 'COVERED' | 'MISSING';
  invigilators: Array<{ id: string; teacherUserId: string; teacherName: string }>;
};

export type ExaminationTypeTimetableSummary = {
  id: string;
  classId: string;
  className: string;
  examinationCode?: string | null;
  startDate: string;
  endDate: string;
  slots: Array<{ examDate: string; session: ExaminationSessionPeriod; sessionCode?: string; sessionName?: string; startTime?: string | null; endTime?: string | null; courseName?: string | null }>;
};

export type ExaminationInvigilatorsContext = {
  examinationTypes?: Array<{ id: string; name: string; academicYear: string; term: string }>;
  typeTimetables?: ExaminationTypeTimetableSummary[];
  lists: Array<{ id: string; listCode?: string | null; examinationCode?: string | null; examinationName?: string | null; examinationTypeId?: string | null; examinationTypeName?: string | null; academicYear: string; term: string; status: string; roomCount: number; studentCount: number }>;
  teachers: ExaminationInvigilatorTeacher[];
  selected: {
    list: { id: string; listCode?: string | null; examinationCode?: string | null; examinationName?: string | null; examinationTypeId?: string | null; academicYear: string; term: string; startDate?: string; endDate?: string };
    rooms: Array<{ id: string; roomName: string; roomNumber?: string | null; capacity: number }>;
    sessions: Array<{ examDate: string; session: ExaminationSessionPeriod; sessionCode?: string; sessionName?: string; startTime?: string; endTime?: string; courseName?: string | null }>;
    assignments: ExaminationInvigilatorAssignment[];
    coverage?: ExaminationInvigilatorCoverageRow[];
  } | null;
};

export async function getExaminationInvigilatorsContext(params?: { examinationListId?: string; examinationTypeId?: string }) {
  const res = await api.get('/examination-invigilators/context', { params });
  return res.data.data as ExaminationInvigilatorsContext;
}

export async function getExaminationInvigilatorsDashboard(examinationListId: string) {
  const res = await api.get('/examination-invigilators/dashboard', { params: { examinationListId } });
  return res.data.data as { stats: { totalExaminationDays: number; totalExaminationRooms: number; availableTeachers: number; assignedInvigilators: number; unassignedRooms: number; totalAssignments: number }; selected: ExaminationInvigilatorsContext['selected']; teachers: ExaminationInvigilatorTeacher[] };
}

export async function generateExaminationInvigilators(data: {
  examinationListId?: string;
  examinationTypeId?: string;
  teacherIds: string[];
  mode: 'AUTO' | 'MANUAL';
  rotationMode?: 'PER_SESSION' | 'DAILY' | 'NONE';
  defaultPerRoom?: number;
  manual?: { rooms: Array<{ roomId: string; defaultCount?: number; sessions?: Record<string, number> }> };
  replaceExisting?: boolean;
}) {
  const res = await api.post('/examination-invigilators/generate', data);
  return res.data.data as { created: number; unassigned: Array<{ roomName: string; date: string; session: string; sessionCode?: string; needed: number; assigned: number }>; assignments: ExaminationInvigilatorAssignment[] };
}

export async function updateExaminationInvigilatorAssignment(id: string, data: { teacherUserId?: string; status?: string; roomId?: string }) {
  const res = await api.put(`/examination-invigilators/${id}`, data);
  return res.data.data as ExaminationInvigilatorAssignment;
}

export async function getAvailableInvigilatorTeachers(params: { examinationListId: string; examDate: string; session?: ExaminationSessionPeriod; sessionCode?: string }) {
  const res = await api.get('/examination-invigilators/available-teachers', { params });
  return (res.data.data ?? []) as Array<{ id: string; name: string; email?: string | null }>;
}

export async function addExaminationInvigilatorAssignment(data: { examinationListId: string; roomId: string; examDate: string; session?: ExaminationSessionPeriod; sessionCode?: string; teacherUserId: string }) {
  const res = await api.post('/examination-invigilators/assignments', data);
  return res.data.data as ExaminationInvigilatorAssignment;
}

export async function clearExaminationInvigilatorAssignments(params: { examinationListId?: string; examinationTypeId?: string }) {
  const res = await api.delete('/examination-invigilators/assignments', { params });
  return res.data.data as { deleted: number };
}

export interface ExaminationAttendanceRecord {
  id: string;
  studentId: string;
  studentCode?: string | null;
  studentName: string;
  classId?: string | null;
  className?: string | null;
  examDate: string;
  session: 'MORNING' | 'AFTERNOON';
  sessionCode?: string;
  sessionName?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  notes?: string | null;
  markedByName?: string | null;
  markedAt?: string | null;
  room?: { id: string; roomName: string; roomNumber?: string | null };
  examinationList?: { id: string; listCode?: string; examinationName?: string; academicYear: string; term: string; examinationTypeId?: string | null; examinationType?: { id: string; name: string } | null };
}

export async function listExaminationAttendance(params: Record<string, any>) {
  const res = await api.get('/examination-invigilators/attendance/records', { params });
  return res.data.data as { rows: ExaminationAttendanceRecord[]; stats: { total: number; present: number; absent: number; late: number; excused: number }; pagination: { page: number; limit: number; total: number; pages: number }; filters: { rooms: any[]; classes: any[] } };
}

// --- Nursery academic reports -----------------------------

export async function getNurserySettings() {
  const res = await api.get('/nursery/settings');
  return res.data.data as NurserySettings;
}

export async function saveNurseryPerformanceBands(bands: NurseryPerformanceBand[]) {
  const res = await api.put('/nursery/settings/performance', { bands });
  return res.data.data as { performance: NurseryPerformanceBand[] };
}

export async function saveNurseryTemplate(template: NurseryTemplateSettings) {
  const res = await api.put('/nursery/settings/template', { template });
  return res.data.data as { template: NurseryTemplateSettings };
}

export async function listNurseryClasses(academicYear?: string) {
  const res = await api.get('/nursery/classes', { params: academicYear ? { academicYear } : undefined });
  return res.data.data as NurseryClassRow[];
}

export async function saveNurseryClassConfig(body: {
  classId: string;
  className?: string;
  academicYear: string;
  templateKey?: string;
  enabled?: boolean;
}) {
  const res = await api.post('/nursery/classes', body);
  return res.data.data;
}

export async function deleteNurseryClassConfig(id: string) {
  const res = await api.delete(`/nursery/classes/${id}`);
  return res.data.data as { deleted: boolean };
}

export async function getNurserySubjects(params: { classId: string; academicYear: string; term?: string }) {
  const res = await api.get('/nursery/subjects', { params });
  return res.data.data as NurserySubjectsResponse;
}

export async function saveNurserySubjects(body: {
  classId: string;
  academicYear: string;
  subjects: Array<Omit<NurserySubjectRow, 'configId'>>;
}) {
  const res = await api.put('/nursery/subjects', body);
  return res.data.data as NurserySubjectsResponse;
}

export async function listNurseryReports(params: {
  classId: string;
  academicYear: string;
  term: string;
  reportKind?: NurseryReportKind;
  search?: string;
}) {
  const res = await api.get('/nursery/reports', { params });
  return res.data.data as NurseryReportsResponse;
}

export async function generateNurseryReport(body: {
  studentId: string;
  classId: string;
  academicYear: string;
  term: string;
  reportKind?: NurseryReportKind;
}) {
  const res = await api.post('/nursery/reports/generate', body);
  return res.data.data as { report: NurseryReport };
}

export async function generateNurseryClassReports(body: {
  classId: string;
  academicYear: string;
  term: string;
  reportKind?: NurseryReportKind;
  studentIds?: string[];
}) {
  const res = await api.post('/nursery/reports/generate-class', body);
  return res.data.data as { generated: number; skipped: number; total: number; errors: string[]; classAverage: number | null };
}

export async function getNurseryReport(id: string) {
  const res = await api.get(`/nursery/reports/${id}`);
  return res.data.data as NurseryReport;
}

export async function updateNurseryReportComments(
  id: string,
  body: { teacherComment?: string | null; headTeacherComment?: string | null }
) {
  const res = await api.put(`/nursery/reports/${id}/comments`, body);
  return res.data.data as NurseryReport;
}

export async function publishNurseryReports(body: {
  ids?: string[];
  classId?: string;
  academicYear?: string;
  term?: string;
  reportKind?: NurseryReportKind;
}) {
  const res = await api.post('/nursery/reports/publish', body);
  return res.data.data as { published: number };
}

