/** Canonical trip lifecycle statuses (aligned with backend TripStatus). */
export const TRIP_STATUS_VALUES = [
  'DRAFT',
  'SUBMITTED',
  'VALIDATION',
  'UNDER_REVIEW',
  'CORRECTION_REQUESTED',
  'RESUBMITTED',
  'AWAITING_ADDITIONAL_APPROVAL',
  'APPROVED',
  'REJECTED',
  'TRIP_IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export type TripStatusValue = (typeof TRIP_STATUS_VALUES)[number];

export const TRIP_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  VALIDATION: 'Intake review',
  UNDER_REVIEW: 'Under review',
  CORRECTION_REQUESTED: 'Awaiting corrections',
  RESUBMITTED: 'Resubmitted',
  AWAITING_ADDITIONAL_APPROVAL: 'Final decision',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  TRIP_IN_PROGRESS: 'Trip in progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const TRIP_STATUS_SUBLABELS: Partial<Record<string, string>> = {
  RESUBMITTED: 'With corrections',
  CORRECTION_REQUESTED: 'School action needed',
};

export function tripStatusLabel(status: string): string {
  return TRIP_STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function tripStatusFilterOptions(): Array<{ value: string; label: string }> {
  return [
    { value: 'all', label: 'All statuses' },
    ...TRIP_STATUS_VALUES.map((value) => ({
      value,
      label: TRIP_STATUS_SUBLABELS[value]
        ? `${TRIP_STATUS_LABELS[value]} — ${TRIP_STATUS_SUBLABELS[value]}`
        : TRIP_STATUS_LABELS[value],
    })),
  ];
}
