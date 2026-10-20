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
import type { Kit, KitRequest, KitRequestPayment, LookupResult, PublicRequestStatus } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3038/api';
const IAM_API_URL = import.meta.env.VITE_IAM_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
});

export const publicApi = axios.create({
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

export async function listKits(params?: { gradeLevel?: string; status?: string }) {
  const res = await api.get('/kits', { params });
  return res.data.data as Kit[];
}

export async function getKitById(id: string) {
  const res = await api.get(`/kits/${id}`);
  return res.data.data as Kit;
}

export interface KitRequirementInput {
  title: string;
  quantity?: number;
  unitPrice?: string | number;
  imageUrl?: string;
  notes?: string;
}

export async function createKit(data: {
  name: string;
  gradeLevel: string;
  description?: string;
  imageUrl?: string;
  amount: string | number;
  status?: string;
  requirements?: KitRequirementInput[];
}) {
  const res = await api.post('/kits', data);
  return res.data.data as Kit;
}

export async function updateKit(
  id: string,
  data: Partial<{
    name: string;
    gradeLevel: string;
    description?: string;
    imageUrl?: string;
    amount: string | number;
    status?: string;
    requirements?: KitRequirementInput[];
  }>
) {
  const res = await api.put(`/kits/${id}`, data);
  return res.data.data as Kit;
}

export async function deleteKit(id: string) {
  const res = await api.delete(`/kits/${id}`);
  return res.data.data;
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

export async function listRequests(params?: {
  status?: string;
  search?: string;
  studentId?: string;
  kitId?: string;
}) {
  const res = await api.get('/requests', { params });
  return res.data.data as { total: number; requests: KitRequest[] };
}

export async function getRequestById(id: string) {
  const res = await api.get(`/requests/${id}`);
  return res.data.data as KitRequest;
}

export interface CreateRequestPayload {
  studentCode: string;
  kitId: string;
  items?: { requirementId: string; quantity?: number }[];
  parentName: string;
  parentPhone?: string;
  parentRelation: string;
  deliveryMethod: string;
  notes?: string;
}

export async function createRequest(data: CreateRequestPayload) {
  const res = await api.post('/requests', data);
  return res.data.data as KitRequest;
}

export async function updateRequestStatus(id: string, status: string) {
  const res = await api.put(`/requests/${id}/status`, { status });
  return res.data.data as KitRequest;
}

export async function recordPayment(
  id: string,
  data: { method?: string; amount?: string | number; reference?: string; paidBy?: string }
) {
  const res = await api.post(`/requests/${id}/payments`, data);
  return res.data.data as KitRequestPayment;
}

export async function publicLookupStudent(code: string) {
  const res = await publicApi.get('/public/students/lookup', { params: { code } });
  return res.data.data as LookupResult;
}

export async function publicListKits(params: { organizationId: string; gradeLevel?: string }) {
  const res = await publicApi.get('/public/kits', { params });
  return res.data.data as Kit[];
}

export async function publicCreateRequest(data: CreateRequestPayload) {
  const res = await publicApi.post('/public/requests', data);
  return res.data.data as KitRequest;
}

export interface PublicProduct {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  imageUrl: string | null;
  unitPrice: string | number;
  stockQty: number;
  category?: { id: string; name: string } | null;
  pricingRules?: Array<{ sellingPrice: string | number }>;
}

export interface PublicStandardKit {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  district: string | null;
  academicYear: string;
  term: string;
  className: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  totalAmount: string | number;
  items: Array<{
    id: string;
    title: string;
    description: string | null;
    quantity: number;
    unitPrice: string | number;
    imageUrl: string | null;
    productId: string | null;
  }>;
  pricingRules?: Array<{ sellingPrice: string | number }>;
}

export async function publicListProducts(params?: { search?: string; categoryId?: string }) {
  const res = await publicApi.get('/public/products', { params });
  return res.data.data as PublicProduct[];
}

export async function publicListStandardKits(params: {
  organizationId?: string;
  className?: string;
  academicYear?: string;
  term?: string;
}) {
  const res = await publicApi.get('/public/standard-kits', { params });
  return res.data.data as PublicStandardKit[];
}

export async function publicGetSettings() {
  const res = await publicApi.get('/public/settings');
  return res.data.data as {
    homeDeliveryFee: string | number;
    schoolPickupFee: string | number;
    customKitsEnabled: boolean;
    standardKitsEnabled: boolean;
  };
}

export interface PublicAcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

export async function publicGetAcademicSettings(organizationId: string) {
  const res = await publicApi.get('/public/academic-settings', { params: { organizationId } });
  return res.data.data as PublicAcademicSettings;
}

export interface CreatePlatformOrderPayload {
  orderType: 'STANDARD' | 'CUSTOM';
  studentCode: string;
  standardKitId?: string;
  items?: Array<{
    productId?: string;
    requirementId?: string;
    title?: string;
    unitPrice?: number;
    quantity?: number;
    imageUrl?: string;
  }>;
  parentName: string;
  parentPhone?: string;
  parentRelation: string;
  deliveryMethod: string;
  deliveryAddress?: string;
  pickupPoint?: string;
  district?: string;
  sector?: string;
  notes?: string;
  paymentMethod?: string;
  paymentReference?: string;
}

export async function publicCreatePlatformOrder(data: CreatePlatformOrderPayload) {
  const res = await publicApi.post('/public/orders', data);
  return res.data.data as KitRequest & { trackingNumber?: string | null };
}

export interface ParentClaimPayload {
  studentCode: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  role: string;
}

export async function publicClaimParent(data: ParentClaimPayload) {
  const res = await publicApi.post('/public/parents/claim', data);
  return res.data.data as {
    studentId: string;
    organizationId: string;
    parentId: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    role: string;
  };
}

export async function publicRequestStatus(requestNo: string) {
  const res = await publicApi.get(`/public/requests/status/${encodeURIComponent(requestNo)}`);
  return res.data.data as PublicRequestStatus;
}
