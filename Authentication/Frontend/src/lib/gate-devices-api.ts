import { api } from '@/lib/api';
import type { SmartAccessSchool } from '@/lib/smart-access-api';

export type GateDevice = {
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

export type { SmartAccessSchool };

export async function fetchGateDeviceSchools(params?: {
  provinceId?: string;
  districtId?: string;
  sectorId?: string;
  search?: string;
}) {
  const { data } = await api.get<{ success: boolean; data: SmartAccessSchool[] }>(
    '/super-admin/gate-devices/schools',
    { params }
  );
  return data.data;
}

export async function fetchGateDevices(organizationId: string) {
  const { data } = await api.get<{ success: boolean; data: GateDevice[] }>(
    `/super-admin/gate-devices/schools/${organizationId}/devices`
  );
  return data.data;
}

export async function createGateDevice(
  organizationId: string,
  body: {
    name: string;
    deviceCode?: string;
    location?: string;
    gateName?: string;
    direction?: string;
  }
) {
  const { data } = await api.post<{ success: boolean; data: GateDevice }>(
    `/super-admin/gate-devices/schools/${organizationId}/devices`,
    body
  );
  return data.data;
}

export async function rotateGateDeviceApiKey(organizationId: string, deviceId: string) {
  const { data } = await api.post<{ success: boolean; data: { id: string; deviceCode: string; apiKey: string } }>(
    `/super-admin/gate-devices/schools/${organizationId}/devices/${deviceId}/api-key/rotate`
  );
  return data.data;
}

export async function updateGateDevice(
  organizationId: string,
  deviceId: string,
  body: Record<string, unknown>
) {
  const { data } = await api.patch<{ success: boolean; data: GateDevice }>(
    `/super-admin/gate-devices/schools/${organizationId}/devices/${deviceId}`,
    body
  );
  return data.data;
}

export async function deleteGateDevice(organizationId: string, deviceId: string) {
  const { data } = await api.delete<{ success: boolean; data: { id: string; deleted: boolean } }>(
    `/super-admin/gate-devices/schools/${organizationId}/devices/${deviceId}`
  );
  return data.data;
}

export async function updateGateDeviceWifi(
  organizationId: string,
  deviceId: string,
  wifi: { wifiSsid: string; wifiPassword: string }
) {
  return updateGateDevice(organizationId, deviceId, wifi);
}

export const ATTENDANCE_API_BASE = 'https://attendance-api.shuleplus.rw/api';
export const GATE_API_URL = `${ATTENDANCE_API_BASE}/gate_attendance`;
export const DEVICE_CONFIG_URL = `${ATTENDANCE_API_BASE}/device_config`;
export const DEVICE_HEARTBEAT_URL = `${ATTENDANCE_API_BASE}/device_heartbeat`;

export function buildArduinoSnippet(deviceCode: string, apiKey: string) {
  return `const char* DEVICE_ID = "${deviceCode}";
const char* API_KEY = "${apiKey}";

const char* CONFIG_URL      = "${DEVICE_CONFIG_URL}";
const char* GATE_BATCH_URL  = "${ATTENDANCE_API_BASE}/gate_attendance/batch";
const char* HEARTBEAT_URL   = "${DEVICE_HEARTBEAT_URL}";

// Always-queue firmware (ShulePlus_Gate_Reader.ino):
// 1. Tap → save locally (never waits on HTTPS)
// 2. Background batch sync → GATE_BATCH_URL
// 3. Wi-Fi from Super Admin (CONFIG_URL) or AP SHULEPLUS-<DEVICE_ID> / shuleplus
// LED: BLUE = Wi-Fi online · RED = no Wi-Fi · GREEN = tap saved`;
}

/** UI presence: ONLINE only if heartbeat within ~75s (matches Attendance API). */
export function isGateDeviceOnline(status?: string | null, lastSeenAt?: string | null) {
  if (status === 'DISABLED') return false;
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= 75_000;
}
