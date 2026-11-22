import {
  RouteStatus,
  TransportEnrollmentStatus,
  TransportServiceDirection,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import {
  fetchClassesFromManagement,
  fetchStudentsFromManagement,
  isStudentManagementEnabled,
  type SmStudent,
} from "../clients/student-management.client";
import { getOrCreateSettings } from "./transport.service";
import { writeAudit } from "./seed.service";

export async function listLearnerClassOptions(organizationId: string) {
  const linked = isStudentManagementEnabled();
  if (!linked) {
    return { studentManagementLinked: false as const, classes: [] as { id: string; label: string }[] };
  }
  const classes = await fetchClassesFromManagement(organizationId);
  return {
    studentManagementLinked: true as const,
    classes: classes.map((c) => ({ id: c.id, label: c.label })),
  };
}

export async function searchLearnerDirectory(
  organizationId: string,
  opts: {
    q?: string;
    className?: string;
    classId?: string;
    excludeEnrolled?: boolean;
    assignmentStatus?: "all" | "assigned" | "unassigned";
    limit?: number;
  }
) {
  const limit = Math.min(opts.limit ?? 200, 2000);
  const activeAssignments = await prisma.studentAssignment.findMany({
    where: { organizationId, deletedAt: null, enrollmentStatus: TransportEnrollmentStatus.ACTIVE },
    include: { route: { select: { id: true, name: true, code: true } }, pickupStop: true, dropoffStop: true },
  });
  const assignmentByCode = new Map(activeAssignments.map((a) => [a.studentCode, a]));
  const enrolledCodes = new Set(activeAssignments.map((e) => e.studentCode));

  let smRows: SmStudent[] = [];
  const smLinked = isStudentManagementEnabled();
  if (smLinked) {
    smRows = await fetchStudentsFromManagement(organizationId, {
      search: opts.q,
      className: opts.className,
      classId: opts.classId,
      limit,
    });
  }

  let directory = smRows.map((s) => {
    const assignment = assignmentByCode.get(s.studentCode);
    return {
      source: "student_management" as const,
      id: s.id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      className: s.className ?? null,
      photoUrl: s.photoUrl ?? null,
      rfidUid: s.rfidUid ?? null,
      parentName: s.parentName ?? null,
      parentPhone: s.parentPhone ?? null,
      alreadyEnrolled: enrolledCodes.has(s.studentCode),
      currentRoute: assignment?.route
        ? { id: assignment.route.id, name: assignment.route.name, code: assignment.route.code }
        : null,
      pickupStopName: assignment?.pickupStop?.name ?? null,
      dropoffStopName: assignment?.dropoffStop?.name ?? null,
    };
  });

  if (opts.excludeEnrolled) {
    directory = directory.filter((d) => !d.alreadyEnrolled);
  }
  if (opts.assignmentStatus === "assigned") {
    directory = directory.filter((d) => d.alreadyEnrolled);
  } else if (opts.assignmentStatus === "unassigned") {
    directory = directory.filter((d) => !d.alreadyEnrolled);
  }

  if (!directory.length && opts.q) {
    const local = await prisma.studentAssignment.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { studentName: { contains: opts.q, mode: "insensitive" } },
          { studentCode: { contains: opts.q, mode: "insensitive" } },
        ],
      },
      take: limit,
      include: { route: true, pickupStop: true },
    });
    return local.map((a) => ({
      source: "transport" as const,
      id: a.id,
      studentCode: a.studentCode,
      fullName: a.studentName,
      className: a.className,
      photoUrl: null,
      rfidUid: null,
      parentName: a.guardianName,
      parentPhone: a.guardianPhone,
      alreadyEnrolled: true,
      assignment: a,
    }));
  }

  return directory;
}

async function resolveRouteAssignment(organizationId: string, routeId: string, pickupStopId: string) {
  const route = await prisma.route.findFirst({
    where: { organizationId, id: routeId, deletedAt: null },
    include: { stops: { orderBy: { sequence: "asc" } }, buses: true },
  });
  if (!route) throw new AppError(404, "Route not found");

  const stop = route.stops.find((s) => s.id === pickupStopId);
  if (!stop) throw new AppError(400, "Pickup stop does not belong to this route");

  const primaryBus = route.buses[0] ?? null;
  return { route, stop, primaryBus };
}

