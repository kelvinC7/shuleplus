import {
  AttendanceMethod,
  AttendanceSyncStatus,
  BoardingType,
  PassengerMark,
  Prisma,
  TransportEventType,
  TripDirection,
  TripStatus,
} from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { getOrCreateSettings, prepareTrip } from "./transport.service";
import { queueTransportEventNotifications } from "./transport-notification.service";
import { writeAudit } from "./seed.service";

function dateOnly(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function parseServiceDate(raw?: string) {
  if (!raw) return dateOnly();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new AppError(400, "Invalid serviceDate");
  return dateOnly(d);
}

const tripInclude = {
  bus: true,
  route: { include: { stops: { orderBy: { sequence: "asc" as const } }, supervisors: { where: { deletedAt: null } } } },
  driver: true,
  attendant: true,
  passengers: { orderBy: { studentName: "asc" as const } },
} satisfies Prisma.TripInclude;

export type RosterStatus = "NOT_RECORDED" | "RECORDED" | "ABSENT" | "PENDING_SYNC";

export function boardingTypeForEvent(eventType: TransportEventType): BoardingType {
  if (eventType === TransportEventType.BOARDING_TO_SCHOOL || eventType === TransportEventType.BOARDING_TO_HOME) {
    return BoardingType.BOARDING;
  }
  return BoardingType.EXIT;
}

export function assertEventMatchesTripDirection(direction: TripDirection, eventType: TransportEventType) {
  const isSchoolEvent =
    eventType === TransportEventType.BOARDING_TO_SCHOOL || eventType === TransportEventType.ARRIVED_AT_SCHOOL;
  const isHomeEvent =
    eventType === TransportEventType.BOARDING_TO_HOME || eventType === TransportEventType.DROPPED_OFF_HOME;
  if (direction === TripDirection.TO_SCHOOL && !isSchoolEvent) {
    throw new AppError(400, "Event type does not match morning (to school) journey");
  }
  if (direction === TripDirection.TO_HOME && !isHomeEvent) {
    throw new AppError(400, "Event type does not match afternoon (to home) journey");
  }
}

async function refreshTripCounts(tripId: string) {
  const passengers = await prisma.tripPassenger.findMany({ where: { tripId } });
  const boarded = passengers.filter(
    (p) => p.mark === PassengerMark.BOARDED || p.mark === PassengerMark.MANUAL || p.mark === PassengerMark.CHANGED_BUS
  ).length;
  const exited = passengers.filter((p) => p.mark === PassengerMark.EXITED).length;
  const missing = passengers.filter(
    (p) => p.mark === PassengerMark.EXPECTED || p.mark === PassengerMark.MISSING
  ).length;
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

export async function listAttendanceRoutes(organizationId: string) {
  const routes = await prisma.route.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      stops: { orderBy: { sequence: "asc" } },
      supervisors: { where: { deletedAt: null } },
      buses: { where: { deletedAt: null }, take: 3 },
    },
  });
  const today = dateOnly();
  const trips = await prisma.trip.findMany({
    where: {
      organizationId,
      tripDate: today,
      status: { in: [TripStatus.SCHEDULED, TripStatus.BOARDING, TripStatus.LIVE, TripStatus.COMPLETED] },
    },
    include: { bus: true },
  });
  return routes.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    primaryBusId: r.primaryBusId,
    buses: r.buses.map((b) => ({ id: b.id, code: b.code, plateNumber: b.plateNumber })),
    stopCount: r.stops.length,
    supervisors: r.supervisors,
    tripsToday: trips.filter((t) => t.routeId === r.id).map((t) => ({
      id: t.id,
      direction: t.direction,
      status: t.status,
      busCode: t.bus.code,
    })),
  }));
}

export async function ensureTripForRoute(
  organizationId: string,
  input: { routeId: string; direction: TripDirection; serviceDate?: string; busId?: string }
) {
  if (!input.routeId?.trim()) throw new AppError(400, "routeId is required");
  const route = await prisma.route.findFirst({
    where: { id: input.routeId, organizationId, deletedAt: null },
    include: { buses: { where: { deletedAt: null } } },
  });
  if (!route) throw new AppError(404, "Route not found");

  const busId =
    input.busId ??
    route.primaryBusId ??
    route.buses[0]?.id ??
    (
      await prisma.bus.findFirst({
        where: { organizationId, routeId: route.id, deletedAt: null },
      })
    )?.id;
  if (!busId) throw new AppError(400, "No bus assigned to this route");

  const serviceDate = parseServiceDate(input.serviceDate);
  const existing = await prisma.trip.findFirst({
    where: {
      organizationId,
      routeId: route.id,
      busId,
      tripDate: serviceDate,
      direction: input.direction,
      status: { in: [TripStatus.SCHEDULED, TripStatus.BOARDING, TripStatus.LIVE, TripStatus.COMPLETED] },
    },
    include: tripInclude,
  });
  if (existing) return existing;

  const trip = await prepareTrip(organizationId, { busId, direction: input.direction });
  if (trip.routeId !== route.id) {
    await prisma.trip.update({ where: { id: trip.id }, data: { routeId: route.id } });
  }
  return prisma.trip.findUniqueOrThrow({ where: { id: trip.id }, include: tripInclude });
}

