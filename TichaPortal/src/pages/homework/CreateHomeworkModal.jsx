import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { TP_EMPTY } from '../../utils/tpEmpty';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  FileUp,
  Link2,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { tpActionBtn, tpActionBtnPrimary } from '../../components/TeacherPageShell';
import { assignmentKey, coursesForClass, newQuestion, uniqueClasses } from './utils';

const STEPS = ['Details', 'Type & Content', 'Review'];

const TYPE_CARDS = [
  {
    id: 'QUIZ',
    Icon: ClipboardList,
    title: 'Manual Quiz',
    desc: 'Multiple choice, true/false, short and long answers.',
  },
  {
    id: 'FILE',
    Icon: FileUp,
    title: 'File Assignment',
    desc: 'PDF, DOCX, or image with instructions.',
  },
  {
    id: 'RESOURCE',
    Icon: Link2,
    title: 'Online Resource',
    desc: 'Link, video, or external learning resource.',
  },
];

function FieldLabel({ children, required }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-slate-600">
      {children}
      {required ? <span className="text-amber-600"> *</span> : null}
    </label>
  );
}

function QuestionRow({ question, index, onChange, onDuplicate, onRemove }) {
  const update = (patch) => onChange({ ...question, ...patch });

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-slate-50/80 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question {index + 1}</p>
        <div className="flex gap-1">
          <button type="button" onClick={onDuplicate} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-600" title="Duplicate">
            <Copy className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-500" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <select
        className="tp-input mt-2 text-sm"
        value={question.type}
        onChange={(e) => {
          const type = e.target.value;
          onChange(newQuestion(type));
        }}
      >
        <option value="MULTIPLE_CHOICE">Multiple Choice</option>
        <option value="TRUE_FALSE">True / False</option>
        <option value="SHORT_ANSWER">Short Answer</option>
        <option value="LONG_ANSWER">Long Answer</option>
      </select>

      <textarea
        className="tp-input mt-2 min-h-[4.5rem] resize-y"
        rows={2}
        placeholder="Question text…"
        value={question.text}
        onChange={(e) => update({ text: e.target.value })}
      />

      <div className="mt-2 flex items-center gap-2">
        <label className="text-xs text-slate-500">Points</label>
        <input
          type="number"
          min={1}
          className="tp-input w-20 text-sm"
          value={question.points}
          onChange={(e) => update({ points: Number(e.target.value) || 1 })}
        />
      </div>

      {question.type === 'MULTIPLE_CHOICE' && (
        <div className="mt-3 space-y-2">
          {(question.options || []).map((opt, oi) => (
            <div key={opt.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  update({
                    options: question.options.map((o) => ({ ...o, isCorrect: o.id === opt.id })),
                  })
                }
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  opt.isCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {String.fromCharCode(65 + oi)}
              </button>
              <input
                className="tp-input flex-1 text-sm"
                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                value={opt.text}
                onChange={(e) =>
                  update({
                    options: question.options.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)),
                  })
                }
              />
            </div>
          ))}
          <button
            type="button"
            className="text-xs font-semibold text-[#c87800]"
            onClick={() =>
              update({
                options: [...(question.options || []), { id: crypto.randomUUID(), text: '', isCorrect: false }],
              })
            }
          >
            + Add option
          </button>
        </div>
      )}

      {question.type === 'TRUE_FALSE' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => update({ correctAnswer: val })}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
                question.correctAnswer === val
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {val ? 'True' : 'False'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function defaultForm(academicYear, term) {
  return {
    title: '',
    description: '',
    academicYear: academicYear || '',
    term: term || '',
    className: '',
    classId: null,
    courseName: '',
    homeworkType: 'QUIZ',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    dueTime: '17:00',
    estimatedMinutes: '30',
    maxScore: '20',
    questions: [newQuestion()],
    resourceUrl: '',
    submissionMode: 'SYSTEM',
    fileName: '',
    fileBase64: '',
  };
}

export default function CreateHomeworkModal({ open, onClose, onSave, saving, academicYear, term, assignments }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => defaultForm(academicYear, term));

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setForm(defaultForm(academicYear, term));
  }, [open, academicYear, term]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const classes = useMemo(() => uniqueClasses(assignments), [assignments]);
  const courses = useMemo(() => coursesForClass(assignments, form.className), [assignments, form.className]);
  const totalMarks = useMemo(
    () => (form.homeworkType === 'QUIZ' ? form.questions.reduce((s, q) => s + (Number(q.points) || 0), 0) : Number(form.maxScore) || 0),
    [form]
  );

  if (!open) return null;

  function buildPayload(asDraft) {
    let dueDate = null;
    if (form.dueDate) {
      dueDate = new Date(`${form.dueDate}T${form.dueTime || '17:00'}:00`).toISOString();
    }
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      academicYear: form.academicYear,
      term: form.term,
      className: form.className,
      classId: form.classId,
      courseName: form.courseName,
      homeworkType: form.homeworkType,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      dueDate,
      estimatedMinutes: Number(form.estimatedMinutes) || null,
      maxScore: form.homeworkType === 'QUIZ' ? totalMarks : Number(form.maxScore) || null,
      questions: form.homeworkType === 'QUIZ' ? form.questions : [],
      resourceUrl: form.homeworkType === 'RESOURCE' ? form.resourceUrl : null,
      submissionMode: form.submissionMode,
      fileBase64: form.fileBase64 || undefined,
      fileName: form.fileName || undefined,
      status: asDraft ? 'DRAFT' : undefined,
    };
  }

  async function handleSave(asDraft) {
    await onSave(buildPayload(asDraft), asDraft);
  }

  function onFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('File must be under 8 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((p) => ({ ...p, fileName: file.name, fileBase64: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  const canNext = form.title.trim() && form.className && form.courseName;
  const canPublish = canNext && form.dueDate;

  const modal = (
    <div
      className="fixed inset-0 z-[230] flex flex-col bg-[#000435]/50 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4 sm:pb-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hw-modal-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />

      <div className="relative flex h-[100dvh] w-full max-w-none flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[min(720px,calc(100dvh-2rem))] sm:max-w-2xl sm:rounded-3xl sm:ring-1 sm:ring-black/5">
        {/* Drag handle (mobile) */}
        <div className="flex shrink-0 justify-center pt-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-200" aria-hidden />
        </div>

        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-black/[0.06] px-4 pb-3 pt-1 sm:px-6 sm:pt-4">
          <div className="min-w-0">
            <p id="hw-modal-title" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c87800]">
              Create homework
            </p>
            <p className="mt-0.5 text-base font-medium text-[#000435]">{STEPS[step]}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-black/[0.06] p-2 text-slate-500 hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="shrink-0 overflow-x-auto px-4 pb-3 sm:px-6">
          <div className="flex min-w-[min(100%,20rem)] gap-1.5 rounded-xl bg-slate-100/90 p-1">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className={`flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-center text-[11px] font-semibold sm:text-xs ${
                  i === step
                    ? 'bg-[#000435] text-white shadow-sm'
                    : i < step
                      ? 'bg-white text-emerald-700'
                      : 'text-slate-500'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2 sm:px-6 sm:py-3">
          {step === 0 && (
            <div className="space-y-4 pb-2">
              <div>
                <FieldLabel required>Homework title</FieldLabel>
                <input
                  className="tp-input"
                  placeholder="e.g. Algebra practice, week 3"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Academic year</FieldLabel>
                  <input
                    className="tp-input text-sm"
                    placeholder="2025-2026"
                    value={form.academicYear}
                    onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel>Term</FieldLabel>
                  <input
                    className="tp-input text-sm"
                    placeholder="Term 1"
                    value={form.term}
                    onChange={(e) => setForm((p) => ({ ...p, term: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <FieldLabel required>Class</FieldLabel>
                <select
                  className="tp-input"
                  value={form.className}
                  onChange={(e) => {
                    const cls = classes.find((c) => c.className === e.target.value);
                    setForm((p) => ({ ...p, className: e.target.value, classId: cls?.classId || null, courseName: '' }));
                  }}
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.className} value={c.className}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel required>Course</FieldLabel>
                <select
                  className="tp-input"
                  value={form.courseName}
                  disabled={!form.className}
                  onChange={(e) => setForm((p) => ({ ...p, courseName: e.target.value }))}
                >
                  <option value="">Select course</option>
                  {courses.map((c) => (
                    <option key={assignmentKey(c)} value={c.subjectName}>
                      {c.subjectName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Instructions</FieldLabel>
                <textarea
                  className="tp-input min-h-[5rem] resize-y"
                  rows={3}
                  placeholder="Optional instructions for students and parents…"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Start date</FieldLabel>
                  <input
                    type="date"
                    className="tp-input text-sm"
                    value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel required>Due date</FieldLabel>
                  <input
                    type="date"
                    className="tp-input text-sm"
                    value={form.dueDate}
                    onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
                <div>
                  <FieldLabel>Due time</FieldLabel>
                  <input
                    type="time"
                    className="tp-input text-sm"
                    value={form.dueTime}
                    onChange={(e) => setForm((p) => ({ ...p, dueTime: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel>Duration (min)</FieldLabel>
                  <input
                    className="tp-input text-sm"
                    inputMode="numeric"
                    value={form.estimatedMinutes}
                    onChange={(e) => setForm((p) => ({ ...p, estimatedMinutes: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel>Max score</FieldLabel>
                  <input
                    className="tp-input text-sm"
                    inputMode="numeric"
                    value={form.maxScore}
                    onChange={(e) => setForm((p) => ({ ...p, maxScore: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 pb-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {TYPE_CARDS.map((t) => {
                  const Icon = t.Icon;
                  const selected = form.homeworkType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, homeworkType: t.id }))}
                      className={`flex gap-3 rounded-2xl border p-3 text-left transition sm:flex-col sm:p-4 ${
                        selected
                          ? 'border-[#000435] bg-[#000435]/[0.04] ring-2 ring-[#000435]/12'
                          : 'border-black/[0.06] bg-white hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          selected ? 'bg-[#000435] text-white' : 'bg-slate-100 text-[#000435]'
                        }`}
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#000435]">{t.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {form.homeworkType === 'QUIZ' && (
                <div className="space-y-3">
                  {form.questions.map((q, i) => (
                    <QuestionRow
                      key={q.id}
                      question={q}
                      index={i}
                      onChange={(next) =>
                        setForm((p) => ({ ...p, questions: p.questions.map((x, j) => (j === i ? next : x)) }))
                      }
                      onDuplicate={() =>
                        setForm((p) => ({
                          ...p,
                          questions: [...p.questions.slice(0, i + 1), { ...q, id: crypto.randomUUID() }, ...p.questions.slice(i + 1)],
                        }))
                      }
                      onRemove={() =>
                        setForm((p) => ({ ...p, questions: p.questions.length > 1 ? p.questions.filter((_, j) => j !== i) : p.questions }))
                      }
                    />
                  ))}
                  <button
                    type="button"
                    className={`${tpActionBtn} w-full`}
                    onClick={() => setForm((p) => ({ ...p, questions: [...p.questions, newQuestion()] }))}
                  >
                    <Plus className="h-4 w-4" /> Add question
                  </button>
                </div>
              )}

              {form.homeworkType === 'FILE' && (
                <div className="space-y-3">
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center transition hover:border-[#c87800]/50 hover:bg-amber-50/30">
                    <FileText className="h-9 w-9 text-slate-400" />
                    <p className="mt-2 text-sm font-medium text-[#000435]">{form.fileName || 'Tap to upload'}</p>
                    <p className="mt-1 max-w-xs text-xs text-slate-500">PDF, DOCX, or image · max 8 MB</p>
                    <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx" className="hidden" onChange={onFilePick} />
                  </label>
                  <div>
                    <FieldLabel>How students submit</FieldLabel>
                    <select className="tp-input" value={form.submissionMode} onChange={(e) => setForm((p) => ({ ...p, submissionMode: e.target.value }))}>
                      <option value="SYSTEM">Answer in system</option>
                      <option value="FILE">Upload a file</option>
                      <option value="BOTH">Both options</option>
                    </select>
                  </div>
                </div>
              )}

              {form.homeworkType === 'RESOURCE' && (
                <div>
                  <FieldLabel>Resource URL</FieldLabel>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="tp-input pl-10"
                      placeholder="https://…"
                      value={form.resourceUrl}
                      onChange={(e) => setForm((p) => ({ ...p, resourceUrl: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="rounded-2xl border border-black/[0.06] bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5">
              <h3 className="text-lg font-semibold text-[#000435]">{form.title.trim() || 'Untitled homework'}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {form.className || TP_EMPTY} · {form.courseName || TP_EMPTY}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Type</dt>
                  <dd className="font-medium text-[#000435]">{TYPE_CARDS.find((t) => t.id === form.homeworkType)?.title}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Questions</dt>
                  <dd className="font-medium text-[#000435]">{form.homeworkType === 'QUIZ' ? form.questions.length : TP_EMPTY}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Total marks</dt>
                  <dd className="font-medium text-[#000435]">{totalMarks}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Due</dt>
                  <dd className="font-medium text-[#000435]">
                    {form.dueDate || TP_EMPTY} {form.dueTime}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Est. time</dt>
                  <dd className="font-medium text-[#000435]">{form.estimatedMinutes} min</dd>
                </div>
              </dl>
              {form.description && <p className="mt-4 text-sm leading-relaxed text-slate-600">{form.description}</p>}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-black/[0.06] bg-white px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] max-sm:pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              className={`${tpActionBtn} w-full sm:w-auto disabled:opacity-40`}
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button type="button" disabled={saving} onClick={() => void handleSave(true)} className={`${tpActionBtn} w-full sm:w-auto`}>
                Save draft
              </button>
              {step < 2 ? (
                <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className={`${tpActionBtnPrimary} w-full sm:w-auto disabled:opacity-40`}>
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving || !canPublish}
                  onClick={() => void handleSave(false)}
                  className={`${tpActionBtnPrimary} w-full sm:w-auto disabled:opacity-40`}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Publish homework
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
