import { prisma } from '../config/database';
import { seedGlobalDemoSchools } from './seed.service';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getSuperAdminOverview() {
  let tenantCount = await prisma.tenant.count();
  if (tenantCount === 0) {
    await seedGlobalDemoSchools();
    tenantCount = await prisma.tenant.count();
  }

  const today = startOfToday();
  const devices = await prisma.rfidReaderDevice.findMany({ include: { tenant: true } });
  const online = devices.filter((d) => d.status === 'ONLINE').length;
  const offline = devices.filter((d) => d.status === 'OFFLINE').length;
  const withAlerts = await prisma.deviceAlert.count({
    where: { acknowledged: false },
  });
  const eventsToday = await prisma.cardEvent.count({ where: { timestamp: { gte: today } } });
  const failedEvents = await prisma.cardEvent.count({
    where: {
      timestamp: { gte: today },
      eventType: { in: ['INVALID_CARD', 'UNKNOWN_CARD', 'BLOCKED_CARD'] },
    },
  });
  const pendingSync = devices.reduce((s, d) => s + d.pendingOfflineEvents + d.pendingEvents, 0);
  const attendanceToday = await prisma.cardEvent.count({
    where: {
      timestamp: { gte: today },
      eventType: { in: ['ENTRY', 'ATTENDANCE', 'RE_ENTRY'] },
    },
  });

  return {
    kpis: {
      totalSchools: tenantCount,
      totalDevices: devices.length,
      onlineDevices: online,
      offlineDevices: offline,
      devicesWithAlerts: withAlerts,
      studentsCheckedInToday: attendanceToday,
      cardEventsToday: eventsToday,
      failedEvents,
      pendingSynchronizations: pendingSync,
    },
    network: {
      online,
      offline,
      withAlerts,
    },
  };
}

export async function listSchools(query?: { page?: number; limit?: number; province?: string }) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
  const skip = (page - 1) * limit;
  const where = query?.province ? { province: query.province } : {};
  const [total, tenants] = await Promise.all([
    prisma.tenant.count({ where }),
    prisma.tenant.findMany({
      where,
      orderBy: { organizationName: 'asc' },
      skip,
      take: limit,
    }),
  ]);

  const enriched = await Promise.all(
    tenants.map(async (t) => {
      const devices = await prisma.rfidReaderDevice.findMany({
        where: { organizationId: t.organizationId },
      });
      return {
        ...t,
        deviceCount: devices.length,
        online: devices.filter((d) => d.status === 'ONLINE').length,
        offline: devices.filter((d) => d.status === 'OFFLINE').length,
        warning: devices.filter((d) => d.status === 'WARNING').length,
      };
    })
  );

  return { data: enriched, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getSchoolDevices(organizationId: string) {
  const tenant = await prisma.tenant.findFirst({ where: { organizationId } });
  if (!tenant) return null;
  const devices = await prisma.rfidReaderDevice.findMany({
    where: { organizationId },
    orderBy: { deviceCode: 'asc' },
  });
  return { tenant, devices };
}

export async function getRegionMap() {
  const tenants = await prisma.tenant.findMany();
  const regions = new Map<string, { schools: number; devices: number; online: number; offline: number }>();
  for (const t of tenants) {
    const key = t.province ?? 'Other';
    const entry = regions.get(key) ?? { schools: 0, devices: 0, online: 0, offline: 0 };
    entry.schools += 1;
    const devices = await prisma.rfidReaderDevice.findMany({ where: { organizationId: t.organizationId } });
    entry.devices += devices.length;
    entry.online += devices.filter((d) => d.status === 'ONLINE').length;
    entry.offline += devices.filter((d) => d.status === 'OFFLINE').length;
    regions.set(key, entry);
  }
  return Array.from(regions.entries()).map(([province, stats]) => ({ province, ...stats }));
}

export async function listAllDevices(query?: { page?: number; limit?: number; status?: string }) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
  const skip = (page - 1) * limit;
  const where = query?.status ? { status: query.status as never } : {};
  const [total, rows] = await Promise.all([
    prisma.rfidReaderDevice.count({ where }),
    prisma.rfidReaderDevice.findMany({
      where,
      include: { tenant: true },
      orderBy: { deviceCode: 'asc' },
      skip,
      take: limit,
    }),
  ]);
  return { data: rows, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listGlobalFirmware() {
  return prisma.firmwareVersion.findMany({ orderBy: { version: 'desc' } });
}

export async function listGlobalProfiles() {
  return prisma.configProfile.findMany({ orderBy: { name: 'asc' } });
}

export async function listGlobalEvents(query?: { page?: number; limit?: number }) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query?.limit) || 30));
  const skip = (page - 1) * limit;
  const [total, rows] = await Promise.all([
    prisma.cardEvent.count(),
    prisma.cardEvent.findMany({
      include: { device: true },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
  ]);
  return { data: rows, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
