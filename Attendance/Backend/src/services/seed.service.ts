import { DeviceStatus, Prisma } from "../generated/prisma";
import { prisma } from "../config/database";

export async function seedTenantData(organizationId: string) {
  await prisma.attendanceSettings.upsert({
    where: { organizationId },
    update: {},
    create: {
      organizationId,
      schoolName: "School",
      academicYear: "2026-2027",
      term: "Term 1",
    },
  });

  const deviceCount = await prisma.rfidDevice.count({ where: { organizationId, deletedAt: null } });
  if (deviceCount === 0) {
    await prisma.rfidDevice.createMany({
      data: [
        {
          organizationId,
          deviceCode: "RFID-001",
          name: "Main Gate Entry",
          location: "Main Gate",
          gateName: "Main Gate",
          status: DeviceStatus.ONLINE,
          direction: "ENTRY",
          batteryPercent: 95,
          signalQuality: "Excellent",
          firmwareVersion: "1.0.0",
          lastSeenAt: new Date(),
        },
        {
          organizationId,
          deviceCode: "RFID-002",
          name: "Main Gate Exit",
          location: "Main Gate",
          gateName: "Main Gate",
          status: DeviceStatus.ONLINE,
          direction: "EXIT",
          batteryPercent: 92,
          signalQuality: "Excellent",
          firmwareVersion: "1.0.0",
          lastSeenAt: new Date(),
        },
      ],
    });
  }

}

export async function writeAudit(
  organizationId: string,
  action: string,
  opts?: { actorUserId?: string; entityType?: string; entityId?: string; detail?: string }
) {
  await prisma.auditLog.create({
    data: {
      organizationId,
      action,
      actorUserId: opts?.actorUserId,
      entityType: opts?.entityType,
      entityId: opts?.entityId,
      detail: opts?.detail,
    },
  });
}

export type { Prisma };
