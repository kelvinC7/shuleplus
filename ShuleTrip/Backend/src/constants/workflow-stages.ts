import { TripStatus } from '../generated/prisma';

export type WorkflowStageKey = 'intake' | 'education' | 'transport' | 'final';

export const WORKFLOW_STAGE_ORDER: WorkflowStageKey[] = ['intake', 'education', 'transport', 'final'];

export type WorkflowStageDef = {
  key: WorkflowStageKey;
  label: string;
  shortLabel: string;
  approvalStageKey: string;
  /** Trip statuses while waiting at this stage */
  activeStatuses: TripStatus[];
  actorRoles: string[];
  next: WorkflowStageKey | null;
};

export const WORKFLOW_STAGES: Record<WorkflowStageKey, WorkflowStageDef> = {
  intake: {
    key: 'intake',
    label: 'Completeness & intake verification',
    shortLabel: 'Intake',
    approvalStageKey: 'intake_completeness',
    activeStatuses: [TripStatus.VALIDATION, TripStatus.RESUBMITTED, TripStatus.SUBMITTED],
    actorRoles: ['intake_reviewer', 'super_admin', 'national_administrator'],
    next: 'education',
  },
  education: {
    key: 'education',
    label: 'Education / local authority review',
    shortLabel: 'Education',
    approvalStageKey: 'education_authority',
    activeStatuses: [TripStatus.UNDER_REVIEW, TripStatus.RESUBMITTED],
    actorRoles: [
      'education_reviewer',
      'district_education_officer',
      'sector_education_inspector',
      'super_admin',
      'national_administrator',
    ],
    next: 'transport',
  },
  transport: {
    key: 'transport',
    label: 'Transport & road-safety verification',
    shortLabel: 'Transport',
    approvalStageKey: 'transport_safety',
    activeStatuses: [TripStatus.UNDER_REVIEW, TripStatus.RESUBMITTED],
    actorRoles: ['transport_reviewer', 'super_admin', 'national_administrator'],
    next: 'final',
  },
  final: {
    key: 'final',
    label: 'Final trip authorization',
    shortLabel: 'Final',
    approvalStageKey: 'final_authorization',
    activeStatuses: [TripStatus.AWAITING_ADDITIONAL_APPROVAL, TripStatus.RESUBMITTED],
    actorRoles: ['final_approval_officer', 'super_admin', 'national_administrator'],
    next: null,
  },
};

export const READ_ONLY_GOV_ROLES = new Set(['monitoring_officer']);

export function stageForKey(key: string | null | undefined): WorkflowStageDef | null {
  if (!key) return null;
  return WORKFLOW_STAGES[key as WorkflowStageKey] ?? null;
}
