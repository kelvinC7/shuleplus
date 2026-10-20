import axios, { type InternalAxiosRequestConfig } from 'axios';
import { ensureAccessToken, refreshAccessToken } from './api';
import { clearSession } from './auth';

const DEVICE_API = process.env.NEXT_PUBLIC_DEVICE_API_URL ?? 'http://localhost:3062/api';

const client = axios.create({
  baseURL: `${DEVICE_API}/super-admin`,
  headers: { 'Content-Type': 'application/json' },
});

function redirectToLogin(): void {
  clearSession();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

client.interceptors.request.use(async (config) => {
  const token = await ensureAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      }
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);

function formatDeviceApiError(err: unknown): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

  if (status === 401) {
    return message ?? 'Session expired. Sign in again and retry.';
  }
  if (status === 403) {
    return message ?? 'Super admin access required for RFID Network.';
  }
  if (status === 404) {
    return 'Device module API route not found. Ensure Device backend is running on port 3062.';
  }
  if (!status) {
    return 'Unable to reach Device module API. Start Device backend on port 3062.';
  }
  return message ?? `Device module API error (${status}).`;
}

async function deviceGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  try {
    const { data } = await client.get<T>(path, { params });
    return data;
  } catch (err) {
    throw new Error(formatDeviceApiError(err));
  }
}

export type RfidOverview = {
  kpis: {
    totalSchools: number;
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    devicesWithAlerts: number;
    studentsCheckedInToday: number;
    cardEventsToday: number;
    failedEvents: number;
    pendingSynchronizations: number;
  };
  network: {
    online: number;
    offline: number;
    withAlerts: number;
  };
};

export type RfidRegionMapEntry = {
  province: string;
  schools: number;
  devices: number;
  online: number;
  offline: number;
};

export async function fetchRfidOverview() {
  const data = await deviceGet<{ data: RfidOverview }>('/overview');
  return data.data;
}

export async function fetchRfidSchools(params?: { page?: number; limit?: number; province?: string }) {
  return deviceGet<{ data: Array<Record<string, unknown>>; total?: number }>('/schools', params);
}

export async function fetchRfidSchoolDevices(orgId: string) {
  const data = await deviceGet<{
    data: { tenant: Record<string, unknown>; devices: Array<Record<string, unknown>> };
  }>(`/schools/${orgId}/devices`);
  return data.data;
}

export async function fetchRfidMap() {
  const data = await deviceGet<{ data: RfidRegionMapEntry[] }>('/map');
  return data.data;
}

export async function fetchRfidFleet(params?: { page?: number; limit?: number; status?: string }) {
  return deviceGet<{ data: Array<Record<string, unknown>> }>('/devices', params);
}

export async function fetchRfidGlobalEvents(params?: { page?: number; limit?: number }) {
  return deviceGet<{ data: Array<Record<string, unknown>> }>('/events', params);
}

export async function fetchRfidFirmware() {
  const data = await deviceGet<{ data: Array<Record<string, unknown>> }>('/firmware');
  return data.data;
}

export async function fetchRfidProfiles() {
  const data = await deviceGet<{ data: Array<Record<string, unknown>> }>('/profiles');
  return data.data;
}
