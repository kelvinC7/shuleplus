import { GovApplicationsWorkspace } from '@/government/components/gov-applications-workspace';

export default function ReviewQueuePage() {
  return (
    <GovApplicationsWorkspace
      title="Action queue"
      description="Trips at your workflow stage that need a decision or sign-off."
      queue="actionable"
      signActionLabel="Review & sign"
      emptyMessage="No trips awaiting your action at this time."
    />
  );
}
