import { Suspense } from 'react';
import { CreateAssessmentView } from '@/modules/assessments/create-assessment-view';

export default function CreateAssessmentPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-muted">Loading…</div>}>
      <CreateAssessmentView />
    </Suspense>
  );
}
