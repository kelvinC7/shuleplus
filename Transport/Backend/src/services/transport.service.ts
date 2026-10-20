import {
  AlertSeverity,
  AlertType,
  BoardingType,
  BusStatus,
  CardStatus,
  DeviceStatus,
  EmergencyStatus,
  EmergencyType,
  FeeStatus,
  NotificationChannel,
  PassengerMark,
  Prisma,
  StaffStatus,
  StudentTransportState,
  TripDirection,
  TripStatus,
} from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { fetchStudentByRfidUid, isStudentManagementEnabled } from "../clients/student-management.client";
import { writeAudit } from "./seed.service";

function dateOnly(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function nowMinutes(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

function parseHm(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function str(v: unknown) {
  return v === undefined || v === null ? undefined : String(v);
}

function num(v: unknown) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function bool(v: unknown) {
  if (v === undefined) return undefined;
  return Boolean(v);
}

function isBoardedMark(mark: PassengerMark) {
  return mark === PassengerMark.BOARDED || mark === PassengerMark.MANUAL || mark === PassengerMark.EXITED;
}

function isMissingMark(mark: PassengerMark) {
  return mark === PassengerMark.EXPECTED || mark === PassengerMark.MISSING;
}

export async function getOrCreateSettings(organizationId: string) {
  return prisma.transportSettings.upsert({
    where: { organizationId },
    update: {},
    create: { organizationId },
  });
}

export async function updateSettings(organizationId: string, body: Record<string, unknown>) {
  await getOrCreateSettings(organizationId);
  return prisma.transportSettings.update({
    where: { organizationId },
    data: {
      ...(body.enableParentNotify !== undefined ? { enableParentNotify: Boolean(body.enableParentNotify) } : {}),
      ...(body.enableSms !== undefined ? { enableSms: Boolean(body.enableSms) } : {}),
      ...(body.enableEmail !== undefined ? { enableEmail: Boolean(body.enableEmail) } : {}),
      ...(body.enableWhatsapp !== undefined ? { enableWhatsapp: Boolean(body.enableWhatsapp) } : {}),
      ...(body.enablePush !== undefined ? { enablePush: Boolean(body.enablePush) } : {}),
      ...(body.requireReconciliation !== undefined
        ? { requireReconciliation: Boolean(body.requireReconciliation) }
        : {}),
      ...(body.allowWrongBus !== undefined ? { allowWrongBus: Boolean(body.allowWrongBus) } : {}),
      ...(body.duplicateTapSeconds !== undefined ? { duplicateTapSeconds: Number(body.duplicateTapSeconds) } : {}),
      ...(body.morningStart !== undefined ? { morningStart: String(body.morningStart) } : {}),
      ...(body.schoolArrival !== undefined ? { schoolArrival: String(body.schoolArrival) } : {}),
      ...(body.afternoonStart !== undefined ? { afternoonStart: String(body.afternoonStart) } : {}),
      ...(body.homeArrival !== undefined ? { homeArrival: String(body.homeArrival) } : {}),
      ...(body.academicYear !== undefined ? { academicYear: String(body.academicYear) } : {}),
      ...(body.term !== undefined ? { term: String(body.term) } : {}),
      ...(body.schoolName !== undefined ? { schoolName: String(body.schoolName) } : {}),
    },
  });
}

async function raiseAlert(
  organizationId: string,
  type: AlertType,
  title: string,
  message: string,
  severity: AlertSeverity = AlertSeverity.WARNING,
  related?: { relatedType?: string; relatedId?: string }
) {
  return prisma.safetyAlert.create({
    data: { organizationId, type, title, message, severity, ...related },
  });
}

async function queueParentNotify(
  organizationId: string,
  studentName: string,
  studentCode: string | null | undefined,
  title: string,
  message: string
) {
  const settings = await getOrCreateSettings(organizationId);
  if (!settings.enableParentNotify) return;

  const parents = await prisma.parentContact.findMany({
    where: {
      organizationId,
      deletedAt: null,
      OR: [
        ...(studentCode ? [{ studentCode }] : []),
        { studentName: { equals: studentName, mode: "insensitive" } },
      ],
    },
  });

  const channels: NotificationChannel[] = [];
  if (settings.enablePush) channels.push(NotificationChannel.PUSH);
  if (settings.enableEmail) channels.push(NotificationChannel.EMAIL);
  if (settings.enableSms) channels.push(NotificationChannel.SMS);
  if (settings.enableWhatsapp) channels.push(NotificationChannel.WHATSAPP);
  if (!channels.length) channels.push(NotificationChannel.APP);

  for (const p of parents.length ? parents : [null]) {
    for (const channel of channels) {
      if (p) {
        if (channel === NotificationChannel.SMS && !p.notifySms) continue;
        if (channel === NotificationChannel.EMAIL && !p.notifyEmail) continue;
        if (channel === NotificationChannel.WHATSAPP && !p.notifyWhatsapp) continue;
        if (channel === NotificationChannel.PUSH && !p.notifyPush) continue;
      }
      await prisma.parentNotification.create({
        data: {
          organizationId,
          parentId: p?.id,
          studentName,
          channel,
          title,
          message,
          sentAt: new Date(),
          status: "SENT",
        },
      });
    }
  }
}

function isAfternoon(settings: { morningStart: string; afternoonStart: string }) {
  const now = nowMinutes();
  return now >= parseHm(settings.afternoonStart);
}

async function refreshTripCounts(tripId: string) {
  const passengers = await prisma.tripPassenger.findMany({ where: { tripId } });
  const boarded = passengers.filter((p) => isBoardedMark(p.mark)).length;
  const exited = passengers.filter((p) => p.mark === PassengerMark.EXITED).length;
  const missing = passengers.filter((p) => isMissingMark(p.mark)).length;
  await prisma.trip.update({
    where: { id: tripId },
    data: {
      expectedCount: passengers.length,
      boardedCount: boarded,
      exitedCount: exited,
      missingCount: missing,
    },
  });
}

const tripInclude = {
  bus: true,
  route: { include: { stops: { orderBy: { sequence: "asc" as const } } } },
  driver: true,
  attendant: true,
  passengers: { orderBy: { studentName: "asc" as const } },
} satisfies Prisma.TripInclude;

export async function dashboard(organizationId: string) {
  const today = dateOnly();
  const settings = await getOrCreateSettings(organizationId);
  const [
    totalBuses,
    activeBuses,
    movingBuses,
    maintenanceBuses,
    students,
    onBus,
    expected,
    missing,
    activeDrivers,
    activeAttendants,
    liveTrips,
    alerts,
    recentEvents,
  ] = await Promise.all([
    prisma.bus.count({ where: { organizationId, deletedAt: null } }),
    prisma.bus.count({ where: { organizationId, deletedAt: null, status: BusStatus.ACTIVE } }),
    prisma.trip.count({ where: { organizationId, tripDate: today, status: TripStatus.LIVE } }),
    prisma.bus.count({ where: { organizationId, deletedAt: null, status: BusStatus.MAINTENANCE } }),
    prisma.studentAssignment.count({ where: { organizationId, deletedAt: null } }),
    prisma.studentAssignment.count({
      where: { organizationId, deletedAt: null, liveState: StudentTransportState.ON_BUS },
    }),
    prisma.studentAssignment.count({
      where: { organizationId, deletedAt: null, liveState: StudentTransportState.EXPECTED },
    }),
    prisma.studentAssignment.count({
      where: { organizationId, deletedAt: null, liveState: StudentTransportState.MISSING },
    }),
    prisma.driver.count({ where: { organizationId, deletedAt: null, status: StaffStatus.ACTIVE } }),
    prisma.attendant.count({ where: { organizationId, deletedAt: null, status: StaffStatus.ACTIVE } }),
    prisma.trip.findMany({
      where: {
        organizationId,
        tripDate: today,
        status: { in: [TripStatus.BOARDING, TripStatus.LIVE] },
      },
      include: tripInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.safetyAlert.count({ where: { organizationId, resolved: false } }),
    prisma.boardingEvent.findMany({
      where: { organizationId },
      orderBy: { scannedAt: "desc" },
      take: 12,
    }),
  ]);

  const late = await prisma.safetyAlert.count({
    where: { organizationId, resolved: false, type: AlertType.LATE_BOARDING },
  });

  return {
    organizationName: settings.schoolName || "School",
    academicYear: settings.academicYear,
    term: settings.term,
    kpis: {
      totalBuses,
      activeBuses,
      studentsAssigned: students,
      studentsOnBuses: onBus,
      notYetBoarded: expected + missing,
      lateOrMissed: late + missing,
      busesMoving: movingBuses,
      maintenanceBuses,
      activeDrivers,
      activeAttendants,
      openAlerts: alerts,
    },
    liveTrips,
    recentEvents,
  };
}

export async function liveOperations(organizationId: string) {
  const data = await dashboard(organizationId);
  const today = dateOnly();
  const [buses, alerts, emergencies, missingStudents] = await Promise.all([
    prisma.bus.findMany({
      where: { organizationId, deletedAt: null },
      include: { driver: true, attendant: true, route: true },
      orderBy: { code: "asc" },
    }),
    prisma.safetyAlert.findMany({
      where: { organizationId, resolved: false },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.emergency.findMany({
      where: { organizationId, status: { not: EmergencyStatus.RESOLVED } },
      include: { bus: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.studentAssignment.findMany({
      where: {
        organizationId,
        deletedAt: null,
        liveState: { in: [StudentTransportState.MISSING, StudentTransportState.EXPECTED] },
      },
      include: { morningBus: true, pickupStop: true },
      orderBy: { studentName: "asc" },
    }),
  ]);

  return {
    ...data,
    buses,
    alerts,
    emergencies,
    missingStudents,
    todayTrips: await prisma.trip.findMany({
      where: { organizationId, tripDate: today },
      include: tripInclude,
      orderBy: { createdAt: "desc" },
    }),
    refreshedAt: new Date().toISOString(),
  };
}

async function resolveCard(organizationId: string, cardNumber: string) {
  const normalized = cardNumber.trim().toUpperCase();
  let card = await prisma.rfidCard.findFirst({
    where: { organizationId, deletedAt: null, OR: [{ cardNumber: normalized }, { uid: normalized }] },
    include: { assignment: { include: { morningBus: true, afternoonBus: true, route: true, pickupStop: true } } },
  });
  if (card) return card;

  if (!isStudentManagementEnabled()) return null;
  const sm = await fetchStudentByRfidUid(organizationId, normalized);
  if (!sm) return null;

  const assignment = await prisma.studentAssignment.findFirst({
    where: { organizationId, deletedAt: null, studentCode: sm.studentCode },
    include: { morningBus: true, afternoonBus: true, route: true, pickupStop: true },
  });

  card = await prisma.rfidCard.create({
    data: {
      organizationId,
      cardNumber: normalized,
      uid: normalized,
      status: CardStatus.ACTIVE,
      assignmentId: assignment?.id,
      studentCode: sm.studentCode,
      studentName: sm.fullName,
      className: sm.className,
      issuedAt: new Date(),
      activatedAt: new Date(),
    },
    include: { assignment: { include: { morningBus: true, afternoonBus: true, route: true, pickupStop: true } } },
  });
  return card;
}

export async function processTap(
  organizationId: string,
  input: { cardNumber: string; deviceCode?: string; type?: BoardingType | string; busCode?: string }
) {
  const settings = await getOrCreateSettings(organizationId);
  const cardNumber = input.cardNumber.trim().toUpperCase();
  const card = await resolveCard(organizationId, cardNumber);

  if (!card) {
    await raiseAlert(
      organizationId,
      AlertType.UNKNOWN_CARD,
      "Unknown card",
      `RFID ${cardNumber} has no student assigned. Do not allow boarding.`,
      AlertSeverity.CRITICAL,
      { relatedType: "card" }
    );
    throw new AppError(404, "UNKNOWN CARD — no student assigned. Do not allow boarding.");
  }

  const denied: CardStatus[] = [CardStatus.BLOCKED, CardStatus.LOST, CardStatus.EXPIRED, CardStatus.INACTIVE, CardStatus.DAMAGED];
  if (denied.includes(card.status)) {
    await raiseAlert(
      organizationId,
      AlertType.UNAUTHORIZED,
      "Unauthorized RFID",
      `Card ${cardNumber} is ${card.status}`,
      AlertSeverity.CRITICAL,
      { relatedType: "card", relatedId: card.id }
    );
    throw new AppError(403, `Card is ${card.status.toLowerCase()} — access denied`);
  }

  const assignment = card.assignment;
  if (assignment?.transportSuspended || assignment?.liveState === StudentTransportState.SUSPENDED) {
    throw new AppError(403, "Transport access is suspended for this student");
  }

  const device = input.deviceCode
    ? await prisma.rfidDevice.findFirst({
        where: { organizationId, deviceCode: input.deviceCode.trim().toUpperCase(), deletedAt: null },
        include: { bus: { include: { driver: true, attendant: true, route: true } } },
      })
    : null;

  if (device?.status === DeviceStatus.DISABLED) throw new AppError(403, "Device is disabled");

  const afternoon = isAfternoon(settings);
  const assignedBus = afternoon ? assignment?.afternoonBus : assignment?.morningBus;
  const detectedBus =
    device?.bus ??
    (input.busCode
      ? await prisma.bus.findFirst({
          where: { organizationId, code: input.busCode.trim().toUpperCase(), deletedAt: null },
          include: { driver: true, attendant: true, route: true },
        })
      : assignedBus
        ? await prisma.bus.findFirst({
            where: { id: assignedBus.id },
            include: { driver: true, attendant: true, route: true },
          })
        : null);

  if (!detectedBus) throw new AppError(400, "No bus could be resolved for this tap");

  const wrongBus = Boolean(assignedBus && assignedBus.id !== detectedBus.id);
  if (wrongBus && !settings.allowWrongBus) {
    if (assignment) {
      await prisma.studentAssignment.update({
        where: { id: assignment.id },
        data: { liveState: StudentTransportState.WRONG_BUS },
      });
    }
    await raiseAlert(
      organizationId,
      AlertType.WRONG_BUS,
      "Wrong bus",
      `${card.studentName} assigned to ${assignedBus?.code} tapped ${detectedBus.code}.`,
      AlertSeverity.CRITICAL,
      { relatedType: "student", relatedId: assignment?.id }
    );
    throw new AppError(
      403,
      `WRONG BUS — assigned ${assignedBus?.code ?? "none"}, detected ${detectedBus.code}. Action required.`
    );
  }

  const today = dateOnly();
  let trip = await prisma.trip.findFirst({
    where: {
      organizationId,
      busId: detectedBus.id,
      tripDate: today,
      status: { in: [TripStatus.SCHEDULED, TripStatus.BOARDING, TripStatus.LIVE] },
    },
    include: tripInclude,
  });

  if (!trip) {
    trip = await prepareTrip(organizationId, {
      busId: detectedBus.id,
      direction: afternoon ? TripDirection.TO_HOME : TripDirection.TO_SCHOOL,
    });
  }

  const recent = await prisma.boardingEvent.findFirst({
    where: {
      organizationId,
      cardId: card.id,
      scannedAt: { gte: new Date(Date.now() - settings.duplicateTapSeconds * 1000) },
    },
  });
  if (recent) {
    await raiseAlert(
      organizationId,
      AlertType.DUPLICATE_TAP,
      "Duplicate tap",
      `${card.studentName} already boarded. Last scan on ${recent.busCode ?? detectedBus.code}.`,
      AlertSeverity.INFO,
      { relatedType: "event", relatedId: recent.id }
    );
    throw new AppError(429, `Student already boarded. Last scan: ${recent.scannedAt.toISOString()} · Bus ${recent.busCode}`);
  }

  const type: BoardingType =
    (input.type as BoardingType) ||
    (assignment?.liveState === StudentTransportState.ON_BUS ? BoardingType.EXIT : BoardingType.BOARDING);

  const now = new Date();
  const passenger = await prisma.tripPassenger.findFirst({
    where: { tripId: trip.id, studentCode: card.studentCode ?? assignment?.studentCode ?? "" },
  });

  if (type === BoardingType.BOARDING && passenger) {
    await prisma.tripPassenger.update({
      where: { id: passenger.id },
      data: { mark: PassengerMark.BOARDED, boardedAt: now },
    });
  } else if (type === BoardingType.EXIT && passenger) {
    await prisma.tripPassenger.update({
      where: { id: passenger.id },
      data: { mark: PassengerMark.EXITED, exitedAt: now },
    });
  }

  const liveState =
    type === BoardingType.BOARDING
      ? StudentTransportState.ON_BUS
      : trip.direction === TripDirection.TO_SCHOOL
        ? StudentTransportState.AT_SCHOOL
        : StudentTransportState.RETURNED_HOME;

  if (assignment) {
    await prisma.studentAssignment.update({ where: { id: assignment.id }, data: { liveState } });
  }

  await prisma.rfidCard.update({
    where: { id: card.id },
    data: { usageCount: { increment: 1 }, lastUsedAt: now, status: CardStatus.ACTIVE },
  });
  await prisma.cardHistory.create({
    data: { organizationId, cardId: card.id, action: type, detail: detectedBus.code },
  });

  if (device) {
    await prisma.rfidDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: now, status: DeviceStatus.ONLINE },
    });
  }

  const event = await prisma.boardingEvent.create({
    data: {
      organizationId,
      tripId: trip.id,
      cardId: card.id,
      deviceId: device?.id,
      stopId: assignment?.pickupStopId,
      studentCode: card.studentCode,
      studentName: card.studentName ?? "Unknown",
      className: card.className,
      cardNumber,
      busCode: detectedBus.code,
      routeName: detectedBus.route?.name ?? trip.route?.name,
      stopName: assignment?.pickupStop?.name,
      driverName: detectedBus.driver?.name ?? trip.driver?.name,
      deviceCode: device?.deviceCode,
      type,
      outcome: "OK",
      academicYear: settings.academicYear,
      term: settings.term,
      scannedAt: now,
    },
  });

  await prisma.trip.update({
    where: { id: trip.id },
    data: {
      status: trip.status === TripStatus.SCHEDULED ? TripStatus.BOARDING : trip.status,
      lastRfidAt: now,
      lastRfidName: card.studentName,
    },
  });
  await refreshTripCounts(trip.id);

  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const notifyMessage =
    type === BoardingType.BOARDING
      ? `${card.studentName} boarded ${detectedBus.code} at ${timeStr}.`
      : trip.direction === TripDirection.TO_SCHOOL
        ? `${card.studentName} arrived at school at ${timeStr}.`
        : `${card.studentName} exited ${detectedBus.code} at ${timeStr}.`;
  await queueParentNotify(
    organizationId,
    card.studentName ?? "Student",
    card.studentCode,
    type === BoardingType.BOARDING ? "Boarded" : "Exited",
    notifyMessage
  );

  const refreshed = await prisma.trip.findUnique({ where: { id: trip.id }, include: tripInclude });

  return {
    access: "GRANTED",
    type,
    status: liveState,
    student: {
      name: card.studentName,
      code: card.studentCode,
      className: card.className,
      cardNumber,
    },
    bus: {
      code: detectedBus.code,
      route: detectedBus.route?.name ?? trip.route?.name,
      driver: detectedBus.driver?.name ?? trip.driver?.name,
    },
    time: now.toISOString(),
    event,
    trip: refreshed,
    parentMessage: notifyMessage,
  };
}

export async function prepareTrip(
  organizationId: string,
  input: { busId?: string; busCode?: string; direction?: TripDirection }
) {
  const bus = await prisma.bus.findFirst({
    where: {
      organizationId,
      deletedAt: null,
      ...(input.busId ? { id: input.busId } : {}),
      ...(input.busCode ? { code: input.busCode } : {}),
    },
    include: { driver: true, attendant: true, route: true },
  });
  if (!bus) throw new AppError(404, "Bus not found");

  const settings = await getOrCreateSettings(organizationId);
  const direction = input.direction ?? (isAfternoon(settings) ? TripDirection.TO_HOME : TripDirection.TO_SCHOOL);
  const today = dateOnly();

  const existing = await prisma.trip.findFirst({
    where: {
      organizationId,
      busId: bus.id,
      tripDate: today,
      direction,
      status: { in: [TripStatus.SCHEDULED, TripStatus.BOARDING, TripStatus.LIVE] },
    },
    include: tripInclude,
  });
  if (existing) return existing;

  const assignments = await prisma.studentAssignment.findMany({
    where: {
      organizationId,
      deletedAt: null,
      transportSuspended: false,
      ...(direction === TripDirection.TO_SCHOOL ? { morningBusId: bus.id } : { afternoonBusId: bus.id }),
    },
  });

  const trip = await prisma.trip.create({
    data: {
      organizationId,
      busId: bus.id,
      routeId: bus.routeId,
      driverId: bus.driverId,
      attendantId: bus.attendantId,
      direction,
      status: TripStatus.BOARDING,
      tripDate: today,
      lastLocation: bus.lastLocation,
      expectedCount: assignments.length,
      boardedCount: 0,
      missingCount: assignments.length,
      passengers: {
        create: assignments.map((a) => ({
          organizationId,
          assignmentId: a.id,
          studentCode: a.studentCode,
          studentName: a.studentName,
          className: a.className,
          mark: PassengerMark.EXPECTED,
        })),
      },
    },
    include: tripInclude,
  });

  await prisma.studentAssignment.updateMany({
    where: { id: { in: assignments.map((a) => a.id) } },
    data: { liveState: StudentTransportState.EXPECTED },
  });

  return trip;
}

export async function startTrip(organizationId: string, tripId: string, force = false) {
  const settings = await getOrCreateSettings(organizationId);
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, organizationId },
    include: tripInclude,
  });
  if (!trip) throw new AppError(404, "Trip not found");

  const missing = trip.passengers.filter((p) => isMissingMark(p.mark));
  if (settings.requireReconciliation && missing.length && !force) {
    await prisma.tripPassenger.updateMany({
      where: { id: { in: missing.map((m) => m.id) } },
      data: { mark: PassengerMark.MISSING },
    });
    await prisma.studentAssignment.updateMany({
      where: { studentCode: { in: missing.map((m) => m.studentCode) }, organizationId },
      data: { liveState: StudentTransportState.MISSING },
    });
    await refreshTripCounts(trip.id);
    await raiseAlert(
      organizationId,
      AlertType.MISSING_STUDENT,
      "Do not depart",
      `${trip.bus.code}: expected ${trip.passengers.length}, RFID boarded ${trip.passengers.length - missing.length}. Missing: ${missing.map((m) => m.studentName).join(", ")}`,
      AlertSeverity.CRITICAL,
      { relatedType: "trip", relatedId: trip.id }
    );
    throw new AppError(
      409,
      `DO NOT DEPART — ${missing.length} student(s) missing: ${missing.map((m) => m.studentName).join(", ")}`
    );
  }

  const updated = await prisma.trip.update({
    where: { id: trip.id },
    data: { status: TripStatus.LIVE, startedAt: new Date(), reconciled: true },
    include: tripInclude,
  });
  await writeAudit(organizationId, "START_TRIP", { entityType: "trip", entityId: trip.id, detail: trip.bus.code });
  return updated;
}

export async function completeTrip(organizationId: string, tripId: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, organizationId } });
  if (!trip) throw new AppError(404, "Trip not found");
  return prisma.trip.update({
    where: { id: trip.id },
    data: { status: TripStatus.COMPLETED, endedAt: new Date() },
    include: tripInclude,
  });
}

export async function reconcilePassenger(
  organizationId: string,
  tripId: string,
  studentCode: string,
  mark: PassengerMark | string,
  note?: string
) {
  const passenger = await prisma.tripPassenger.findFirst({
    where: { organizationId, tripId, studentCode },
  });
  if (!passenger) throw new AppError(404, "Passenger not found");
  const next = mark as PassengerMark;
  const now = new Date();
  const updated = await prisma.tripPassenger.update({
    where: { id: passenger.id },
    data: {
      mark: next,
      note,
      boardedAt:
        next === PassengerMark.BOARDED || next === PassengerMark.MANUAL || next === PassengerMark.CHANGED_BUS
          ? now
          : passenger.boardedAt,
    },
  });
  const liveMap: Partial<Record<PassengerMark, StudentTransportState>> = {
    [PassengerMark.ABSENT]: StudentTransportState.MISSING,
    [PassengerMark.MISSING]: StudentTransportState.MISSING,
    [PassengerMark.BOARDED]: StudentTransportState.ON_BUS,
    [PassengerMark.MANUAL]: StudentTransportState.ON_BUS,
    [PassengerMark.CHANGED_BUS]: StudentTransportState.ON_BUS,
    [PassengerMark.EXPECTED]: StudentTransportState.EXPECTED,
  };
  if (liveMap[next]) {
    await prisma.studentAssignment.updateMany({
      where: { organizationId, studentCode },
      data: { liveState: liveMap[next] },
    });
  }
  await refreshTripCounts(tripId);
  return updated;
}

export async function pingGps(
  organizationId: string,
  tripId: string,
  body: { location?: string; latitude?: number; longitude?: number; speedKmh?: number }
) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, organizationId } });
  if (!trip) throw new AppError(404, "Trip not found");
  await prisma.gpsPing.create({
    data: {
      organizationId,
      tripId,
      location: body.location,
      latitude: body.latitude,
      longitude: body.longitude,
      speedKmh: body.speedKmh,
    },
  });
  await prisma.trip.update({
    where: { id: tripId },
    data: {
      lastLocation: body.location,
      lastLat: body.latitude,
      lastLng: body.longitude,
      speedKmh: body.speedKmh,
    },
  });
  await prisma.bus.update({
    where: { id: trip.busId },
    data: {
      lastLocation: body.location,
      lastLat: body.latitude,
      lastLng: body.longitude,
      speedKmh: body.speedKmh,
    },
  });
  return prisma.trip.findUnique({ where: { id: tripId }, include: tripInclude });
}

