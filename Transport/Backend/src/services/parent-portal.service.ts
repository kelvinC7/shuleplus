import { TripStatus } from "@prisma/client";
import { prisma } from "../config/database";

function dateOnly(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfTodayUtc() {
  const d = dateOnly();
  return new Date(d.getTime());
}

function eventLabel(eventType: string) {
  switch (eventType) {
    case "BOARDING_TO_SCHOOL":
      return { phase: "morning", step: 1, label: "Entered bus", detail: "Pickup confirmed" };
    case "ARRIVED_AT_SCHOOL":
      return { phase: "morning", step: 2, label: "Arrived at school", detail: "School arrival recorded" };
    case "BOARDING_TO_HOME":
      return { phase: "afternoon", step: 1, label: "Entered bus", detail: "Departure for home confirmed" };
    case "DROPPED_OFF_HOME":
      return { phase: "afternoon", step: 2, label: "Exited bus", detail: "Drop-off at approved stop" };
    default:
      return { phase: "other", step: 0, label: eventType.replace(/_/g, " "), detail: "" };
  }
}

function sanitizeStop(
  stop: {
    id: string;
    name: string;
    sequence: number;
    kind: string;
    placeName: string | null;
    adminLabel: string | null;
    address: string | null;
    plannedTime: string | null;
    latitude: number | null;
    longitude: number | null;
  },
  isChildStop: boolean
) {
  return {
    id: stop.id,
    name: stop.name,
    sequence: stop.sequence,
    kind: stop.kind,
    plannedTime: stop.plannedTime,
    landmark: stop.placeName || stop.adminLabel || null,
    isChildStop,
    address: isChildStop ? stop.address : null,
    latitude: stop.latitude,
    longitude: stop.longitude,
  };
}

export async function parentPortalSnapshot(organizationId: string, studentCode: string) {
  const code = studentCode.trim();
  const assignment = await prisma.studentAssignment.findFirst({
    where: {
      organizationId,
      deletedAt: null,
      studentCode: { equals: code, mode: "insensitive" },
    },
    include: {
      route: {
        include: {
          stops: { orderBy: { sequence: "asc" } },
          supervisors: { where: { deletedAt: null } },
        },
      },
      pickupStop: true,
      dropoffStop: true,
      morningBus: { include: { driver: true } },
      afternoonBus: { include: { driver: true } },
    },
  });

  if (!assignment) {
    return { enrolled: false as const, studentCode: code, linkStatus: "no_assignment" as const };
  }

  const childStopIds = new Set(
    [assignment.pickupStopId, assignment.dropoffStopId].filter(Boolean) as string[]
  );

  const route = assignment.route;
  const stops =
    route?.stops.map((s) => sanitizeStop(s, childStopIds.has(s.id))) ?? [];

  const enrolledCode = assignment.studentCode;

  const todayStart = startOfTodayUtc();
  const todayEvents = await prisma.boardingEvent.findMany({
    where: { organizationId, studentCode: enrolledCode, scannedAt: { gte: todayStart } },
    orderBy: { scannedAt: "asc" },
  });

  const history = await prisma.boardingEvent.findMany({
    where: { organizationId, studentCode: enrolledCode },
    orderBy: { scannedAt: "desc" },
    take: 60,
  });

  const liveTrip = await prisma.trip.findFirst({
    where: {
      organizationId,
      tripDate: dateOnly(),
      routeId: assignment.routeId ?? undefined,
      status: { in: [TripStatus.BOARDING, TripStatus.LIVE] },
    },
    include: {
      bus: { include: { driver: true } },
      route: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  let lastGps: { latitude: number; longitude: number; recordedAt: string } | null = null;
  if (liveTrip) {
    const ping = await prisma.gpsPing.findFirst({
      where: { organizationId, tripId: liveTrip.id },
      orderBy: { createdAt: "desc" },
    });
    if (ping?.latitude != null && ping.longitude != null) {
      lastGps = {
        latitude: ping.latitude,
        longitude: ping.longitude,
        recordedAt: ping.createdAt.toISOString(),
      };
    }
  }

  const morningExpected = ["BOARDING_TO_SCHOOL", "ARRIVED_AT_SCHOOL"];
  const afternoonExpected = ["BOARDING_TO_HOME", "DROPPED_OFF_HOME"];
  const recordedToday = new Set(todayEvents.map((e) => e.eventType));
  const pendingMorning = morningExpected.filter((t) => !recordedToday.has(t as never));
  const pendingAfternoon = afternoonExpected.filter((t) => !recordedToday.has(t as never));

  const driver = assignment.morningBus?.driver ?? liveTrip?.bus?.driver ?? null;
  const supervisor = route?.supervisors[0] ?? null;

  return {
    enrolled: true as const,
    student: {
      studentCode: assignment.studentCode,
      studentName: assignment.studentName,
      className: assignment.className,
      liveState: assignment.liveState,
      suspended: assignment.transportSuspended,
    },
    assignment: {
      routeId: assignment.routeId,
      routeName: route?.name ?? "",
      routeCode: route?.code ?? "",
      schoolName: route?.schoolName ?? "",
      departureTime: route?.departureTime,
      arrivalTime: route?.arrivalTime,
      pickup: assignment.pickupStop
        ? sanitizeStop(assignment.pickupStop, true)
        : null,
      dropoff: assignment.dropoffStop
        ? sanitizeStop(assignment.dropoffStop, true)
        : null,
    },
    bus: assignment.morningBus
      ? {
          code: assignment.morningBus.code,
          plateNumber: assignment.morningBus.plateNumber,
          busType: assignment.morningBus.busType,
        }
      : null,
    staff: {
      driver: driver
        ? {
            name: driver.name,
            phone: driver.phone,
            photoUrl: null as string | null,
            vehicle: assignment.morningBus
              ? `${assignment.morningBus.code} · ${assignment.morningBus.plateNumber}`
              : "",
          }
        : null,
      supervisor: supervisor
        ? {
            name: supervisor.name,
            phone: supervisor.phone,
            roleTitle: supervisor.roleTitle,
            routeName: route?.name ?? "",
          }
        : null,
    },
    route: route
      ? {
          id: route.id,
          name: route.name,
          color: route.color,
          pathGeoJson: route.pathGeoJson,
          stops,
        }
      : null,
    todayJourney: {
      status: liveTrip?.status ?? "SCHEDULED",
      startedAt: liveTrip?.startedAt?.toISOString() ?? null,
      pendingMorning,
      pendingAfternoon,
      note:
        pendingMorning.length || pendingAfternoon.length
          ? "Missing scans do not mean absent until the school confirms."
          : null,
    },
    liveTracking: lastGps
      ? {
          ...lastGps,
          isLive: liveTrip?.status === TripStatus.LIVE,
          stale: Date.now() - new Date(lastGps.recordedAt).getTime() > 5 * 60 * 1000,
        }
      : null,
    todayTimeline: todayEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      ...eventLabel(e.eventType),
      scannedAt: e.scannedAt.toISOString(),
      stopName: e.stopName,
      method: e.attendanceMethod,
      outcome: e.outcome,
      confirmed: e.outcome === "OK",
      status: e.outcome === "OK" ? "confirmed" : "exception",
    })),
    history: history.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      ...eventLabel(e.eventType),
      scannedAt: e.scannedAt.toISOString(),
      stopName: e.stopName,
      method: e.attendanceMethod,
      outcome: e.outcome,
      confirmed: e.outcome === "OK",
      status: e.outcome === "OK" ? "confirmed" : "exception",
    })),
  };
}
