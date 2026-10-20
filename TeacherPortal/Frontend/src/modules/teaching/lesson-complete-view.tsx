'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { completeLesson, smartApiError } from '@/services/timetable-smart-api';

interface LessonCompleteModalProps {
  sessionId: string;
  subjectName?: string;
  className?: string;
  onClose: () => void;
  onCompleted: () => void;
}

export function LessonCompleteModal({
  sessionId,
  subjectName,
  className,
  onClose,
  onCompleted,
}: LessonCompleteModalProps) {
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [homework, setHomework] = useState('');
  const [objectives, setObjectives] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent, draft = false) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await completeLesson(sessionId, { topic, notes, homework, objectives, draft });
      onCompleted();
      onClose();
    } catch (err) {
      setError(smartApiError(err, 'Could not complete lesson'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-navy">Complete lesson</h3>
            <p className="mt-0.5 text-sm text-muted">
              {[subjectName, className].filter(Boolean).join(' · ') || 'Lesson notes'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-slate-100 hover:text-navy"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4 px-5 py-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Topic
            </span>
            <input
              className="input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What did you cover?"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Objectives
            </span>
            <input
              className="input"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="Learning objectives"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Notes
            </span>
            <textarea
              className="input min-h-[88px] resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Class notes, observations…"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Homework
            </span>
            <textarea
              className="input min-h-[72px] resize-y"
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder="Assigned homework"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={submitting}
              onClick={(e) => handleSubmit(e, true)}
            >
              Save draft
            </button>
            <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Complete lesson
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
