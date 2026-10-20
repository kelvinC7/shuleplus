'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Loader2, Save } from 'lucide-react';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import { completeLesson, fetchTeacherToday, smartApiError } from '@/services/timetable-smart-api';
import type { SmartLesson } from '@/types/smart-timetable';

export function HomeworkView() {
  const { term, academicYear } = useAcademicSettings();
  const [lessons, setLessons] = useState<SmartLesson[]>([]);
  const [homework, setHomework] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = await fetchTeacherToday({ term, academicYear });
      setLessons(today.lessons ?? []);
      const next: Record<string, string> = {};
      for (const lesson of today.lessons ?? []) {
        next[lesson.timetableId] = lesson.topic ?? '';
      }
      setHomework(next);
    } catch (err) {
      setMessage(smartApiError(err, 'Could not load today’s lessons'));
    } finally {
      setLoading(false);
    }
  }, [term, academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(lesson: SmartLesson) {
    if (!lesson.sessionId) {
      setMessage('Start the class (check-in) before assigning homework for this period.');
      return;
    }
    setSavingId(lesson.timetableId);
    setMessage(null);
    try {
      await completeLesson(lesson.sessionId, {
        topic: lesson.topic ?? lesson.subjectName,
        homework: homework[lesson.timetableId] ?? '',
        draft: false,
      });
      setMessage(`Homework saved for ${lesson.className} · ${lesson.subjectName}`);
    } catch (err) {
      setMessage(smartApiError(err, 'Could not save homework'));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Homework</h1>
        <p className="mt-1 text-sm text-slate-600">
          Assign work for today’s periods. Parents see it in Homework Center once the lesson is completed.
        </p>
      </div>
      {message && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</div>
      )}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading lessons…
        </div>
      ) : lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
          No lessons on today’s timetable.
        </div>
      ) : (
        <ul className="space-y-3">
          {lessons.map((lesson) => (
            <li key={lesson.timetableId} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {lesson.className} · {lesson.subjectName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {lesson.startTime}–{lesson.endTime}
                    {lesson.sessionId ? ' · class started' : ' · start class to publish'}
                  </p>
                </div>
                <BookOpen className="h-4 w-4 text-slate-400" />
              </div>
              <textarea
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                rows={3}
                placeholder="Homework for parents and students…"
                value={homework[lesson.timetableId] ?? ''}
                onChange={(e) => setHomework((prev) => ({ ...prev, [lesson.timetableId]: e.target.value }))}
              />
              <button
                type="button"
                disabled={savingId === lesson.timetableId}
                onClick={() => void save(lesson)}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingId === lesson.timetableId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save homework
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