export async function getAttendanceDashboard(
  organizationId: string,
  tripId: string,
  eventType: TransportEventType
) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, organizationId },
    include: tripInclude,
  });
  if (!trip) throw new AppError(404, "Trip not found");
  assertEventMatchesTripDirection(trip.direction, eventType);

  const roster = await buildRoster(organizationId, trip, eventType);
  const expected = roster.length;
  const confirmed = roster.filter((r) => r.status === "RECORDED").length;
  const absent = roster.filter((r) => r.status === "ABSENT").length;
  const notRecorded = roster.filter((r) => r.status === "NOT_RECORDED").length;
  const pendingSync = roster.filter((r) => r.status === "PENDING_SYNC").length;

  const eventIds = roster.map((r) => r.eventId).filter(Boolean) as string[];
  let notificationStats = { total: 0, delivered: 0, failed: 0, pending: 0 };
  if (eventIds.length) {
    const notes = await prisma.parentNotification.groupBy({
      by: ["status"],
      where: { organizationId, boardingEventId: { in: eventIds } },
      _count: true,
    });
    for (const row of notes) {
      notificationStats.total += row._count;
      if (row.status === "DELIVERED" || row.status === "SENT") notificationStats.delivered += row._count;
      else if (row.status === "FAILED") notificationStats.failed += row._count;
      else notificationStats.pending += row._count;
    }
  }

  const devices = trip.busId
    ? await prisma.rfidDevice.findMany({
        where: { organizationId, busId: trip.busId, deletedAt: null },
        orderBy: { deviceCode: "asc" },
      })
    : [];

  return {
    serviceDate: trip.tripDate.toISOString().slice(0, 10),
    trip: serializeTrip(trip),
    eventType,
    stats: {
      expected,
      confirmed,
      notRecorded,
      absent,
      pendingSync,
      exceptions: 0,
      notifications: notificationStats,
    },
    roster,
    devices,
    journeyStatus: mapJourneyStatus(trip.status, trip.startedAt),
    journeyStartedAt: trip.startedAt?.toISOString() ?? null,
  };
}

function mapJourneyStatus(status: TripStatus, startedAt?: Date | null) {
  if (startedAt && status === TripStatus.BOARDING) return "Pickup in progress";
  switch (status) {
    case TripStatus.SCHEDULED:
      return "Ready";
    case TripStatus.BOARDING:
      return "Boarding";
    case TripStatus.LIVE:
      return "In Transit";
    case TripStatus.COMPLETED:
      return "Completed";
    case TripStatus.CANCELLED:
      return "Cancelled";
    default:
      return status;
  }
}

function serializeTrip(trip: Prisma.TripGetPayload<{ include: typeof tripInclude }>) {
  return {
    id: trip.id,
    direction: trip.direction,
    status: trip.status,
    tripDate: trip.tripDate.toISOString().slice(0, 10),
    startedAt: trip.startedAt?.toISOString() ?? null,
    endedAt: trip.endedAt?.toISOString() ?? null,
    journeyStarted: Boolean(trip.startedAt),
    expectedCount: trip.expectedCount,
    boardedCount: trip.boardedCount,
    missingCount: trip.missingCount,
    bus: trip.bus,
    route: trip.route,
    driver: trip.driver,
    attendant: trip.attendant,
  };
}

