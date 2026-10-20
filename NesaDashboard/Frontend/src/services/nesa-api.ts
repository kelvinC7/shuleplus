import { api } from './api';

export type SchoolListItem = {
  id: string;
  organizationCode: string | null;
  name: string;
  type: string;
  status: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  cell?: string | null;
  village?: string | null;
  ownershipType?: string | null;
  schoolCategory?: string | null;
  schoolProgram?: string | null;
  principalName?: string | null;
};

export type SchoolProfile = {
  organizationId: string;
  organizationCode?: string | null;
  schoolName: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  country?: string | null;
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  cell?: string | null;
  village?: string | null;
  logoUrl?: string | null;
  ownershipType?: string;
  schoolCategory?: string | null;
  schoolProgram?: string | null;
  educationLevels?: unknown;
  academicYear?: string | null;
  curriculum?: string | null;
  schoolMotto?: string | null;
  schoolShift?: string | null;
  principalName?: string | null;
  deputyHeadName?: string | null;
  bursarName?: string | null;
  secretaryName?: string | null;
  leadershipPhone?: string | null;
  leadershipEmail?: string | null;
  leaders?: Array<{ name: string; role: string; phone?: string; email?: string }>;
};

export type CircularListItem = {
  id: string;
  organizationId: string;
  schoolName: string;
  schoolCode?: string | null;
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  academicYear: string;
  term: string;
  className: string;
  status: string;
  nesaStatus?: string | null;
  totalFee?: number | null;
  requestIncrease?: boolean;
  increaseReason?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CircularDetail = CircularListItem & {
  payments?: unknown;
  requirements?: unknown;
  announcements?: unknown;
  banks?: unknown;
  leaders?: unknown;
  comments?: Array<{
    id: string;
    authorName: string;
    content: string;
    createdAt: string;
  }>;
  approvals?: Array<{
    id: string;
    stage: string;
    action: string;
    notes?: string | null;
    reason?: string | null;
    approverName?: string | null;
    actedAt?: string | null;
  }>;
  activities?: Array<{
    id: string;
    eventType?: string;
    action?: string;
    description: string;
    actorName?: string | null;
    createdAt: string;
  }>;
  schoolProvince?: string | null;
  schoolDistrict?: string | null;
  schoolSector?: string | null;
};

export const nesaApi = {
  listSchools: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: SchoolListItem[] }>('/schools', { params }),

  getSchool: (id: string) =>
    api.get<{ success: boolean; data: SchoolProfile }>(`/schools/${id}`),

  listCirculars: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: CircularListItem[] }>('/circulars', { params }),

  getCircular: (id: string) =>
    api.get<{ success: boolean; data: CircularDetail }>(`/circulars/${id}`),

  commentCircular: (id: string, content: string) =>
    api.post(`/circulars/${id}/comments`, { content }),

  rejectCircular: (id: string, reason: string) =>
    api.post(`/circulars/${id}/reject`, { reason }),

  unpublishCircular: (id: string, reason: string) =>
    api.post(`/circulars/${id}/unpublish`, { reason }),

  approveCircular: (id: string, notes?: string) =>
    api.post(`/circulars/${id}/approve`, { notes }),

  /** Official View & Print HTML URL (authenticated via bearer in iframe use getPrintBlob). */
  printUrl: (id: string, lang = 'en') => `/circulars/${id}/print?lang=${lang}`,

  getPrintHtml: async (id: string, lang = 'en') => {
    const res = await api.get<string>(`/circulars/${id}/print`, {
      params: { lang },
      responseType: 'text',
    });
    return res.data;
  },

  listProvinces: () =>
    api.get<{ success: boolean; data: { items: unknown[]; total: number } }>('/provinces'),
  listDistricts: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: { items: unknown[]; total: number } }>('/districts', {
      params,
    }),
  listSectors: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: { items: unknown[]; total: number } }>('/sectors', {
      params,
    }),
  listAcademicYears: () =>
    api.get<{ success: boolean; data: { items: unknown[]; total: number } }>('/academic-years'),
  listFeePolicies: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: { items: unknown[]; total: number } }>('/fee-policies', {
      params,
    }),
  getFeePolicy: (id: string) => api.get<{ success: boolean; data: unknown }>(`/fee-policies/${id}`),
  createFeePolicy: (body: Record<string, unknown>) =>
    api.post<{ success: boolean; data: unknown }>('/fee-policies', body),
  updateFeePolicy: (id: string, body: Record<string, unknown>) =>
    api.put<{ success: boolean; data: unknown }>(`/fee-policies/${id}`, body),
  archiveFeePolicy: (id: string) =>
    api.post<{ success: boolean; data: unknown }>(`/fee-policies/${id}/archive`),

  listGaPolicies: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: { items: unknown[]; total: number } }>(
      '/general-assembly-policies',
      { params }
    ),
  createGaPolicy: (body: Record<string, unknown>) =>
    api.post<{ success: boolean; data: unknown }>('/general-assembly-policies', body),
  updateGaPolicy: (id: string, body: Record<string, unknown>) =>
    api.put<{ success: boolean; data: unknown }>(`/general-assembly-policies/${id}`, body),
  archiveGaPolicy: (id: string) =>
    api.post<{ success: boolean; data: unknown }>(`/general-assembly-policies/${id}/archive`),

  resolvePolicy: (body: Record<string, unknown>) =>
    api.post<{ success: boolean; data: unknown }>('/policy-engine/resolve', body),
  simulatePolicy: (body: Record<string, unknown>) =>
    api.post<{ success: boolean; data: unknown }>('/policy-engine/simulate', body),

  getDashboard: () => api.get<{ success: boolean; data: Record<string, unknown> }>('/dashboard'),
};

/** Normalize list payloads that return `{ items, total }` or a bare array. */
export function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}
