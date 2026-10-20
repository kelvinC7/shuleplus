import axios, { type InternalAxiosRequestConfig } from 'axios';
import { refreshAccessToken } from '@/services/api';
import {
  captureTokenFromUrl,
  clearToken,
  getToken,
  isTokenExpired,
  notifySessionExpired,
} from '@/shared/auth-token';

const IAM_API_URL = process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';

export const iamApi = axios.create({
  baseURL: IAM_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

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

iamApi.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  captureTokenFromUrl();
  const token = await ensureFreshToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

iamApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return iamApi(original);
      }
      clearToken();
      notifySessionExpired();
    }
    return Promise.reject(error);
  }
);

export type PrintCardUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export function namesFromEmail(email: string) {
  const local = email.split('@')[0]?.trim() || 'user';
  const parts = local.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean);
  const firstName = parts[0]
    ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase()
    : 'User';
  const lastName = parts[1]
    ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase()
    : 'Operator';
  return { firstName, lastName };
}

export async function fetchPrintCardUsers() {
  const { data } = await iamApi.get<{ success: boolean; data: PrintCardUser[] }>(
    '/super-admin/print-card/users'
  );
  return data.data;
}

export async function createPrintCardUser(body: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  sendCredentialsEmail?: boolean;
}) {
  const { data } = await iamApi.post<{ success: boolean; data: { tempPassword?: string } }>(
    '/super-admin/print-card/users',
    {
      email: body.email.trim(),
      password: body.password,
      firstName: body.firstName?.trim(),
      lastName: body.lastName?.trim(),
      sendCredentialsEmail: body.sendCredentialsEmail ?? false,
    }
  );
  return data.data;
}

export async function updatePrintCardUser(
  userId: string,
  body: { email?: string; firstName?: string; lastName?: string; phone?: string | null }
) {
  const { data } = await iamApi.patch<{ success: boolean; data: PrintCardUser }>(
    `/super-admin/platform-users/${userId}`,
    body
  );
  return data.data;
}

export async function deletePrintCardUser(userId: string) {
  await iamApi.delete(`/super-admin/platform-users/${userId}`);
}

export async function resetPrintCardUserPassword(
  userId: string,
  body: { password?: string; sendEmail?: boolean }
) {
  const { data } = await iamApi.post<{ success: boolean; data: { tempPassword?: string } }>(
    `/super-admin/platform-users/${userId}/reset-password`,
    body
  );
  return data.data;
}

export type PlatformModuleSummary = {
  id: string;
  slug: string;
  name: string;
  shortName?: string | null;
  version?: string | null;
};

export type OrgModuleAssignmentRow = {
  module: PlatformModuleSummary & { description?: string | null };
  assignment: {
    id: string;
    status: string;
    tenantProvisioned: boolean;
    activatedAt?: string | null;
  } | null;
};

export type OrgModuleAssignmentsResponse = {
  organization: { id: string; name: string; organizationCode?: string | null };
  modules: OrgModuleAssignmentRow[];
};

export async function fetchModuleCatalog() {
  const { data } = await iamApi.get<{ success: boolean; data: PlatformModuleSummary[] }>(
    '/super-admin/module-catalog'
  );
  return data.data;
}

export async function fetchOrgModuleAssignments(organizationId: string) {
  const { data } = await iamApi.get<{ success: boolean; data: OrgModuleAssignmentsResponse }>(
    `/super-admin/module-assignments/organizations/${organizationId}`
  );
  return data.data;
}

export async function assignOrgModules(organizationId: string, moduleIds: string[]) {
  const { data } = await iamApi.put<{ success: boolean; data: OrgModuleAssignmentsResponse; message?: string }>(
    `/super-admin/module-assignments/organizations/${organizationId}`,
    { moduleIds }
  );
  return data;
}

export async function patchOrgModule(
  organizationId: string,
  moduleId: string,
  action: 'activate' | 'deactivate' | 'lock' | 'unlock'
) {
  const { data } = await iamApi.patch<{ success: boolean; data: unknown; message?: string }>(
    `/super-admin/organizations/${organizationId}/modules/${moduleId}`,
    { action }
  );
  return data;
}

export async function provisionOrgModule(organizationId: string, moduleId: string) {
  const { data } = await iamApi.post<{ success: boolean; data: unknown; message?: string }>(
    `/super-admin/organizations/${organizationId}/modules/${moduleId}/provision`,
    {}
  );
  return data;
}

const PRINT_CARD_SLUG = 'print-card';

export async function getPrintCardModuleId() {
  const catalog = await fetchModuleCatalog();
  const mod = catalog.find((m) => m.slug === PRINT_CARD_SLUG);
  if (!mod) throw new Error('Print Card module not found in IAM catalog');
  return mod.id;
}

export function printCardAssignmentFromOrg(data: OrgModuleAssignmentsResponse) {
  return data.modules.find((row) => row.module.slug === PRINT_CARD_SLUG) ?? null;
}

export async function setPrintCardModuleForOrg(organizationId: string, enabled: boolean) {
  const [printCardModuleId, assignments] = await Promise.all([
    getPrintCardModuleId(),
    fetchOrgModuleAssignments(organizationId),
  ]);

  const row = printCardAssignmentFromOrg(assignments);
  const activeModuleIds = assignments.modules
    .filter((m) => m.assignment?.status === 'ACTIVE')
    .map((m) => m.module.id);

  if (enabled) {
    if (row?.assignment?.status === 'ACTIVE') {
      return { alreadyEnabled: true, data: assignments };
    }
    if (row?.assignment && row.assignment.status !== 'ACTIVE') {
      await patchOrgModule(organizationId, printCardModuleId, 'activate');
      const refreshed = await fetchOrgModuleAssignments(organizationId);
      return { alreadyEnabled: false, data: refreshed };
    }
    const moduleIds = [...new Set([...activeModuleIds, printCardModuleId])];
    const result = await assignOrgModules(organizationId, moduleIds);
    return { alreadyEnabled: false, data: result.data, message: result.message };
  }

  if (!row?.assignment) {
    return { alreadyEnabled: false, data: assignments };
  }
  if (row.assignment.status === 'ACTIVE') {
    await patchOrgModule(organizationId, printCardModuleId, 'deactivate');
  }
  const refreshed = await fetchOrgModuleAssignments(organizationId);
  return { alreadyEnabled: false, data: refreshed };
}
