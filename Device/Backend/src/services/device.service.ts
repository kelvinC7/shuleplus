import { CommandStatus, DeviceStatus, Prisma, SyncStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { generateDeviceCredentials } from './ingestion.service';
import {
  deviceCodePrefix,
  formatDeviceCode,
  parseDeviceCodeSequence,
} from '../utils/device-code';
import { resolveOrgProfile } from '../utils/org-profile';

type PageQuery = { page?: number; limit?: number; status?: string };

function parsePage(query?: PageQuery) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function mapDevice(row: Awaited<ReturnType<typeof prisma.rfidReaderDevice.findFirst>>) {
  if (!row) return row;
  const { deviceSecret, authToken, ...safe } = row;
  const storagePct =
    safe.storageTotalMb && safe.storageUsedMb
      ? Math.round((safe.storageUsedMb / safe.storageTotalMb) * 100)
      : null;
  return {
    ...safe,
    hasCredentials: Boolean(authToken),
    installationDate: safe.installationDate?.toISOString() ?? null,
    lastSeenAt: safe.lastSeenAt?.toISOString() ?? null,
    batteryUpdatedAt: safe.batteryUpdatedAt?.toISOString() ?? null,
    deviceClock: safe.deviceClock?.toISOString() ?? null,
    lastHeartbeatAt: safe.lastHeartbeatAt?.toISOString() ?? null,
    lastSyncAt: safe.lastSyncAt?.toISOString() ?? null,
    createdAt: safe.createdAt.toISOString(),
    updatedAt: safe.updatedAt.toISOString(),
    storageUsedPct: storagePct,
  };
}

export async function getDeviceCredentials(organizationId: string, id: string) {
  const row = await prisma.rfidReaderDevice.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, 'Device not found');
  return {
    deviceCode: row.deviceCode,
    authToken: row.authToken,
    ingestUrl: '/api/ingest/events',
    mqttTopic: `shuleplus/rfid/${row.deviceCode.toLowerCase()}/events`,
  };
}

export async function listDevices(organizationId: string, query?: PageQuery) {
  const { page, limit, skip } = parsePage(query);
  const where: Prisma.RfidReaderDeviceWhereInput = { organizationId };
  if (query?.status) {
    where.status = query.status as DeviceStatus;
  }
  const [total, rows] = await Promise.all([
    prisma.rfidReaderDevice.count({ where }),
    prisma.rfidReaderDevice.findMany({
      where,
      include: { configProfile: true },
      orderBy: { deviceCode: 'asc' },
      skip,
      take: limit,
    }),
  ]);
  return {
    data: rows.map((r) => mapDevice(r)),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getDevice(organizationId: string, id: string) {
  const row = await prisma.rfidReaderDevice.findFirst({
    where: { id, organizationId },
    include: { configProfile: true },
  });
  if (!row) throw new AppError(404, 'Device not found');
  return mapDevice(row);
}

async function nextDeviceSequence(organizationId: string, prefix: string): Promise<number> {
  const rows = await prisma.rfidReaderDevice.findMany({
    where: { organizationId },
    select: { deviceCode: true },
  });

  let maxSeq = 0;
  for (const row of rows) {
    const code = row.deviceCode.toUpperCase();
    if (code.startsWith(prefix.toUpperCase())) {
      const seq = parseDeviceCodeSequence(code);
      if (seq != null) maxSeq = Math.max(maxSeq, seq);
    }
  }

  return Math.min(maxSeq + 1, 999);
}

export async function previewNextDeviceCode(organizationId: string) {
  const profile = await resolveOrgProfile(organizationId);
  const prefix = deviceCodePrefix(profile.districtCode, profile.schoolCodeNumeric);
  const sequence = await nextDeviceSequence(organizationId, prefix);
  const deviceCode = formatDeviceCode(profile.districtCode, profile.schoolCodeNumeric, sequence);

  return {
    deviceCode,
    districtCode: profile.districtCode,
    schoolCode: profile.schoolCodeNumeric,
    district: profile.district,
    sequence,
    prefix,
  };
}

export async function createDevice(
  organizationId: string,
  input: Record<string, unknown>
) {
  let deviceCode = String(input.deviceCode ?? input.deviceId ?? '').trim().toUpperCase();
  if (!deviceCode) {
    const preview = await previewNextDeviceCode(organizationId);
    deviceCode = preview.deviceCode;
  }

  const creds = generateDeviceCredentials();
  const data = {
    organizationId,
    deviceName: String(input.deviceName ?? deviceCode),
    deviceCode,
    serialNumber: input.serialNumber ? String(input.serialNumber) : null,
    deviceType: String(input.deviceType ?? 'Gate Reader'),
    firmwareVersion: input.firmwareVersion ? String(input.firmwareVersion) : null,
    location: String(input.location ?? 'Unassigned'),
    gateEntrance: input.gateEntrance ? String(input.gateEntrance) : null,
    attendanceZone: input.attendanceZone ? String(input.attendanceZone) : null,
    installationDate: input.installationDate ? new Date(String(input.installationDate)) : null,
    status: (input.status as DeviceStatus) ?? DeviceStatus.OFFLINE,
    ipAddress: input.ipAddress ? String(input.ipAddress) : null,
    macAddress: input.macAddress ? String(input.macAddress) : null,
    wifiSsid: input.wifiSsid ? String(input.wifiSsid) : null,
    timeZone: input.timeZone ? String(input.timeZone) : 'Africa/Kigali',
    authToken: creds.authToken,
    deviceSecret: creds.deviceSecret,
  };

  try {
    const created = await prisma.rfidReaderDevice.create({
      data,
      include: { configProfile: true },
    });
    return mapDevice(created);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const profile = await resolveOrgProfile(organizationId);
      let seq = parseDeviceCodeSequence(deviceCode) ?? (await nextDeviceSequence(organizationId, deviceCodePrefix(profile.districtCode, profile.schoolCodeNumeric)));

      for (let attempt = 0; attempt < 10; attempt++) {
        const nextCode = formatDeviceCode(profile.districtCode, profile.schoolCodeNumeric, seq + attempt);
        try {
          const created = await prisma.rfidReaderDevice.create({
            data: { ...data, deviceCode: nextCode },
            include: { configProfile: true },
          });
          return mapDevice(created);
        } catch (retryErr) {
          if (
            retryErr instanceof Prisma.PrismaClientKnownRequestError &&
            retryErr.code === 'P2002'
          ) {
            continue;
          }
          throw retryErr;
        }
      }

      const preview = await previewNextDeviceCode(organizationId);
      throw new AppError(
        409,
        `Device ID "${deviceCode}" is already registered. Try ${preview.deviceCode} instead.`
      );
    }
    throw err;
  }
}

export async function updateDevice(
  organizationId: string,
  id: string,
  input: Record<string, unknown>
) {
  const row = await prisma.rfidReaderDevice.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, 'Device not found');
  const updated = await prisma.rfidReaderDevice.update({
    where: { id },
    data: {
      deviceName: input.deviceName ? String(input.deviceName) : undefined,
      location: input.location ? String(input.location) : undefined,
      gateEntrance: input.gateEntrance ? String(input.gateEntrance) : undefined,
      attendanceZone: input.attendanceZone ? String(input.attendanceZone) : undefined,
      wifiSsid: input.wifiSsid ? String(input.wifiSsid) : undefined,
      timeZone: input.timeZone ? String(input.timeZone) : undefined,
      status: input.status ? (input.status as DeviceStatus) : undefined,
    },
    include: { configProfile: true },
  });
  return mapDevice(updated);
}

