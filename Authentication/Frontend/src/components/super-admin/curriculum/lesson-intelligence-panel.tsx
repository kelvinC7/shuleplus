'use client';

import { BookOpen, ClipboardList, Link2, Wrench } from 'lucide-react';
import { parseLessonIntelligence, type LessonIntelRow } from './lesson-intelligence';

function ChipList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) {
    return <p className="text-xs text-slate-500">{empty}</p>;
  }
  return (
    <ul className="mt-1.5 space-y-1">
      {items.map((item) => (
        <li
          key={item.slice(0, 60)}
          className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs leading-relaxed text-slate-700"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export function LessonIntelligencePanel({ lesson }: { lesson: LessonIntelRow }) {
  const intel = parseLessonIntelligence(lesson);

  return (
    <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-[#000435]">Curriculum intelligence</span>
        {intel.pbAligned ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800 ring-1 ring-emerald-200">
            <Link2 size={12} />
            PB aligned
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
            TG only
          </span>
        )}
        {intel.mergeEngine ? (
          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-sky-800 ring-1 ring-sky-200">
            TG + PB merged
          </span>
        ) : null}
      </div>

      <section>
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#FCB038]">
          <Wrench size={14} />
          Tools &amp; equipment
        </h4>
        <ChipList items={intel.tools} empty="No tools detected — verify PDF section or re-extract." />
      </section>

      <section>
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#FCB038]">
          <ClipboardList size={14} />
          Requirements
        </h4>
        <ChipList items={intel.requirements} empty="No explicit requirements extracted for this lesson." />
      </section>

      <section>
        <h4 className="text-[11px] font-bold uppercase text-slate-500">Materials (TG)</h4>
        <ChipList items={intel.materials} empty="No materials list — check Teacher&apos;s Guide pages." />
      </section>

      <section className="rounded-xl border border-[#FCB038]/30 bg-amber-50/40 p-3">
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#000435]">
          <BookOpen size={14} className="text-[#FCB038]" />
          Pupil&apos;s Book alignment
        </h4>
        {intel.pbActivities.length ? (
          <>
            <p className="mt-1 text-[10px] font-semibold uppercase text-slate-500">Activities</p>
            <ChipList items={intel.pbActivities.slice(0, 6)} empty="" />
          </>
        ) : null}
        {intel.pbExercises.length ? (
          <>
            <p className="mt-2 text-[10px] font-semibold uppercase text-slate-500">Exercises / practice</p>
            <ChipList items={intel.pbExercises.slice(0, 6)} empty="" />
          </>
        ) : null}
        {!intel.pbActivities.length && !intel.pbExercises.length ? (
          <p className="mt-1 text-xs text-slate-600">
            Upload and link a Pupil&apos;s Book, then re-extract or merge, to show PB activities here.
          </p>
        ) : null}
        {intel.intelligenceNotes.length ? (
          <div className="mt-3 border-t border-amber-200/60 pt-2">
            <p className="text-[10px] font-bold uppercase text-slate-500">Merge notes</p>
            <ul className="mt-1 list-disc pl-4 text-xs text-slate-700">
              {intel.intelligenceNotes.map((n) => (
                <li key={n.slice(0, 50)}>{n}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function LessonIntelBadges({ lesson }: { lesson: LessonIntelRow }) {
  const intel = parseLessonIntelligence(lesson);
  if (!intel.tools.length && !intel.pbAligned) return null;
  return (
    <span className="ml-auto flex shrink-0 gap-0.5">
      {intel.tools.length ? (
        <span className="rounded bg-white/20 px-1 text-[9px] font-bold uppercase" title="Tools extracted">
          T
        </span>
      ) : null}
      {intel.pbAligned ? (
        <span className="rounded bg-emerald-400/30 px-1 text-[9px] font-bold uppercase" title="Pupil book aligned">
          PB
        </span>
      ) : null}
    </span>
  );
}
