'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Save,
  Send,
} from 'lucide-react';

import { api } from '@/services/api';
import { useAuth } from '@/contexts/auth-context';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type Question = {
  id: string;
  type: string;
  text: string;
  points?: number;
  options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
};

type HomeworkDetail = {
  id: string;
  title: string;
  subject: string;
  description: string | null;
  teacher: string | null;
  dueDate: string;
  status: string;
  homeworkType?: string;
  className?: string | null;
  maxScore?: number | null;
  estimatedMinutes?: number | null;
  questionCount?: number | null;
  questions?: Question[];
  answers?: Record<string, unknown> | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  resourceUrl?: string | null;
  submissionMode?: string | null;
  score?: number | null;
  feedback?: string | null;
};

export default function HomeworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { activeStudentId, linkedStudents } = useAuth();
  const code = linkedStudents.find((s) => s.id === activeStudentId)?.shuleCode;

  const [hw, setHw] = useState<HomeworkDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeStudentId) params.set('studentId', activeStudentId);
      if (code) params.set('studentCode', code);
      const res = await api.get<{ data: HomeworkDetail }>(`/homework/${id}?${params}`);
      const detail = res.data.data ?? (res.data as unknown as HomeworkDetail);
      setHw(detail);
      if (detail.answers && typeof detail.answers === 'object') {
        setAnswers(detail.answers as Record<string, unknown>);
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not load homework'
      );
    } finally {
      setLoading(false);
    }
  }, [id, activeStudentId, code]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveDraft() {
    setSaving(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (activeStudentId) params.set('studentId', activeStudentId);
      if (code) params.set('studentCode', code);
      await api.post(`/homework/${id}/draft?${params}`, { answers });
      setMessage('Draft saved.');
    } catch {
      setMessage('Could not save draft.');
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (activeStudentId) params.set('studentId', activeStudentId);
      if (code) params.set('studentCode', code);
      await api.post(`/homework/${id}/submit?${params}`, { answers });
      setMessage('Homework submitted successfully.');
      await load();
    } catch {
      setMessage('Could not submit. Check your answers and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-slate-500">
        <Loader2 className="size-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (error || !hw) {
    return (
      <div className="space-y-4 py-10">
        <p className="text-red-600">{error || 'Not found'}</p>
        <Link href="/homework" className="text-sm font-semibold text-primary">← Back</Link>
      </div>
    );
  }

  const readOnly = ['SUBMITTED', 'REVIEWED', 'COMPLETED'].includes(hw.status);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-24">
      <Link href="/homework" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy">
        <ArrowLeft className="size-4" /> Homework
      </Link>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-navy text-primary">
          <BookOpen className="size-5" />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-primary">{hw.subject}</p>
        <h1 className="text-xl font-bold text-navy">{hw.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {[hw.className, hw.subject].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" /> Due {formatDate(hw.dueDate)}
          </span>
          {hw.questionCount ? <span>{hw.questionCount} questions</span> : null}
          {hw.maxScore != null ? <span>{hw.maxScore} marks</span> : null}
        </div>
        {hw.description && <p className="mt-4 text-sm leading-relaxed text-slate-600">{hw.description}</p>}
        {hw.attachmentUrl && (
          <a href={hw.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-primary underline">
            {hw.attachmentName || 'Download assignment file'}
          </a>
        )}
        {hw.resourceUrl && (
          <a href={hw.resourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary underline">
            Open resource link
          </a>
        )}
      </div>

      {(hw.questions || []).length > 0 && (
        <div className="space-y-4">
          {hw.questions!.map((q, i) => (
            <div key={q.id || i} className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Question {i + 1}</p>
              <p className="mt-1 font-medium text-navy">{q.text}</p>

              {q.type === 'MULTIPLE_CHOICE' && q.options && (
                <div className="mt-3 space-y-2">
                  {q.options.map((opt, oi) => (
                    <label
                      key={opt.id || oi}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition',
                        answers[q.id] === opt.id ? 'border-primary bg-primary/5' : 'border-slate-200',
                        readOnly && 'pointer-events-none opacity-80'
                      )}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === opt.id}
                        disabled={readOnly}
                        onChange={() => setAnswers((p) => ({ ...p, [q.id]: opt.id }))}
                        className="accent-primary"
                      />
                      <span>{String.fromCharCode(65 + oi)}. {opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'TRUE_FALSE' && (
                <div className="mt-3 flex gap-2">
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      disabled={readOnly}
                      onClick={() => setAnswers((p) => ({ ...p, [q.id]: val }))}
                      className={cn(
                        'flex-1 rounded-xl border py-2 text-sm font-medium',
                        answers[q.id] === val ? 'border-primary bg-primary/5 text-navy' : 'border-slate-200 text-slate-600'
                      )}
                    >
                      {val ? 'True' : 'False'}
                    </button>
                  ))}
                </div>
              )}

              {(q.type === 'SHORT_ANSWER' || q.type === 'LONG_ANSWER') && (
                <textarea
                  className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  rows={q.type === 'LONG_ANSWER' ? 4 : 2}
                  disabled={readOnly}
                  value={String(answers[q.id] ?? '')}
                  onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                  placeholder="Your answer…"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {readOnly && hw.score != null && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="inline-flex items-center gap-2 font-bold text-emerald-800">
            <CheckCircle2 className="size-5" /> Score: {hw.score}/{hw.maxScore ?? '—'}
          </p>
          {hw.feedback && <p className="mt-2 text-sm text-emerald-900">{hw.feedback}</p>}
        </div>
      )}

      {message && <p className="text-center text-sm text-slate-600">{message}</p>}

      {!readOnly && (hw.questions?.length || hw.homeworkType === 'QUIZ') && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 p-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mx-auto flex max-w-2xl gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveDraft()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-navy"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save draft
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-semibold text-white"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
