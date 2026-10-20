import React from 'react';
import { joinItems } from '../../utils/lessonPlanTextUtils';

function RefBlock({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="pt-4 first:pt-0">
      <h3 className="text-xs font-medium text-slate-500">{title}</h3>
      <div className="mt-1.5 space-y-1 text-sm leading-relaxed text-slate-800">
        {items.map((item) => (
          <p key={item.slice(0, 80)}>{item}</p>
        ))}
      </div>
    </div>
  );
}

export default function LessonPlanCurriculumSection({ intelligence, objectives, onApplyMaterials }) {
  if (!intelligence) return null;

  const {
    tools = [],
    requirements = [],
    materials = [],
    pupilActivities = [],
    pupilExercises = [],
    intelligenceNotes = [],
    keyUnitCompetence,
    officialObjectives = [],
    hasPupilsBook,
  } = intelligence;

  const objList =
    officialObjectives.length
      ? officialObjectives
      : objectives?.map((o) => o?.statement || o?.value).filter(Boolean) || [];

  const hasContent =
    tools.length ||
    requirements.length ||
    materials.length ||
    pupilActivities.length ||
    pupilExercises.length ||
    objList.length ||
    keyUnitCompetence;

  if (!hasContent) return null;

  return (
    <section className="border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Curriculum reference</h2>
        <span className="text-xs text-slate-400">
          {hasPupilsBook ? "TG + pupil's book" : "Teacher's guide"}
        </span>
      </div>

      <RefBlock title="Objectives" items={objList} />
      <RefBlock title="Tools & equipment" items={tools} />
      <RefBlock title="Requirements" items={requirements} />
      <RefBlock title="Materials" items={materials} />

      {pupilActivities.length > 0 || pupilExercises.length > 0 ? (
        <div className="pt-4">
          <h3 className="text-xs font-medium text-slate-500">Pupil book</h3>
          {pupilActivities.length > 0 ? (
            <div className="mt-1.5 space-y-1 text-sm leading-relaxed text-slate-800">
              {pupilActivities.slice(0, 6).map((a) => (
                <p key={a.slice(0, 60)}>{a}</p>
              ))}
            </div>
          ) : null}
          {pupilExercises.length > 0 ? (
            <div className="mt-3 space-y-1 text-sm leading-relaxed text-slate-800">
              {pupilExercises.slice(0, 4).map((a) => (
                <p key={a.slice(0, 60)}>{a}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {keyUnitCompetence ? (
        <p className="pt-4 text-sm leading-relaxed text-slate-800">
          <span className="text-slate-500">Key unit competence. </span>
          {keyUnitCompetence}
        </p>
      ) : null}

      {intelligenceNotes?.length ? (
        <div className="mt-3 space-y-1 text-sm text-slate-600">
          {intelligenceNotes.map((n) => (
            <p key={n.slice(0, 50)}>{n}</p>
          ))}
        </div>
      ) : null}

      {materials.length > 0 && onApplyMaterials ? (
        <button
          type="button"
          onClick={() => onApplyMaterials(joinItems(materials))}
          className="mt-4 text-sm font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600"
        >
          Use materials in preparation
        </button>
      ) : null}
    </section>
  );
}

/** Preview removed — fields below are the source of truth. */
export function ActivityBullets() {
  return null;
}
