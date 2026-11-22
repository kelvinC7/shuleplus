import type { GovTripRow } from '@/government/components/gov-applications-table';

const SIGNABLE_BY_STAGE: Record<string, string[]> = {
  intake: ['VALIDATION', 'RESUBMITTED', 'SUBMITTED'],
  education: ['UNDER_REVIEW', 'RESUBMITTED'],
  transport: ['UNDER_REVIEW', 'RESUBMITTED'],
  final: ['AWAITING_ADDITIONAL_APPROVAL', 'RESUBMITTED'],
};

const TERMINAL = new Set(['APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED']);

const STAGE_SHORT: Record<string, string> = {
  intake: 'Intake',
  education: 'Education',
  transport: 'Transport',
  final: 'Final',
};

/** True when the official can still sign at this list's workflow gate. */
export function tripOpenForSignOnPage(row: GovTripRow, pageStage?: string): boolean {
  if (row.status === 'CORRECTION_REQUESTED' || TERMINAL.has(row.status)) return false;

  const gate = pageStage ?? row.currentStageKey;
  if (!gate) return false;
  if (pageStage && row.currentStageKey !== pageStage) return false;

  const allowed = SIGNABLE_BY_STAGE[gate];
  return allowed ? allowed.includes(row.status) : false;
}

export function tripMovedPastPageStage(row: GovTripRow, pageStage?: string): boolean {
  if (!pageStage) return false;
  return row.currentStageKey !== pageStage;
}

export function currentGateLabel(stageKey?: string | null): string {
  if (!stageKey) return 'Pipeline';
  return STAGE_SHORT[stageKey] ?? stageKey.replace(/_/g, ' ');
}
