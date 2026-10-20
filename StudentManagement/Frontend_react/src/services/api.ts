import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { AcademicSettings } from '@/types';
import {
  captureTokenFromUrl,
  clearToken,
  getRefreshToken,
  getToken,
  isTokenExpired,
  notifySessionExpired,
  setToken,
} from '@/shared/auth-token';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3052/api';
const IAM_API_URL = import.meta.env.VITE_IAM_API_URL ?? 'http://localhost:3001/api/v1';

/** Long timeout for bulk import / preview (same pattern as other modules). */
const API_TIMEOUT_MS = 120_000;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

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
  (response) => response,
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
    }
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
  defaultClassId?: string;
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
  defaultClassId?: string;
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

export async function getParent(id: string) {
  const res = await api.get(`/parents/${id}`);
  return res.data.data;
}

export async function updateParent(id: string, data: {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  nationalId?: string;
  occupation?: string;
  address?: string;
}) {
  const res = await api.put(`/parents/${id}`, data);
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

export async function fetchTeacherCandidates(search?: string) {
  const res = await api.get('/classes/teacher-candidates', { params: search ? { search } : undefined });
  return res.data.data;
}

export type ClassMonitorRecord = {
  id: string;
  slot: number;
  qrCode: string;
  classId: string;
  className: string;
  studentId: string;
  studentUid?: string;
  studentCode: string | null;
  studentName: string;
};

export async function listClassMonitors(classId?: string): Promise<ClassMonitorRecord[]> {
  const res = await api.get('/class-monitors', { params: classId ? { classId } : undefined });
  return res.data.data;
}

export async function createClassMonitor(data: { classId: string; studentId: string; slot?: 1 | 2 }) {
  const res = await api.post('/class-monitors', data);
  return res.data.data as ClassMonitorRecord;
}

export async function updateClassMonitor(
  id: string,
  data: { studentId?: string; slot?: 1 | 2 }
) {
  const res = await api.put(`/class-monitors/${id}`, data);
  return res.data.data as ClassMonitorRecord;
}

export async function deleteClassMonitor(id: string) {
  const res = await api.delete(`/class-monitors/${id}`);
  return res.data.data;
}

export async function assignClassHeadTeacher(
  classId: string,
  data: {
    headTeacherUserId?: string | null;
    headTeacherRefId?: string | null;
    headTeacherName?: string | null;
    headTeacherEmail?: string | null;
    headTeacherSource?: 'TIMETABLE' | 'HR' | 'MANUAL' | null;
  }
) {
  const res = await api.patch(`/classes/${classId}/head-teacher`, data);
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

export async function deleteExam(id: string) {
  const res = await api.delete(`/exams/${id}`);
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

export type { AcademicSettings };

export async function fetchAcademicSettings() {
  const res = await api.get('/settings/academic');
  return res.data.data as AcademicSettings;
}

export async function updateAcademicSettings(settings: AcademicSettings) {
  const res = await api.put('/settings/academic', settings);
  return res.data.data as AcademicSettings;
}
