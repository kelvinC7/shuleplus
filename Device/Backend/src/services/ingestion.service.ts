import { randomBytes } from 'crypto';
import { EventType, SyncStatus, DeviceStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { fetchStudentByRfidUid, normalizeCardUid } from '../clients/student-management.client';

export type IngestEventInput = {
  eventId?: string;
  cardUid: string;
  timestamp?: string;
  eventType?: string;
  direction?: string;
  readQuality?: number;
  syncStatus?: string;
  studentId?: string;
  studentName?: string;
};

export type IngestHeartbeatInput = {
  batteryLevel?: number;
  batteryCharging?: boolean;
  batteryVoltage?: number;
  wifiSsid?: string;
  wifiSignalDbm?: number;
  wifiQuality?: string;
  ipAddress?: string;
  storageUsedMb?: number;
  storageTotalMb?: number;
  pendingOfflineEvents?: number;
  deviceClock?: string;
  clockSynced?: boolean;
  serverConnected?: boolean;
  firmwareVersion?: string;
};

const EVENT_TYPE_MAP: Record<string, EventType> = {
  ENTRY: EventType.ENTRY,
  EXIT: EventType.EXIT,
  ATTENDANCE: EventType.ATTENDANCE,
  RE_ENTRY: EventType.RE_ENTRY,
  'RE-ENTRY': EventType.RE_ENTRY,
  UNKNOWN: EventType.UNKNOWN_CARD,
  UNKNOWN_CARD: EventType.UNKNOWN_CARD,
  BLOCKED: EventType.BLOCKED_CARD,
  BLOCKED_CARD: EventType.BLOCKED_CARD,
  DUPLICATE: EventType.DUPLICATE_SCAN,
  DUPLICATE_SCAN: EventType.DUPLICATE_SCAN,
  INVALID: EventType.INVALID_CARD,
  INVALID_CARD: EventType.INVALID_CARD,
  OFFLINE: EventType.OFFLINE_EVENT,
  OFFLINE_EVENT: EventType.OFFLINE_EVENT,
  MANUAL: EventType.MANUAL_OVERRIDE,
  MANUAL_OVERRIDE: EventType.MANUAL_OVERRIDE,
};

function mapEventType(raw?: string): EventType {
  if (!raw) return EventType.ENTRY;
  const key = raw.trim().toUpperCase().replace(/\s+/g, '_');
  return EVENT_TYPE_MAP[key] ?? EventType.ATTENDANCE;
}

function wifiQualityFromDbm(dbm?: number) {
  if (dbm == null) return null;
  if (dbm >= -55) return 'Excellent';
  if (dbm >= -65) return 'Good';
  if (dbm >= -75) return 'Fair';
  return 'Weak';
}

export function generateDeviceCredentials() {
  return {
    authToken: randomBytes(24).toString('hex'),
    deviceSecret: randomBytes(32).toString('hex'),
  };
}

export async function authenticateDevice(deviceCode: string, token: string) {
  const device = await prisma.rfidReaderDevice.findFirst({
    where: { deviceCode: deviceCode.trim().toUpperCase() },
  });
  if (!device) throw new AppError(401, 'Unknown device');
  const valid =
    (device.authToken && device.authToken === token) ||
    (device.deviceSecret && device.deviceSecret === token);
  if (!valid) throw new AppError(401, 'Invalid device credentials');
  return device;
}

export async function ingestHeartbeat(deviceId: string, input: IngestHeartbeatInput) {
  const now = new Date();
  const wifiQuality = input.wifiQuality ?? wifiQualityFromDbm(input.wifiSignalDbm) ?? undefined;
  return prisma.rfidReaderDevice.update({
    where: { id: deviceId },
    data: {
      status: DeviceStatus.ONLINE,
      lastSeenAt: now,
      lastHeartbeatAt: now,
      batteryLevel: input.batteryLevel,
      batteryCharging: input.batteryCharging,
      batteryVoltage: input.batteryVoltage,
      batteryUpdatedAt: input.batteryLevel != null ? now : undefined,
      wifiSsid: input.wifiSsid,
      wifiSignalDbm: input.wifiSignalDbm,
      wifiQuality,
      ipAddress: input.ipAddress,
      storageUsedMb: input.storageUsedMb,
      storageTotalMb: input.storageTotalMb,
      pendingOfflineEvents: input.pendingOfflineEvents,
      deviceClock: input.deviceClock ? new Date(input.deviceClock) : undefined,
      clockSynced: input.clockSynced,
      serverConnected: input.serverConnected ?? true,
      firmwareVersion: input.firmwareVersion,
      syncStatus: SyncStatus.SYNCED,
      lastSyncAt: now,
    },
  });
}

export async function ingestCardEvent(deviceId: string, input: IngestEventInput) {
  const device = await prisma.rfidReaderDevice.findUnique({ where: { id: deviceId } });
  if (!device) throw new AppError(404, 'Device not found');

  const cardUidRaw = input.cardUid.trim();
  if (!cardUidRaw) throw new AppError(400, 'cardUid is required');

  const normalizedUid = normalizeCardUid(cardUidRaw);
  const timestamp = input.timestamp ? new Date(input.timestamp) : new Date();
  if (Number.isNaN(timestamp.getTime())) throw new AppError(400, 'Invalid timestamp');

  let eventType = mapEventType(input.eventType);
  let studentId = input.studentId ?? null;
  let studentName = input.studentName ?? null;

  const student = await fetchStudentByRfidUid(device.organizationId, normalizedUid);
  if (student) {
    studentId = student.id;
    studentName = student.fullName;
    if (eventType === EventType.UNKNOWN_CARD) eventType = EventType.ENTRY;
  } else {
    const knownUnknownTypes: EventType[] = [
      EventType.UNKNOWN_CARD,
      EventType.BLOCKED_CARD,
      EventType.INVALID_CARD,
      EventType.DUPLICATE_SCAN,
    ];
    if (!knownUnknownTypes.includes(eventType)) {
      eventType = EventType.UNKNOWN_CARD;
      await upsertUnknownCard(device.organizationId, cardUidRaw, device);
    }
  }

  const syncStatus =
    input.syncStatus?.toUpperCase() === 'PENDING' || input.syncStatus?.toUpperCase() === 'OFFLINE'
      ? SyncStatus.PENDING
      : SyncStatus.SYNCED;

  const eventCode =
    input.eventId?.trim() ||
    `EVT-${device.deviceCode}-${timestamp.getTime()}-${normalizedUid.slice(-4)}`;

  const existing = await prisma.cardEvent.findFirst({
    where: { organizationId: device.organizationId, eventCode },
  });
  if (existing) {
    return { duplicate: true, event: existing };
  }

  const created = await prisma.cardEvent.create({
    data: {
      organizationId: device.organizationId,
      deviceId: device.id,
      eventCode,
      cardUid: cardUidRaw.includes('*') ? cardUidRaw : `****${normalizedUid.slice(-4)}`,
      studentId,
      studentName,
      timestamp,
      eventType,
      readerLocation: device.location,
      direction: input.direction,
      readQuality: input.readQuality,
      syncStatus,
    },
    include: { device: true },
  });

  await prisma.rfidReaderDevice.update({
    where: { id: device.id },
    data: {
      todayScans: { increment: 1 },
      lastSeenAt: new Date(),
      status: DeviceStatus.ONLINE,
      pendingOfflineEvents:
        syncStatus === SyncStatus.PENDING
          ? Math.max(0, (device.pendingOfflineEvents ?? 0))
          : device.pendingOfflineEvents,
    },
  });

  await prisma.deviceLog.create({
    data: {
      organizationId: device.organizationId,
      deviceId: device.id,
      category: 'card',
      level: 'INFO',
      message: `Card scanned: ${created.cardUid} → ${eventType}${studentName ? ` (${studentName})` : ''}`,
    },
  });

  return { duplicate: false, event: created, studentLinked: Boolean(student) };
}

async function upsertUnknownCard(
  organizationId: string,
  cardUid: string,
  device: { deviceCode: string; location: string }
) {
  const masked = cardUid.includes('*') ? cardUid : `****${normalizeCardUid(cardUid).slice(-4)}`;
  const existing = await prisma.unknownCard.findFirst({
    where: { organizationId, cardUid: masked },
  });
  if (existing) {
    await prisma.unknownCard.update({
      where: { id: existing.id },
      data: { attempts: { increment: 1 }, lastSeenAt: new Date(), status: 'open' },
    });
  } else {
    await prisma.unknownCard.create({
      data: {
        organizationId,
        cardUid: masked,
        deviceCode: device.deviceCode,
        location: device.location,
        lastSeenAt: new Date(),
      },
    });
  }
}

export async function ingestCardEventBatch(deviceId: string, events: IngestEventInput[]) {
  const results = [];
  for (const ev of events) {
    results.push(await ingestCardEvent(deviceId, { ...ev, syncStatus: ev.syncStatus ?? 'PENDING' }));
  }
  const device = await prisma.rfidReaderDevice.findUnique({ where: { id: deviceId } });
  if (device) {
    const pending = results.filter((r) => r.event.syncStatus === SyncStatus.PENDING).length;
    await prisma.rfidReaderDevice.update({
      where: { id: deviceId },
      data: {
        pendingOfflineEvents: Math.max(0, pending),
        syncStatus: pending > 0 ? SyncStatus.PENDING : SyncStatus.SYNCED,
        lastSyncAt: new Date(),
      },
    });
  }
  return results;
}
