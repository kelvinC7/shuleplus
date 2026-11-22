import { TRIP_STATUS_LABELS, TRIP_STATUS_SUBLABELS, TRIP_STATUS_VALUES } from '@/shared/trip-status';

export interface SchoolTripListItem {
  id: string;
  reference: string;
  title: string;
  destination: string | null;
  status: string;
  departAt: string | null;
  returnAt: string | null;
  updatedAt?: string;
  _count: { participants: number; staff: number };
}

function statusFilterLabel(value: string): string {
  const sub = TRIP_STATUS_SUBLABELS[value];
  const main = TRIP_STATUS_LABELS[value] ?? value;
  return sub ? `${main} — ${sub}` : main;
}

/** Options for the school trips status dropdown (no chip row). */
export const TRIP_STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All trips' },
  { value: 'UNDER_REVIEW', label: 'In review (any pipeline stage)' },
  ...TRIP_STATUS_VALUES.map((value) => ({ value, label: statusFilterLabel(value) })),
];