export async function deleteDevice(organizationId: string, id: string) {
  const row = await prisma.rfidReaderDevice.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, 'Device not found');
  await prisma.rfidReaderDevice.delete({ where: { id } });
  return { id };
}

const DESTRUCTIVE = new Set(['FACTORY_RESET', 'CLEAR_SYNCED_EVENTS', 'SHUTDOWN']);

export async function issueCommand(
  organizationId: string,
  deviceId: string,
  input: { command: string; category?: string; issuedBy?: string; confirmed?: boolean }
) {
  const device = await prisma.rfidReaderDevice.findFirst({ where: { id: deviceId, organizationId } });
  if (!device) throw new AppError(404, 'Device not found');
  const requiresConfirm = DESTRUCTIVE.has(input.command);
  if (requiresConfirm && !input.confirmed) {
    throw new AppError(400, 'This command requires confirmation');
  }
  const code = `CMD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const cmd = await prisma.deviceCommand.create({
    data: {
      organizationId,
      deviceId,
      commandCode: code,
      command: input.command,
      category: input.category ?? 'general',
      issuedBy: input.issuedBy ?? 'Admin',
      requiresConfirm,
      status: CommandStatus.COMPLETED,
      response: `${input.command} acknowledged by device`,
      completedAt: new Date(),
    },
  });
  if (input.command === 'SYNC_NOW' || input.command === 'SYNC_TIME') {
    await prisma.rfidReaderDevice.update({
      where: { id: deviceId },
      data: { lastSyncAt: new Date(), syncStatus: SyncStatus.SYNCED, clockSynced: true },
    });
  }
  return cmd;
}

export async function listCommands(organizationId: string, deviceId?: string, query?: PageQuery) {
  const { page, limit, skip } = parsePage(query);
  const where: Prisma.DeviceCommandWhereInput = { organizationId };
  if (deviceId) where.deviceId = deviceId;
  const [total, rows] = await Promise.all([
    prisma.deviceCommand.count({ where }),
    prisma.deviceCommand.findMany({
      where,
      include: { device: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);
  return {
    data: rows.map((r) => ({
      ...r,
      completedAt: r.completedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function listAlerts(organizationId: string, query?: PageQuery) {
  const { page, limit, skip } = parsePage(query);
  const where = { organizationId };
  const [total, rows] = await Promise.all([
    prisma.deviceAlert.count({ where }),
    prisma.deviceAlert.findMany({
      where,
      include: { device: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);
  return {
    data: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function listLogs(
  organizationId: string,
  deviceId: string,
  query?: PageQuery & { category?: string }
) {
  const { page, limit, skip } = parsePage(query);
  const where: Prisma.DeviceLogWhereInput = { organizationId, deviceId };
  if (query?.category && query.category !== 'all') where.category = query.category;
  const [total, rows] = await Promise.all([
    prisma.deviceLog.count({ where }),
    prisma.deviceLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);
  return {
    data: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function listProfiles(organizationId: string) {
  return prisma.configProfile.findMany({
    where: { OR: [{ organizationId }, { isGlobal: true }] },
    orderBy: { name: 'asc' },
  });
}

export async function listFirmware(organizationId: string) {
  return prisma.firmwareVersion.findMany({
    where: { OR: [{ organizationId }, { organizationId: null }] },
    orderBy: { version: 'desc' },
  });
}

export async function bulkCommand(
  organizationId: string,
  deviceIds: string[],
  input: { command: string; issuedBy?: string; confirmed?: boolean }
) {
  const results = [];
  for (const id of deviceIds) {
    results.push(await issueCommand(organizationId, id, input));
  }
  return results;
}
