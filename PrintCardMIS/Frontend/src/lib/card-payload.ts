import type { CardRecord, PersonKind, PrintCardSchool } from '@/services/print-card-api';
import { buildCardPayload, type CardKind } from '@/lib/smart-card-renderer';

export function recordToPerson(record: CardRecord, kind: PersonKind) {
  if (kind === 'STUDENT') {
    return {
      id: record.personId,
      studentCode: record.personCode,
      fullName: record.fullName,
      className: record.className,
      educationLevel: record.educationLevel,
      photoUrl: record.photoUrl,
    };
  }
  return {
    id: record.personId,
    employeeNumber: record.personCode,
    fullName: record.fullName,
    position: record.role ?? 'Staff',
    photoUrl: record.photoUrl,
  };
}

export function buildPayloadFromRecord(
  record: CardRecord,
  kind: PersonKind,
  school: PrintCardSchool
) {
  const cardKind: CardKind = kind === 'STUDENT' ? 'student' : 'staff';
  return buildCardPayload(cardKind, school, recordToPerson(record, kind) as never);
}
