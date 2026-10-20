export interface PaginatedList<T> {
  success?: boolean;
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'MAINTENANCE';
export type SyncStatus = 'SYNCED' | 'PENDING' | 'FAILED' | 'OFFLINE';

export interface RfidDevice {
  id: string;
  deviceName: string;
  deviceCode: string;
  serialNumber?: string | null;
  deviceType: string;
  firmwareVersion?: string | null;
  location: string;
  gateEntrance?: string | null;
  attendanceZone?: string | null;
  installationDate?: string | null;
  status: DeviceStatus;
  syncStatus: SyncStatus;
  lastSeenAt?: string | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  wifiSsid?: string | null;
  wifiSignalDbm?: number | null;
  wifiQuality?: string | null;
  batteryLevel?: number | null;
  batteryCharging?: boolean;
  batteryVoltage?: number | null;
  batteryUpdatedAt?: string | null;
  storageTotalMb?: number | null;
  storageUsedMb?: number | null;
  storageUsedPct?: number | null;
  pendingOfflineEvents?: number;
  todayScans: number;
  timeZone?: string | null;
  deviceClock?: string | null;
  clockSynced?: boolean;
  serverConnected?: boolean;
  lastHeartbeatAt?: string | null;
  lastSyncAt?: string | null;
  serverResponseMs?: number | null;
  pendingEvents?: number;
  failedEvents?: number;
}

export interface CardEvent {
  id: string;
  eventCode: string;
  deviceId: string;
  cardUid: string;
  studentId?: string | null;
  studentName?: string | null;
  timestamp: string;
  eventType: string;
  readerLocation?: string | null;
  direction?: string | null;
  readQuality?: number | null;
  syncStatus: SyncStatus;
  device?: RfidDevice;
}

export interface UnknownCard {
  id: string;
  cardUid: string;
  deviceCode?: string | null;
  location?: string | null;
  attempts: number;
  lastSeenAt: string;
  status: string;
}

export interface DeviceAlert {
  id: string;
  alertType: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  acknowledged: boolean;
  createdAt: string;
  device?: RfidDevice | null;
}

export interface DeviceCommand {
  id: string;
  commandCode: string;
  command: string;
  category?: string | null;
  issuedBy?: string | null;
  status: string;
  response?: string | null;
  completedAt?: string | null;
  createdAt: string;
  device?: RfidDevice;
}

export interface DeviceLog {
  id: string;
  category: string;
  level: string;
  message: string;
  createdAt: string;
}

export interface DashboardData {
  kpis: {
    devicesOnline: number;
    devicesOffline: number;
    lowBattery: number;
    wifiSignal: string;
    attendanceToday: number;
    cardsScannedToday: number;
    failedCardReads: number;
    pendingSync: number;
    offlineEventsPending: number;
  };
  attendance: {
    total: number;
    present: number;
    late: number;
    absent: number;
    unknownCards: number;
    duplicateReads: number;
    byGate: { gate: string; count: number; deviceCode: string; status: string }[];
  };
  timeline: { label: string; count: number }[];
  devices: RfidDevice[];
}

export interface DashboardSummary {
  organizationName?: string;
  organizationId?: string;
  kpis?: DashboardData['kpis'];
}

export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export interface ConfigProfile {
  id: string;
  name: string;
  description?: string | null;
  settings: Record<string, unknown>;
  deviceCount: number;
}

export interface FirmwareVersion {
  id: string;
  version: string;
  releaseNotes?: string | null;
  deviceCount: number;
  status: string;
  rolloutPct: number;
}

export interface OfflineStatus {
  pendingEvents: number;
  oldestEvent?: string | null;
  storageUsedPct: number;
  connectionRestored: boolean;
  syncProgress: { synced: number; total: number };
}

/** Legacy sample-module scaffold — kept for unused scaffold routes */
export interface SampleRecord {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  createdBy: string;
  category?: string;
  description?: string;
  updatedAt?: string;
}