export async function raiseEmergency(
  organizationId: string,
  body: { busId?: string; tripId?: string; type?: EmergencyType | string; notes?: string; location?: string }
) {
  const trip = body.tripId
    ? await prisma.trip.findFirst({ where: { id: body.tripId, organizationId }, include: { bus: true, driver: true } })
    : await prisma.trip.findFirst({
        where: {
          organizationId,
          busId: body.busId,
          status: { in: [TripStatus.BOARDING, TripStatus.LIVE] },
        },
        include: { bus: true, driver: true },
      });
  const bus = trip?.bus ?? (body.busId
    ? await prisma.bus.findFirst({ where: { id: body.busId, organizationId } })
    : null);
  if (!bus) throw new AppError(400, "Bus is required");

  const emergency = await prisma.emergency.create({
    data: {
      organizationId,
      busId: bus.id,
      tripId: trip?.id,
      type: (body.type as EmergencyType) || EmergencyType.OTHER,
      location: body.location ?? trip?.lastLocation ?? bus.lastLocation,
      studentCount: trip?.boardedCount,
      driverName: trip?.driver?.name,
      notes: body.notes,
    },
    include: { bus: true, trip: true },
  });
  await raiseAlert(
    organizationId,
    AlertType.EMERGENCY,
    `Emergency — ${emergency.type}`,
    `${bus.code} · ${emergency.location ?? "unknown location"} · ${emergency.studentCount ?? 0} students`,
    AlertSeverity.CRITICAL,
    { relatedType: "emergency", relatedId: emergency.id }
  );
  return emergency;
}

