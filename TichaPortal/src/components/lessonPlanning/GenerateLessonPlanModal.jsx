import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
  Sparkles,
  StickyNote,
  X,
} from 'lucide-react';
import {
  fetchBookTree,
  fetchClassRosterSummary,
  fetchCurriculumCatalog,
  fetchLessonPlanningContext,
  generateLessonPlan,
} from '../../services/lessonPlanningApi';
import { booksForAssignment, extractGradeFromClass, subjectsMatch } from '../../utils/curriculumMatch';

const NAVY = '#000435';

const STEPS = [
  { id: 'schedule', label: 'Schedule', short: 'When', icon: CalendarDays },
  { id: 'class', label: 'Class', short: 'Who', icon: GraduationCap },
  { id: 'curriculum', label: 'Curriculum', short: 'What', icon: BookOpen },
  { id: 'notes', label: 'Notes', short: 'Notes', icon: StickyNote },
];

export default function GenerateLessonPlanModal({ open, onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState(null);
  const [catalog, setCatalog] = useState({ books: [] });
  const [tree, setTree] = useState(null);
  const [assignmentKey, setAssignmentKey] = useState('');
  const [bookId, setBookId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [sessionDuration, setSessionDuration] = useState(null);
  const [form, setForm] = useState({
    academicYear: '',
    term: '',
    lessonDate: '',
    durationMinutes: 40,
    maleLearners: '',
    femaleLearners: '',
    classSize: '',
    language: 'English',
    sen: '',
  });

  useEffect(() => {
    if (!open) return undefined;
    setStep(0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const ctx = await fetchLessonPlanningContext();
        if (cancelled) return;
        setContext(ctx);
        const first = ctx.assignments?.[0];
        const cat = await fetchCurriculumCatalog({
          subject: first?.subjectName,
          grade: extractGradeFromClass(first?.className) || first?.className,
        });
        if (cancelled) return;
        setCatalog(cat);
        const key = first ? `${first.subjectName}|${first.className}` : '';
        setAssignmentKey(key);
        setSessionDuration(ctx.sessionDuration?.source === 'timetable' ? ctx.sessionDuration : null);
        setForm((f) => ({
          ...f,
          academicYear: ctx.academicYear || f.academicYear,
          term: ctx.term || f.term,
          lessonDate: ctx.lessonDate || f.lessonDate,
          durationMinutes: ctx.sessionDuration?.durationMinutes || ctx.defaultDurationMinutes || 40,
        }));
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load teacher context');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const assignment = useMemo(() => {
    const list = context?.assignments || [];
    if (!assignmentKey) return list[0] || null;
    const [subjectName, className] = assignmentKey.split('|');
    return list.find((a) => a.subjectName === subjectName && a.className === className) || list[0] || null;
  }, [context, assignmentKey]);

  useEffect(() => {
    if (!assignment || !open || !form.lessonDate) return;
    let cancelled = false;
    (async () => {
      try {
        const ctx = await fetchLessonPlanningContext({
          date: form.lessonDate,
          academicYear: form.academicYear,
          term: form.term,
          subjectName: assignment.subjectName,
          className: assignment.className,
        });
        if (cancelled) return;
        setSessionDuration(ctx.sessionDuration?.source === 'timetable' ? ctx.sessionDuration : null);
        setForm((f) => ({
          ...f,
          durationMinutes:
            ctx.sessionDuration?.durationMinutes ?? ctx.defaultDurationMinutes ?? f.durationMinutes,
        }));
      } catch {
        /* keep current duration */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignment, open, form.lessonDate, form.academicYear, form.term]);

  useEffect(() => {
    if (!assignment || !open) return;
    let cancelled = false;
    (async () => {
      try {
        const summary = await fetchClassRosterSummary({
          classId: assignment.classId,
          className: assignment.className,
          academicYear: form.academicYear,
        });
        if (cancelled) return;
        setForm((f) => ({
          ...f,
          maleLearners: summary.male ?? '',
          femaleLearners: summary.female ?? '',
          classSize: summary.classSize ?? summary.total ?? '',
        }));
      } catch {
        /* roster optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignment, open, context, form.academicYear]);

  useEffect(() => {
    if (!open || !assignment) return;
    let cancelled = false;
    (async () => {
      try {
        const cat = await fetchCurriculumCatalog({
          subject: assignment.subjectName,
          grade: extractGradeFromClass(assignment.className) || assignment.className,
        });
        if (!cancelled) setCatalog(cat);
      } catch {
        /* keep previous catalog */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignment, open]);

  const filteredBooks = useMemo(
    () => booksForAssignment(catalog.books, assignment),
    [catalog.books, assignment]
  );

  const recommendedBook = useMemo(() => {
    if (!filteredBooks.length || !assignment) return null;
    return filteredBooks.find((b) => subjectsMatch(b.subject, assignment.subjectName)) || filteredBooks[0];
  }, [filteredBooks, assignment]);

  useEffect(() => {
    if (!filteredBooks.length) {
      setBookId('');
      setTree(null);
      setUnitId('');
      setLessonId('');
      return;
    }
    const pick = recommendedBook || filteredBooks[0];
    setBookId((current) => {
      if (current && filteredBooks.some((b) => b.id === current)) return current;
      return pick?.id || '';
    });
  }, [filteredBooks, recommendedBook]);

  useEffect(() => {
    if (!bookId || !open) return;
    let cancelled = false;
    (async () => {
      try {
        const t = await fetchBookTree(bookId);
        if (cancelled) return;
        setTree(t);
        const u = t.units?.[0];
        setUnitId(u?.id || '');
        setLessonId(u?.lessons?.[0]?.id || '');
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load curriculum tree');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, open]);

  const selectedUnit = tree?.units?.find((u) => u.id === unitId);
  const lessons = selectedUnit?.lessons || [];

  useEffect(() => {
    if (!bookId || !lessons.length) {
      if (!lessons.length && unitId) setLessonId('');
      return;
    }
    if (!lessons.some((l) => l.id === lessonId)) {
      setLessonId(lessons[0].id);
    }
  }, [bookId, unitId, lessons, lessonId]);

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(form.academicYear && form.term && form.lessonDate);
    if (step === 1) return Boolean(assignment && (context?.assignments?.length || 0) > 0);
    if (step === 2) return Boolean(bookId && unitId && lessonId);
    return true;
  }, [step, form, assignment, context, bookId, unitId, lessonId]);

  const onSubmit = async () => {
    if (!lessonId) {
      setError('Select unit and lesson from approved curriculum');
      setStep(2);
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const result = await generateLessonPlan({
        curriculumLessonId: lessonId,
        durationMinutes: Number(form.durationMinutes),
        classSize: form.classSize ? Number(form.classSize) : undefined,
        maleLearners: form.maleLearners !== '' ? Number(form.maleLearners) : undefined,
        femaleLearners: form.femaleLearners !== '' ? Number(form.femaleLearners) : undefined,
        language: form.language,
        termLabel: form.term,
        academicYear: form.academicYear,
        subjectLabel: assignment?.subjectName,
        gradeLabel: assignment?.className,
        className: assignment?.className,
        lessonDate: form.lessonDate,
        specialEducationalNeeds: form.sen || undefined,
      });
      onClose?.();
      navigate(`/lesson-plans/${result?.plan?.id}`);
    } catch (e) {
      setError(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-lesson-plan-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />

      <div className="relative flex max-h-[min(100dvh,680px)] w-full max-w-lg flex-col overflow-hidden rounded-t-xl bg-white shadow-xl ring-1 ring-black/5 sm:max-h-[min(90dvh,680px)] sm:rounded-lg">
        <div className="flex shrink-0 justify-center pt-2 sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-slate-300" />
        </div>

        <header className="shrink-0 border-b border-slate-200 px-5 pb-4 pt-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-400">
                Step {step + 1} of {STEPS.length}
              </p>
              <h2 id="generate-lesson-plan-title" className="text-lg font-semibold text-slate-900">
                {STEPS[step].label}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">{STEPS.map((s) => s.label).join(' · ')}</p>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain bg-white px-6 py-6">
          <div className="mx-auto w-full max-w-sm sm:max-w-md">
          {error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{error}</div>
          ) : null}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="animate-spin" style={{ color: NAVY }} size={36} />
              <p className="text-sm text-slate-500">Loading…</p>
            </div>
          ) : (
            <>
              {step === 0 ? (
                <StepPanel>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Academic year">
                      <select
                        className={inputCls}
                        value={form.academicYear}
                        onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                      >
                        {(context?.academicYears || [form.academicYear]).map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Term">
                      <select className={inputCls} value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
                        {(context?.terms || ['Term 1', 'Term 2', 'Term 3']).map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Lesson date">
                      <input
                        type="date"
                        className={inputCls}
                        value={form.lessonDate}
                        onChange={(e) => setForm({ ...form, lessonDate: e.target.value })}
                      />
                    </Field>
                    <Field label="Language">
                      <select className={inputCls} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                        <option>English</option>
                        <option>Kinyarwanda</option>
                        <option>French</option>
                      </select>
                    </Field>
                  </div>
                </StepPanel>
              ) : null}

              {step === 1 ? (
                <StepPanel>
                  {(context?.assignments || []).length === 0 ? (
                    <p className="text-sm text-slate-600">No courses linked. Set up your timetable first.</p>
                  ) : (
                    <Field label="Course & class">
                      <select
                        className={inputCls}
                        value={assignmentKey}
                        onChange={(e) => setAssignmentKey(e.target.value)}
                      >
                        {(context?.assignments || []).map((a) => {
                          const key = `${a.subjectName}|${a.className}`;
                          return (
                            <option key={key} value={key}>
                              {a.subjectName} · {a.classLabel || a.className}
                              {a.room ? ` · ${a.room}` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </Field>
                  )}

                  <Field
                    label={
                      sessionDuration?.source === 'timetable'
                        ? `Duration · ${sessionDuration.periodCount} ${
                            sessionDuration.periodCount === 1 ? 'period' : 'periods'
                          }${sessionDuration.startTime ? ` · ${sessionDuration.startTime}` : ''}`
                        : 'Duration (minutes)'
                    }
                    className="mt-3"
                  >
                    <input
                      type="number"
                      inputMode="numeric"
                      min={20}
                      max={240}
                      readOnly={sessionDuration?.source === 'timetable'}
                      className={`${inputCls}${sessionDuration?.source === 'timetable' ? ' cursor-default bg-slate-50 text-slate-700' : ''}`}
                      value={form.durationMinutes}
                      onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                    />
                  </Field>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <StatPill label="Male" value={form.maleLearners} />
                    <StatPill label="Female" value={form.femaleLearners} />
                    <StatPill label="Total" value={form.classSize} />
                  </div>
                </StepPanel>
              ) : null}

              {step === 2 ? (
                <StepPanel>
                  {recommendedBook && assignment && !subjectsMatch(recommendedBook.subject, assignment.subjectName) ? (
                    <p className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      Using guide <strong>{recommendedBook.subject}</strong> ({recommendedBook.grade}) for{' '}
                      <strong>{assignment.subjectName}</strong>.
                    </p>
                  ) : null}
                  <Field label="Teacher&apos;s guide">
                    <select
                      className={inputCls}
                      value={bookId}
                      onChange={(e) => setBookId(e.target.value)}
                      disabled={!filteredBooks.length}
                    >
                      {filteredBooks.length === 0 ? (
                        <option value="">
                          No published guide for {assignment?.subjectName || 'this subject'}
                        </option>
                      ) : null}
                      {filteredBooks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.subject} · {b.grade} · {b.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Unit">
                      <select
                        className={inputCls}
                        value={unitId}
                        disabled={!bookId || !(tree?.units?.length)}
                        onChange={(e) => {
                          setUnitId(e.target.value);
                          const u = tree?.units?.find((x) => x.id === e.target.value);
                          setLessonId(u?.lessons?.[0]?.id || '');
                        }}
                      >
                        {!bookId ? <option value="">Select a guide first</option> : null}
                        {(tree?.units || []).map((u) => (
                          <option key={u.id} value={u.id}>
                            Unit {u.unitNumber} · {u.title.slice(0, 40)}
                            {u.title.length > 40 ? '…' : ''}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Lesson">
                      <select
                        className={inputCls}
                        value={lessonId}
                        disabled={!unitId || !lessons.length}
                        onChange={(e) => setLessonId(e.target.value)}
                      >
                        {!unitId ? <option value="">Select a unit first</option> : null}
                        {lessons.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.lessonNumber ? `${l.lessonNumber} · ` : ''}
                            {l.title.slice(0, 36)}
                            {l.title.length > 36 ? '…' : ''}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </StepPanel>
              ) : null}

              {step === 3 ? (
                <StepPanel>
                  <Field label="Differentiation / SEN (optional)">
                    <textarea
                      className={`${inputCls} min-h-[96px] resize-y`}
                      placeholder="Optional notes for this class"
                      value={form.sen}
                      onChange={(e) => setForm({ ...form, sen: e.target.value })}
                    />
                  </Field>
                </StepPanel>
              ) : null}
            </>
          )}
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2 sm:gap-3">
            {step > 0 ? (
              <button
                type="button"
                disabled={generating}
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 sm:flex-none sm:px-4"
              >
                <ChevronLeft size={18} />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] flex-1 rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 sm:flex-none sm:px-4"
              >
                Cancel
              </button>
            )}

            {isLast ? (
              <button
                type="button"
                disabled={generating || loading || !lessonId}
                onClick={() => void onSubmit()}
                className="inline-flex min-h-[44px] flex-[1.4] items-center justify-center gap-2 rounded-md text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: NAVY }}
              >
                {generating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                Generate plan
              </button>
            ) : (
              <button
                type="button"
                disabled={loading || !canNext}
                onClick={() => {
                  setError('');
                  setStep((s) => Math.min(s + 1, STEPS.length - 1));
                }}
                className="inline-flex min-h-[44px] flex-[1.4] items-center justify-center gap-1 rounded-md text-sm font-bold text-white disabled:opacity-50"
                style={{ background: NAVY }}
              >
                Continue
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

const inputCls =
  'w-full min-h-[40px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200';

function StepPanel({ children }) {
  return <div>{children}</div>;
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
        {value !== '' && value != null ? value : '–'}
      </p>
    </div>
  );
}
