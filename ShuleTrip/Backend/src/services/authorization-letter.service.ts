import { TripStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { parseConditionsFromStorage } from '../constants/authorization-conditions';

const FINAL_STAGE_KEY = 'final_authorization';

export class AuthorizationLetterService {
  async buildForTrip(tripId: string, organizationId?: string) {
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        tenant: true,
        participants: true,
        staff: true,
        vehicles: true,
        authorizations: true,
        approvals: { orderBy: { decidedAt: 'asc' } },
      },
    });

    if (!trip) throw new AppError(404, 'Trip not found');
    if (trip.status !== TripStatus.APPROVED && trip.status !== TripStatus.TRIP_IN_PROGRESS && trip.status !== TripStatus.COMPLETED) {
      throw new AppError(409, 'Authorization letter is available only after final approval');
    }

    const auth = trip.authorizations[0];
    if (!auth) throw new AppError(404, 'No authorization record for this trip');

    const finalApproval = trip.approvals.find(
      (a) => a.stageKey === FINAL_STAGE_KEY && a.decision === 'APPROVED'
    );

    const vehicle = trip.vehicles[0];
    const leader = trip.staff.find((s) => s.isLeader);

    return {
      authorizationNo: auth.authorizationNo,
      issuedAt: auth.issuedAt,
      issuedByName: auth.issuedByName,
      verificationReference: auth.authorizationNo,
      conditions: parseConditionsFromStorage(auth.conditions),
      trip: {
        id: trip.id,
        reference: trip.reference,
        title: trip.title,
        purpose: trip.purpose,
        destination: trip.destination,
        departAt: trip.departAt,
        returnAt: trip.returnAt,
        status: trip.status,
        tripLeaderName: trip.tripLeaderName ?? leader?.fullName ?? null,
      },
      school: {
        name: trip.tenant?.organizationName ?? 'School',
        code: trip.tenant?.schoolCode ?? null,
        district: trip.tenant?.district ?? null,
        sector: trip.tenant?.sector ?? null,
      },
      counts: {
        learners: trip.participants.length,
        staff: trip.staff.length,
        consentRecorded: trip.participants.filter((p) => p.guardianConsent).length,
      },
      transport: vehicle
        ? {
            mode: vehicle.mode,
            plateNumber: vehicle.plateNumber,
            vehicleType: vehicle.vehicleType,
            capacity: vehicle.capacity,
            driverName: vehicle.driverName,
            driverPhone: vehicle.driverPhone,
          }
        : null,
      finalApproval: finalApproval
        ? {
            id: finalApproval.id,
            stageLabel: finalApproval.stageLabel,
            signatureName: finalApproval.signatureName,
            stampReference: finalApproval.stampReference,
            authorityOffice: finalApproval.authorityOffice,
            officialRole: finalApproval.officialRole,
            decidedAt: finalApproval.decidedAt,
            reason: finalApproval.reason,
            hasSignatureFile: Boolean(finalApproval.signatureStorageKey),
            hasStampFile: Boolean(finalApproval.stampStorageKey),
          }
        : null,
      responsibleAuthority:
        trip.tenant?.district != null
          ? `District Education Office · ${trip.tenant.district}`
          : 'Republic of Rwanda · Ministry of Education (configured authority)',
    };
  }
}

export const authorizationLetterService = new AuthorizationLetterService();
