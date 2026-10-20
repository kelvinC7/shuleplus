'use client';

import { useParams } from 'next/navigation';
import { AssessmentDetailView } from '@/modules/assessments/assessment-detail-view';

export default function AssessmentDetailPage() {
  const params = useParams<{ id: string }>();
  return <AssessmentDetailView id={params.id} />;
}
