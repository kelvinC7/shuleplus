import { BusStatus, RouteStatus, TransportEnrollmentStatus } from "@prisma/client";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { writeAudit } from "./seed.service";

const CONFIRM_PHRASE = "CLEAR_ALL_TRANSPORT_DATA";

/**
 * Removes operational transport data for one organization (routes, buses, enrollments, trips).
 * Keeps tenant settings and notification templates.
 */
export async function purgeOperationalData(
  organizationId: string,
  confirm: string,
  actorUserId?: string
) {
  if (confirm !== CONFIRM_PHRASE) {
    throw new AppError(400, `Confirmation must be exactly: ${CONFIRM_PHRASE}`);
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const tripIds = (
      await tx.trip.findMany({
        where: { organizationId },
        select: { id: true },
      })
    ).map((t) => t.id);

    if (tripIds.length) {
      await tx.boardingEvent.deleteMany({ where: { organizationId, tripId: { in: tripIds } } });
      await tx.gpsPing.deleteMany({ where: { organizationId, tripId: { in: tripIds } } });
      await tx.tripPassenger.deleteMany({ where: { organizationId, tripId: { in: tripIds } } });
      await tx.trip.deleteMany({ where: { organizationId } });
    }

    await tx.studentAssignment.updateMany({
      where: { organizationId, deletedAt: null },
      data: {
        deletedAt: now,
        routeId: null,
        pickupStopId: null,
        dropoffStopId: null,
        morningBusId: null,
        afternoonBusId: null,
        enrollmentStatus: TransportEnrollmentStatus.ENDED,
      },
    });

    await tx.bus.updateMany({
      where: { organizationId, deletedAt: null },
      data: { deletedAt: now, routeId: null, status: BusStatus.INACTIVE },
    });

    await tx.route.updateMany({
      where: { organizationId, deletedAt: null },
      data: { deletedAt: now, status: RouteStatus.INACTIVE, primaryBusId: null },
    });
  });

  await writeAudit(organizationId, "transport.purge_operational_data", {
    actorUserId,
    detail: "Cleared routes, buses, enrollments, and trips",
  });

  return {
    purged: true,
    message: "All transport routes, buses, learner enrollments, and trips were cleared for your organization.",
  };
}

export { CONFIRM_PHRASE as PURGE_CONFIRM_PHRASE };
