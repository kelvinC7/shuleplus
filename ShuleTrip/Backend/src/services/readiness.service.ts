import type { Trip, TripDocument, TripParticipant, TripStaff, TripVehicle } from '../generated/prisma';

export type ReadinessItem = {
  key: string;
  label: string;
  level: 'blocker' | 'warning' | 'advisory';
  message: string;
};

export type ReadinessReport = {
  score: number;
  blockers: ReadinessItem[];
  warnings: ReadinessItem[];
  advisories: ReadinessItem[];
};

const SUPERVISION_MAX_STUDENTS_PER_ADULT = 15;

export function computeTripReadiness(trip: Trip & {
  participants: TripParticipant[];
  staff: TripStaff[];
  vehicles: TripVehicle[];
  documents: TripDocument[];
}): ReadinessReport {
  const blockers: ReadinessItem[] = [];
  const warnings: ReadinessItem[] = [];
  const advisories: ReadinessItem[] = [];

  if (!trip.title?.trim()) {
    blockers.push({ key: 'title', label: 'Trip title', level: 'blocker', message: 'Trip title is required.' });
  }
  if (!trip.destination?.trim()) {
    blockers.push({ key: 'destination', label: 'Destination', level: 'blocker', message: 'Destination is required.' });
  }
  if (!trip.departAt) {
    blockers.push({ key: 'departAt', label: 'Departure', level: 'blocker', message: 'Planned departure date and time are required.' });
  }
  if (trip.participants.length === 0) {
    blockers.push({
      key: 'participants',
      label: 'Student manifest',
      level: 'blocker',
      message: 'Add at least one student to the trip manifest.',
    });
  }
  const leaders = trip.staff.filter((s) => s.isLeader);
  if (trip.staff.length === 0 || leaders.length === 0) {
    blockers.push({
      key: 'trip_leader',
      label: 'Trip leader',
      level: 'blocker',
      message: 'Assign at least one accompanying staff member as trip leader.',
    });
  }

  const vehicle = trip.vehicles[0];
  if (!vehicle?.plateNumber?.trim() || !vehicle.driverName?.trim()) {
    blockers.push({
      key: 'transport',
      label: 'Transport',
      level: 'blocker',
      message: 'Vehicle registration and driver name are required.',
    });
  } else if (!vehicle.driverLicenseCategory?.trim() || !vehicle.driverLicenseNumber?.trim()) {
    blockers.push({
      key: 'transport',
      label: 'Transport',
      level: 'blocker',
      message: 'Driver license category and license number are required.',
    });
  }

  if (trip.participants.length > 0 && trip.staff.length > 0) {
    const ratio = trip.participants.length / trip.staff.length;
    if (ratio > SUPERVISION_MAX_STUDENTS_PER_ADULT) {
      warnings.push({
        key: 'supervision_ratio',
        label: 'Supervision ratio',
        level: 'warning',
        message: `${trip.participants.length} learners with ${trip.staff.length} supervisor(s) exceeds the configured ${SUPERVISION_MAX_STUDENTS_PER_ADULT}:1 guideline.`,
      });
    }
  }

  const withoutPhone = trip.participants.filter((p) => !p.guardianPhone?.trim());
  if (withoutPhone.length > 0) {
    warnings.push({
      key: 'guardian_contact',
      label: 'Guardian contact',
      level: 'warning',
      message: `${withoutPhone.length} participant(s) have no guardian phone on record in Student Management.`,
    });
  }

  const consentMissing = trip.participants.filter((p) => !p.guardianConsent);
  if (consentMissing.length > 0) {
    warnings.push({
      key: 'guardian_consent',
      label: 'Guardian consent',
      level: 'warning',
      message: `${consentMissing.length} guardian consent(s) pending in ParentMIS — you may submit; parents are notified after submission.`,
    });
  }

  if (trip.documents.length === 0) {
    advisories.push({
      key: 'documents',
      label: 'Supporting documents',
      level: 'advisory',
      message: 'No supporting documents uploaded yet. Officials may request them during review.',
    });
  }

  const safety = trip.safetyDetails as { risksIdentified?: boolean; firstAidPlan?: boolean } | null;
  if (!safety?.risksIdentified || !safety?.firstAidPlan) {
    advisories.push({
      key: 'safety_plan',
      label: 'Safety assessment',
      level: 'advisory',
      message: 'Complete the safety and risk assessment checklist before departure.',
    });
  }

  const totalChecks = 8;
  const passed = totalChecks - blockers.length - Math.min(warnings.length, 3);
  const score = Math.max(0, Math.min(100, Math.round((passed / totalChecks) * 100)));

  return { score, blockers, warnings, advisories };
}
