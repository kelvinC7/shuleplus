import { TripWorkspaceShell } from '@/schools/components/TripWorkspaceShell';

export default function TransportManagementPage() {
  return (
    <TripWorkspaceShell
      title="Transport management"
      description="Vehicle, driver, capacity, route, and document expiry context for the selected trip. Changes after approval may require re-review."
      initialTab="transport"
    />
  );
}
