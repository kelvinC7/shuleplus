import { TripWorkspaceShell } from '@/schools/components/TripWorkspaceShell';

export default function SafetyCompliancePage() {
  return (
    <TripWorkspaceShell
      title="Safety and compliance"
      description="Risk checklist, transport context, and readiness · aligned with wizard step 5."
      initialTab="safety"
    />
  );
}
