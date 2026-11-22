import {
  Prisma,
  RouteServiceDirection,
  RouteStatus,
  StopKind,
} from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function num(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const routeInclude = {
  stops: { orderBy: { sequence: "asc" as const } },
  buses: { where: { deletedAt: null }, include: { driver: true, attendant: true } },
  _count: { select: { assignments: true, trips: true } },
} satisfies Prisma.RouteInclude;

export async function routesDashboard(organizationId: string) {
  const [totalRoutes, activeRoutes, totalStops, enrolledLearners, busesOnRoutes] = await Promise.all([
    prisma.route.count({ where: { organizationId, deletedAt: null } }),
    prisma.route.count({ where: { organizationId, deletedAt: null, status: RouteStatus.ACTIVE } }),
    prisma.stop.count({ where: { organizationId, route: { deletedAt: null } } }),
    prisma.studentAssignment.count({ where: { organizationId, deletedAt: null, routeId: { not: null } } }),
    prisma.bus.count({ where: { organizationId, deletedAt: null, routeId: { not: null } } }),
  ]);
  return {
    totalRoutes,
    activeRoutes,
    totalStops,
    enrolledLearners,
    assignedBuses: busesOnRoutes,
  };
}

export async function nextRouteCode(organizationId: string) {
  const routes = await prisma.route.findMany({
    where: { organizationId },
    select: { code: true },
  });
  let max = 0;
  for (const r of routes) {
    const m = /^RTE-(\d+)$/i.exec(r.code.trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `RTE-${String(max + 1).padStart(3, "0")}`;
}

export async function listRoutesPage(
  organizationId: string,
  opts: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    serviceDirection?: string;
    busId?: string;
  }
) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 10));
  const q = opts.q?.trim();

  const where: Prisma.RouteWhereInput = {
    organizationId,
    deletedAt: null,
    ...(opts.status ? { status: opts.status as RouteStatus } : {}),
    ...(opts.serviceDirection
      ? { serviceDirection: opts.serviceDirection as RouteServiceDirection }
      : {}),
    ...(opts.busId
      ? {
          OR: [{ primaryBusId: opts.busId }, { buses: { some: { id: opts.busId } } }],
        }
      : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { direction: { contains: q, mode: "insensitive" } },
            { stops: { some: { name: { contains: q, mode: "insensitive" } } } },
            { buses: { some: { code: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.route.count({ where }),
    prisma.route.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: routeInclude,
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    items: items.map(enrichRouteRow),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

type RouteRow = Prisma.RouteGetPayload<{ include: typeof routeInclude }>;

function enrichRouteRow(route: RouteRow) {
  const ordered = [...route.stops].sort((a, b) => a.sequence - b.sequence);
  const origin = ordered.find((s) => s.kind === StopKind.ORIGIN) ?? ordered[0];
  const dest =
    ordered.find((s) => s.kind === StopKind.DESTINATION || s.kind === StopKind.SCHOOL) ??
    ordered[ordered.length - 1];
  const primaryBus =
    route.buses.find((b) => b.id === route.primaryBusId) ?? route.buses[0] ?? null;
  return {
    ...route,
    primaryBus,
    startLabel: origin?.name ?? "—",
    endLabel: dest?.name ?? "—",
    learnerCount: route._count.assignments,
    stopCount: route.stops.length,
    tripCount: route._count.trips,
  };
}

export async function getRouteDetail(organizationId: string, id: string) {
  const route = await prisma.route.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      ...routeInclude,
      assignments: {
        where: { deletedAt: null },
        take: 200,
        select: {
          id: true,
          studentCode: true,
          studentName: true,
          className: true,
          pickupStopId: true,
          dropoffStopId: true,
        },
      },
    },
  });
  if (!route) throw new AppError(404, "Route not found");
  const { assignments, ...core } = route;
  return { ...enrichRouteRow(core as Parameters<typeof enrichRouteRow>[0]), assignments };
}

export type RouteStopInput = {
  id?: string;
  name: string;
  sequence: number;
  kind?: StopKind | string;
  provinceId?: string;
  districtId?: string;
  sectorId?: string;
  cellId?: string;
  villageId?: string;
  placeName?: string;
  adminLabel?: string;
  address?: string;
  plannedTime?: string;
  etaMinutes?: number;
  latitude?: number;
  longitude?: number;
};

export async function saveRouteFull(
  organizationId: string,
  body: Record<string, unknown>,
  id?: string
) {
  const name = str(body.name);
  let code = str(body.code);
  if (!name) throw new AppError(400, "Route name is required");
  if (!code) code = await nextRouteCode(organizationId);

  const stopsRaw = body.stops;
  if (!Array.isArray(stopsRaw) || stopsRaw.length < 2) {
    throw new AppError(400, "At least origin and destination stops are required");
  }
  const stops: RouteStopInput[] = stopsRaw.map((s, i) => {
    const row = s as Record<string, unknown>;
    return {
      id: str(row.id) || undefined,
      name: str(row.name) || `Stop ${i + 1}`,
      sequence: num(row.sequence) ?? i + 1,
      kind: (str(row.kind) || StopKind.INTERMEDIATE) as StopKind,
      provinceId: str(row.provinceId) || undefined,
      districtId: str(row.districtId) || undefined,
      sectorId: str(row.sectorId) || undefined,
      cellId: str(row.cellId) || undefined,
      villageId: str(row.villageId) || undefined,
      placeName: str(row.placeName) || undefined,
      adminLabel: str(row.adminLabel) || undefined,
      address: str(row.address) || undefined,
      plannedTime: str(row.plannedTime) || undefined,
      etaMinutes: num(row.etaMinutes),
      latitude: num(row.latitude),
      longitude: num(row.longitude),
    };
  });

  const status = (str(body.status) || RouteStatus.DRAFT) as RouteStatus;
  const serviceDirection = (str(body.serviceDirection) || RouteServiceDirection.BOTH) as RouteServiceDirection;
  const primaryBusId = str(body.primaryBusId) || null;

  const routeData = {
    name,
    code,
    direction: str(body.direction) || buildDirectionLabel(stops),
    serviceDirection,
    color: str(body.color) || "#FCB038",
    lineWidth: num(body.lineWidth) ?? 7,
    lineOpacity: num(body.lineOpacity) ?? 1,
    distanceKm: num(body.distanceKm),
    etaMinutes: num(body.etaMinutes),
    departureTime: str(body.departureTime) || null,
    arrivalTime: str(body.arrivalTime) || null,
    operatingDays: body.operatingDays ?? [1, 2, 3, 4, 5],
    pathGeoJson:
      body.pathGeoJson === undefined || body.pathGeoJson === null
        ? undefined
        : (body.pathGeoJson as Prisma.InputJsonValue),
    schoolLat: num(body.schoolLat),
    schoolLng: num(body.schoolLng),
    schoolName: str(body.schoolName) || null,
    primaryBusId,
    status,
    notes: str(body.notes) || null,
  };

  const saved = await prisma.$transaction(async (tx) => {
    let routeId = id;
    if (routeId) {
      const existing = await tx.route.findFirst({
        where: { id: routeId, organizationId, deletedAt: null },
      });
      if (!existing) throw new AppError(404, "Route not found");
      await tx.route.update({ where: { id: routeId }, data: routeData });
    } else {
      const created = await tx.route.create({
        data: { organizationId, ...routeData },
      });
      routeId = created.id;
    }

    const existingStops = await tx.stop.findMany({
      where: { routeId, organizationId },
      select: { id: true },
    });
    const existingIds = new Set(existingStops.map((s) => s.id));
    const keepIds = stops.map((s) => s.id).filter((sid) => sid && existingIds.has(sid)) as string[];

    await tx.stop.deleteMany({
      where: {
        routeId,
        organizationId,
        id: { notIn: keepIds.length ? keepIds : ["__none__"] },
      },
    });

    for (const stop of stops) {
      const stopData = {
        name: stop.name,
        sequence: stop.sequence,
        kind: (stop.kind as StopKind) ?? StopKind.INTERMEDIATE,
        provinceId: stop.provinceId,
        districtId: stop.districtId,
        sectorId: stop.sectorId,
        cellId: stop.cellId,
        villageId: stop.villageId,
        placeName: stop.placeName,
        adminLabel: stop.adminLabel,
        address: stop.address,
        plannedTime: stop.plannedTime,
        etaMinutes: stop.etaMinutes,
        latitude: stop.latitude,
        longitude: stop.longitude,
      };
      if (stop.id && existingIds.has(stop.id)) {
        await tx.stop.update({
          where: { id: stop.id },
          data: stopData,
        });
      } else {
        await tx.stop.create({
          data: { organizationId, routeId, ...stopData },
        });
      }
    }

    if (primaryBusId) {
      await tx.bus.updateMany({
        where: { id: primaryBusId, organizationId, deletedAt: null },
        data: { routeId },
      });
    }

    return routeId;
  });

  return getRouteDetail(organizationId, saved);
}

function buildDirectionLabel(stops: RouteStopInput[]) {
  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  const a = sorted[0]?.name ?? "Start";
  const b = sorted[sorted.length - 1]?.name ?? "End";
  return `${a} → ${b}`;
}

export async function archiveRoute(organizationId: string, id: string) {
  const route = await prisma.route.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: { _count: { select: { trips: true } } },
  });
  if (!route) throw new AppError(404, "Route not found");

  const hadTrips = route._count.trips > 0;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.studentAssignment.updateMany({
      where: { organizationId, routeId: id, deletedAt: null },
      data: { routeId: null, pickupStopId: null, dropoffStopId: null },
    });
    await tx.bus.updateMany({
      where: { organizationId, routeId: id },
      data: { routeId: null },
    });
    await tx.route.update({
      where: { id },
      data: { deletedAt: now, status: RouteStatus.INACTIVE, primaryBusId: null },
    });
  });

  return {
    id,
    archived: hadTrips,
    deleted: true,
    message: hadTrips
      ? "Route removed from planning. Past trips are kept in history."
      : "Route deleted.",
  };
}