async function buildRoster(
  organizationId: string,
  trip: Prisma.TripGetPayload<{ include: typeof tripInclude }>,
  eventType: TransportEventType
) {
  const codes = trip.passengers.map((p) => p.studentCode);
  const assignments = await prisma.studentAssignment.findMany({
    where: { organizationId, studentCode: { in: codes }, deletedAt: null },
    include: { pickupStop: true, dropoffStop: true },
  });
  const byCode = new Map(assignments.map((a) => [a.studentCode, a]));

  const events = await prisma.boardingEvent.findMany({
    where: { organizationId, tripId: trip.id, eventType, studentCode: { in: codes } },
    orderBy: { scannedAt: "desc" },
  });
  const eventByStudent = new Map<string, (typeof events)[0]>();
  for (const ev of events) {
    if (ev.studentCode && !eventByStudent.has(ev.studentCode)) eventByStudent.set(ev.studentCode, ev);
  }

  const isPickupEvent =
    eventType === TransportEventType.BOARDING_TO_SCHOOL || eventType === TransportEventType.BOARDING_TO_HOME;

  return trip.passengers.map((p) => {
    const a = byCode.get(p.studentCode);
    const ev = eventByStudent.get(p.studentCode);
    let status: RosterStatus = "NOT_RECORDED";
    if (ev) {
      if (ev.syncStatus === AttendanceSyncStatus.PENDING) status = "PENDING_SYNC";
      else if (ev.outcome === "ABSENT") status = "ABSENT";
      else status = "RECORDED";
    } else if (p.mark === PassengerMark.ABSENT && isPickupEvent) {
      status = "ABSENT";
    }

    const stop =
      eventType === TransportEventType.DROPPED_OFF_HOME || eventType === TransportEventType.BOARDING_TO_HOME
        ? a?.dropoffStop
        : a?.pickupStop;

    return {
      passengerId: p.id,
      studentCode: p.studentCode,
      studentName: p.studentName,
      className: p.className,
      assignedStopId: stop?.id ?? null,
      assignedStopName: stop?.name ?? null,
      mark: p.mark,
      status,
      eventId: ev?.id ?? null,
      recordedAt: ev?.scannedAt.toISOString() ?? null,
      attendanceMethod: ev?.attendanceMethod ?? null,
    };
  });
}

export async function recordManualAttendance(
  organizationId: string,
  actorUserId: string | undefined,
  input: {
    tripId: string;
    eventType: TransportEventType;
    studentCode: string;
    action: "CONFIRM" | "ABSENT";
    idempotencyKey?: string;
    clientRecordedAt?: string;
    note?: string;
  }
) {
  return recordAttendanceCore(organizationId, actorUserId, {
    ...input,
    method: AttendanceMethod.MANUAL,
  });
}

export async function syncOfflineAttendance(
  organizationId: string,
  actorUserId: string | undefined,
  events: {
    tripId: string;
    eventType: TransportEventType;
    studentCode: string;
    action: "CONFIRM" | "ABSENT";
    idempotencyKey: string;
    clientRecordedAt: string;
    method: AttendanceMethod;
  }[]
) {
  const results: { idempotencyKey: string; ok: boolean; error?: string; eventId?: string }[] = [];
  for (const ev of events) {
    try {
      const created = await recordAttendanceCore(organizationId, actorUserId, {
        tripId: ev.tripId,
        eventType: ev.eventType,
        studentCode: ev.studentCode,
        action: ev.action,
        idempotencyKey: ev.idempotencyKey,
        clientRecordedAt: ev.clientRecordedAt,
        method: ev.method,
      });
      results.push({ idempotencyKey: ev.idempotencyKey, ok: true, eventId: created.event.id });
    } catch (e) {
      const msg = e instanceof AppError ? e.message : "Sync failed";
      results.push({ idempotencyKey: ev.idempotencyKey, ok: false, error: msg });
    }
  }
  return results;
}