async function assertRouteCapacity(
  organizationId: string,
  routeId: string,
  busId: string | null | undefined,
  additionalCount: number
) {
  const assigned = await prisma.studentAssignment.count({
    where: { organizationId, routeId, deletedAt: null, enrollmentStatus: TransportEnrollmentStatus.ACTIVE },
  });
  const bus = busId
    ? await prisma.bus.findFirst({ where: { organizationId, id: busId, deletedAt: null } })
    : null;
  const capacity = bus?.capacity ?? 999;
  if (assigned + additionalCount > capacity) {
    throw new AppError(
      400,
      `Route capacity exceeded: ${assigned + additionalCount} learners assigned but bus capacity is ${capacity}`
    );
  }
}

type BulkEntry = {
  studentId?: string;
  studentCode: string;
  studentName: string;
  className?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  pickupStopId?: string;
  dropoffStopId?: string;
  moveFromOtherRoute?: boolean;
};

export async function bulkAssignLearners(
  organizationId: string,
  body: Record<string, unknown>,
  actorUserId?: string
) {
  const routeId = String(body.routeId ?? "");
  const defaultPickupStopId = String(body.pickupStopId ?? "");
  const defaultDropoffStopId = String(body.dropoffStopId ?? body.pickupStopId ?? "");
  const serviceDirection = (body.serviceDirection as TransportServiceDirection) ?? TransportServiceDirection.BOTH;
  const entries = (body.entries as BulkEntry[] | undefined) ?? [];

  if (!routeId) throw new AppError(400, "routeId is required");
  if (!entries.length) throw new AppError(400, "At least one learner is required");

  const route = await prisma.route.findFirst({
    where: { organizationId, id: routeId, deletedAt: null },
    include: { stops: { orderBy: { sequence: "asc" } }, buses: true },
  });
  if (!route) throw new AppError(404, "Route not found");
  if (route.status === RouteStatus.INACTIVE) {
    throw new AppError(400, "Cannot assign learners to an inactive route");
  }
  if (!route.stops.length) throw new AppError(400, "Route has no stops — configure the route first");

  const primaryBus = route.buses.find((b) => b.id === route.primaryBusId) ?? route.buses[0] ?? null;
  const settings = await getOrCreateSettings(organizationId);

  const morningBusId =
    serviceDirection === TransportServiceDirection.AFTERNOON_ONLY ? null : primaryBus?.id ?? null;
  const afternoonBusId =
    serviceDirection === TransportServiceDirection.MORNING_ONLY ? null : primaryBus?.id ?? null;

  const stopIds = new Set(route.stops.map((s) => s.id));

  for (const entry of entries) {
    const pickupStopId = entry.pickupStopId ?? defaultPickupStopId;
    const dropoffStopId = entry.dropoffStopId ?? defaultDropoffStopId ?? pickupStopId;
    if (!pickupStopId) throw new AppError(400, `Pickup stop required for ${entry.studentCode}`);
    if (!stopIds.has(pickupStopId) || !stopIds.has(dropoffStopId)) {
      throw new AppError(400, `Invalid stop for learner ${entry.studentCode}`);
    }
  }

  await assertRouteCapacity(organizationId, routeId, primaryBus?.id, entries.length);

  const results = await prisma.$transaction(async (tx) => {
    const out: { studentCode: string; status: "created" | "updated" | "moved"; id: string }[] = [];

    for (const entry of entries) {
      if (!entry.studentCode || !entry.studentName) continue;

      const pickupStopId = entry.pickupStopId ?? defaultPickupStopId;
      const dropoffStopId = entry.dropoffStopId ?? defaultDropoffStopId ?? pickupStopId;

      const existing = await tx.studentAssignment.findFirst({
        where: { organizationId, studentCode: entry.studentCode, deletedAt: null },
      });

      if (
        existing?.routeId &&
        existing.routeId !== route.id &&
        !entry.moveFromOtherRoute
      ) {
        throw new AppError(
          409,
          `${entry.studentName} is already on another route. Enable move to transfer.`
        );
      }

      const data: Prisma.StudentAssignmentUncheckedCreateInput = {
        organizationId,
        studentId: entry.studentId ?? entry.studentCode,
        studentCode: entry.studentCode,
        studentName: entry.studentName,
        className: entry.className ?? undefined,
        routeId: route.id,
        pickupStopId,
        dropoffStopId,
        morningBusId,
        afternoonBusId,
        guardianName: entry.guardianName ?? undefined,
        guardianPhone: entry.guardianPhone ?? undefined,
        serviceDirection,
        enrollmentStatus: TransportEnrollmentStatus.ACTIVE,
        academicYear: settings.academicYear,
        term: settings.term,
      };

      let row;
      let status: "created" | "updated" | "moved" = "created";
      if (existing) {
        status = existing.routeId && existing.routeId !== route.id ? "moved" : "updated";
        row = await tx.studentAssignment.update({
          where: { id: existing.id },
          data: { ...data, id: existing.id, organizationId },
        });
      } else {
        row = await tx.studentAssignment.create({ data });
      }
      out.push({ studentCode: entry.studentCode, status, id: row.id });

      if (entry.guardianName || entry.guardianPhone) {
        const parent = await tx.parentContact.findFirst({
          where: { organizationId, studentCode: entry.studentCode, deletedAt: null },
        });
        if (!parent) {
          await tx.parentContact.create({
            data: {
              organizationId,
              assignmentId: row.id,
              studentCode: entry.studentCode,
              studentName: entry.studentName,
              parentName: entry.guardianName ?? "Guardian",
              phone: entry.guardianPhone,
            },
          });
        }
      }
    }
    return out;
  });

  await writeAudit(organizationId, "BULK_ASSIGN", {
    actorUserId,
    entityType: "route",
    entityId: route.id,
    detail: `${entries.length} learners`,
  });

  return {
    route: { id: route.id, name: route.name, code: route.code },
    bus: primaryBus ? { id: primaryBus.id, code: primaryBus.code, capacity: primaryBus.capacity } : null,
    assigned: results.length,
    results,
  };
}

