import { GovApplicationsWorkspace } from '@/government/components/gov-applications-workspace';

export function ApplicationIntakePage() {
  return (
    <GovApplicationsWorkspace
      title="Application intake & completeness"
      description="Trips you handled at intake stay on this list with their current status. Sign only when a trip is still at the intake gate."
      stage="intake"
      signActionLabel="Sign & release"
      emptyMessage="No trip applications in your jurisdiction yet."
    />
  );
}

export function AllApplicationsPage() {
  return (
    <GovApplicationsWorkspace
      title="Applications"
      description="All submitted trips in your jurisdiction."
      emptyMessage="No applications found."
    />
  );
}

export function PendingDecisionsPage() {
  return (
    <GovApplicationsWorkspace
      title="Pending final decisions"
      description="Applications where transport and education gates are signed and final authorization is required."
      stage="final"
      signActionLabel="Final authorization"
      emptyMessage="No applications awaiting a final decision."
    />
  );
}

export function EducationReviewPage() {
  return (
    <GovApplicationsWorkspace
      title="Education / local authority review"
      description="Education trips stay listed after you sign — status updates as they move through the pipeline."
      stage="education"
      signActionLabel="Sign education gate"
      emptyMessage="No applications in education review for your jurisdiction."
    />
  );
}

export function ApprovedTripsPage() {
  return (
    <GovApplicationsWorkspace
      title="Approved trips"
      description="Authorized applications ready for departure."
      status="APPROVED"
      showSignAction={false}
      emptyMessage="No authorized trips in scope."
    />
  );
}

export function TripMonitoringPage() {
  return (
    <GovApplicationsWorkspace
      title="Active trip monitoring"
      description="Trips in progress · boarding, route events, incidents, and return closure."
      status="TRIP_IN_PROGRESS"
      showSignAction={false}
      emptyMessage="No active trips to monitor right now."
    />
  );
}
