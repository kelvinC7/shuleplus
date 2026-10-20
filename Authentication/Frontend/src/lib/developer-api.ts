import axios from 'axios';
import { api } from './api';
import {
  clearDeveloperSession,
  getDeveloperRefreshToken,
  getDeveloperToken,
  setDeveloperSession,
  type DeveloperUser,
} from './developer-auth';

function isDeveloperPortalHosted(): boolean {
  if (typeof window === 'undefined') return false;
  return /(^|\.)shuleplus\.rw$/i.test(window.location.hostname);
}

/**
 * IAM API base for developer portal — auto-detects production on shuleplus.rw.
 * Server build: set NEXT_PUBLIC_API_URL=https://shuleplus.rw/api/v1
 */
export function resolveDeveloperApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
  if (isDeveloperPortalHosted()) {
    if (!raw || /localhost|127\.0\.0\.1/i.test(raw)) {
      return 'https://shuleplus.rw/api/v1';
    }
    return raw;
  }
  return raw || 'http://localhost:3001/api/v1';
}

/** Full gateway prefix, e.g. https://shuleplus.rw/api/v1/developers/gateway */
export function resolveDeveloperGatewayBase(apiBase?: string): string {
  const base = (apiBase ?? resolveDeveloperApiBase()).replace(/\/$/, '');
  return `${base}/developers/gateway`;
}

const API_BASE = resolveDeveloperApiBase();
const ADMIN_BASE = '/super-admin/developer-access';

export const developerApi = axios.create({
  baseURL: `${API_BASE}/developers`,
  headers: { 'Content-Type': 'application/json' },
});

