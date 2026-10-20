'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, X } from 'lucide-react';
import type { TeacherOption } from '@/types';

export interface AddCourseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: {
    subjectName: string;
    teacherUserId: string;
    teacherName: string;
    room?: string;
  }) => Promise<void>;
  slotLabel: string;
  className: string;
  courseOptions: string[];
  teachers: TeacherOption[];
  loadTeachersForSubject?: (subjectName: string) => Promise<TeacherOption[]>;
  initial?: {
    subjectName: string;
    teacherUserId: string;
    teacherName: string;
    room?: string;
  };
  busy?: boolean;
}

export function AddCourseModal({
  open,
  onClose,
  onSave,
  slotLabel,
  className,
  courseOptions,
  teachers,
  loadTeachersForSubject,
  initial,
  busy,
}: AddCourseModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'pick' | 'manual'>('pick');
  const [subjectPick, setSubjectPick] = useState('');
  const [subjectManual, setSubjectManual] = useState('');
  const [teacherUserId, setTeacherUserId] = useState('');
  const [room, setRoom] = useState('');
  const [subjectTeachers, setSubjectTeachers] = useState<TeacherOption[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setSubjectPick(initial.subjectName);
      setSubjectManual(initial.subjectName);
      setTeacherUserId(initial.teacherUserId);
      setRoom(initial.room ?? '');
      setMode(courseOptions.includes(initial.subjectName) ? 'pick' : 'manual');
    } else {
      setSubjectPick(courseOptions[0] ?? '');
      setSubjectManual('');
      setTeacherUserId('');
      setRoom('');
      setMode(courseOptions.length ? 'pick' : 'manual');
    }
  }, [open, initial, courseOptions]);

  const subjectName = mode === 'pick' ? subjectPick.trim() : subjectManual.trim();

  useEffect(() => {
    if (!open || !subjectName) {
      setSubjectTeachers([]);
      return;
    }
    let cancelled = false;
    setLoadingTeachers(true);
    void (async () => {
      try {
        const loaded = loadTeachersForSubject
          ? await loadTeachersForSubject(subjectName)
          : teachers;
        if (!cancelled) setSubjectTeachers(loaded);
      } catch {
        if (!cancelled) setSubjectTeachers(teachers);
      } finally {
        if (!cancelled) setLoadingTeachers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, subjectName, loadTeachersForSubject, teachers]);

  const teacherOptions = useMemo(() => {
    const base = subjectTeachers.length ? subjectTeachers : teachers;
    if (!subjectName) return base;
    const filtered = base.filter(
      (t) => !t.subjects?.length || t.subjects.some((s) => s.toLowerCase() === subjectName.toLowerCase()),
    );
    return filtered.length ? filtered : base;
  }, [subjectTeachers, teachers, subjectName]);

  useEffect(() => {
    if (!teacherUserId) return;
    if (!teacherOptions.some((t) => t.teacherUserId === teacherUserId)) {
      setTeacherUserId('');
    }
  }, [teacherOptions, teacherUserId]);

  const teacher = useMemo(
    () => teacherOptions.find((t) => t.teacherUserId === teacherUserId),
    [teacherOptions, teacherUserId],
  );

  if (!open || !mounted) return null;

  async function handleSubmit() {
    if (!subjectName || !teacher) return;
    await onSave({
      subjectName,
      teacherUserId: teacher.teacherUserId,
      teacherName: teacher.teacherName,
      room: room.trim() || undefined,
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-navy/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[min(calc(100dvh-2rem),560px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/90 bg-white shadow-[0_24px_60px_-12px_rgba(0,4,53,0.35)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-base font-bold text-navy">
              <BookOpen size={18} className="shrink-0 text-amber-600" />
              {initial ? 'Edit course' : 'Add course'}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {className} · {slotLabel}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              disabled={!courseOptions.length}
              onClick={() => setMode('pick')}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                mode === 'pick' ? 'bg-white text-navy shadow-sm' : 'text-slate-500'
              }`}
            >
              Class courses
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                mode === 'manual' ? 'bg-white text-navy shadow-sm' : 'text-slate-500'
              }`}
            >
              Manual
            </button>
          </div>

          {mode === 'pick' ? (
            <label className="block text-xs font-semibold text-navy">
              Subject
              <select
                className="input mt-1.5 w-full"
                value={subjectPick}
                onChange={(e) => {
                  setSubjectPick(e.target.value);
                  setTeacherUserId('');
                }}
              >
                {courseOptions.length === 0 ? (
                  <option value="">No courses. Use manual entry.</option>
                ) : (
                  courseOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))
                )}
              </select>
            </label>
          ) : (
            <label className="block text-xs font-semibold text-navy">
              Subject name
              <input
                className="input mt-1.5 w-full"
                placeholder="e.g. Mathematics"
                value={subjectManual}
                onChange={(e) => {
                  setSubjectManual(e.target.value);
                  setTeacherUserId('');
                }}
              />
            </label>
          )}

          <label className="block text-xs font-semibold text-navy">
            Teacher
            <select
              className="input mt-1.5 w-full"
              value={teacherUserId}
              disabled={loadingTeachers || !subjectName}
              onChange={(e) => setTeacherUserId(e.target.value)}
            >
              <option value="">
                {loadingTeachers ? 'Loading…' : !subjectName ? 'Pick subject first' : 'Select teacher'}
              </option>
              {teacherOptions.map((t) => (
                <option key={t.teacherUserId} value={t.teacherUserId}>
                  {t.teacherName}
                  {t.recommended ? ' (pref.)' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-navy">
            Room <span className="font-normal text-slate-400">(optional)</span>
            <input
              className="input mt-1.5 w-full"
              placeholder="e.g. Lab 2"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
          </label>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-slate-100 bg-slate-50/90 px-5 py-4">
          <button type="button" className="btn-secondary flex-1 py-2.5" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary flex-1 py-2.5"
            disabled={busy || !subjectName || !teacherUserId}
            onClick={() => void handleSubmit()}
          >
            {initial ? 'Save' : 'Save course'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
