import { TripWorkspaceShell } from '@/schools/components/TripWorkspaceShell';

export default function ParticipantsStaffPage() {
  return (
    <TripWorkspaceShell
      title="Students & staff"
      description="Full manifest and supervising adults, synced with the register trip wizard."
      initialTab="manifest"
    />
  );
}