async function recordAttendanceCore(
  organizationId: string,
  actorUserId: string | undefined,
  input: {
    tripId: string;
    eventType: TransportEventType;
    studentCode: string;
    action: "CONFIRM" | "ABSENT";
    method: AttendanceMethod;
    idempotencyKey?: string;
    clientRecordedAt?: string;
    note?: string;
    cardId?: string;
    cardNumber?: string;
    deviceId?: string;
    deviceCode?: string;
  }
) {
  if (input.idempotencyKey) {
    const existing = await prisma.boardingEvent.findFirst({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      return { duplicate: true, event: existing };
    }
  }

  const trip = await prisma.trip.findFirst({
    where: { id: input.tripId, organizationId },
    include: tripInclude,
  });
  if (!trip) throw new AppError(404, "Trip not found");
  assertEventMatchesTripDirection(trip.direction, input.eventType);

  const passenger = trip.passengers.find((p) => p.studentCode === input.studentCode);
  if (!passenger) throw new AppError(404, "Learner is not on this trip roster");

  const settings = await getOrCreateSettings(organizationId);
  const assignment = await prisma.studentAssignment.findFirst({
    where: { organizationId, studentCode: input.studentCode, deletedAt: null },
    include: { pickupStop: true, dropoffStop: true },
  });

  const dup = await prisma.boardingEvent.findFirst({
    where: {
      organizationId,
      tripId: trip.id,
      studentCode: input.studentCode,
      eventType: input.eventType,
      outcome: input.action === "ABSENT" ? "ABSENT" : "OK",
    },
  });
  if (dup && input.action === "CONFIRM") {
    throw new AppError(409, "Attendance already recorded for this learner and event");
  }

  const type = boardingTypeForEvent(input.eventType);
  const now = input.clientRecordedAt ? new Date(input.clientRecordedAt) : new Date();
  const stop =
    input.eventType === TransportEventType.DROPPED_OFF_HOME || input.eventType === TransportEventType.BOARDING_TO_HOME
      ? assignment?.dropoffStop
      : assignment?.pickupStop;

  if (input.action === "ABSENT") {
    await prisma.tripPassenger.update({
      where: { id: passenger.id },
      data: { mark: PassengerMark.ABSENT, note: input.note },
    });
    const event = await prisma.boardingEvent.create({
      data: {
        organizationId,
        tripId: trip.id,
        studentCode: input.studentCode,
        studentName: passenger.studentName,
        className: passenger.className,
        cardId: input.cardId,
        cardNumber: input.cardNumber,
        deviceId: input.deviceId,
        deviceCode: input.deviceCode,
        stopId: stop?.id,
        stopName: stop?.name,
        busCode: trip.bus.code,
        routeName: trip.route?.name,
        driverName: trip.driver?.name,
        type,
        eventType: input.eventType,
        attendanceMethod: input.method,
        recordedByUserId: actorUserId,
        idempotencyKey: input.idempotencyKey,
        syncStatus: AttendanceSyncStatus.SYNCED,
        clientRecordedAt: input.clientRecordedAt ? now : undefined,
        outcome: "ABSENT",
        academicYear: settings.academicYear,
        term: settings.term,
        scannedAt: now,
      },
    });
    await refreshTripCounts(trip.id);
    return { duplicate: false, event };
  }

  if (type === BoardingType.BOARDING) {
    await prisma.tripPassenger.update({
      where: { id: passenger.id },
      data: { mark: PassengerMark.MANUAL, boardedAt: now, note: input.note },
    });
  } else {
    await prisma.tripPassenger.update({
      where: { id: passenger.id },
      data: { mark: PassengerMark.EXITED, exitedAt: now, note: input.note },
    });
  }

  const event = await prisma.boardingEvent.create({
    data: {
      organizationId,
      tripId: trip.id,
      studentCode: input.studentCode,
      studentName: passenger.studentName,
      className: passenger.className,
      cardId: input.cardId,
      cardNumber: input.cardNumber,
      deviceId: input.deviceId,
      deviceCode: input.deviceCode,
      stopId: stop?.id,
      stopName: stop?.name,
      busCode: trip.bus.code,
      routeName: trip.route?.name,
      driverName: trip.driver?.name,
      type,
      eventType: input.eventType,
      attendanceMethod: input.method,
      recordedByUserId: actorUserId,
      idempotencyKey: input.idempotencyKey,
      syncStatus: AttendanceSyncStatus.SYNCED,
      clientRecordedAt: input.clientRecordedAt ? now : undefined,
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
      lastRfidName: passenger.studentName,
    },
  });
  await refreshTripCounts(trip.id);

  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  await queueTransportEventNotifications({
    organizationId,
    eventType: input.eventType,
    studentName: passenger.studentName,
    studentCode: input.studentCode,
    boardingEventId: event.id,
    vars: {
      studentName: passenger.studentName,
      busCode: trip.bus.code,
      time: timeStr,
      routeName: trip.route?.name,
      schoolName: settings.schoolName ?? "School",
      stopName: stop?.name,
    },
  });

  return { duplicate: false, event };
}

export async function listAttendanceHistory(
  organizationId: string,
  query: {
    page?: number;
    limit?: number;
    q?: string;
    routeId?: string;
    tripId?: string;
    eventType?: TransportEventType;
    method?: AttendanceMethod;
    from?: string;
    to?: string;
    syncStatus?: AttendanceSyncStatus;
  }
) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 25));
  const skip = (page - 1) * limit;

  const from = query.from ? parseServiceDate(query.from) : undefined;
  const to = query.to ? parseServiceDate(query.to) : undefined;
  if (to) to.setUTCDate(to.getUTCDate() + 1);

  const where: Prisma.BoardingEventWhereInput = {
    organizationId,
    outcome: { not: "JOURNEY_START" },
    ...(query.eventType
      ? { eventType: query.eventType }
      : {
          eventType: {
            notIn: [TransportEventType.ROUTE_PICKUP_STARTED, TransportEventType.ROUTE_HOME_STARTED],
          },
        }),
    ...(query.tripId ? { tripId: query.tripId } : {}),
    ...(query.method ? { attendanceMethod: query.method } : {}),
    ...(query.syncStatus ? { syncStatus: query.syncStatus } : {}),
    ...(from || to
      ? {
          scannedAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: to } : {}),
          },
        }
      : {}),
    ...(query.routeId
      ? {
          trip: { routeId: query.routeId },
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { studentName: { contains: query.q, mode: "insensitive" } },
            { studentCode: { contains: query.q, mode: "insensitive" } },
            { busCode: { contains: query.q, mode: "insensitive" } },
            { routeName: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.boardingEvent.count({ where }),
    prisma.boardingEvent.findMany({
      where,
      orderBy: { scannedAt: "desc" },
      skip,
      take: limit,
      include: {
        trip: { include: { bus: true, route: true } },
        notifications: {
          select: { id: true, status: true, channel: true, sentAt: true, providerRef: true },
        },
      },
    }),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    rows: rows.map((r) => ({
      id: r.id,
      studentName: r.studentName,
      studentCode: r.studentCode,
      className: r.className,
      eventType: r.eventType,
      type: r.type,
      outcome: r.outcome,
      attendanceMethod: r.attendanceMethod,
      syncStatus: r.syncStatus,
      scannedAt: r.scannedAt.toISOString(),
      stopName: r.stopName,
      busCode: r.busCode,
      routeName: r.routeName ?? r.trip?.route?.name,
      tripId: r.tripId,
      tripDirection: r.trip?.direction,
      recordedByUserId: r.recordedByUserId,
      deviceCode: r.deviceCode,
      notifications: r.notifications,
    })),
  };
}

export async function getAttendanceEventDetail(organizationId: string, eventId: string) {
  const event = await prisma.boardingEvent.findFirst({
    where: { id: eventId, organizationId },
    include: {
      trip: { include: { bus: true, route: true, driver: true, attendant: true } },
      notifications: {
        orderBy: [{ channel: "asc" }, { createdAt: "asc" }],
        include: {
          parent: {
            select: {
              id: true,
              parentName: true,
              phone: true,
              email: true,
              relationship: true,
              notifySms: true,
              notifyPush: true,
              notifyEmail: true,
            },
          },
        },
      },
      device: true,
      stop: true,
    },
  });
  if (!event) throw new AppError(404, "Event not found");

  return {
    id: event.id,
    studentName: event.studentName,
    studentCode: event.studentCode,
    className: event.className,
    eventType: event.eventType,
    type: event.type,
    outcome: event.outcome,
    attendanceMethod: event.attendanceMethod,
    syncStatus: event.syncStatus,
    scannedAt: event.scannedAt.toISOString(),
    clientRecordedAt: event.clientRecordedAt?.toISOString() ?? null,
    createdAt: event.createdAt.toISOString(),
    cardNumber: event.cardNumber,
    busCode: event.busCode,
    routeName: event.routeName,
    stopName: event.stopName,
    driverName: event.driverName,
    deviceCode: event.deviceCode,
    recordedByUserId: event.recordedByUserId,
    idempotencyKey: event.idempotencyKey,
    trip: event.trip
      ? {
          id: event.trip.id,
          direction: event.trip.direction,
          status: event.trip.status,
          tripDate: event.trip.tripDate.toISOString().slice(0, 10),
          startedAt: event.trip.startedAt?.toISOString() ?? null,
          bus: event.trip.bus,
          route: event.trip.route,
          driver: event.trip.driver,
          attendant: event.trip.attendant,
        }
      : null,
    stop: event.stop,
    device: event.device,
    notifications: event.notifications.map((n) => ({
      id: n.id,
      channel: n.channel,
      status: n.status,
      language: n.language,
      title: n.title,
      message: n.message,
      providerRef: n.providerRef,
      retryCount: n.retryCount,
      sentAt: n.sentAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
      parent: n.parent
        ? {
            id: n.parent.id,
            name: n.parent.parentName,
            phone: n.parent.phone,
            email: n.parent.email,
            relationship: n.parent.relationship,
            notifySms: n.parent.notifySms,
            notifyPush: n.parent.notifyPush,
            notifyEmail: n.parent.notifyEmail,
          }
        : null,
    })),
  };
}

/** Driver begins the route (pickup run). Notifies parents per stop — separate from learner attendance. */
export async function beginRouteJourney(organizationId: string, tripId: string, actorUserId?: string) {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, organizationId },
    include: tripInclude,
  });
  if (!trip) throw new AppError(404, "Trip not found");

  if (trip.startedAt) {
    return {
      trip: serializeTrip(trip),
      alreadyStarted: true as const,
      startedAt: trip.startedAt.toISOString(),
      parentsNotified: 0,
    };
  }

  const now = new Date();
  const today = dateOnly();
  const journeyEventType =
    trip.direction === TripDirection.TO_SCHOOL
      ? TransportEventType.ROUTE_PICKUP_STARTED
      : TransportEventType.ROUTE_HOME_STARTED;

  const settings = await getOrCreateSettings(organizationId);
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const assignments = await prisma.studentAssignment.findMany({
    where: {
      organizationId,
      studentCode: { in: trip.passengers.map((p) => p.studentCode) },
      deletedAt: null,
    },
    include: { pickupStop: true, dropoffStop: true },
  });
  const assignmentByCode = new Map(assignments.map((a) => [a.studentCode, a]));

  let parentsNotified = 0;
  for (const passenger of trip.passengers) {
    const assignment = assignmentByCode.get(passenger.studentCode);
    const stop =
      trip.direction === TripDirection.TO_SCHOOL ? assignment?.pickupStop : assignment?.dropoffStop;

    const marker = await prisma.boardingEvent.create({
      data: {
        organizationId,
        tripId: trip.id,
        stopId: stop?.id,
        studentCode: passenger.studentCode,
        studentName: passenger.studentName,
        className: passenger.className,
        busCode: trip.bus.code,
        routeName: trip.route?.name,
        stopName: stop?.name,
        driverName: trip.driver?.name,
        type: BoardingType.BOARDING,
        eventType: journeyEventType,
        attendanceMethod: AttendanceMethod.MANUAL,
        recordedByUserId: actorUserId,
        outcome: "JOURNEY_START",
        academicYear: settings.academicYear,
        term: settings.term,
        scannedAt: now,
      },
    });

    await queueTransportEventNotifications({
      organizationId,
      eventType: journeyEventType,
      studentName: passenger.studentName,
      studentCode: passenger.studentCode,
      boardingEventId: marker.id,
      vars: {
        studentName: passenger.studentName,
        busCode: trip.bus.code,
        time: timeStr,
        routeName: trip.route?.name,
        schoolName: settings.schoolName ?? "School",
        stopName: stop?.name,
      },
    });
    parentsNotified += 1;
  }

  const updated = await prisma.trip.update({
    where: { id: trip.id },
    data: {
      status: TripStatus.BOARDING,
      startedAt: now,
      tripDate: today,
    },
    include: tripInclude,
  });

  await writeAudit(organizationId, "BEGIN_ROUTE_JOURNEY", {
    entityType: "trip",
    entityId: tripId,
    detail: `${journeyEventType} at ${now.toISOString()} · ${parentsNotified} parent alerts queued`,
    actorUserId,
  });

  return {
    trip: serializeTrip(updated),
    alreadyStarted: false as const,
    startedAt: now.toISOString(),
    parentsNotified,
    journeyEventType,
  };
}

export async function bulkConfirmAttendance(
  organizationId: string,
  actorUserId: string | undefined,
  input: {
    tripId: string;
    eventType: TransportEventType;
    studentCodes: string[];
    idempotencyPrefix?: string;
  }
) {
  const results: { studentCode: string; ok: boolean; error?: string }[] = [];
  for (const code of input.studentCodes) {
    try {
      await recordManualAttendance(organizationId, actorUserId, {
        tripId: input.tripId,
        eventType: input.eventType,
        studentCode: code,
        action: "CONFIRM",
        idempotencyKey: input.idempotencyPrefix ? `${input.idempotencyPrefix}:${code}` : undefined,
      });
      results.push({ studentCode: code, ok: true });
    } catch (e) {
      results.push({
        studentCode: code,
        ok: false,
        error: e instanceof AppError ? e.message : "Failed",
      });
    }
  }
  return results;
}
