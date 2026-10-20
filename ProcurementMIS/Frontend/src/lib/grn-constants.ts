export const STORAGE_LOCATIONS = [
  'Main Store',
  'ICT Store',
  'Science Store',
  'Kitchen Store',
  'Uniform Store',
  'Library Store',
] as const;

export const ITEM_CONDITIONS = [
  'Good',
  'Damaged',
  'Wrong Item',
  'Expired',
  'Missing Parts',
  'Other',
] as const;

export const QUALITY_STATUSES = [
  { value: 'ACCEPTED', label: 'Accepted', tone: 'success' as const },
  { value: 'ACCEPTED_WITH_ISSUES', label: 'Accepted with Issues', tone: 'warning' as const },
  { value: 'REJECTED', label: 'Rejected', tone: 'danger' as const },
];

export const GRN_STATUSES = [
  'DRAFT',
  'PENDING_INSPECTION',
  'PARTIALLY_RECEIVED',
  'FULLY_RECEIVED',
  'ACCEPTED',
  'REJECTED',
] as const;

export const GRN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_INSPECTION: 'Pending Inspection',
  PARTIALLY_RECEIVED: 'Partially Received',
  FULLY_RECEIVED: 'Fully Received',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  RECEIVED: 'Received',
  COMPLETED: 'Completed',
};

export const GRN_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING_INSPECTION', label: 'Pending Inspection' },
  { key: 'PARTIALLY_RECEIVED', label: 'Partial' },
  { key: 'FULLY_RECEIVED', label: 'Received' },
  { key: 'REJECTED', label: 'Rejected' },
] as const;

export const RETURN_REASONS = [
  'Damaged',
  'Wrong Item',
  'Wrong Quantity',
  'Poor Quality',
  'Expired',
  'Defective',
  'Supplier Error',
  'Other',
] as const;

export const RETURN_RESOLUTIONS = [
  { value: 'REPLACEMENT', label: 'Replacement' },
  { value: 'CREDIT_NOTE', label: 'Credit Note' },
  { value: 'REFUND', label: 'Refund' },
  { value: 'EXCHANGE', label: 'Exchange' },
] as const;

export const RETURN_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SENT_TO_SUPPLIER',
  'REPLACEMENT_PENDING',
  'REPLACED',
  'CREDIT_RECEIVED',
  'CLOSED',
  'REJECTED',
] as const;

export const RETURN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  SENT_TO_SUPPLIER: 'Sent to Supplier',
  REPLACEMENT_PENDING: 'Replacement Pending',
  REPLACED: 'Replaced',
  CREDIT_RECEIVED: 'Credit Received',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
};

export const RETURN_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'SENT_TO_SUPPLIER', label: 'Sent to Supplier' },
  { key: 'REPLACEMENT', label: 'Replacement' },
  { key: 'CREDIT', label: 'Credit Note' },
  { key: 'CLOSED', label: 'Closed' },
] as const;

export function grnStatusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'FULLY_RECEIVED' || status === 'ACCEPTED' || status === 'COMPLETED') return 'success';
  if (status === 'PARTIALLY_RECEIVED') return 'warning';
  if (status === 'REJECTED') return 'danger';
  if (status === 'PENDING_INSPECTION' || status === 'DRAFT') return 'info';
  return 'neutral';
}

export function returnStatusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'CLOSED' || status === 'REPLACED' || status === 'CREDIT_RECEIVED') return 'success';
  if (status === 'PENDING_APPROVAL' || status === 'DRAFT' || status === 'REPLACEMENT_PENDING') return 'warning';
  if (status === 'REJECTED') return 'danger';
  if (status === 'APPROVED' || status === 'SENT_TO_SUPPLIER') return 'info';
  return 'neutral';
}
