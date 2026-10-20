import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2, Sparkles } from 'lucide-react';
import {
  fetchBookTree,
  fetchCurriculumCatalog,
  generateLessonPlan,
} from '../../services/lessonPlansApi';

const NAVY = '#000435';
const AMBER = '#FCB038';

export default function CreateLessonPlan() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [catalog, setCatalog] = useState({ books: [], subjects: [], grades: [] });
  const [tree, setTree] = useState(null);

  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [bookId, setBookId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(40);
  const [classSize, setClassSize] = useState(50);
  const [language, setLanguage] = useState('English');
  const [termLabel, setTermLabel] = useState('');
  const [lessonDate, setLessonDate] = useState('');
  const [sen, setSen] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCurriculumCatalog();
        if (cancelled) return;
        setCatalog(data);
        if (data.subjects?.length) setSubject(data.subjects[0]);
        if (data.grades?.length) setGrade(data.grades[0]);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load curriculum');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBooks = useMemo(
    () =>
      (catalog.books || []).filter(
        (b) => (!subject || b.subject === subject) && (!grade || b.grade === grade)
      ),
    [catalog.books, subject, grade]
  );

  useEffect(() => {
    if (!bookId && filteredBooks.length) setBookId(filteredBooks[0].id);
  }, [filteredBooks, bookId]);

  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    (async () => {
      try {
        const t = await fetchBookTree(bookId);
        if (!cancelled) {
          setTree(t);
          const firstUnit = t.units?.[0];
          setUnitId(firstUnit?.id || '');
          setLessonId(firstUnit?.lessons?.[0]?.id || '');
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load units');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const selectedUnit = tree?.units?.find((u) => u.id === unitId);
  const lessons = selectedUnit?.lessons || [];

  const onGenerate = async () => {
    if (!lessonId) {
      setError('Select a lesson / subtopic');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const result = await generateLessonPlan({
        curriculumLessonId: lessonId,
        durationMinutes,
        classSize,
        language,
        termLabel: termLabel || undefined,
        lessonDate: lessonDate || undefined,
        specialEducationalNeeds: sen || undefined,
      });
      const planId = result?.plan?.id;
      navigate(`/lesson-plans/${planId}`);
    } catch (e) {
      setError(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" style={{ color: NAVY }} size={36} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Create a lesson plan</p>
        <h1 className="text-2xl font-black" style={{ color: NAVY }}>
          Step {step} of 2
        </h1>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {step === 1 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <Field label="Subject">
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setBookId('');
              }}
            >
              {(catalog.subjects || []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Grade / Class">
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value);
                setBookId('');
              }}
            >
              {(catalog.grades || []).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Curriculum book">
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
            >
              {filteredBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.edition || b.language})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unit">
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={unitId}
              onChange={(e) => {
                setUnitId(e.target.value);
                const u = tree?.units?.find((x) => x.id === e.target.value);
                setLessonId(u?.lessons?.[0]?.id || '');
              }}
            >
              {(tree?.units || []).map((u) => (
                <option key={u.id} value={u.id}>
                  Unit {u.unitNumber}: {u.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lesson / Subtopic">
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
            >
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.lessonNumber ? `${l.lessonNumber} · ` : ''}
                  {l.title}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white"
            style={{ background: NAVY }}
          >
            Continue
            <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration (minutes)">
              <input
                type="number"
                min={20}
                max={120}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
            </Field>
            <Field label="Class size">
              <input
                type="number"
                min={1}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                value={classSize}
                onChange={(e) => setClassSize(Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="Language">
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option>English</option>
              <option>Kinyarwanda</option>
              <option>French</option>
            </select>
          </Field>
          <Field label="Term (optional)">
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={termLabel}
              onChange={(e) => setTermLabel(e.target.value)}
              placeholder="Term 1"
            />
          </Field>
          <Field label="Lesson date (optional)">
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
            />
          </Field>
          <Field label="Special educational needs (teacher-confirmed)">
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-h-[80px]"
              value={sen}
              onChange={(e) => setSen(e.target.value)}
              placeholder="Describe support strategies for your learners (not assumed by AI)."
            />
          </Field>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700"
            >
              Back
            </button>
            <button
              type="button"
              disabled={generating}
              onClick={() => void onGenerate()}
              className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-60"
              style={{ background: AMBER, color: NAVY }}
            >
              {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              Generate lesson plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
