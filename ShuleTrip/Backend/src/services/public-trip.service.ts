import { TripStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { parseConditionsFromStorage } from '../constants/authorization-conditions';

export type PublicTripAccess = {
  allowed: boolean;
  headline: string;
  detail: string;
};

function accessFromStatus(status: TripStatus): PublicTripAccess {
  switch (status) {
    case TripStatus.APPROVED:
    case TripStatus.TRIP_IN_PROGRESS:
      return {
        allowed: true,
        headline: 'Authorized',
        detail: 'This school trip is approved. Learners may travel under the registered plan.',
      };
    case TripStatus.COMPLETED:
      return {
        allowed: false,
        headline: 'Completed',
        detail: 'This trip has already taken place and is closed.',
      };
    case TripStatus.REJECTED:
      return {
        allowed: false,
        headline: 'Not authorized',
        detail: 'Government review rejected this application. Travel is not permitted.',
      };
    case TripStatus.CANCELLED:
      return {
        allowed: false,
        headline: 'Cancelled',
        detail: 'This trip was cancelled and is not valid for travel.',
      };
    case TripStatus.CORRECTION_REQUESTED:
      return {
        allowed: false,
        headline: 'Corrections required',
        detail: 'The school must update the application before approval.',
      };
    case TripStatus.DRAFT:
      return {
        allowed: false,
        headline: 'Draft only',
        detail: 'This application has not been submitted for review.',
      };
    default:
      return {
        allowed: false,
        headline: 'Pending review',
        detail: 'Awaiting government decision. Travel is not authorized yet.',
      };
  }
}

export class PublicTripService {
  async getByReference(reference: string) {
    const ref = reference.trim();
    if (!ref) throw new AppError(400, 'Trip reference is required');

    const trip = await prisma.trip.findFirst({
      where: { reference: { equals: ref, mode: 'insensitive' } },
      include: {
        tenant: { select: { organizationName: true, schoolCode: true, district: true } },
        participants: {
          select: { fullName: true, studentCode: true, classLabel: true, guardianConsent: true },
          orderBy: { fullName: 'asc' },
        },
        staff: { orderBy: { fullName: 'asc' } },
        vehicles: true,
        documents: { select: { documentType: true, fileName: true } },
        approvals: { orderBy: { createdAt: 'desc' }, take: 1 },
        authorizations: true,
      },
    });

    if (!trip) throw new AppError(404, 'Trip not found');

    const access = accessFromStatus(trip.status);
    const latestApproval = trip.approvals[0];
    const authorization = trip.authorizations[0];

    return {
      reference: trip.reference,
      title: trip.title,
      purpose: trip.purpose,
      destination: trip.destination,
      departAt: trip.departAt,
      returnAt: trip.returnAt,
      status: trip.status,
      tripLeaderName: trip.tripLeaderName,
      organizationName: trip.tenant?.organizationName ?? null,
      schoolCode: trip.tenant?.schoolCode ?? null,
      district: trip.tenant?.district ?? null,
      access,
      governmentDecision: latestApproval
        ? {
            decision: latestApproval.decision,
            stageLabel: latestApproval.stageLabel,
            reason: latestApproval.reason,
            decidedAt: latestApproval.decidedAt,
          }
        : null,
      authorization: authorization
        ? {
            authorizationNo: authorization.authorizationNo,
            issuedAt: authorization.issuedAt,
            issuedByName: authorization.issuedByName,
            conditions: parseConditionsFromStorage(authorization.conditions),
            revokedAt: authorization.revokedAt,
          }
        : null,
      counts: {
        participants: trip.participants.length,
        staff: trip.staff.length,
        documents: trip.documents.length,
        consentRecorded: trip.participants.filter((p) => p.guardianConsent).length,
      },
      participants: trip.participants.map((p) => ({
        fullName: p.fullName,
        studentCode: p.studentCode,
        classLabel: p.classLabel,
        guardianConsent: p.guardianConsent,
      })),
      staff: trip.staff.map((s) => ({
        fullName: s.fullName,
        role: s.role,
        isLeader: s.isLeader,
      })),
      vehicle: trip.vehicles[0]
        ? {
            mode: trip.vehicles[0].mode,
            plateNumber: trip.vehicles[0].plateNumber,
            driverName: trip.vehicles[0].driverName,
          }
        : null,
    };
  }
}

export const publicTripService = new PublicTripService();
