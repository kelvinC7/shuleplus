'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, CalendarPlus, Layers, X } from 'lucide-react';
import type { TeacherOption } from '@/types';
import { PlacementAdvisorPanel, type PlacementSlotRef } from '@/components/placement-advisor-panel';

export type FreePeriodAddModalProps = {
  open: boolean;
  onClose: () => void;
  busy?: boolean;
  className: string;
  slotLabel: string;
  term: string;
  academicYear: string;
  targetSlot: PlacementSlotRef;
  showCourseTab: boolean;
  showExtraTab: boolean;
  courseOptions: string[];
  teachers: TeacherOption[];
  loadTeachersForSubject?: (subjectName: string) => Promise<TeacherOption[]>;
  periodsPerWeekForSubject?: (subjectName: string) => number | undefined;
  placedPeriodsForSubject?: (subjectName: string) => number;
  onSaveCourse: (
    payload: {
      subjectName: string;
      teacherUserId: string;
      teacherName: string;
      room?: string;
    },
    opts: { bumpPeriods: boolean },
    slot?: PlacementSlotRef,
  ) => Promise<void>;
  onSaveExtra: (name: string) => Promise<void>;
};

export function FreePeriodAddModal({
  open,
  onClose,
  busy,
  className,
  slotLabel,
  term,
  academicYear,
  targetSlot,
  showCourseTab,
  showExtraTab,
  courseOptions,
  teachers,
  loadTeachersForSubject,
  periodsPerWeekForSubject,
  placedPeriodsForSubject,
  onSaveCourse,
  onSaveExtra,
}: FreePeriodAddModalProps) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<'course' | 'extra'>(showCourseTab ? 'course' : 'extra');
  const [mode, setMode] = useState<'pick' | 'manual'>('pick');
  const [subjectPick, setSubjectPick] = useState('');
  const [subjectManual, setSubjectManual] = useState('');
  const [teacherUserId, setTeacherUserId] = useState('');
  const [room, setRoom] = useState('');
  const [bumpPeriods, setBumpPeriods] = useState(true);
  const [extraName, setExtraName] = useState('');
  const [subjectTeachers, setSubjectTeachers] = useState<TeacherOption[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [applyingSlot, setApplyingSlot] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTab(showCourseTab ? 'course' : 'extra');
    setSubjectPick(courseOptions[0] ?? '');
    setSubjectManual('');
    setTeacherUserId('');
    setRoom('');
    setExtraName('');
    setBumpPeriods(true);
    setSaveError('');
    setMode(courseOptions.length ? 'pick' : 'manual');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, showCourseTab, courseOptions, onClose]);

  const subjectName = mode === 'pick' ? subjectPick.trim() : subjectManual.trim();

  useEffect(() => {
    if (!open || tab !== 'course' || !subjectName) {
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
  }, [open, tab, subjectName, loadTeachersForSubject, teachers]);

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

  const weeklyTarget = subjectName ? periodsPerWeekForSubject?.(subjectName) : undefined;
  const placed = subjectName ? (placedPeriodsForSubject?.(subjectName) ?? 0) : 0;

  if (!open || !mounted) return null;

  async function runSaveCourse(slot: PlacementSlotRef) {
    if (!subjectName || !teacher) return;
    setSaveError('');
    setApplyingSlot(true);
    try {
      await onSaveCourse(
        {
          subjectName,
          teacherUserId: teacher.teacherUserId,
          teacherName: teacher.teacherName,
          room: room.trim() || undefined,
        },
        { bumpPeriods },
        slot,
      );
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not add course.';
      setSaveError(msg);
      throw e;
    } finally {
      setApplyingSlot(false);
    }
  }

  async function submitCourse() {
    await runSaveCourse(targetSlot);
  }

  async function submitExtra() {
    const name = extraName.trim();
    if (!name) return;
    await onSaveExtra(name);
  }

  const bothTabs = showCourseTab && showExtraTab;
  const formBusy = busy || applyingSlot;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-navy/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[min(calc(100dvh-2rem),640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_28px_80px_-16px_rgba(0,4,53,0.45)]"
      >
        <div className="relative shrink-0 overflow-hidden border-b border-white/10 px-5 py-4">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#000435] via-[#0f1a5c] to-[#1e3a8a]"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-base font-bold text-white">
                <CalendarPlus size={18} className="text-amber-400" />
                Add period
              </p>
              <p className="mt-1 truncate text-xs text-white/70">
                {className} · {slotLabel}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {bothTabs ? (
          <div className="flex shrink-0 gap-1 border-b border-slate-100 bg-slate-50/90 px-4 py-2">
            <button
              type="button"
              onClick={() => setTab('course')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
                tab === 'course' ? 'bg-white text-navy shadow-sm ring-1 ring-slate-200/80' : 'text-slate-500'
              }`}
            >
              <BookOpen size={14} /> Course
            </button>
            <button
              type="button"
              onClick={() => setTab('extra')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
                tab === 'extra' ? 'bg-white text-navy shadow-sm ring-1 ring-slate-200/80' : 'text-slate-500'
              }`}
            >
              <Layers size={14} /> Extra
            </button>
          </div>
        ) : null}

        <div className="modal-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
          {tab === 'course' && showCourseTab ? (
            <>
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
                      setSaveError('');
                    }}
                  >
                    {courseOptions.length === 0 ? (
                      <option value="">No courses configured</option>
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
                      setSaveError('');
                    }}
                  />
                </label>
              )}

              {subjectName && weeklyTarget != null ? (
                <p className="text-xs text-slate-500">
                  {placed}/{weeklyTarget} periods this week
                </p>
              ) : null}

              <label className="block text-xs font-semibold text-navy">
                Teacher
                <select
                  className="input mt-1.5 w-full"
                  value={teacherUserId}
                  disabled={loadingTeachers || !subjectName}
                  onChange={(e) => {
                    setTeacherUserId(e.target.value);
                    setSaveError('');
                  }}
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

              {teacher ? (
                <PlacementAdvisorPanel
                  className={className}
                  subjectName={subjectName}
                  teacherUserId={teacher.teacherUserId}
                  teacherName={teacher.teacherName}
                  term={term}
                  academicYear={academicYear}
                  room={room.trim() || undefined}
                  targetSlot={targetSlot}
                  applying={formBusy}
                  onPickSlot={(slot) => void runSaveCourse(slot)}
                />
              ) : null}

              {saveError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
                  {saveError}
                </div>
              ) : null}

              <label className="flex cursor-pointer items-start gap-2 text-xs text-navy">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={bumpPeriods}
                  onChange={(e) => setBumpPeriods(e.target.checked)}
                />
                <span>Increase periods/week by 1</span>
              </label>
            </>
          ) : null}

          {tab === 'extra' && showExtraTab ? (
            <>
              <label className="block text-xs font-semibold text-navy">
                Name
                <input
                  className="input mt-1.5 w-full"
                  autoFocus
                  placeholder="e.g. Debate Club"
                  value={extraName}
                  onChange={(e) => setExtraName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submitExtra();
                  }}
                />
              </label>
            </>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-slate-100 bg-slate-50/90 px-5 py-4">
          <button type="button" className="btn-secondary flex-1 py-2.5" onClick={onClose} disabled={formBusy}>
            Cancel
          </button>
          {tab === 'course' && showCourseTab ? (
            <button
              type="button"
              className="btn-primary flex-1 py-2.5"
              disabled={formBusy || !subjectName || !teacherUserId}
              onClick={() => void submitCourse()}
            >
              Save
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary flex-1 py-2.5"
              disabled={formBusy || !extraName.trim()}
              onClick={() => void submitExtra()}
            >
              Add activity
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
