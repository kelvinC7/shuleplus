import {
  AlertSeverity,
  CommandStatus,
  DeviceStatus,
  EventType,
  SyncStatus,
} from '../generated/prisma';
import { prisma } from '../config/database';
import { generateDeviceCredentials } from './ingestion.service';

function minutesAgo(min: number) {
  return new Date(Date.now() - min * 60_000);
}

function secondsAgo(sec: number) {
  return new Date(Date.now() - sec * 1000);
}

function todayAt(h: number, m: number) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

export async function seedOrganizationDemo(organizationId: string, organizationName: string) {
  const existing = await prisma.rfidReaderDevice.count({ where: { organizationId } });
  if (existing > 0) return;

  const profile = await prisma.configProfile.create({
    data: {
      organizationId,
      name: 'Primary School RFID Profile',
      description: 'Default gate reader configuration with offline mode and duplicate protection',
      settings: {
        wifi: { autoReconnect: true },
        time: { automaticSync: true, ntpServer: 'pool.ntp.org' },
        attendance: { duplicateProtection: true, offlineMode: true },
        reader: { scanTimeoutSec: 2, duplicateIntervalSec: 10 },
        security: { encryptedCommunication: true },
      },
      deviceCount: 4,
    },
  });

  const demoCreds = generateDeviceCredentials();

  const devices = await Promise.all([
    prisma.rfidReaderDevice.create({
      data: {
        organizationId,
        deviceName: 'Main Gate Reader',
        deviceCode: 'RFID-001',
        serialNumber: 'SN-2026-001-A',
        deviceType: 'Gate Reader',
        firmwareVersion: 'v2.4.1',
        location: 'Main Gate',
        gateEntrance: 'Main Gate',
        attendanceZone: 'Primary Campus',
        installationDate: new Date('2025-09-01'),
        status: DeviceStatus.ONLINE,
        syncStatus: SyncStatus.SYNCED,
        lastSeenAt: secondsAgo(8),
        ipAddress: '192.168.1.101',
        macAddress: 'AA:BB:CC:DD:01:01',
        wifiSsid: 'School-WiFi',
        wifiSignalDbm: -48,
        wifiQuality: 'Excellent',
        batteryLevel: 87,
        batteryCharging: true,
        batteryVoltage: 4.1,
        batteryUpdatedAt: secondsAgo(30),
        storageTotalMb: 512,
        storageUsedMb: 215,
        pendingOfflineEvents: 0,
        todayScans: 426,
        timeZone: 'Africa/Kigali',
        deviceClock: new Date(),
        clockSynced: true,
        serverConnected: true,
        lastHeartbeatAt: secondsAgo(8),
        lastSyncAt: secondsAgo(10),
        serverResponseMs: 42,
        configProfileId: profile.id,
        authToken: demoCreds.authToken,
        deviceSecret: demoCreds.deviceSecret,
      },
    }),
    prisma.rfidReaderDevice.create({
      data: {
        organizationId,
        deviceName: 'Secondary Gate Reader',
        deviceCode: 'RFID-002',
        serialNumber: 'SN-2026-002-B',
        firmwareVersion: 'v2.4.1',
        location: 'Secondary Gate',
        gateEntrance: 'Secondary Gate',
        attendanceZone: 'Primary Campus',
        status: DeviceStatus.ONLINE,
        syncStatus: SyncStatus.SYNCED,
        lastSeenAt: secondsAgo(24),
        ipAddress: '192.168.1.102',
        wifiSsid: 'School-WiFi',
        wifiSignalDbm: -58,
        wifiQuality: 'Good',
        batteryLevel: 64,
        batteryCharging: false,
        storageTotalMb: 512,
        storageUsedMb: 180,
        todayScans: 318,
        lastSyncAt: secondsAgo(24),
        serverConnected: true,
        configProfileId: profile.id,
      },
    }),
    prisma.rfidReaderDevice.create({
      data: {
        organizationId,
        deviceName: 'Boarding Gate Reader',
        deviceCode: 'RFID-003',
        serialNumber: 'SN-2026-003-C',
        firmwareVersion: 'v2.4.0',
        location: 'Boarding Gate',
        gateEntrance: 'Boarding Gate',
        attendanceZone: 'Boarding',
        status: DeviceStatus.OFFLINE,
        syncStatus: SyncStatus.PENDING,
        lastSeenAt: minutesAgo(18),
        batteryLevel: 31,
        wifiQuality: null,
        storageTotalMb: 512,
        storageUsedMb: 420,
        pendingOfflineEvents: 24,
        todayScans: 201,
        lastSyncAt: minutesAgo(18),
        serverConnected: false,
        configProfileId: profile.id,
      },
    }),
    prisma.rfidReaderDevice.create({
      data: {
        organizationId,
        deviceName: 'Staff Gate Reader',
        deviceCode: 'RFID-004',
        serialNumber: 'SN-2026-004-D',
        firmwareVersion: 'v2.4.1',
        location: 'Staff Gate',
        gateEntrance: 'Staff Gate',
        attendanceZone: 'Staff',
        status: DeviceStatus.WARNING,
        syncStatus: SyncStatus.SYNCED,
        lastSeenAt: secondsAgo(45),
        wifiSignalDbm: -76,
        wifiQuality: 'Weak',
        batteryLevel: 18,
        storageTotalMb: 512,
        storageUsedMb: 465,
        todayScans: 109,
        lastSyncAt: secondsAgo(45),
        clockSynced: false,
        serverConnected: true,
        configProfileId: profile.id,
      },
    }),
  ]);

  const eventRows = [
    { student: 'Jean Claude', uid: '4821', type: EventType.ENTRY, h: 7, m: 31 },
    { student: 'Alice Uwase', uid: '9182', type: EventType.ENTRY, h: 7, m: 32 },
    { student: 'Eric Mugisha', uid: '3312', type: EventType.EXIT, h: 7, m: 42 },
    { student: 'Marie Claire', uid: '5521', type: EventType.ENTRY, h: 7, m: 35 },
    { student: 'Patrick N.', uid: '7712', type: EventType.ATTENDANCE, h: 8, m: 12 },
  ] as const;

  let eventIdx = 0;
  for (const e of eventRows) {
    const device = devices[0];
    await prisma.cardEvent.create({
      data: {
        organizationId,
        deviceId: device.id,
        eventCode: `EVT-${organizationId.slice(0, 4)}-${++eventIdx}`,
        cardUid: `****${e.uid}`,
        studentId: `STU-${e.uid}`,
        studentName: e.student,
        timestamp: todayAt(e.h, e.m),
        eventType: e.type,
        readerLocation: device.location,
        direction: e.type === EventType.EXIT ? 'Exit' : 'Entry',
        readQuality: 92,
        syncStatus: SyncStatus.SYNCED,
      },
    });
  }

  await prisma.unknownCard.createMany({
    data: [
      {
        organizationId,
        cardUid: '****4821',
        deviceCode: 'RFID-001',
        location: 'Main Gate',
        attempts: 3,
        lastSeenAt: todayAt(7, 15),
      },
      {
        organizationId,
        cardUid: '****7821',
        deviceCode: 'RFID-001',
        location: 'Main Gate',
        attempts: 1,
        lastSeenAt: todayAt(8, 5),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.deviceAlert.createMany({
    data: [
      {
        organizationId,
        deviceId: devices[2].id,
        alertType: 'device_offline',
        title: 'Device Offline',
        message: `${devices[2].deviceCode} has been offline for 18 minutes.`,
        severity: AlertSeverity.CRITICAL,
      },
      {
        organizationId,
        deviceId: devices[1].id,
        alertType: 'low_battery',
        title: 'Low Battery',
        message: `${devices[1].deviceCode} battery is at 64%.`,
        severity: AlertSeverity.WARNING,
      },
      {
        organizationId,
        deviceId: devices[3].id,
        alertType: 'weak_wifi',
        title: 'Weak Wi-Fi',
        message: `${devices[3].deviceCode} signal dropped below -75 dBm.`,
        severity: AlertSeverity.WARNING,
      },
      {
        organizationId,
        deviceId: devices[0].id,
        alertType: 'storage_full',
        title: 'Storage Almost Full',
        message: `${devices[0].deviceCode} storage is 91% full.`,
        severity: AlertSeverity.CRITICAL,
      },
      {
        organizationId,
        deviceId: devices[3].id,
        alertType: 'clock_sync',
        title: 'Clock Out of Sync',
        message: `${devices[3].deviceCode} clock differs from server by 3 minutes.`,
        severity: AlertSeverity.CRITICAL,
      },
      {
        organizationId,
        alertType: 'unknown_card',
        title: 'Unknown Card Detected',
        message: '7 unknown card reads today at Main Gate.',
        severity: AlertSeverity.WARNING,
      },
    ],
  });

  for (const device of devices) {
    await prisma.deviceLog.createMany({
      data: [
        { organizationId, deviceId: device.id, category: 'card', level: 'INFO', message: 'Card scanned' },
        { organizationId, deviceId: device.id, category: 'server', level: 'INFO', message: 'Event uploaded' },
        { organizationId, deviceId: device.id, category: 'wifi', level: 'INFO', message: 'Wi-Fi connected' },
        { organizationId, deviceId: device.id, category: 'wifi', level: 'WARN', message: 'Weak Wi-Fi signal' },
        { organizationId, deviceId: device.id, category: 'battery', level: 'INFO', message: 'Device heartbeat' },
      ],
    });
  }

  await prisma.firmwareVersion.createMany({
    data: [
      { organizationId, version: 'v2.4.1', deviceCount: 3, status: 'CURRENT', rolloutPct: 100 },
      { organizationId, version: 'v2.4.0', deviceCount: 1, status: 'UPDATE_AVAILABLE', rolloutPct: 25 },
    ],
    skipDuplicates: true,
  });

  await prisma.deviceCommand.create({
    data: {
      organizationId,
      deviceId: devices[0].id,
      commandCode: 'CMD-2026-008421',
      command: 'SYNC_TIME',
      category: 'time',
      issuedBy: 'System',
      status: CommandStatus.COMPLETED,
      response: 'Device time synchronized with server',
      completedAt: secondsAgo(120),
    },
  });

  void organizationName;
}

export async function seedGlobalDemoSchools() {
  const schools = [
    { id: 'org-kigali-demo', name: 'Green Hills Academy', province: 'Kigali', district: 'Gasabo' },
    { id: 'org-kigali-2', name: 'Kigali Parents School', province: 'Kigali', district: 'Kicukiro' },
    { id: 'org-south-1', name: 'Huye Secondary School', province: 'South', district: 'Huye' },
  ];

  for (const s of schools) {
    const tenant = await prisma.tenant.findFirst({ where: { organizationId: s.id } });
    if (!tenant) {
      await prisma.tenant.create({
        data: {
          organizationId: s.id,
          organizationName: s.name,
          province: s.province,
          district: s.district,
          status: 'ACTIVE',
        },
      });
      await seedOrganizationDemo(s.id, s.name);
    }
  }
}
