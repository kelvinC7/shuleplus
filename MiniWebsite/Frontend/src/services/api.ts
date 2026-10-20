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
import type { Applicant, SchoolWebsite, WebsitePage } from '@/types';
import type { GalleryItem } from '@/lib/gallery';
import type { SchoolLeader } from '@/lib/leaders';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3055/api';
const IAM_API_URL = import.meta.env.VITE_IAM_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
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

export async function getDashboard() {
  const res = await api.get('/dashboard');
  return res.data.data;
}

export async function getWebsite() {
  const res = await api.get('/websites/me');
  return res.data.data as SchoolWebsite;
}

export interface WebsiteUpdateInput {
  title?: string;
  tagline?: string;
  heroTitle?: string;
  heroText?: string;
  heroImageUrl?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  email?: string;
  phone?: string;
  address?: string;
  province?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  schoolCategory?: string;
  schoolProgram?: string;
  educationLevels?: string[];
  leaders?: SchoolLeader[];
  websiteUrl?: string;
  about?: string;
  vision?: string;
  mission?: string;
  admissionInfo?: string;
  admissionsEnabled?: boolean;
  admissionForm?: Array<{
    id: string;
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    options?: string[];
  }>;
  customCss?: string;
  stats?: Array<{ label: string; value: string }>;
  programs?: Array<{ name: string; description: string }>;
  news?: Array<{ title: string; date: string; excerpt: string }>;
  gallery?: GalleryItem[] | string[];
}

export async function updateWebsite(data: WebsiteUpdateInput) {
  const res = await api.put('/websites/me', data);
  return res.data.data as SchoolWebsite;
}

export async function updateWebsiteSlug(slug: string) {
  const res = await api.put('/websites/me/slug', { slug });
  return res.data.data as SchoolWebsite;
}

export async function publishWebsite() {
  const res = await api.post('/websites/me/publish');
  return res.data.data as SchoolWebsite & { html?: string };
}

export async function unpublishWebsite() {
  const res = await api.post('/websites/me/unpublish');
  return res.data.data as SchoolWebsite;
}

export async function regenerateWebsite() {
  const res = await api.post('/websites/me/regenerate');
  return res.data.data as { html: string; publicUrl: string };
}

export async function previewWebsite(data: WebsiteUpdateInput & { slug?: string }) {
  const res = await api.post('/websites/me/preview', data);
  return res.data.data as { html: string; publicUrl: string };
}

export async function uploadImage(file: File): Promise<string> {
  const contentBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
  const res = await api.post('/upload/image', {
    fileName: file.name,
    contentBase64,
    mimeType: file.type || 'image/png',
  });
  return res.data.data.url as string;
}

export async function listPages() {
  const res = await api.get('/websites/me/pages');
  return res.data.data as WebsitePage[];
}

export async function createPage(data: {
  slug: string;
  title: string;
  content: string;
  sortOrder?: number;
}) {
  const res = await api.post('/websites/me/pages', data);
  return res.data.data as WebsitePage;
}

export async function updatePage(
  id: string,
  data: Partial<{ slug: string; title: string; content: string; sortOrder: number }>
) {
  const res = await api.put(`/websites/me/pages/${id}`, data);
  return res.data.data as WebsitePage;
}

export async function deletePage(id: string) {
  const res = await api.delete(`/websites/me/pages/${id}`);
  return res.data.data;
}

export async function listApplicants(params?: { status?: string }) {
  const res = await api.get('/websites/me/applicants', { params });
  return res.data.data as Applicant[];
}

export async function updateApplicantStatus(id: string, status: string) {
  const res = await api.put(`/websites/me/applicants/${id}/status`, { status });
  return res.data.data as Applicant;
}
