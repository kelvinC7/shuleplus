import crypto from 'crypto';
import { TripStatus } from '../generated/prisma';
import type { JwtPayload } from '../middleware/auth.middleware';
import {
  READ_ONLY_GOV_ROLES,
  WORKFLOW_STAGE_ORDER,
  WORKFLOW_STAGES,
  type WorkflowStageKey,
} from '../constants/workflow-stages';

export function userGovRoles(user: JwtPayload): string[] {
  const roles = [...(user.roles ?? [])];
  const slug = user.tripRoleSlug?.trim();
  if (slug && !roles.includes(slug)) roles.push(slug);
  return roles;
}

export function isFinalApprovalOfficer(user: JwtPayload): boolean {
  const roles = userGovRoles(user);
  return roles.includes('final_approval_officer') || user.tripRoleSlug === 'final_approval_officer';
}

/** May sign at the final gate (requires IAM “Final approve”). */
export function isFinalApprovalActor(user: JwtPayload): boolean {
  if (user.canFinalApprove !== true) return false;
  const roles = userGovRoles(user);
  return (
    isFinalApprovalOfficer(user) ||
    roles.includes('super_admin') ||
    roles.includes('national_administrator')
  );
}

export function isReadOnlyOfficial(user: JwtPayload): boolean {
  const roles = userGovRoles(user);
  if (roles.includes('super_admin') || roles.includes('national_administrator')) return false;
  return roles.length > 0 && roles.every((r) => READ_ONLY_GOV_ROLES.has(r));
}

export function canActOnStage(user: JwtPayload, stageKey: WorkflowStageKey): boolean {
  if (isReadOnlyOfficial(user)) return false;
  const roles = userGovRoles(user);
  if (roles.includes('super_admin') || roles.includes('national_administrator')) return true;

  const stage = WORKFLOW_STAGES[stageKey];
  if (!stage.actorRoles.some((r) => roles.includes(r))) return false;

  if (stageKey === 'final') {
    if (!user.canFinalApprove) return false;
    if (roles.includes('final_approval_officer') || user.tripRoleSlug === 'final_approval_officer') {
      return true;
    }
    return false;
  }

  return true;
}

type TripViewContext = {
  currentStageKey: string;
  status: TripStatus;
  approvals?: Array<{ stageKey: string; decidedById?: string | null; decidedAt?: Date | null }>;
};

/** Read access: officials may always open files they acted on or that are at their gate (signing is separate). */
export function canViewTripInPipeline(user: JwtPayload, trip: TripViewContext): boolean {
  const { currentStageKey, status, approvals = [] } = trip;

  if (status === TripStatus.DRAFT || status === TripStatus.CANCELLED) return false;
  if (status === TripStatus.APPROVED || status === TripStatus.TRIP_IN_PROGRESS || status === TripStatus.COMPLETED) {
    return true;
  }
  if (isReadOnlyOfficial(user)) return true;

  const roles = userGovRoles(user);
  if (roles.includes('super_admin') || roles.includes('national_administrator')) return true;

  /** Final approval officers may open any in-jurisdiction file read-only; signing stays gated by `canActOnStage`. */
  if (isFinalApprovalOfficer(user)) return true;

  if (approvals.some((a) => a.decidedById && a.decidedById === user.sub && a.decidedAt)) {
    return true;
  }

  const stagesUserCanAct = WORKFLOW_STAGE_ORDER.filter((s) => canActOnStage(user, s));
  const approvalKeysForUser = new Set(stagesUserCanAct.map((s) => WORKFLOW_STAGES[s].approvalStageKey));
  if (approvals.some((a) => approvalKeysForUser.has(a.stageKey) && a.decidedAt)) {
    return true;
  }

  const key = currentStageKey as WorkflowStageKey;
  if (!stagesUserCanAct.includes(key)) return false;

  const stage = WORKFLOW_STAGES[key];
  if (!stage) return false;

  if (status === TripStatus.CORRECTION_REQUESTED || status === TripStatus.REJECTED) {
    return true;
  }

  if (stage.activeStatuses.includes(status) || status === TripStatus.RESUBMITTED) {
    return true;
  }

  return true;
}

/** Queues visible on role dashboards — only stages the user may act on now. */
export function actionableStagesForUser(user: JwtPayload): WorkflowStageKey[] {
  if (isReadOnlyOfficial(user)) return [];
  const roles = userGovRoles(user);
  if (roles.includes('super_admin') || roles.includes('national_administrator')) {
    return [...WORKFLOW_STAGE_ORDER];
  }
  return WORKFLOW_STAGE_ORDER.filter((key) => canActOnStage(user, key));
}

export function buildStampReference(district?: string | null): string {
  const slug = (district ?? 'NATIONAL')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .slice(0, 24);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const tail = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ST-${slug}-${date}-${tail}`;
}

export function authorityOfficeLabel(user: JwtPayload): string {
  const parts = [user.authority, user.district, user.sector].filter(Boolean);
  if (parts.length > 0) return parts.join(' · ');
  return 'Republic of Rwanda · ShuleTrip Government Console';
}
