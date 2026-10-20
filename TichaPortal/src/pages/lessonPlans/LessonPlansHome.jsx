import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Loader2, Plus, Sparkles } from 'lucide-react';
import { listLessonPlans } from '../../services/lessonPlansApi';

const NAVY = '#000435';
const AMBER = '#FCB038';

export default function LessonPlansHome() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listLessonPlans();
        if (!cancelled) setPlans(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load lesson plans');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-6 text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${NAVY}, #121a5c)` }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: AMBER }}>
              Teaching & Learning
            </p>
            <h1 className="mt-1 text-2xl font-black">AI Lesson Planner</h1>
            <p className="mt-2 max-w-xl text-sm text-white/75">
              Generate REB-aligned lesson plans from published curriculum, grounded in official Teacher’s Guide content.
            </p>
          </div>
          <Link
            to="/lesson-plans/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-md"
            style={{ background: AMBER, color: NAVY }}
          >
            <Plus size={18} />
            Create lesson plan
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}. Ensure Curriculum Intelligence API (:3094) and TichaPortal backend are running.
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin" style={{ color: NAVY }} size={32} />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <Sparkles className="mx-auto text-slate-300" size={40} />
          <p className="mt-3 font-semibold text-slate-800">No saved lesson plans yet</p>
          <p className="mt-1 text-sm text-slate-500">Select a published unit and subtopic to generate your first plan.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <Link
              key={p.id}
              to={`/lesson-plans/${p.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#FCB038]/60 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <BookOpen size={20} style={{ color: AMBER }} className="shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-bold text-[#000435] truncate">
                    {p.lesson?.title || 'Lesson plan'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {p.lesson?.unit?.title ? `Unit ${p.lesson.unit.unitNumber} · ` : ''}
                    {p.durationMinutes} min · {p.status}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Updated {new Date(p.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
