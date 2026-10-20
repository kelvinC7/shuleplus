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
export interface AcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

export async function getAcademicSettings() {
  const res = await api.get('/academic-settings');
  return res.data.data as AcademicSettings;
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
  term?: string
) {
  const params: Record<string, string> = {};
  if (term) params.term = term;
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
  includeTerms?: string[]
) {
  const params: Record<string, string> = {};
  if (term) params.term = term;
  if (includeTerms?.length) params.includeTerms = includeTerms.join(',');
  const res = await api.get(`/grading/report-card/${studentId}/${classId}/${academicYear}`, { params });
  return res.data.data;
}

export async function publishReportCard(body: {
  studentId: string;
  classId: string;
  academicYear: string;
  term: string;
}) {
  const res = await api.post('/grading/report-card/publish', body);
  return res.data.data;
}

export async function publishReportCardsForClass(body: {
  classId: string;
  academicYear: string;
  term: string;
}) {
  const res = await api.post('/grading/report-card/publish-class', body);
  return res.data.data as { published: number; skipped: number; total: number; errors: string[] };
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
