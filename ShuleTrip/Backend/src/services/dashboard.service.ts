import { TripStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import type { JwtPayload } from '../middleware/auth.middleware';
import { resolveSchoolManifestMode } from './school-manifest-mode.service';
import { buildTenantJurisdictionWhere, INTAKE_ACTIVE_STATUSES } from '../utils/jurisdiction';

const AWAITING: TripStatus[] = [
  TripStatus.SUBMITTED,
  TripStatus.VALIDATION,
  TripStatus.UNDER_REVIEW,
  TripStatus.RESUBMITTED,
  TripStatus.AWAITING_ADDITIONAL_APPROVAL,
];

export class DashboardService {
  async getSchoolSummary(organizationId: string, user: JwtPayload, academicYear?: string) {
    const studentManifestMode = await resolveSchoolManifestMode(user);
    const yearFilter = academicYear?.trim() ? { academicYear: academicYear.trim() } : {};

    const tripBase = { organizationId, ...yearFilter };

    const [
      totalTrips,
      drafts,
      awaitingReview,
      approvedTrips,
      approvedUpcoming,
      corrections,
      completed,
      rejected,
      cancelled,
      tenant,
      recentDecisions,
      upcomingTrips,
      draftTrips,
      tripsNeedingConsent,
      missingDocCount,
    ] = await Promise.all([
      prisma.trip.count({ where: tripBase }),
      prisma.trip.count({ where: { ...tripBase, status: TripStatus.DRAFT } }),
      prisma.trip.count({ where: { ...tripBase, status: { in: AWAITING } } }),
      prisma.trip.count({ where: { ...tripBase, status: TripStatus.APPROVED } }),
      prisma.trip.count({
        where: {
          ...tripBase,
          status: TripStatus.APPROVED,
          departAt: { gte: new Date() },
        },
      }),
      prisma.trip.count({ where: { ...tripBase, status: TripStatus.CORRECTION_REQUESTED } }),
      prisma.trip.count({ where: { ...tripBase, status: TripStatus.COMPLETED } }),
      prisma.trip.count({ where: { ...tripBase, status: TripStatus.REJECTED } }),
      prisma.trip.count({ where: { ...tripBase, status: TripStatus.CANCELLED } }),
      prisma.tenant.findUnique({ where: { organizationId } }),
      prisma.tripApproval.findMany({
        where: {
          trip: { organizationId },
          decision: { in: ['APPROVED', 'REJECTED', 'CORRECTION_REQUESTED', 'ESCALATED'] },
        },
        orderBy: { decidedAt: 'desc' },
        take: 10,
        include: { trip: { select: { id: true, reference: true, title: true } } },
      }),
      prisma.trip.findMany({
        where: {
          ...tripBase,
          departAt: { gte: new Date() },
          status: { notIn: [TripStatus.CANCELLED, TripStatus.REJECTED] },
        },
        orderBy: { departAt: 'asc' },
        take: 6,
        select: {
          id: true,
          reference: true,
          title: true,
          destination: true,
          departAt: true,
          status: true,
          tripLeaderName: true,
        },
      }),
      prisma.trip.findFirst({
        where: { ...tripBase, status: TripStatus.DRAFT },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, reference: true, title: true, wizardStep: true, updatedAt: true },
      }),
      prisma.tripParticipant.count({
        where: {
          guardianConsent: false,
          trip: {
            organizationId,
            status: { notIn: [TripStatus.COMPLETED, TripStatus.CANCELLED, TripStatus.REJECTED] },
            ...yearFilter,
          },
        },
      }),
      prisma.tripDocument.count({
        where: {
          verificationStatus: { in: ['MISSING', 'NOT_REVIEWED', 'CORRECTION_REQUIRED'] },
          trip: { organizationId, ...yearFilter },
        },
      }),
    ]);

    const pipeline = [
      { stageKey: 'draft', label: 'Draft', count: drafts },
      { stageKey: 'submitted', label: 'Submitted', count: await prisma.trip.count({ where: { ...tripBase, status: TripStatus.SUBMITTED } }) },
      { stageKey: 'under_review', label: 'Under review', count: await prisma.trip.count({ where: { ...tripBase, status: { in: [TripStatus.UNDER_REVIEW, TripStatus.VALIDATION, TripStatus.RESUBMITTED, TripStatus.AWAITING_ADDITIONAL_APPROVAL] } } }) },
      { stageKey: 'corrections', label: 'Corrections required', count: corrections },
      { stageKey: 'approved', label: 'Approved', count: approvedTrips },
      { stageKey: 'rejected', label: 'Rejected', count: rejected },
    ];

    const requiredActions: Array<{
      tripId: string;
      reference: string;
      title: string;
      kind: string;
      message: string;
      href: string;
      priority: 'high' | 'medium';
    }> = [];

    if (corrections > 0) {
      const correctionTrips = await prisma.trip.findMany({
        where: { ...tripBase, status: TripStatus.CORRECTION_REQUESTED },
        take: 5,
        select: { id: true, reference: true, title: true, correctionNote: true },
      });
      for (const t of correctionTrips) {
        requiredActions.push({
          tripId: t.id,
          reference: t.reference,
          title: t.title,
          kind: 'correction',
          message: t.correctionNote?.slice(0, 120) ?? 'Respond to government correction request',
          href: `/school/trips/${t.id}/edit`,
          priority: 'high',
        });
      }
    }

    if (draftTrips) {
      requiredActions.push({
        tripId: draftTrips.id,
        reference: draftTrips.reference,
        title: draftTrips.title,
        kind: 'draft',
        message: `Continue draft (step ${draftTrips.wizardStep + 1})`,
        href: `/school/trips/${draftTrips.id}/edit`,
        priority: 'medium',
      });
    }

    if (tripsNeedingConsent > 0) {
      requiredActions.push({
        tripId: '',
        reference: '',
        title: 'Guardian consent',
        kind: 'consent',
        message: `${tripsNeedingConsent} learner(s) still need guardian consent`,
        href: '/school/consent',
        priority: 'medium',
      });
    }

    if (missingDocCount > 0) {
      requiredActions.push({
        tripId: '',
        reference: '',
        title: 'Documents',
        kind: 'documents',
        message: `${missingDocCount} document requirement(s) missing or need review`,
        href: '/school/documents',
        priority: 'medium',
      });
    }

    requiredActions.sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1));
    const nextAction = requiredActions[0] ?? null;
    const actionRequired = requiredActions.length;

    return {
      organizationId,
      organizationName: tenant?.organizationName ?? 'School',
      studentManifestMode,
      schoolCode: tenant?.organizationCode ?? tenant?.schoolCode ?? null,
      district: tenant?.district ?? null,
      academicYear: academicYear ?? null,
      kpis: {
        totalTrips,
        drafts,
        awaitingReview,
        pendingApproval: awaitingReview,
        actionRequired,
        approvedTrips,
        approvedUpcoming,
        corrections,
        completed,
        rejected,
        cancelled,
        rejectedOrCancelled: rejected + cancelled,
        incompleteConsent: tripsNeedingConsent,
        missingDocuments: missingDocCount,
      },
      pipeline,
      upcomingTrips: upcomingTrips.map((t) => ({
        id: t.id,
        reference: t.reference,
        title: t.title,
        destination: t.destination,
        departAt: t.departAt,
        status: t.status,
        tripLeaderName: t.tripLeaderName,
        daysUntilDeparture: t.departAt
          ? Math.max(0, Math.ceil((t.departAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
          : null,
      })),
      requiredActions,
      nextAction,
      recentDecisions: recentDecisions.map((d) => ({
        tripId: d.trip.id,
        reference: d.trip.reference,
        title: d.trip.title,
        decision: d.decision,
        stageLabel: d.stageLabel,
        decidedAt: d.decidedAt,
        reason: d.reason,
      })),
    };
  }

  private async workflowPipelineCounts(tripWhere: Record<string, unknown>) {
    const [intake, education, transport, finalStage, approvedCount, corrections] = await Promise.all([
      prisma.trip.count({
        where: {
          ...tripWhere,
          currentStageKey: 'intake',
          status: { in: [...INTAKE_ACTIVE_STATUSES] as TripStatus[] },
        },
      }),
      prisma.trip.count({
        where: { ...tripWhere, currentStageKey: 'education', status: TripStatus.UNDER_REVIEW },
      }),
      prisma.trip.count({
        where: { ...tripWhere, currentStageKey: 'transport', status: TripStatus.UNDER_REVIEW },
      }),
      prisma.trip.count({
        where: {
          ...tripWhere,
          currentStageKey: 'final',
          status: TripStatus.AWAITING_ADDITIONAL_APPROVAL,
        },
      }),
      prisma.trip.count({ where: { ...tripWhere, status: TripStatus.APPROVED } }),
      prisma.trip.count({ where: { ...tripWhere, status: TripStatus.CORRECTION_REQUESTED } }),
    ]);

    return [
      { stageKey: 'intake', label: 'Intake & completeness', count: intake },
      { stageKey: 'education', label: 'Education review', count: education },
      { stageKey: 'transport', label: 'Transport & safety', count: transport },
      { stageKey: 'final', label: 'Final authorization', count: finalStage },
      { stageKey: 'approved', label: 'Authorized', count: approvedCount },
      { stageKey: 'corrections', label: 'Corrections required', count: corrections },
    ];
  }

  async getGovernmentSummary(jurisdiction?: { district?: string; sector?: string }) {
    await prisma.trip.updateMany({
      where: { status: TripStatus.SUBMITTED },
      data: { status: TripStatus.VALIDATION, currentStageKey: 'intake' },
    });

    const tenantWhere = buildTenantJurisdictionWhere(jurisdiction);
    const tripWhere = tenantWhere ? { tenant: tenantWhere } : {};

    const docTripFilter = tenantWhere ? { trip: { tenant: tenantWhere } } : {};

    const [
      totalApplications,
      awaitingReview,
      approved,
      rejected,
      activeTrips,
      missingDocuments,
      safetyIssues,
      correctionsRequired,
      validationCount,
      underReview,
      submitted,
      awaitingAdditional,
      recentDecisions,
    ] = await Promise.all([
      prisma.trip.count({ where: tripWhere }),
      prisma.trip.count({ where: { ...tripWhere, status: { in: AWAITING } } }),
      prisma.trip.count({ where: { ...tripWhere, status: TripStatus.APPROVED } }),
      prisma.trip.count({ where: { ...tripWhere, status: TripStatus.REJECTED } }),
      prisma.trip.count({ where: { ...tripWhere, status: TripStatus.TRIP_IN_PROGRESS } }),
      prisma.tripDocument.count({
        where: {
          verificationStatus: { in: ['MISSING', 'NOT_REVIEWED'] },
          ...docTripFilter,
        },
      }),
      prisma.tripDocument.count({
        where: {
          verificationStatus: { in: ['INVALID', 'EXPIRED', 'CORRECTION_REQUIRED'] },
          ...docTripFilter,
        },
      }),
      prisma.trip.count({ where: { ...tripWhere, status: TripStatus.CORRECTION_REQUESTED } }),
      prisma.trip.count({ where: { ...tripWhere, status: TripStatus.VALIDATION } }),
      prisma.trip.count({ where: { ...tripWhere, status: TripStatus.UNDER_REVIEW } }),
      prisma.trip.count({
        where: {
          ...tripWhere,
          currentStageKey: 'intake',
          status: { in: [...INTAKE_ACTIVE_STATUSES] as TripStatus[] },
        },
      }),
      prisma.trip.count({ where: { ...tripWhere, status: TripStatus.AWAITING_ADDITIONAL_APPROVAL, currentStageKey: 'final' } }),
      prisma.tripApproval.findMany({
        where: {
          decision: { in: ['APPROVED', 'REJECTED', 'CORRECTION_REQUESTED', 'ESCALATED'] },
          ...(tenantWhere ? { trip: { tenant: tenantWhere } } : {}),
        },
        orderBy: { decidedAt: 'desc' },
        take: 10,
        include: { trip: { select: { reference: true, title: true, status: true } } },
      }),
    ]);

    const nearingDeparture = await prisma.trip.count({
      where: {
        ...tripWhere,
        status: { in: [...AWAITING, TripStatus.APPROVED] },
        departAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const reviewCutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const overdueReviews = await prisma.trip.count({
      where: {
        ...tripWhere,
        status: { in: [TripStatus.UNDER_REVIEW, TripStatus.VALIDATION, TripStatus.SUBMITTED] },
        submittedAt: { lt: reviewCutoff },
      },
    });

    return {
      jurisdiction: jurisdiction ?? null,
      kpis: {
        totalApplications,
        awaitingReview,
        nearingDeparture,
        missingDocuments,
        safetyIssues,
        correctionsRequired,
        approved,
        rejected,
        activeTrips,
        overdueReviews,
        pendingValidation: validationCount + submitted,
        educationReview: underReview,
        completenessReview: validationCount,
      },
      workflowQueue: {
        intake: submitted,
        education: await prisma.trip.count({
          where: { ...tripWhere, currentStageKey: 'education', status: TripStatus.UNDER_REVIEW },
        }),
        transport: await prisma.trip.count({
          where: { ...tripWhere, currentStageKey: 'transport', status: TripStatus.UNDER_REVIEW },
        }),
        final: awaitingAdditional,
      },
      pipeline: await this.workflowPipelineCounts(tripWhere),
      recentDecisions: recentDecisions.map((d) => ({
        reference: d.trip.reference,
        title: d.trip.title,
        tripStatus: d.trip.status,
        decision: d.decision,
        stageLabel: d.stageLabel,
        decidedAt: d.decidedAt,
        reason: d.reason,
        decidedByName: d.decidedByName,
      })),
    };
  }
}

export const dashboardService = new DashboardService();
