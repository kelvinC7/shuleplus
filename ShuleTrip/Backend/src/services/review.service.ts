import crypto from 'crypto';
import { ApprovalDecision, TripStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import type { JwtPayload } from '../middleware/auth.middleware';
import { computeTripReadiness } from './readiness.service';
import { WORKFLOW_STAGES, type WorkflowStageKey, stageForKey } from '../constants/workflow-stages';
import {
  authorityOfficeLabel,
  buildStampReference,
  canActOnStage,
  canViewTripInPipeline,
  isReadOnlyOfficial,
} from './gov-workflow.service';

import { buildTenantJurisdictionWhere } from '../utils/jurisdiction';
import {
  approvalAttestationService,
  type AttestationFileInput,
} from './approval-attestation.service';
import { formatConditionsForStorage } from '../constants/authorization-conditions';

function jurisdictionFilter(user: JwtPayload) {
  return buildTenantJurisdictionWhere({
    district: typeof user.district === 'string' ? user.district : undefined,
    sector: typeof user.sector === 'string' ? user.sector : undefined,
  });
}

async function getTripForOfficial(tripId: string, user: JwtPayload) {
  const tenantFilter = jurisdictionFilter(user);
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      ...(tenantFilter ? { tenant: tenantFilter as object } : {}),
    },
    include: {
      tenant: true,
      participants: true,
      staff: true,
      vehicles: true,
      documents: true,
      approvals: { orderBy: { createdAt: 'asc' } },
      authorizations: true,
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 40 },
    },
  });
  if (!trip) throw new AppError(404, 'Application not found in your jurisdiction');

  if (!canViewTripInPipeline(user, trip)) {
    const stage = stageForKey(trip.currentStageKey);
    throw new AppError(
      403,
      `This trip is not visible to your role yet (current step: ${stage?.shortLabel ?? trip.currentStageKey}, status: ${trip.status}).`
    );
  }

  return trip;
}

function workflowMeta(trip: { currentStageKey: string; status: TripStatus }, user: JwtPayload) {
  const stageKey = trip.currentStageKey as WorkflowStageKey;
  const stage = stageForKey(stageKey);
  return {
    currentStageKey: stageKey,
    currentStageLabel: stage?.label ?? stageKey,
    canAct: Boolean(
      stage &&
        trip.status !== TripStatus.CORRECTION_REQUESTED &&
        canActOnStage(user, stageKey) &&
        stage.activeStatuses.includes(trip.status)
    ),
    readOnly: isReadOnlyOfficial(user),
  };
}

export class ReviewService {
  async getApplication(tripId: string, user: JwtPayload) {
    const trip = await getTripForOfficial(tripId, user);
    const readiness = computeTripReadiness(trip);
    const completedApprovals = trip.approvals.filter(
      (a) => a.decision === ApprovalDecision.APPROVED && a.decidedAt
    );
    return {
      trip,
      readiness,
      workflow: workflowMeta(trip, user),
      governanceChain: completedApprovals.map((a) => ({
        id: a.id,
        stageKey: a.stageKey,
        stageLabel: a.stageLabel,
        decision: a.decision,
        reason: a.reason,
        decidedAt: a.decidedAt,
        decidedByName: a.decidedByName,
        officialRole: a.officialRole,
        authorityOffice: a.authorityOffice,
        signatureName: a.signatureName,
        stampReference: a.stampReference,
        signatureStorageKey: a.signatureStorageKey,
        stampStorageKey: a.stampStorageKey,
        signatureFileName: a.signatureFileName,
        stampFileName: a.stampFileName,
      })),
    };
  }

  async startReview(tripId: string, user: JwtPayload) {
    const trip = await getTripForOfficial(tripId, user);
    return { trip, workflow: workflowMeta(trip, user), message: 'Use stage approval to advance this application.' };
  }

