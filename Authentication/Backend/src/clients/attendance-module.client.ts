import { env } from '../config/env';
import { throwModuleClientError, throwModuleUnavailable } from './module-client.util';

type ServiceJson<T> = { success?: boolean; data?: T; message?: string };

export type AttendanceModuleRecord = {
  id: string;
  organizationId: string;
  studentId: string | null;
  studentCode: string | null;
  studentName: string;
  className: string | null;
  gateName: string | null;
  entryTime: string | null;
  exitTime: string | null;
  status: string;
  notes: string | null;
  cardNumber: string | null;
  deviceCode: string | null;
};

export type AttendanceGateDevice = {
  id: string;
  deviceCode: string;
  name: string;
  location: string;
  gateName?: string | null;
  apiKey?: string | null;
  status: string;
  direction: string;
  batteryPercent?: number | null;
  signalQuality?: string | null;
  wifiSsid?: string | null;
  wifiPassword?: string | null;
  studentsToday?: number;
  lastSeenAt?: string | null;
  firmwareVersion?: string | null;
};

async function attendanceFetch<T>(
  path: string,
  organizationId: string,
  init?: RequestInit & { query?: Record<string, string | undefined> }
): Promise<T> {
  const url = new URL(`${env.ATTENDANCE_API_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`);
  url.searchParams.set('organizationId', organizationId);
  if (init?.query) {
    for (const [key, value] of Object.entries(init.query)) {
      if (value) url.searchParams.set(key, value);
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.PLATFORM_SERVICE_KEY,
        'x-source-service': 'iam-super-admin',
        'x-organization-id': organizationId,
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throwModuleUnavailable('Attendance');
  }

  const body = (await response.json().catch(() => ({}))) as ServiceJson<T> & { message?: string };
  if (!response.ok) {
    throwModuleClientError(response, body, 'Attendance');
  }
  return body.data as T;
}

export async function listAttendanceRecordsSafe(
  organizationId: string,
  query?: { date?: string; q?: string }
): Promise<AttendanceModuleRecord[]> {
  const url = new URL(`${env.ATTENDANCE_API_URL.replace(/\/$/, '')}/service/attendance`);
  url.searchParams.set('organizationId', organizationId);
  if (query?.date) url.searchParams.set('date', query.date);
  if (query?.q) url.searchParams.set('q', query.q);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.PLATFORM_SERVICE_KEY,
        'x-source-service': 'iam-representative',
        'x-organization-id': organizationId,
      },
    });
    const body = (await response.json().catch(() => ({}))) as ServiceJson<AttendanceModuleRecord[]>;
    if (!response.ok) return [];
    return Array.isArray(body.data) ? body.data : [];
  } catch {
    return [];
  }
}

export const attendanceModuleClient = {
  listDevices(organizationId: string) {
    return attendanceFetch<AttendanceGateDevice[]>('/service/devices', organizationId);
  },

  createDevice(
    organizationId: string,
    body: {
      deviceCode?: string;
      name: string;
      location?: string;
      gateName?: string;
      direction?: string;
      organizationName?: string;
      organizationCode?: string;
    }
  ) {
    return attendanceFetch<AttendanceGateDevice>('/service/devices', organizationId, {
      method: 'POST',
      body: JSON.stringify({
        organizationId,
        deviceCode: body.deviceCode,
        name: body.name,
        location: body.location,
        gateName: body.gateName,
        direction: body.direction,
        organizationName: body.organizationName,
        organizationCode: body.organizationCode,
      }),
    });
  },

  rotateDeviceApiKey(organizationId: string, deviceId: string) {
    return attendanceFetch<{ id: string; deviceCode: string; apiKey: string }>(
      `/service/devices/${deviceId}/api-key/rotate`,
      organizationId,
      { method: 'POST', body: JSON.stringify({ organizationId }) }
    );
  },

  updateDevice(organizationId: string, deviceId: string, body: Record<string, unknown>) {
    return attendanceFetch<AttendanceGateDevice>(`/service/devices/${deviceId}`, organizationId, {
      method: 'PATCH',
      body: JSON.stringify({ ...body, organizationId }),
    });
  },

  deleteDevice(organizationId: string, deviceId: string) {
    return attendanceFetch<{ id: string; deleted: boolean }>(
      `/service/devices/${deviceId}`,
      organizationId,
      { method: 'DELETE', body: JSON.stringify({ organizationId }) }
    );
  },

  enableSmsChannel(organizationId: string) {
    return attendanceFetch<{ enableSms: boolean }>('/service/settings/enable-sms', organizationId, {
      method: 'PATCH',
      body: JSON.stringify({ organizationId }),
    });
  },
};
