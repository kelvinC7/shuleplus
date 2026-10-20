import type {
  ApiEnvelope,
  CardEvent,
  ConfigProfile,
  DashboardData,
  DeviceAlert,
  DeviceCommand,
  DeviceLog,
  FirmwareVersion,
  OfflineStatus,
  PaginatedList,
  RfidDevice,
  UnknownCard,
} from '@/types';
import { api } from './api';

export const deviceApi = {
  dashboard: () => api.get<ApiEnvelope<DashboardData>>('/dashboard'),
  liveAttendance: () => api.get<ApiEnvelope<DashboardData['attendance']>>('/attendance/live'),
  offlineStatus: () => api.get<ApiEnvelope<OfflineStatus>>('/offline-status'),

  devices: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<PaginatedList<RfidDevice>>('/devices', { params }),
  nextDeviceCode: () =>
    api.get<
      ApiEnvelope<{
        deviceCode: string;
        districtCode: string;
        schoolCode: string;
        district: string | null;
        sequence: number;
      }>
    >('/devices/next-code'),
  device: (id: string) => api.get<ApiEnvelope<RfidDevice>>(`/devices/${id}`),
  createDevice: (body: Record<string, unknown>) => api.post<ApiEnvelope<RfidDevice>>('/devices', body),
  updateDevice: (id: string, body: Record<string, unknown>) =>
    api.patch<ApiEnvelope<RfidDevice>>(`/devices/${id}`, body),
  deleteDevice: (id: string) => api.delete<ApiEnvelope<{ id: string }>>(`/devices/${id}`),

  sendCommand: (deviceId: string, body: { command: string; category?: string; confirmed?: boolean }) =>
    api.post<ApiEnvelope<DeviceCommand>>(`/devices/${deviceId}/commands`, body),
  bulkCommand: (body: { deviceIds: string[]; command: string; confirmed?: boolean }) =>
    api.post<ApiEnvelope<DeviceCommand[]>>('/devices/bulk-command', body),

  events: (params?: { page?: number; limit?: number; deviceId?: string; eventType?: string }) =>
    api.get<PaginatedList<CardEvent>>('/events', { params }),
  unknownCards: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedList<UnknownCard>>('/unknown-cards', { params }),
  unknownCardAction: (id: string, action: string, studentId?: string) =>
    api.post<ApiEnvelope<{ id: string; action: string }>>(`/unknown-cards/${id}/action`, {
      action,
      studentId,
    }),

  searchStudents: (q: string) =>
    api.get<ApiEnvelope<Array<{ id: string; studentCode: string; fullName: string; className?: string | null; rfidUid?: string | null }>>>(
      '/students/search',
      { params: { q } }
    ),

  alerts: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedList<DeviceAlert>>('/alerts', { params }),
  commands: (params?: { page?: number; limit?: number; deviceId?: string }) =>
    api.get<PaginatedList<DeviceCommand>>('/commands', { params }),
  logs: (deviceId: string, params?: { page?: number; limit?: number; category?: string }) =>
    api.get<PaginatedList<DeviceLog>>(`/devices/${deviceId}/logs`, { params }),

  profiles: () => api.get<ApiEnvelope<ConfigProfile[]>>('/profiles'),
  firmware: () => api.get<ApiEnvelope<FirmwareVersion[]>>('/firmware'),
};