  async recordDecision(
    tripId: string,
    user: JwtPayload,
    input: {
      action: 'approve' | 'reject' | 'request_corrections';
      reason: string;
      responseDeadline?: string;
      checklist?: Record<string, string>;
      signatureName?: string;
      officialTitle?: string;
      attestationFiles?: { signature: AttestationFileInput; stamp: AttestationFileInput };
    }
  ) {
    if (isReadOnlyOfficial(user)) {
      throw new AppError(403, 'Your role is read-only and cannot record decisions.');
    }

    const trip = await getTripForOfficial(tripId, user);
    const stageKey = trip.currentStageKey as WorkflowStageKey;
    const stage = WORKFLOW_STAGES[stageKey];
    if (!stage) throw new AppError(409, 'Unknown workflow stage on this application');

    if (!canActOnStage(user, stageKey)) {
      throw new AppError(403, 'You are not authorized to act at this workflow stage.');
    }

    if (!stage.activeStatuses.includes(trip.status)) {
      throw new AppError(409, 'Application is not awaiting action at this stage.');
    }

    const reason = input.reason.trim();
    if (!reason) throw new AppError(400, 'A decision reason is required');

    const signatureName =
      input.signatureName?.trim() ||
      user.name?.trim() ||
      user.email;
    const authorityOffice = authorityOfficeLabel(user);
    const officialRole = user.tripRoleSlug ?? user.roles?.find((r) => stage.actorRoles.includes(r)) ?? 'official';

    let attestationAssets: Awaited<ReturnType<typeof approvalAttestationService.savePair>> | undefined;
    if (input.action === 'approve') {
      if (!input.attestationFiles?.signature || !input.attestationFiles?.stamp) {
        throw new AppError(400, 'Upload your signature image and official stamp image to approve this stage');
      }
      attestationAssets = await approvalAttestationService.savePair(
        trip.organizationId,
        tripId,
        input.attestationFiles.signature,
        input.attestationFiles.stamp
      );
    }

    const attestationRow = attestationAssets
      ? {
          signatureStorageKey: attestationAssets.signatureStorageKey,
          stampStorageKey: attestationAssets.stampStorageKey,
          signatureFileName: attestationAssets.signatureFileName,
          stampFileName: attestationAssets.stampFileName,
        }
      : {};

    if (input.action === 'reject') {
      await prisma.$transaction([
        prisma.trip.update({
          where: { id: tripId },
          data: { status: TripStatus.REJECTED, correctionNote: reason },
        }),
        prisma.tripApproval.create({
          data: {
            tripId,
            stageKey: stage.approvalStageKey,
            stageLabel: stage.label,
            decision: ApprovalDecision.REJECTED,
            decidedById: user.sub,
            decidedByName: user.email,
            officialRole,
            authorityOffice,
            signatureName,
            stampReference: buildStampReference(user.district),
            reason,
            decidedAt: new Date(),
          },
        }),
        prisma.tripAuditLog.create({
          data: {
            tripId,
            organizationId: trip.organizationId,
            actorId: user.sub,
            actorName: user.email,
            action: 'APPLICATION_REJECTED',
            detail: `${stage.label}: ${reason}`,
          },
        }),
      ]);
      return prisma.trip.findUnique({ where: { id: tripId }, include: { approvals: true } });
    }

    if (input.action === 'request_corrections') {
      const due = input.responseDeadline ? new Date(input.responseDeadline) : undefined;
      await prisma.$transaction([
        prisma.trip.update({
          where: { id: tripId },
          data: {
            status: TripStatus.CORRECTION_REQUESTED,
            correctionNote: reason,
            correctionDueAt: due,
          },
        }),
        prisma.tripApproval.create({
          data: {
            tripId,
            stageKey: stage.approvalStageKey,
            stageLabel: stage.label,
            decision: ApprovalDecision.CORRECTION_REQUESTED,
            decidedById: user.sub,
            decidedByName: user.email,
            officialRole,
            authorityOffice,
            signatureName,
            stampReference: buildStampReference(user.district),
            reason,
            decidedAt: new Date(),
          },
        }),
        prisma.tripAuditLog.create({
          data: {
            tripId,
            organizationId: trip.organizationId,
            actorId: user.sub,
            actorName: user.email,
            action: 'CORRECTION_REQUESTED',
            detail: `${stage.label}: ${reason}`,
          },
        }),
      ]);
      if (input.checklist) await this.applyDocumentChecklist(tripId, input.checklist, user.email);
      return prisma.trip.findUnique({ where: { id: tripId }, include: { approvals: true } });
    }

    if (stageKey === 'final') {
      if (!user.canFinalApprove && !user.roles?.includes('super_admin') && !user.roles?.includes('national_administrator')) {
        throw new AppError(403, 'Your account is not enabled to issue final trip authorization. Enable it in IAM.');
      }
      const readiness = computeTripReadiness(trip);
      if (readiness.blockers.length > 0) {
        throw new AppError(
          400,
          `Cannot authorize while mandatory blockers remain: ${readiness.blockers.map((b) => b.label).join(', ')}`
        );
      }

      const authorizationNo = `AUTH-${trip.reference.replace(/^ST-/, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const verifyToken = crypto.randomBytes(24).toString('hex');
      const verifyTokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');

      await prisma.$transaction([
        prisma.trip.update({
          where: { id: tripId },
          data: { status: TripStatus.APPROVED, correctionNote: null, correctionDueAt: null, currentStageKey: 'final' },
        }),
        prisma.tripApproval.create({
          data: {
            tripId,
            stageKey: stage.approvalStageKey,
            stageLabel: stage.label,
            decision: ApprovalDecision.APPROVED,
            decidedById: user.sub,
            decidedByName: user.email,
            officialRole,
            authorityOffice,
            signatureName,
            stampReference: buildStampReference(user.district),
            reason,
            decidedAt: new Date(),
            ...attestationRow,
          },
        }),
        prisma.tripAuthorization.upsert({
          where: { tripId },
          create: {
            tripId,
            authorizationNo,
            issuedByName: signatureName,
            verifyTokenHash,
            conditions: formatConditionsForStorage(),
          },
          update: {
            authorizationNo,
            issuedAt: new Date(),
            issuedByName: signatureName,
            verifyTokenHash,
            revokedAt: null,
            conditions: formatConditionsForStorage(),
          },
        }),
        prisma.tripAuditLog.create({
          data: {
            tripId,
            organizationId: trip.organizationId,
            actorId: user.sub,
            actorName: user.email,
            action: 'APPLICATION_APPROVED',
            detail: reason,
          },
        }),
      ]);
      if (input.checklist) await this.applyDocumentChecklist(tripId, input.checklist, user.email);
      return prisma.trip.findUnique({
        where: { id: tripId },
        include: { authorizations: true, approvals: true },
      });
    }

    const next = stage.next;
    if (!next) throw new AppError(409, 'No next stage configured');

    const nextDef = WORKFLOW_STAGES[next];
    let nextStatus: TripStatus = TripStatus.UNDER_REVIEW;
    if (next === 'final') nextStatus = TripStatus.AWAITING_ADDITIONAL_APPROVAL;

    await prisma.$transaction([
      prisma.trip.update({
        where: { id: tripId },
        data: { currentStageKey: next, status: nextStatus },
      }),
      prisma.tripApproval.create({
        data: {
          tripId,
          stageKey: stage.approvalStageKey,
          stageLabel: stage.label,
          decision: ApprovalDecision.APPROVED,
          decidedById: user.sub,
          decidedByName: user.email,
          officialRole,
          authorityOffice,
          signatureName,
          stampReference: buildStampReference(user.district),
          reason,
          decidedAt: new Date(),
          ...attestationRow,
        },
      }),
      prisma.tripAuditLog.create({
        data: {
          tripId,
          organizationId: trip.organizationId,
          actorId: user.sub,
          actorName: user.email,
          action: 'STAGE_APPROVED',
          detail: `${stage.label} cleared → ${nextDef.label}`,
        },
      }),
    ]);

    if (input.checklist) await this.applyDocumentChecklist(tripId, input.checklist, user.email);

    return prisma.trip.findUnique({ where: { id: tripId }, include: { approvals: true } });
  }

  private async applyDocumentChecklist(tripId: string, checklist: Record<string, string>, reviewer: string) {
    const docs = await prisma.tripDocument.findMany({ where: { tripId } });
    for (const doc of docs) {
      const status = checklist[doc.documentType];
      if (!status) continue;
      await prisma.tripDocument.update({
        where: { id: doc.id },
        data: {
          verificationStatus: status as never,
          reviewerComment: `Updated by ${reviewer}`,
        },
      });
    }
  }
}

export const reviewService = new ReviewService();
