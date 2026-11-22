export const APPROVAL_TIMELINE_STAGES = [
  { key: 'submit', label: 'School submission', description: 'Application, manifest, transport, safety, consent, documents' },
  { key: 'completeness', label: 'Completeness review', description: 'Required fields, documents, dates, capacity consistency' },
  { key: 'education', label: 'Education / authority review', description: 'Purpose, objectives, signed lists, policy fit' },
  { key: 'transport', label: 'Transport & road safety', description: 'Vehicle, driver, insurance, roadworthiness, staffing' },
  { key: 'checkpoint', label: 'Checkpoint inspection', description: 'Optional traffic officer checklist · distinct from authorization' },
  { key: 'final', label: 'Final authorization', description: 'Approve, reject, conditions, or request corrections' },
  { key: 'operations', label: 'Trip-day monitoring', description: 'Boarding, route events, incidents, closure report' },
] as const;

export const EVIDENCE_REQUIREMENTS = [
  { id: 'auth_letter', name: 'Trip authorization letter', stage: 'education' },
  { id: 'signed_manifest', name: 'Signed learner list', stage: 'education' },
  { id: 'vehicle_licence', name: 'School / PMO vehicle licence', stage: 'transport' },
  { id: 'psv_licence', name: 'Hired PSV licence', stage: 'transport' },
  { id: 'transport_auth', name: 'Transport authorization letter', stage: 'transport' },
  { id: 'roadworthiness', name: 'Roadworthiness report', stage: 'transport' },
  { id: 'insurance', name: 'Third-party insurance', stage: 'transport' },
  { id: 'driver_licence', name: "Driver's licence", stage: 'transport' },
  { id: 'driver_badge', name: 'Driver badge & ID', stage: 'transport' },
  { id: 'teacher_letter', name: 'Teacher designation & school ID', stage: 'education' },
  { id: 'assistant_id', name: 'Transport assistant ID', stage: 'transport' },
  { id: 'consent', name: 'Guardian written consent', stage: 'submit' },
  { id: 'transport_policy', name: 'School learner-transport policy', stage: 'submit' },
  { id: 'route_chart', name: 'Route chart & itinerary', stage: 'submit' },
  { id: 'logbook', name: 'Transport logbook & learner records', stage: 'operations' },
  { id: 'checkpoint', name: 'Checkpoint inspection record', stage: 'checkpoint' },
  { id: 'final_cert', name: 'Final authorization certificate', stage: 'final' },
] as const;

export type EvidenceStatus =
  | 'NOT_SUBMITTED'
  | 'SUBMITTED'
  | 'UNDER_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'NOT_APPLICABLE';

export const EVIDENCE_STATUS_LABEL: Record<EvidenceStatus, string> = {
  NOT_SUBMITTED: 'Not submitted',
  SUBMITTED: 'Submitted',
  UNDER_VERIFICATION: 'Under verification',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  NOT_APPLICABLE: 'N/A',
};
