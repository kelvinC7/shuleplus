import { TripWorkspaceShell } from '@/schools/components/TripWorkspaceShell';

export default function GuardianConsentPage() {
  return (
    <TripWorkspaceShell
      title="Guardian consent"
      description="Consent status per learner · use the trip QR on Overview for trip-day verification."
      initialTab="consent"
    />
  );
}
