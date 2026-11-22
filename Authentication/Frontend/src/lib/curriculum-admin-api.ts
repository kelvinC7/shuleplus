import { ensureAccessToken, refreshAccessToken } from './api';
import { clearSession } from './auth';

function resolveCurriculumApi(): string {
  const raw =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CURRICULUM_API_URL) ||
    'http://localhost:3094/api';
  let base = raw.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (/(^|\.)shuleplus\.rw$/i.test(host) && /localhost|127\.0\.0\.1/i.test(base)) {
      return 'https://curriculum-api.shuleplus.rw/api';
    }
  }
  return base;
}

const CURRICULUM_API = resolveCurriculumApi();

function redirectToLogin(): void {
  clearSession();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const token = await ensureAccessToken();
  const res = await fetch(`${CURRICULUM_API}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: T;
    message?: string;
  };

  if (res.status === 401 && !retried) {
    const newToken = await refreshAccessToken();
    if (newToken) return request<T>(path, init, true);
    redirectToLogin();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) throw new Error(body.message || `Curriculum API error ${res.status}`);
  return body.data as T;
}

export type CurriculumBookRow = {
  id: string;
  title: string;
  subject: string;
  grade: string;
  educationLevel?: string | null;
  language: string;
  documentType?: string | null;
  edition?: string | null;
  processingStatus: string;
  pageCount?: number | null;
  fileSizeBytes?: number | null;
  processingError?: string | null;
  lastJobError?: string | null;
  updatedAt: string;
  createdAt?: string;
};

export type CurriculumBooksPage = {
  items: CurriculumBookRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type EducationLevelConfig = {
  id: string;
  label: string;
  grades: Array<{ id: string; label: string }>;
};

export type ProcessingJobRow = {
  id: string;
  status: string;
  progress: number;
  pipelineStage?: string | null;
  pagesProcessed?: number;
  pagesTotal?: number | null;
  attempts: number;
  book?: {
    id: string;
    title: string;
    subject: string;
    grade: string;
    educationLevel?: string | null;
  };
};

export const curriculumAdminApi = {
  getOverview: () =>
    request<{
      books: Record<string, number>;
      jobs: Record<string, number>;
      reviewTasks: number;
      recentJobs: ProcessingJobRow[];
    }>('/platform/overview'),
  getEducationLevels: () => request<EducationLevelConfig[]>('/platform/config/education-levels'),
  listJobs: (status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<ProcessingJobRow[]>(`/platform/jobs${qs}`);
  },
  cancelJob: (jobId: string) =>
    request(`/platform/jobs/${jobId}/cancel`, { method: 'POST', body: '{}' }),
  retryJob: (jobId: string) =>
    request(`/platform/jobs/${jobId}/retry`, { method: 'POST', body: '{}' }),

  listBooks: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : '';
    return request<CurriculumBooksPage>(`/platform/books${qs}`);
  },
  getBook: (id: string) => request<Record<string, unknown>>(`/platform/books/${id}`),
  getTree: (id: string) => request<Record<string, unknown>>(`/platform/books/${id}/tree`),
  setStatus: (id: string, status: string) =>
    request(`/platform/books/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  reprocess: (id: string) =>
    request(`/platform/books/${id}/reprocess`, { method: 'POST', body: '{}' }),
  uploadCurriculumPair: (bookId: string, form: FormData) =>
    request<{
      teachersGuideBookId: string;
      pupilsBookBookId?: string;
      teachersGuideJobId?: string;
      pupilsBookJobId?: string;
    }>(`/platform/books/${bookId}/curriculum-pair`, {
      method: 'POST',
      body: form,
    }),
  uploadBook: (form: FormData) =>
    request<{ book: CurriculumBookRow; job: { id: string } }>('/platform/books/upload', {
      method: 'POST',
      body: form,
    }),
  updateLesson: (bookId: string, lessonId: string, data: Record<string, unknown>) =>
    request(`/platform/books/${bookId}/lessons/${lessonId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getPage: (bookId: string, pageNumber: number) =>
    request<{
      pageNumber: number;
      textContent?: string | null;
      isScanned: boolean;
      ocrApplied: boolean;
      extractionConfidence?: number | null;
      needsManualReview: boolean;
    }>(`/platform/books/${bookId}/pages/${pageNumber}`),
  getValidation: (bookId: string) =>
    request<Record<string, unknown>>(`/platform/books/${bookId}/validation`),
  applyStructure: (bookId: string) =>
    request<Record<string, unknown>>(`/platform/books/${bookId}/apply-structure`, {
      method: 'POST',
      body: '{}',
    }),
  async fetchBookPdfBlob(bookId: string): Promise<Blob> {
    const token = await ensureAccessToken();
    const res = await fetch(`${CURRICULUM_API}/platform/books/${bookId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message || `Failed to load PDF (${res.status})`);
    }
    return res.blob();
  },
};
