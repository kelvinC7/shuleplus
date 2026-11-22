import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CreateAssessmentSheet from './CreateAssessmentSheet';

/**
 * Route wrapper for /assessments/create — opens the same bottom sheet
 * used from the schedule page, then returns to schedule on success/close.
 */
export default function CreateAssessment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preset = useMemo(
    () => ({
      subject: searchParams.get('subject') || '',
      classId: searchParams.get('classId') || '',
      className: searchParams.get('className') || '',
    }),
    [searchParams],
  );

  return (
    <CreateAssessmentSheet
      open
      preset={preset}
      onClose={() => navigate('/assessments/schedule', { replace: true })}
      onCreated={() => navigate('/assessments/schedule', { replace: true })}
    />
  );
}