export async function routeEnrollmentSummary(organizationId: string, routeId: string) {
  const route = await prisma.route.findFirst({
    where: { organizationId, id: routeId, deletedAt: null },
    include: { buses: true, stops: { orderBy: { sequence: "asc" } } },
  });
  if (!route) throw new AppError(404, "Route not found");

  const assigned = await prisma.studentAssignment.count({
    where: { organizationId, routeId, deletedAt: null, enrollmentStatus: TransportEnrollmentStatus.ACTIVE },
  });
  const bus = route.buses[0];
  const capacity = bus?.capacity ?? 0;

  return {
    routeId: route.id,
    routeName: route.name,
    assigned,
    capacity,
    remaining: capacity ? Math.max(0, capacity - assigned) : null,
    stops: route.stops,
    bus: bus ? { id: bus.id, code: bus.code, plateNumber: bus.plateNumber, capacity: bus.capacity } : null,
  };
}

export async function learnersDashboard(organizationId: string) {
  const settings = await getOrCreateSettings(organizationId);
  const [assigned, activeRoutes, allAssignments] = await Promise.all([
    prisma.studentAssignment.count({
      where: { organizationId, deletedAt: null, enrollmentStatus: TransportEnrollmentStatus.ACTIVE, routeId: { not: null } },
    }),
    prisma.route.count({
      where: {
        organizationId,
        deletedAt: null,
        status: "ACTIVE",
        assignments: { some: { deletedAt: null, enrollmentStatus: TransportEnrollmentStatus.ACTIVE } },
      },
    }),
    prisma.studentAssignment.count({ where: { organizationId, deletedAt: null } }),
  ]);

  let schoolLearners: number | null = null;
  if (isStudentManagementEnabled()) {
    const rows = await fetchStudentsFromManagement(organizationId, { limit: 500 });
    schoolLearners = rows.length >= 500 ? 500 : rows.length;
  }

  const totalInSchool = schoolLearners ?? allAssignments;
  const unassigned = schoolLearners != null ? Math.max(0, schoolLearners - assigned) : null;

  return {
    academicYear: settings.academicYear,
    term: settings.term,
    totalInSchool,
    assigned,
    unassigned,
    activeRoutesWithAssignments: activeRoutes,
    studentManagementLinked: isStudentManagementEnabled(),
  };
}

