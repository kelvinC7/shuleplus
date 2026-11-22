import { TripWorkspaceShell } from '@/schools/components/TripWorkspaceShell';

export default function TripDocumentsPage() {
  return (
    <TripWorkspaceShell
      title="Documents & requirements"
      description="Checklist by trip type with upload, replace, and completeness before submission."
      initialTab="documents"
    />
  );
}
