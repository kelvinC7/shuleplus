'use client';

import { TaskDetailView } from '@/modules/tasks/task-detail-view';
import { useParams } from 'next/navigation';

export default function TaskDetailPage() {
  const params = useParams();
  return <TaskDetailView taskId={params.id as string} />;
}