export async function routeLearnersDetail(organizationId: string, routeId: string) {
  const route = await prisma.route.findFirst({
    where: { organizationId, id: routeId, deletedAt: null },
    include: {
      stops: { orderBy: { sequence: "asc" } },
      buses: { where: { deletedAt: null }, include: { driver: true, attendant: true } },
    },
  });
  if (!route) throw new AppError(404, "Route not found");

  const primaryBus = route.buses.find((b) => b.id === route.primaryBusId) ?? route.buses[0] ?? null;
  const assignments = await prisma.studentAssignment.findMany({
    where: {
      organizationId,
      routeId,
      deletedAt: null,
      enrollmentStatus: TransportEnrollmentStatus.ACTIVE,
    },
    include: { pickupStop: true, dropoffStop: true },
    orderBy: { studentName: "asc" },
  });

  const capacity = primaryBus?.capacity ?? 0;
  const assigned = assignments.length;

  const stopSummaries = route.stops.map((stop) => {
    const pickupLearners = assignments.filter((a) => a.pickupStopId === stop.id);
    const dropoffLearners = assignments.filter((a) => a.dropoffStopId === stop.id);
    return {
      stop,
      pickupCount: pickupLearners.length,
      dropoffCount: dropoffLearners.length,
      learners: pickupLearners.map((a) => ({
        id: a.id,
        studentCode: a.studentCode,
        studentName: a.studentName,
        className: a.className,
        pickupStopId: a.pickupStopId,
        dropoffStopId: a.dropoffStopId,
        pickupStopName: a.pickupStop?.name,
        dropoffStopName: a.dropoffStop?.name,
      })),
    };
  });

  const destinationsWithLearners = stopSummaries.filter((s) => s.pickupCount > 0 || s.dropoffCount > 0).length;

  return {
    route: {
      id: route.id,
      name: route.name,
      code: route.code,
      status: route.status,
      serviceDirection: route.serviceDirection,
      startLabel: route.stops[0]?.name,
      endLabel: route.stops[route.stops.length - 1]?.name,
      departureTime: route.departureTime,
      arrivalTime: route.arrivalTime,
      pathGeoJson: route.pathGeoJson,
      color: route.color,
    },
    bus: primaryBus
      ? {
          id: primaryBus.id,
          code: primaryBus.code,
          plateNumber: primaryBus.plateNumber,
          capacity: primaryBus.capacity,
          driverName: primaryBus.driver?.name ?? null,
          attendantName: primaryBus.attendant?.name ?? null,
        }
      : null,
    assigned,
    capacity,
    capacityPercent: capacity ? Math.round((assigned / capacity) * 100) : null,
    stopCount: route.stops.length,
    destinationsWithLearners,
    stops: stopSummaries,
    allLearners: assignments.map((a) => ({
      id: a.id,
      studentCode: a.studentCode,
      studentName: a.studentName,
      className: a.className,
      pickupStopId: a.pickupStopId,
      dropoffStopId: a.dropoffStopId,
      pickupStopName: a.pickupStop?.name,
      dropoffStopName: a.dropoffStop?.name,
    })),
  };
}

export async function unassignLearners(
  organizationId: string,
  body: Record<string, unknown>,
  actorUserId?: string
) {
  const ids = (body.assignmentIds as string[] | undefined) ?? [];
  if (!ids.length) throw new AppError(400, "assignmentIds required");

  await prisma.$transaction(
    ids.map((id) =>
      prisma.studentAssignment.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: {
          deletedAt: new Date(),
          enrollmentStatus: TransportEnrollmentStatus.ENDED,
          routeId: null,
          pickupStopId: null,
          dropoffStopId: null,
        },
      })
    )
  );

  await writeAudit(organizationId, "UNASSIGN_LEARNERS", {
    actorUserId,
    detail: `${ids.length} learners`,
  });

  return { unassigned: ids.length };
}
