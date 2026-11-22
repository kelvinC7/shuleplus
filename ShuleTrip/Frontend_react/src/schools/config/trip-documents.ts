export const DRIVER_LICENSE_DOC_TYPE = 'Driver license document';
const LEGACY_DRIVER_LICENSE_DOC_TYPE = 'Driver license copy';

export const TRIP_DOC_TYPES: Array<{ type: string; hint: string; required: boolean }> = [
  { type: 'Head teacher approval letter', hint: 'Signed letter authorizing the trip', required: true },
  { type: 'Vehicle roadworthiness', hint: 'Inspection or certificate for the vehicle', required: true },
  {
    type: DRIVER_LICENSE_DOC_TYPE,
    hint: 'Clear scan or photo of the valid license for the driver named on the transport step',
    required: true,
  },
  { type: 'Insurance certificate', hint: 'Passenger or vehicle insurance cover', required: true },
];

export function hasDriverLicenseDocument(
  documents: Array<{ documentType: string; fileName?: string | null }>
): boolean {
  return documents.some(
    (d) =>
      (d.documentType === DRIVER_LICENSE_DOC_TYPE || d.documentType === LEGACY_DRIVER_LICENSE_DOC_TYPE) &&
      Boolean(d.fileName?.trim())
  );
}

export function hasRequiredTripDocument(
  documents: Array<{ documentType: string; fileName?: string | null }>,
  type: string
): boolean {
  if (type === DRIVER_LICENSE_DOC_TYPE) return hasDriverLicenseDocument(documents);
  return documents.some((d) => d.documentType === type && Boolean(d.fileName?.trim()));
}