export async function listTrips(organizationId: string) {
  return prisma.trip.findMany({
    where: { organizationId },
    include: tripInclude,
    orderBy: [{ tripDate: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
}

export async function getTrip(organizationId: string, id: string) {
  const trip = await prisma.trip.findFirst({ where: { id, organizationId }, include: tripInclude });
  if (!trip) throw new AppError(404, "Trip not found");
  return trip;
}

export async function listBuses(organizationId: string) {
  const buses = await prisma.bus.findMany({
    where: { organizationId, deletedAt: null },
    include: {
      driver: true,
      attendant: true,
      route: true,
      _count: { select: { morningStudents: true, afternoonStudents: true } },
    },
    orderBy: { code: "asc" },
  });
  return buses.map((b) => ({
    ...b,
    currentStudents: b._count.morningStudents,
  }));
}

export async function upsertBus(organizationId: string, body: Record<string, unknown>, id?: string) {
  const data = {
    code: str(body.code),
    plateNumber: str(body.plateNumber),
    busType: str(body.busType),
    capacity: num(body.capacity),
    status: body.status as BusStatus | undefined,
    gpsDevice: str(body.gpsDevice),
    driverId: str(body.driverId) || null,
    attendantId: str(body.attendantId) || null,
    routeId: str(body.routeId) || null,
    notes: str(body.notes),
    mileageKm: num(body.mileageKm),
    nextServiceKm: num(body.nextServiceKm),
  };
  if (id) {
    return prisma.bus.update({
      where: { id },
      data,
      include: { driver: true, attendant: true, route: true },
    });
  }
  if (!data.code || !data.plateNumber) throw new AppError(400, "code and plateNumber are required");
  return prisma.bus.create({
    data: {
      organizationId,
      code: data.code,
      plateNumber: data.plateNumber,
      busType: data.busType ?? "School Bus",
      capacity: data.capacity ?? 40,
      gpsDevice: data.gpsDevice,
      driverId: data.driverId,
      attendantId: data.attendantId,
      routeId: data.routeId,
      notes: data.notes,
    },
    include: { driver: true, attendant: true, route: true },
  });
}

export async function listDrivers(organizationId: string) {
  return prisma.driver.findMany({
    where: { organizationId, deletedAt: null },
    include: { buses: true, trips: { take: 5, orderBy: { createdAt: "desc" } } },
    orderBy: { name: "asc" },
  });
}

export async function upsertDriver(organizationId: string, body: Record<string, unknown>, id?: string) {
  const data = {
    name: str(body.name),
    phone: str(body.phone),
    licenseNumber: str(body.licenseNumber),
    licenseExpiry: body.licenseExpiry ? new Date(String(body.licenseExpiry)) : undefined,
    status: body.status as StaffStatus | undefined,
    notes: str(body.notes),
  };
  if (id) return prisma.driver.update({ where: { id }, data });
  if (!data.name) throw new AppError(400, "name is required");
  return prisma.driver.create({ data: { organizationId, name: data.name, phone: data.phone, licenseNumber: data.licenseNumber, notes: data.notes } });
}

export async function listAttendants(organizationId: string) {
  return prisma.attendant.findMany({
    where: { organizationId, deletedAt: null },
    include: { buses: true },
    orderBy: { name: "asc" },
  });
}

export async function upsertAttendant(organizationId: string, body: Record<string, unknown>, id?: string) {
  const data = { name: str(body.name), phone: str(body.phone), status: body.status as StaffStatus | undefined, notes: str(body.notes) };
  if (id) return prisma.attendant.update({ where: { id }, data });
  if (!data.name) throw new AppError(400, "name is required");
  return prisma.attendant.create({ data: { organizationId, name: data.name, phone: data.phone, notes: data.notes } });
}

export async function listRoutes(organizationId: string) {
  return prisma.route.findMany({
    where: { organizationId, deletedAt: null },
    include: {
      stops: { orderBy: { sequence: "asc" } },
      buses: true,
      _count: { select: { assignments: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function upsertRoute(organizationId: string, body: Record<string, unknown>, id?: string) {
  const data = {
    name: str(body.name),
    code: str(body.code),
    direction: str(body.direction),
    distanceKm: num(body.distanceKm),
    etaMinutes: num(body.etaMinutes),
    notes: str(body.notes),
  };
  if (id) return prisma.route.update({ where: { id }, data, include: { stops: { orderBy: { sequence: "asc" } } } });
  if (!data.name || !data.code) throw new AppError(400, "name and code are required");
  return prisma.route.create({
    data: {
      organizationId,
      name: data.name,
      code: data.code,
      direction: data.direction ?? "",
      distanceKm: data.distanceKm,
      etaMinutes: data.etaMinutes,
    },
    include: { stops: true },
  });
}

export async function upsertStop(organizationId: string, body: Record<string, unknown>, id?: string) {
  const data = {
    name: str(body.name),
    routeId: str(body.routeId),
    sequence: num(body.sequence),
    etaMinutes: num(body.etaMinutes),
  };
  if (id) return prisma.stop.update({ where: { id }, data });
  if (!data.name || !data.routeId) throw new AppError(400, "name and routeId are required");
  return prisma.stop.create({
    data: {
      organizationId,
      routeId: data.routeId,
      name: data.name,
      sequence: data.sequence ?? 1,
      etaMinutes: data.etaMinutes,
    },
  });
}

export async function listStudents(organizationId: string, q?: string) {
  return prisma.studentAssignment.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { studentName: { contains: q, mode: "insensitive" } },
              { studentCode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { pickupStop: true, dropoffStop: true, morningBus: true, afternoonBus: true, route: true, cards: true },
    orderBy: { studentName: "asc" },
  });
}

export async function upsertStudent(organizationId: string, body: Record<string, unknown>, id?: string) {
  const settings = await getOrCreateSettings(organizationId);
  const data = {
    studentCode: str(body.studentCode),
    studentName: str(body.studentName),
    className: str(body.className),
    level: str(body.level),
    pickupStopId: str(body.pickupStopId) || null,
    dropoffStopId: str(body.dropoffStopId) || null,
    morningBusId: str(body.morningBusId) || null,
    afternoonBusId: str(body.afternoonBusId) || null,
    routeId: str(body.routeId) || null,
    guardianName: str(body.guardianName),
    guardianPhone: str(body.guardianPhone),
    transportSuspended: bool(body.transportSuspended),
    liveState: body.liveState as StudentTransportState | undefined,
    academicYear: settings.academicYear,
    term: settings.term,
  };
  if (id) {
    return prisma.studentAssignment.update({
      where: { id },
      data,
      include: { pickupStop: true, morningBus: true, afternoonBus: true, route: true },
    });
  }
  if (!data.studentCode || !data.studentName) throw new AppError(400, "studentCode and studentName are required");
  return prisma.studentAssignment.create({
    data: {
      organizationId,
      studentId: data.studentCode,
      studentCode: data.studentCode,
      studentName: data.studentName,
      className: data.className,
      level: data.level,
      pickupStopId: data.pickupStopId,
      dropoffStopId: data.dropoffStopId,
      morningBusId: data.morningBusId,
      afternoonBusId: data.afternoonBusId,
      routeId: data.routeId,
      guardianName: data.guardianName,
      guardianPhone: data.guardianPhone,
      academicYear: data.academicYear,
      term: data.term,
    },
    include: { pickupStop: true, morningBus: true, afternoonBus: true, route: true },
  });
}

export async function listCards(organizationId: string, opts: { status?: string; q?: string; page?: number; limit?: number }) {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const where: Prisma.RfidCardWhereInput = {
    organizationId,
    deletedAt: null,
    ...(opts.status ? { status: opts.status as CardStatus } : {}),
    ...(opts.q
      ? {
          OR: [
            { cardNumber: { contains: opts.q, mode: "insensitive" } },
            { studentName: { contains: opts.q, mode: "insensitive" } },
            { studentCode: { contains: opts.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [data, total] = await Promise.all([
    prisma.rfidCard.findMany({
      where,
      include: { assignment: true, history: { orderBy: { createdAt: "desc" }, take: 8 } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.rfidCard.count({ where }),
  ]);
  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

export async function createCard(organizationId: string, body: Record<string, unknown>, actorUserId?: string) {
  const cardNumber = String(body.cardNumber ?? "").trim().toUpperCase();
  if (!cardNumber) throw new AppError(400, "cardNumber is required");
  const assignment = body.studentCode
    ? await prisma.studentAssignment.findFirst({
        where: { organizationId, studentCode: String(body.studentCode), deletedAt: null },
      })
    : null;
  const card = await prisma.rfidCard.create({
    data: {
      organizationId,
      cardNumber,
      uid: cardNumber,
      status: body.activate ? CardStatus.ACTIVE : CardStatus.PENDING,
      assignmentId: assignment?.id,
      studentCode: assignment?.studentCode ?? str(body.studentCode),
      studentName: assignment?.studentName ?? str(body.studentName),
      className: assignment?.className ?? str(body.className),
      issuedAt: new Date(),
      activatedAt: body.activate ? new Date() : null,
      qrPayload: `RFID:${cardNumber}|STUDENT:${assignment?.studentCode ?? body.studentCode ?? ""}`,
    },
  });
  await prisma.cardHistory.create({
    data: { organizationId, cardId: card.id, action: "ISSUED", detail: card.studentName ?? "", actorUserId },
  });
  return card;
}

export async function updateCardStatus(
  organizationId: string,
  id: string,
  status: CardStatus,
  reason?: string,
  actorUserId?: string
) {
  const card = await prisma.rfidCard.findFirst({ where: { id, organizationId } });
  if (!card) throw new AppError(404, "Card not found");
  const updated = await prisma.rfidCard.update({
    where: { id },
    data: {
      status,
      blockedReason: reason,
      blockedAt: status === CardStatus.BLOCKED ? new Date() : card.blockedAt,
      lostAt: status === CardStatus.LOST ? new Date() : card.lostAt,
      activatedAt: status === CardStatus.ACTIVE ? new Date() : card.activatedAt,
    },
  });
  await prisma.cardHistory.create({
    data: { organizationId, cardId: id, action: status, detail: reason, actorUserId },
  });
  if (status === CardStatus.LOST || status === CardStatus.BLOCKED) {
    await prisma.studentAssignment.updateMany({
      where: { organizationId, studentCode: card.studentCode ?? "" },
      data: { liveState: StudentTransportState.SUSPENDED, transportSuspended: true },
    });
  }
  if (status === CardStatus.ACTIVE && card.studentCode) {
    await prisma.studentAssignment.updateMany({
      where: { organizationId, studentCode: card.studentCode },
      data: { transportSuspended: false, liveState: StudentTransportState.EXPECTED },
    });
  }
  return updated;
}

export async function cardHistory(organizationId: string, id: string) {
  return prisma.cardHistory.findMany({
    where: { organizationId, cardId: id },
    orderBy: { createdAt: "desc" },
  });
}

export async function replaceCard(organizationId: string, id: string, newCardNumber?: string, actorUserId?: string) {
  const old = await prisma.rfidCard.findFirst({ where: { id, organizationId } });
  if (!old) throw new AppError(404, "Card not found");
  await prisma.rfidCard.update({ where: { id }, data: { status: CardStatus.REPLACED } });
  const next = String(newCardNumber ?? `RFID-${Date.now()}`).toUpperCase();
  const created = await prisma.rfidCard.create({
    data: {
      organizationId,
      cardNumber: next,
      uid: next,
      status: CardStatus.ACTIVE,
      assignmentId: old.assignmentId,
      studentCode: old.studentCode,
      studentName: old.studentName,
      className: old.className,
      issuedAt: new Date(),
      activatedAt: new Date(),
    },
  });
  await prisma.cardHistory.create({
    data: { organizationId, cardId: created.id, action: "REPLACED", detail: `Replaced ${old.cardNumber}`, actorUserId },
  });
  return created;
}

export async function listDevices(organizationId: string) {
  return prisma.rfidDevice.findMany({
    where: { organizationId, deletedAt: null },
    include: { bus: true },
    orderBy: { name: "asc" },
  });
}

export async function upsertDevice(organizationId: string, body: Record<string, unknown>, id?: string) {
  const data = {
    deviceCode: str(body.deviceCode)?.toUpperCase(),
    name: str(body.name),
    busId: str(body.busId) || null,
    status: body.status as DeviceStatus | undefined,
    notes: str(body.notes),
  };
  if (id) return prisma.rfidDevice.update({ where: { id }, data, include: { bus: true } });
  if (!data.deviceCode || !data.name) throw new AppError(400, "deviceCode and name are required");
  return prisma.rfidDevice.create({
    data: { organizationId, deviceCode: data.deviceCode, name: data.name, busId: data.busId },
    include: { bus: true },
  });
}

export async function testDevice(organizationId: string, id: string) {
  const device = await prisma.rfidDevice.findFirst({ where: { id, organizationId } });
  if (!device) throw new AppError(404, "Device not found");
  return prisma.rfidDevice.update({
    where: { id },
    data: { lastSeenAt: new Date(), status: DeviceStatus.ONLINE },
  });
}

export async function listBoarding(organizationId: string, q?: string) {
  return prisma.boardingEvent.findMany({
    where: {
      organizationId,
      ...(q
        ? {
            OR: [
              { studentName: { contains: q, mode: "insensitive" } },
              { studentCode: { contains: q, mode: "insensitive" } },
              { busCode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { scannedAt: "desc" },
    take: 200,
  });
}

export async function listAlerts(organizationId: string) {
  return prisma.safetyAlert.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function resolveAlert(organizationId: string, id: string) {
  return prisma.safetyAlert.update({ where: { id }, data: { resolved: true } });
}

export async function listMissing(organizationId: string) {
  return prisma.studentAssignment.findMany({
    where: {
      organizationId,
      deletedAt: null,
      liveState: { in: [StudentTransportState.MISSING, StudentTransportState.EXPECTED] },
    },
    include: { morningBus: true, afternoonBus: true, pickupStop: true },
    orderBy: { studentName: "asc" },
  });
}

export async function listEmergencies(organizationId: string) {
  return prisma.emergency.findMany({
    where: { organizationId },
    include: { bus: true, trip: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function resolveEmergency(organizationId: string, id: string) {
  return prisma.emergency.update({ where: { id }, data: { status: EmergencyStatus.RESOLVED } });
}

export async function listIncidents(organizationId: string) {
  return prisma.incident.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
}

export async function createIncident(organizationId: string, body: Record<string, unknown>) {
  if (!body.title) throw new AppError(400, "title is required");
  return prisma.incident.create({
    data: {
      organizationId,
      title: String(body.title),
      detail: str(body.detail),
      busCode: str(body.busCode),
      driverName: str(body.driverName),
      severity: str(body.severity) ?? "WARNING",
    },
  });
}

export async function listFees(organizationId: string) {
  return prisma.transportFee.findMany({ where: { organizationId }, include: { assignment: true }, orderBy: { studentName: "asc" } });
}

export async function upsertFee(organizationId: string, body: Record<string, unknown>, id?: string) {
  const amount = num(body.amountRwf) ?? 0;
  const paid = num(body.paidRwf) ?? 0;
  const status: FeeStatus = paid >= amount && amount > 0 ? FeeStatus.PAID : paid > 0 ? FeeStatus.PARTIAL : FeeStatus.PENDING;
  const data = {
    studentName: str(body.studentName),
    studentCode: str(body.studentCode),
    academicYear: str(body.academicYear),
    term: str(body.term),
    routeName: str(body.routeName),
    amountRwf: amount,
    paidRwf: paid,
    status,
  };
  if (id) return prisma.transportFee.update({ where: { id }, data });
  if (!data.studentName || !data.academicYear || !data.term) throw new AppError(400, "studentName, academicYear and term are required");
  return prisma.transportFee.create({
    data: {
      organizationId,
      studentName: data.studentName,
      studentCode: data.studentCode,
      academicYear: data.academicYear,
      term: data.term,
      routeName: data.routeName,
      amountRwf: data.amountRwf,
      paidRwf: data.paidRwf,
      status,
    },
  });
}

export async function listFuel(organizationId: string) {
  return prisma.fuelRecord.findMany({
    where: { organizationId },
    include: { bus: true },
    orderBy: { purchasedAt: "desc" },
  });
}

export async function createFuel(organizationId: string, body: Record<string, unknown>) {
  const busId = str(body.busId);
  const litres = num(body.litres);
  const costRwf = num(body.costRwf);
  if (!busId || litres == null || costRwf == null) throw new AppError(400, "busId, litres and costRwf are required");
  return prisma.fuelRecord.create({
    data: {
      organizationId,
      busId,
      litres,
      costRwf,
      mileageKm: num(body.mileageKm),
      driverName: str(body.driverName),
      notes: str(body.notes),
    },
    include: { bus: true },
  });
}

export async function listMaintenance(organizationId: string) {
  return prisma.maintenanceRecord.findMany({
    where: { organizationId },
    include: { bus: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createMaintenance(organizationId: string, body: Record<string, unknown>) {
  const busId = str(body.busId);
  const title = str(body.title);
  if (!busId || !title) throw new AppError(400, "busId and title are required");
  return prisma.maintenanceRecord.create({
    data: {
      organizationId,
      busId,
      kind: (str(body.kind) as never) ?? "SERVICE",
      title,
      dueAt: body.dueAt ? new Date(String(body.dueAt)) : null,
      costRwf: num(body.costRwf),
      mileageKm: num(body.mileageKm),
      notes: str(body.notes),
    },
    include: { bus: true },
  });
}

export async function listDocuments(organizationId: string) {
  return prisma.busDocument.findMany({
    where: { organizationId },
    include: { bus: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDocument(organizationId: string, body: Record<string, unknown>) {
  const busId = str(body.busId);
  const title = str(body.title);
  if (!busId || !title) throw new AppError(400, "busId and title are required");
  return prisma.busDocument.create({
    data: {
      organizationId,
      busId,
      kind: (str(body.kind) as never) ?? "OTHER",
      title,
      validTo: body.validTo ? new Date(String(body.validTo)) : null,
      notes: str(body.notes),
    },
    include: { bus: true },
  });
}

export async function listNotifications(organizationId: string) {
  return prisma.parentNotification.findMany({
    where: { organizationId },
    include: { parent: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function listParents(organizationId: string) {
  return prisma.parentContact.findMany({
    where: { organizationId, deletedAt: null },
    include: { assignment: true },
    orderBy: { studentName: "asc" },
  });
}

export async function childTracking(organizationId: string, studentCode: string) {
  const student = await prisma.studentAssignment.findFirst({
    where: { organizationId, studentCode, deletedAt: null },
    include: { morningBus: { include: { driver: true, route: true } }, afternoonBus: true, pickupStop: true },
  });
  if (!student) {
    return {
      student: null,
      trip: null,
      lastEvent: null,
    };
  }
  const today = dateOnly();
  const trip = await prisma.trip.findFirst({
    where: {
      organizationId,
      tripDate: today,
      status: { in: [TripStatus.BOARDING, TripStatus.LIVE] },
      passengers: { some: { studentCode } },
    },
    include: { bus: true, route: true, driver: true },
  });
  const lastEvent = await prisma.boardingEvent.findFirst({
    where: { organizationId, studentCode },
    orderBy: { scannedAt: "desc" },
  });
  return { student, trip, lastEvent };
}

export async function reportsSummary(organizationId: string) {
  const [buses, trips, fees, fuel, maintenance, events, students] = await Promise.all([
    prisma.bus.findMany({ where: { organizationId, deletedAt: null }, include: { _count: { select: { morningStudents: true } } } }),
    prisma.trip.findMany({ where: { organizationId }, take: 30, orderBy: { tripDate: "desc" } }),
    prisma.transportFee.findMany({ where: { organizationId } }),
    prisma.fuelRecord.findMany({ where: { organizationId } }),
    prisma.maintenanceRecord.findMany({ where: { organizationId } }),
    prisma.boardingEvent.findMany({ where: { organizationId }, orderBy: { scannedAt: "desc" }, take: 200 }),
    prisma.studentAssignment.findMany({ where: { organizationId, deletedAt: null } }),
  ]);

  const revenue = fees.reduce((s, f) => s + f.paidRwf, 0);
  const billed = fees.reduce((s, f) => s + f.amountRwf, 0);
  const fuelCost = fuel.reduce((s, f) => s + f.costRwf, 0);
  const maintCost = maintenance.reduce((s, f) => s + (f.costRwf ?? 0), 0);
  const litres = fuel.reduce((s, f) => s + f.litres, 0);

  const utilization = buses.map((b) => ({
    code: b.code,
    used: b._count.morningStudents,
    capacity: b.capacity,
    percent: b.capacity ? Math.round((b._count.morningStudents / b.capacity) * 100) : 0,
  }));

  const dow = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const boardingTrends = dow.map((day, i) => {
    const dayEvents = events.filter((e) => new Date(e.scannedAt).getDay() === i && e.type === BoardingType.BOARDING);
    return { day, boarded: dayEvents.length };
  });

  const onTime = trips.filter((t) => t.status === TripStatus.COMPLETED).length;
  const live = trips.filter((t) => t.status === TripStatus.LIVE).length;

  return {
    students: {
      total: students.length,
      onBus: students.filter((s) => s.liveState === StudentTransportState.ON_BUS).length,
      missing: students.filter((s) => s.liveState === StudentTransportState.MISSING).length,
      atSchool: students.filter((s) => s.liveState === StudentTransportState.AT_SCHOOL).length,
    },
    buses: utilization,
    trips: { total: trips.length, onTime, live, delayed: trips.filter((t) => t.status === TripStatus.BOARDING).length },
    finance: {
      billed,
      revenue,
      fuelCost,
      maintenanceCost: maintCost,
      litres,
      efficiency: litres > 0 ? Number((buses.reduce((s, b) => s + b.mileageKm, 0) / litres).toFixed(2)) : 0,
      profit: revenue - fuelCost - maintCost,
    },
    boardingTrends,
    recentEvents: events.slice(0, 20),
    wrongBus: await prisma.safetyAlert.count({ where: { organizationId, type: AlertType.WRONG_BUS } }),
  };
}

export async function listAudit(organizationId: string) {
  return prisma.auditLog.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 100 });
}
