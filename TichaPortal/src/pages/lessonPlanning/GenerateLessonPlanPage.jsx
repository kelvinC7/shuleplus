import React, { useState } from 'react';
import LessonPlanningLayout from '../../components/lessonPlanning/LessonPlanningLayout';
import GenerateLessonPlanModal from '../../components/lessonPlanning/GenerateLessonPlanModal';

const NAVY = '#000435';

export default function GenerateLessonPlanPage() {
  const [open, setOpen] = useState(false);

  return (
    <LessonPlanningLayout
      title="Generate lesson plan"
      subtitle="Create a draft from published curriculum."
      actions={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex w-full items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold text-white sm:w-auto"
          style={{ background: NAVY }}
        >
          New lesson plan
        </button>
      }
    >
      <p className="text-sm text-slate-600">
        Schedule, class, curriculum, then optional notes.{' '}
        <button type="button" onClick={() => setOpen(true)} className="font-medium text-slate-900 underline underline-offset-2">
          Open wizard
        </button>
      </p>
      <GenerateLessonPlanModal open={open} onClose={() => setOpen(false)} />
    </LessonPlanningLayout>
  );
}
