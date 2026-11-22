import { Prisma, TripStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { nextTripReference, parseTripReferenceSequence, tripReferencePrefix } from '../utils/trip-reference';
import { computeTripReadiness } from './readiness.service';
import { WORKFLOW_STAGES, type WorkflowStageKey } from '../constants/workflow-stages';
import { actionableStagesForUser } from './gov-workflow.service';
import type { JwtPayload } from '../middleware/auth.middleware';
import { buildTenantJurisdictionWhere } from '../utils/jurisdiction';
import { phonesMatch } from '../utils/phone-match';
import { publishTripToParentMis } from '../clients/parentmis.client';

export class TripService {
  async listForSchool(organizationId: string, query: { status?: string; q?: string }) {
    const status = query.status?.trim().toUpperCase() as TripStatus | undefined;
    const q = query.q?.trim();

    return prisma.trip.findMany({
      where: {
        organizationId,
        ...(status && Object.values(TripStatus).includes(status) ? { status } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { reference: { contains: q, mode: 'insensitive' } },
                { destination: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        _count: { select: { participants: true, staff: true } },
      },
    });
  }

  private async normalizeLegacyIntakeTrips() {
    await prisma.trip.updateMany({
      where: { status: TripStatus.SUBMITTED },
      data: { status: TripStatus.VALIDATION, currentStageKey: 'intake' },
    });
  }

  async listForGovernment(
    jurisdiction?: { district?: string; sector?: string },
    options?: { status?: TripStatus; stage?: string; queue?: 'actionable' },
    user?: JwtPayload
  ) {
    await this.normalizeLegacyIntakeTrips();

    const tenantFilter = buildTenantJurisdictionWhere(jurisdiction);

    const stageKey = options?.stage;
    const explicitStatus = options?.status;

    /** Keep processed trips visible: exclude school drafts only unless a status filter is explicit. */
    const statusFilter: Prisma.EnumTripStatusFilter | TripStatus | undefined = explicitStatus
      ? explicitStatus
      : { notIn: [TripStatus.DRAFT] };

    let stageScope: Prisma.TripWhereInput | undefined;
    if (stageKey && WORKFLOW_STAGES[stageKey as keyof typeof WORKFLOW_STAGES]) {
      const approvalStageKey = WORKFLOW_STAGES[stageKey as WorkflowStageKey].approvalStageKey;
      stageScope = {
        OR: [
          { currentStageKey: stageKey },
          { approvals: { some: { stageKey: approvalStageKey } } },
        ],
      };
    }

    const rows = await prisma.trip.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...stageScope,
        ...(tenantFilter ? { tenant: tenantFilter } : {}),
      },
      orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }],
      include: {
        tenant: { select: { organizationName: true, schoolCode: true, district: true, sector: true } },
        _count: { select: { participants: true, staff: true, documents: true } },
        approvals: {
          orderBy: { decidedAt: 'asc' },
          take: 8,
          select: {
            stageKey: true,
            stageLabel: true,
            decision: true,
            signatureName: true,
            stampReference: true,
            decidedAt: true,
          },
        },
      },
    });

    if (options?.queue === 'actionable' && user) {
      const stages = actionableStagesForUser(user);
      if (stages.length === 0) return [];
      const approvalKeys = new Set(stages.map((s) => WORKFLOW_STAGES[s].approvalStageKey));
      return rows.filter((r) => {
        if (stages.includes(r.currentStageKey as WorkflowStageKey)) return true;
        return r.approvals.some((a) => approvalKeys.has(a.stageKey));
      });
    }

    return rows;
  }

  async getById(organizationId: string, tripId: string) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, organizationId },
      include: {
        participants: true,
        staff: true,
        vehicles: true,
        documents: true,
        approvals: { orderBy: { createdAt: 'asc' } },
        authorizations: true,
      },
    });
    if (!trip) throw new AppError(404, 'Trip not found');
    return trip;
  }

  private async nextGlobalTripReference(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = tripReferencePrefix(year);
    const rows = await prisma.trip.findMany({
      where: { reference: { startsWith: prefix } },
      select: { reference: true },
    });
    let maxSeq = 0;
    for (const row of rows) {
      const seq = parseTripReferenceSequence(row.reference, year);
      if (seq != null && seq > maxSeq) maxSeq = seq;
    }
    return nextTripReference(maxSeq + 1, year);
  }

  private isTripReferenceConflict(err: unknown): boolean {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false;
    const target = err.meta?.target;
    if (Array.isArray(target)) return target.includes('reference');
    return String(target ?? '').includes('reference');
  }

  async createDraft(organizationId: string, userId: string, input: { title: string; academicYear?: string }) {
    const maxAttempts = 6;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const reference = await this.nextGlobalTripReference();
      try {
        return await prisma.trip.create({
          data: {
            organizationId,
            reference,
            title: input.title.trim(),
            academicYear: input.academicYear?.trim(),
            status: TripStatus.DRAFT,
            createdByUserId: userId,
          },
        });
      } catch (err) {
        if (this.isTripReferenceConflict(err) && attempt < maxAttempts - 1) continue;
        throw err;
      }
    }
    throw new AppError(500, 'Could not allocate a unique trip reference');
  }

  async deleteSchoolTrip(organizationId: string, tripId: string, userId: string) {
    const trip = await prisma.trip.findFirst({ where: { id: tripId, organizationId } });
    if (!trip) throw new AppError(404, 'Trip not found');
    if (trip.status !== TripStatus.DRAFT && trip.status !== TripStatus.CORRECTION_REQUESTED) {
      throw new AppError(
        409,
        'Only draft or correction-requested trips can be deleted. Submitted applications remain on record.'
      );
    }
    await prisma.trip.delete({ where: { id: tripId } });
    await prisma.tripAuditLog.create({
      data: {
        organizationId,
        actorId: userId,
        action: 'TRIP_DELETED',
        detail: `Deleted application ${trip.reference} (${trip.title})`,
      },
    });
    return { deleted: true, reference: trip.reference };
  }

  async updateDraft(
    organizationId: string,
    tripId: string,
    patch: Record<string, unknown>
  ) {
    const existing = await prisma.trip.findFirst({ where: { id: tripId, organizationId } });
    if (!existing) throw new AppError(404, 'Trip not found');
    if (existing.status !== TripStatus.DRAFT && existing.status !== TripStatus.CORRECTION_REQUESTED) {
      throw new AppError(409, 'Only draft or correction-requested trips can be edited');
    }

    const allowed = [
      'title',
      'purpose',
      'learningObjectives',
      'category',
      'academicYear',
      'term',
      'departAt',
      'returnAt',
      'destination',
      'itinerary',
      'estimatedDistanceKm',
      'isInternational',
      'tripLeaderName',
      'emergencyContact',
      'routeDetails',
      'safetyDetails',
      'wizardStep',
      'safetyReadiness',
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in patch) data[key] = patch[key];
    }

    return prisma.trip.update({ where: { id: tripId }, data });
  }

  async getReadiness(organizationId: string, tripId: string) {
    const trip = await this.getById(organizationId, tripId);
    return computeTripReadiness(trip);
  }

  async setParticipants(
    organizationId: string,
    tripId: string,
    participants: Array<{
      studentId: string;
      studentCode?: string;
      fullName: string;
      classLabel?: string;
      guardianPhone?: string;
      guardianEmail?: string;
      photoUrl?: string;
      guardianConsent?: boolean;
    }>
  ) {
    await this.assertEditable(organizationId, tripId);
    const ids = new Set<string>();
    for (const p of participants) {
      if (ids.has(p.studentId)) {
        throw new AppError(400, 'Duplicate students in manifest');
      }
      ids.add(p.studentId);
    }

    const priorConsent = await prisma.tripParticipant.findMany({
      where: { tripId },
      select: { studentId: true, guardianConsent: true },
    });
    const consentByStudent = new Map(priorConsent.map((p) => [p.studentId, p.guardianConsent]));

    await prisma.$transaction([
      prisma.tripParticipant.deleteMany({ where: { tripId } }),
      ...(participants.length
        ? [
            prisma.tripParticipant.createMany({
              data: participants.map((p) => ({
                tripId,
                studentId: p.studentId,
                studentCode: p.studentCode,
                fullName: p.fullName,
                classLabel: p.classLabel,
                guardianPhone: p.guardianPhone,
                guardianEmail: p.guardianEmail?.trim() || null,
                photoUrl: p.photoUrl,
                guardianConsent: consentByStudent.get(p.studentId) ?? false,
              })),
            }),
          ]
        : []),
    ]);

    return this.getById(organizationId, tripId);
  }

  async setStaff(
    organizationId: string,
    tripId: string,
    staff: Array<{ fullName: string; role: string; isLeader?: boolean; staffId?: string }>
  ) {
    await this.assertEditable(organizationId, tripId);
    await prisma.$transaction([
      prisma.tripStaff.deleteMany({ where: { tripId } }),
      ...(staff.length
        ? [
            prisma.tripStaff.createMany({
              data: staff.map((s) => ({
                tripId,
                fullName: s.fullName.trim(),
                role: s.role.trim(),
                isLeader: s.isLeader ?? false,
                staffId: s.staffId,
              })),
            }),
          ]
        : []),
    ]);
    return this.getById(organizationId, tripId);
  }

  async setVehicles(
    organizationId: string,
    tripId: string,
    vehicles: Array<{
      mode?: string;
      plateNumber?: string;
      vehicleType?: string;
      capacity?: number;
      driverName?: string;
      driverPhone?: string;
      driverLicenseCategory?: string;
      driverLicenseNumber?: string;
    }>
  ) {
    await this.assertEditable(organizationId, tripId);
    await prisma.$transaction([
      prisma.tripVehicle.deleteMany({ where: { tripId } }),
      ...(vehicles.length
        ? [
            prisma.tripVehicle.createMany({
              data: vehicles.map((v) => ({
                tripId,
                mode: v.mode,
                plateNumber: v.plateNumber,
                vehicleType: v.vehicleType,
                capacity: v.capacity,
                driverName: v.driverName,
                driverPhone: v.driverPhone,
                driverLicenseCategory: v.driverLicenseCategory,
                driverLicenseNumber: v.driverLicenseNumber,
              })),
            }),
          ]
        : []),
    ]);
    return this.getById(organizationId, tripId);
  }

  async setDocuments(
    organizationId: string,
    tripId: string,
    documents: Array<{ documentType: string; fileName?: string; issueDate?: string; expiryDate?: string }>
  ) {
    await this.assertEditable(organizationId, tripId);
    const existing = await prisma.tripDocument.findMany({ where: { tripId } });
    const storedByType = new Map(existing.map((d) => [d.documentType, d.storageKey]));

    await prisma.$transaction([
      prisma.tripDocument.deleteMany({ where: { tripId } }),
      ...(documents.length
        ? [
            prisma.tripDocument.createMany({
              data: documents.map((d) => ({
                tripId,
                documentType: d.documentType,
                fileName: d.fileName,
                storageKey: storedByType.get(d.documentType) ?? undefined,
                issueDate: d.issueDate ? new Date(d.issueDate) : undefined,
                expiryDate: d.expiryDate ? new Date(d.expiryDate) : undefined,
              })),
            }),
          ]
        : []),
    ]);
    return this.getById(organizationId, tripId);
  }

  async setParticipantConsent(
    organizationId: string,
    tripId: string,
    updates: Array<{ studentId: string; guardianConsent: boolean }>
  ) {
    await this.assertEditable(organizationId, tripId);
    for (const u of updates) {
      await prisma.tripParticipant.updateMany({
        where: { tripId, studentId: u.studentId },
        data: { guardianConsent: u.guardianConsent },
      });
    }
    return this.getById(organizationId, tripId);
  }

  async recordGuardianConsentFromParent(
    organizationId: string,
    tripId: string,
    input: { studentId: string; guardianPhone: string; approved: boolean }
  ) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, organizationId },
      include: { participants: true },
    });
    if (!trip) throw new AppError(404, 'Trip not found');

    const participant = trip.participants.find((p) => p.studentId === input.studentId);
    if (!participant) throw new AppError(404, 'Learner not on this trip manifest');

    if (!phonesMatch(participant.guardianPhone, input.guardianPhone)) {
      throw new AppError(403, 'Guardian phone does not match the manifest record for this learner');
    }

    await prisma.tripParticipant.update({
      where: { id: participant.id },
      data: { guardianConsent: input.approved },
    });

    await this.maybeAdvanceTripAfterAllConsents(organizationId, tripId);

    return this.getById(organizationId, tripId);
  }

  private async maybeAdvanceTripAfterAllConsents(organizationId: string, tripId: string) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, organizationId },
      include: { participants: true },
    });
    if (!trip) return;
    if (trip.currentStageKey !== 'parent_consent') return;
    if (trip.participants.some((p) => !p.guardianConsent)) return;

    await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.VALIDATION,
        currentStageKey: 'intake',
      },
    });
    await prisma.tripAuditLog.create({
      data: {
        tripId,
        organizationId,
        action: 'ALL_PARENT_CONSENT_RECEIVED',
        detail: `All guardian consents recorded — application ${trip.reference} moved to government validation.`,
      },
    });
  }

  private async assertEditable(organizationId: string, tripId: string) {
    const existing = await prisma.trip.findFirst({ where: { id: tripId, organizationId } });
    if (!existing) throw new AppError(404, 'Trip not found');
    if (existing.status !== TripStatus.DRAFT && existing.status !== TripStatus.CORRECTION_REQUESTED) {
      throw new AppError(409, 'Only draft or correction-requested trips can be edited');
    }
  }

  async submit(organizationId: string, tripId: string, userId: string) {
    const trip = await this.getById(organizationId, tripId);
    if (trip.status !== TripStatus.DRAFT && trip.status !== TripStatus.CORRECTION_REQUESTED) {
      throw new AppError(409, 'Trip is not in a submittable state');
    }

    const readiness = computeTripReadiness(trip);
    if (readiness.blockers.length > 0) {
      throw new AppError(
        400,
        `Cannot submit: ${readiness.blockers.map((b) => b.message).join(' ')}`
      );
    }

    const resubmitting = trip.status === TripStatus.CORRECTION_REQUESTED;
    const consentPending = trip.participants.some((p) => !p.guardianConsent);
    const awaitingParentConsent = consentPending && !resubmitting;

    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: resubmitting ? TripStatus.RESUBMITTED : awaitingParentConsent ? TripStatus.SUBMITTED : TripStatus.VALIDATION,
        currentStageKey: resubmitting ? trip.currentStageKey : awaitingParentConsent ? 'parent_consent' : 'intake',
        submittedAt: new Date(),
        safetyReadiness: readiness.score,
        correctionDueAt: null,
      },
    });

    await prisma.tripAuditLog.create({
      data: {
        tripId,
        organizationId,
        actorId: userId,
        action: resubmitting ? 'TRIP_RESUBMITTED' : 'TRIP_SUBMITTED',
        detail: resubmitting
          ? `Application ${trip.reference} resubmitted after corrections (stage: ${trip.currentStageKey})`
          : awaitingParentConsent
            ? `Application ${trip.reference} submitted — awaiting parent consent in ParentMIS`
            : `Application ${trip.reference} submitted for government review`,
      },
    });

    if (trip.participants.length > 0) {
      await publishTripToParentMis({
        organizationId,
        trip: {
          id: trip.id,
          reference: trip.reference,
          title: trip.title,
          purpose: trip.purpose,
          destination: trip.destination,
          departAt: trip.departAt,
          returnAt: trip.returnAt,
          tripLeaderName: trip.tripLeaderName,
          itinerary: trip.itinerary,
          emergencyContact: trip.emergencyContact,
        },
        participants: trip.participants.map((p) => ({
          studentId: p.studentId,
          fullName: p.fullName,
          guardianPhone: p.guardianPhone,
          guardianEmail: p.guardianEmail,
          classLabel: p.classLabel,
        })),
      });
    }

    return updated;
  }

  /** One round-trip for wizard save/submit prep (replaces 6+ sequential PUT/PATCH calls). */
  async saveWizardBulk(
    organizationId: string,
    tripId: string,
    input: {
      trip: Record<string, unknown>;
      participants: Array<{
        studentId: string;
        studentCode?: string;
        fullName: string;
        classLabel?: string;
        guardianPhone?: string;
        guardianEmail?: string;
        photoUrl?: string;
        guardianConsent?: boolean;
      }>;
      staff: Array<{ fullName: string; role: string; isLeader?: boolean; staffId?: string }>;
      vehicles: Array<{
        mode?: string;
        plateNumber?: string;
        vehicleType?: string;
        capacity?: number;
        driverName?: string;
        driverPhone?: string;
        driverLicenseCategory?: string;
        driverLicenseNumber?: string;
      }>;
      documents: Array<{ documentType: string; fileName?: string; issueDate?: string; expiryDate?: string }>;
    }
  ) {
    await this.assertEditable(organizationId, tripId);

    const allowed = [
      'title',
      'purpose',
      'learningObjectives',
      'category',
      'academicYear',
      'term',
      'departAt',
      'returnAt',
      'destination',
      'itinerary',
      'estimatedDistanceKm',
      'isInternational',
      'tripLeaderName',
      'emergencyContact',
      'routeDetails',
      'safetyDetails',
      'wizardStep',
      'safetyReadiness',
    ] as const;

    const tripData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in input.trip) tripData[key] = input.trip[key];
    }

    const participantIds = new Set<string>();
    for (const p of input.participants) {
      if (participantIds.has(p.studentId)) {
        throw new AppError(400, 'Duplicate students in manifest');
      }
      participantIds.add(p.studentId);
    }

    const existingDocs = await prisma.tripDocument.findMany({ where: { tripId } });
    const storedByType = new Map(existingDocs.map((d) => [d.documentType, d.storageKey]));

    await prisma.$transaction(async (tx) => {
      if (Object.keys(tripData).length > 0) {
        await tx.trip.update({ where: { id: tripId }, data: tripData as Prisma.TripUpdateInput });
      }

      const priorConsent = await tx.tripParticipant.findMany({
        where: { tripId },
        select: { studentId: true, guardianConsent: true },
      });
      const consentByStudent = new Map(priorConsent.map((p) => [p.studentId, p.guardianConsent]));

      await tx.tripParticipant.deleteMany({ where: { tripId } });
      if (input.participants.length) {
        await tx.tripParticipant.createMany({
          data: input.participants.map((p) => ({
            tripId,
            studentId: p.studentId,
            studentCode: p.studentCode,
            fullName: p.fullName,
            classLabel: p.classLabel,
            guardianPhone: p.guardianPhone,
            guardianEmail: p.guardianEmail?.trim() || null,
            photoUrl: p.photoUrl,
            guardianConsent: consentByStudent.get(p.studentId) ?? false,
          })),
        });
      }

      await tx.tripStaff.deleteMany({ where: { tripId } });
      if (input.staff.length) {
        await tx.tripStaff.createMany({
          data: input.staff.map((s) => ({
            tripId,
            fullName: s.fullName.trim(),
            role: s.role.trim(),
            isLeader: s.isLeader ?? false,
            staffId: s.staffId,
          })),
        });
      }

      await tx.tripVehicle.deleteMany({ where: { tripId } });
      if (input.vehicles.length) {
        await tx.tripVehicle.createMany({
          data: input.vehicles.map((v) => ({
            tripId,
            mode: v.mode,
            plateNumber: v.plateNumber,
            vehicleType: v.vehicleType,
            capacity: v.capacity,
            driverName: v.driverName,
            driverPhone: v.driverPhone,
            driverLicenseCategory: v.driverLicenseCategory,
            driverLicenseNumber: v.driverLicenseNumber,
          })),
        });
      }

      await tx.tripDocument.deleteMany({ where: { tripId } });
      if (input.documents.length) {
        await tx.tripDocument.createMany({
          data: input.documents.map((d) => ({
            tripId,
            documentType: d.documentType,
            fileName: d.fileName,
            storageKey: storedByType.get(d.documentType) ?? undefined,
            issueDate: d.issueDate ? new Date(d.issueDate) : undefined,
            expiryDate: d.expiryDate ? new Date(d.expiryDate) : undefined,
          })),
        });
      }
    });

    const trip = await this.getById(organizationId, tripId);
    return { trip, readiness: computeTripReadiness(trip) };
  }
}

export const tripService = new TripService();