developerApi.interceptors.request.use((config) => {
  const token = getDeveloperToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

developerApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = getDeveloperRefreshToken();
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/developers/auth/refresh`, { refreshToken: refresh });
          localStorage.setItem('developerAccessToken', data.data.accessToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return developerApi(original);
        } catch {
          clearDeveloperSession();
          if (typeof window !== 'undefined') window.location.href = '/developers/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export async function developerLogin(email: string, password: string, rememberMe: boolean) {
  const { data } = await developerApi.post('/auth/login', { email, password, rememberMe });
  return data.data as {
    requiresMfa: boolean;
    mfaSessionToken: string;
    authenticatorEnabled: boolean;
    setupRequired?: boolean;
    user: { firstName: string; email: string };
  };
}

export async function developerVerifyMfa(mfaSessionToken: string, code: string) {
  const { data } = await developerApi.post('/auth/mfa/verify', { mfaSessionToken, code });
  const payload = data.data as { accessToken: string; refreshToken: string; user: DeveloperUser };
  setDeveloperSession(payload.accessToken, payload.refreshToken, payload.user);
  return payload;
}

export async function validateActivationToken(token: string) {
  const { data } = await axios.get(`${API_BASE}/developers/auth/activate/validate`, { params: { token } });
  return data.data as { email: string; firstName: string; partnerName: string };
}

export async function activateDeveloperAccount(token: string, password: string) {
  const { data } = await axios.post(`${API_BASE}/developers/auth/activate`, { token, password });
  return data.data as { recoveryCodes: string[] };
}

// Portal
export async function fetchDeveloperDashboard(days = 7) {
  const { data } = await developerApi.get('/dashboard', { params: { days } });
  return data.data as {
    stats: {
      requestsToday: number;
      successfulRequests: number;
      failedRequests: number;
      successRate: string;
      activeApplications: number;
      quotaUsed: number;
      quotaLimit: number;
      quotaPercent: number;
      lastActivityAt: string | null;
    };
    chart: { date: string; requests: number; successRate: string; avgResponseMs: number }[];
  };
}

export async function fetchEndpointStats(days = 7) {
  const { data } = await developerApi.get('/analytics/endpoints', { params: { days } });
  return data.data as { path: string; requests: number; successRate: string }[];
}

export async function fetchDeveloperNotifications() {
  const { data } = await developerApi.get('/notifications');
  return data.data as {
    id: string;
    type: 'success' | 'warning' | 'info';
    title: string;
    body: string;
    createdAt: string;
  }[];
}

export function grantedScopesFromModules(modules: Record<string, Record<string, boolean>>): string[] {
  const scopes: string[] = [];
  for (const perms of Object.values(modules)) {
    for (const [key, enabled] of Object.entries(perms)) {
      if (enabled) scopes.push(key);
    }
  }
  return scopes;
}

export async function fetchDeveloperMe() {
  const { data } = await developerApi.get('/me');
  return data.data as DeveloperUser;
}

export async function fetchApplications() {
  const { data } = await developerApi.get('/applications');
  return data.data as DeveloperApplication[];
}

export async function createApplication(input: {
  name: string;
  description?: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  scopes: string[];
}) {
  const { data } = await developerApi.post('/applications', input);
  return data.data as DeveloperApplication & { clientSecret?: string };
}

export async function rotateApplicationSecret(applicationId: string) {
  const { data } = await developerApi.post(`/applications/${applicationId}/rotate-secret`);
  return data.data as DeveloperApplication & { clientSecret: string };
}

export async function fetchApiCatalog() {
  const { data } = await developerApi.get('/docs/catalog');
  return data.data as {
    apiBaseUrl?: string;
    gatewayBaseUrl?: string;
    modules: ApiModule[];
    permissionMatrix: Record<string, unknown>;
  };
}

export async function fetchApiLogs(limit = 50) {
  const { data } = await developerApi.get('/logs', { params: { limit } });
  return data.data as ApiLogEntry[];
}

export async function fetchWebhooks() {
  const { data } = await developerApi.get('/webhooks');
  return data.data as WebhookEntry[];
}

export async function fetchSecurityOverview() {
  const { data } = await developerApi.get('/security');
  return data.data as SecurityOverview;
}

export async function fetchDeveloperSessions() {
  const { data } = await developerApi.get('/security/sessions');
  return data.data as DevSession[];
}

export async function setupDeveloperMfa() {
  const { data } = await developerApi.post('/mfa/setup');
  return data.data as { secret: string; uri: string };
}

export async function verifyDeveloperMfaSetup(code: string) {
  const { data } = await developerApi.post('/mfa/verify-setup', { code });
  return data.data;
}

export async function gatewayProxyRequest(input: {
  moduleSlug: string;
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}) {
  const { data } = await developerApi.post('/gateway/proxy', input);
  return data as {
    success: boolean;
    requestId: string;
    responseTime: number;
    data: unknown;
  };
}

export async function fetchOpenApiSpec(moduleSlug?: string) {
  const path = moduleSlug ? `/docs/openapi/${moduleSlug}.json` : '/docs/openapi.json';
  const { data } = await developerApi.get(path);
  return data;
}

export async function fetchSandboxOverview() {
  const { data } = await developerApi.get('/sandbox');
  return data.data as SandboxOverview;
}

export async function requestProductionAccess(input: {
  requestedModules: string[];
  businessJustification?: string;
}) {
  const { data } = await developerApi.post('/sandbox/production-request', input);
  return data.data;
}

export type PostmanExportResult = {
  collection: object;
  environment: object;
  setup?: {
    clientId?: string;
    clientSecret?: string;
    organizationId?: string | null;
    sandboxBaseUrl?: string;
    modulesCount?: number;
    appAutoCreated?: boolean;
    instructions?: string;
  };
};

export async function fetchPostmanExport() {
  const { data } = await developerApi.get('/docs/postman');
  return data.data as PostmanExportResult;
}

export async function fetchProductionRequestsAdmin(status?: string) {
  const { data } = await api.get(`${ADMIN_BASE}/production-requests`, { params: { status } });
  return data.data;
}

export async function approveProductionRequest(id: string, notes?: string) {
  const { data } = await api.post(`${ADMIN_BASE}/production-requests/${id}/approve`, { notes });
  return data.data;
}

export async function rejectProductionRequest(id: string, notes?: string) {
  const { data } = await api.post(`${ADMIN_BASE}/production-requests/${id}/reject`, { notes });
  return data.data;
}

export interface SandboxOverview {
  partner: { id: string; name: string; productionAccessStatus: string };
  sandbox: {
    organization: { id: string; name: string; slug: string; organizationCode?: string } | null;
    organizationId: string | null;
    linkedExistingOrganization?: boolean;
    sharedTestSchool?: boolean;
    schoolLabel?: string;
    grantedPermissions: string[];
    modules: {
      slug: string;
      name: string;
      endpointCount: number;
      grantedPermissions: string[];
    }[];
    moduleGroups: {
      slug: string;
      name: string;
      description: string;
      endpointCount: number;
      grantedPermissions: string[];
      scenarios: SandboxScenario[];
      upstreamBase?: string;
      health?: { ok: boolean; latencyMs?: number; error?: string };
    }[];
    applications: Pick<DeveloperApplication, 'id' | 'name' | 'clientId' | 'environment' | 'status'>[];
    sampleStudentCode: string | null;
    apiBaseUrl?: string;
    gatewayBaseUrl?: string;
    postman: {
      clientId: string | null;
      organizationId: string | null;
      gatewayBaseUrl: string;
    };
    scenarios: SandboxScenario[];
    baseUrl: string;
  };
  production: {
    organization: { id: string; name: string } | null;
    organizationId: string | null;
    accessStatus: string;
  };
}

export type SandboxScenario = {
  id: string;
  label: string;
  description: string;
  moduleSlug: string;
  method: string;
  path: string;
  permission: string;
  authMode: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  expectedStatus?: number;
  hasPathParams?: boolean;
};

// Super Admin — uses platform IAM session (same as other super-admin pages)

export async function fetchDeveloperPartners() {
  const { data } = await api.get(`${ADMIN_BASE}/partners`);
  return data.data as DeveloperPartner[];
}

export async function createDeveloperPartner(name: string, description?: string, organizationId?: string) {
  const { data } = await api.post(`${ADMIN_BASE}/partners`, { name, description, organizationId });
  return data.data as DeveloperPartner;
}

export async function linkPartnerSandbox(partnerId: string, organizationId: string) {
  const { data } = await api.post(`${ADMIN_BASE}/partners/${partnerId}/link-sandbox`, { organizationId });
  return data.data as { message: string; organization: { id: string; name: string } };
}

export async function fetchDevelopersAdmin(search?: string) {
  const { data } = await api.get(`${ADMIN_BASE}/developers`, { params: { search } });
  return data.data as DeveloperAdminRow[];
}

export type DeveloperActivationDelivery = {
  delivered: boolean;
  channel: 'notification' | 'smtp' | 'none';
  devMode?: boolean;
};

export type DeveloperActivationResult = {
  user?: DeveloperAdminRow;
  activationUrl: string;
  activationToken: string;
  emailSent?: boolean;
  emailDelivery?: DeveloperActivationDelivery;
  email?: string;
};

export async function createDeveloperAccess(input: CreateDeveloperAccessInput) {
  const { data } = await api.post(`${ADMIN_BASE}/developers`, input);
  return data.data as DeveloperActivationResult;
}

export async function resendDeveloperActivation(id: string) {
  const { data } = await api.post(`${ADMIN_BASE}/developers/${id}/resend-activation`);
  return data.data as DeveloperActivationResult;
}

export async function deleteDeveloper(id: string) {
  const { data } = await api.delete(`${ADMIN_BASE}/developers/${id}`);
  return data.data as { success: boolean; email: string };
}

export type BankOnboardingEmail = {
  subject: string;
  text: string;
  html: string;
};

export async function fetchBankOnboardingEmail(partnerId: string) {
  const { data } = await api.get(`${ADMIN_BASE}/partners/${partnerId}/bank-onboarding-email`);
  return data.data as BankOnboardingEmail;
}

export async function suspendDeveloper(id: string) {
  const { data } = await api.post(`${ADMIN_BASE}/developers/${id}/suspend`);
  return data.data;
}

export async function activateDeveloperAdmin(id: string) {
  const { data } = await api.post(`${ADMIN_BASE}/developers/${id}/activate`);
  return data.data;
}

export async function updateDeveloperAccess(
  id: string,
  input: Pick<CreateDeveloperAccessInput, 'accessType' | 'allowedModules' | 'allowedEnvironments' | 'ipRestrictions'>
) {
  const { data } = await api.patch(`${ADMIN_BASE}/developers/${id}`, input);
  return data.data as DeveloperAdminRow;
}

export async function fetchPermissionConfig() {
  const { data } = await api.get(`${ADMIN_BASE}/permission-config`);
  return data.data as Record<
    string,
    {
      label: string;
      permissions: {
        key: string;
        label: string;
        endpoints?: { method: string; path: string; summary: string }[];
      }[];
    }
  >;
}

export type DeveloperPortalSettings = {
  publicApiUrl: string | null;
  resolvedPublicApiUrl: string;
  gatewayBaseUrl: string;
  source: 'database' | 'environment' | 'frontend' | 'localhost';
  updatedAt: string | null;
};

export async function fetchDeveloperPortalSettings() {
  const { data } = await api.get(`${ADMIN_BASE}/portal-settings`);
  return data.data as DeveloperPortalSettings;
}

export async function updateDeveloperPortalSettings(publicApiUrl: string | null) {
  const { data } = await api.patch(`${ADMIN_BASE}/portal-settings`, { publicApiUrl });
  return data.data as DeveloperPortalSettings;
}

// Types
export interface DeveloperPartner {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  productionAccessStatus?: string;
  sandboxOrganization?: { id: string; name: string; slug: string } | null;
  productionOrganization?: { id: string; name: string; slug: string } | null;
  _count?: { users: number; applications: number };
}

export interface DeveloperAdminRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accessType: string;
  status: string;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  partner: DeveloperPartner;
  allowedModules: Record<string, Record<string, boolean>>;
  allowedEnvironments: string[];
}

export interface CreateDeveloperAccessInput {
  partnerId: string;
  firstName: string;
  lastName: string;
  email: string;
  accessType: 'DEVELOPER' | 'TECHNICAL_ADMIN' | 'API_VIEWER';
  allowedModules: Record<string, Record<string, boolean>>;
  allowedEnvironments: ('SANDBOX' | 'PRODUCTION')[];
  ipRestrictions?: string[];
}

export interface DeveloperApplication {
  id: string;
  name: string;
  description?: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  status: string;
  clientId: string;
  clientSecretPrefix: string;
  scopes: string[];
  lastUsedAt?: string;
  createdAt: string;
  clientSecret?: string;
}

export interface ApiModule {
  slug: string;
  catalogKey?: string;
  name: string;
  description: string;
  baseUrl: string;
  openapiPath: string;
  endpoints: {
    id: string;
    method: string;
    path: string;
    summary: string;
    description: string;
    permission: string;
    authMode?: string;
    queryParams?: { name: string; type: string; required: boolean; description: string }[];
    requestBody?: Record<string, unknown>;
    responseExample?: Record<string, unknown>;
    tags?: string[];
  }[];
}

export interface ApiLogEntry {
  id: string;
  requestId: string;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  createdAt: string;
  application?: { name: string };
}

export interface WebhookEntry {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  successRate: number;
  lastDelivery?: string;
  application: { name: string; environment: string };
}

export interface SecurityOverview {
  score: number;
  checks: Record<string, boolean>;
  activeSessions: number;
}

export interface DevSession {
  id: string;
  deviceName?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
  lastActivity: string;
  isTrusted: boolean;
}
