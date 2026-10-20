'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, MoreHorizontal, Move, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { PeriodSlotDefinition, TimetableRow } from '@/types';
import { WEEK_DAYS } from '@/types';
import { ScheduleSlotTypeIcon } from '@/components/schedule-slot-type-icon';
import { FreePeriodAddModal } from '@/components/free-period-add-modal';
import { shortCourseCode } from '@/utils/course-code';
import { resolveCourseColor, timeSlotKey } from '@/utils/timetable';
import type { TeacherOption } from '@/types';

interface CourseMeta {
  subjectName: string;
  courseCode?: string | null;
  color?: string | null;
}

export interface TimetableCellRef {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  periodLabel?: string;
}

interface DndTimetableGridProps {
  rows: TimetableRow[];
  periodSlots?: PeriodSlotDefinition[];
  courses?: CourseMeta[];
  days?: string[];
  onMove: (id: string, dayOfWeek: string, startTime: string, endTime: string) => Promise<void>;
  onSwap?: (sourceId: string, targetId: string) => Promise<void>;
  viewLabel?: string;
  readOnly?: boolean;
  cardSecondary?: 'teacher' | 'class';
  className?: string;
  term?: string;
  academicYear?: string;
  /** Manual entry: open course modal on empty cells */
  manualEntry?: boolean;
  onAddCourse?: (cell: TimetableCellRef) => void;
  onEditCourse?: (lesson: TimetableRow, cell: TimetableCellRef) => void;
  onDeleteLesson?: (id: string) => Promise<void>;
  onDuplicateLesson?: (lesson: TimetableRow, cell: TimetableCellRef) => Promise<void>;
  /** Lesson queued for copy — tap an empty cell to paste. */
  copyLesson?: TimetableRow | null;
  onCopyLesson?: (lesson: TimetableRow | null) => void;
  onPasteCopy?: (cell: TimetableCellRef) => Promise<void>;
  onAddExtra?: (input: {
    name: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    className: string;
  }) => Promise<void>;
  onRemoveExtra?: (extraActivityId: string) => Promise<void>;
  /** Timetable tab: add course from a free cell (with teacher conflict checks on server). */
  onSaveCourseFromFreeSlot?: (
    cell: TimetableCellRef,
    payload: {
      subjectName: string;
      teacherUserId: string;
      teacherName: string;
      room?: string;
    },
    opts: { bumpPeriods: boolean },
  ) => Promise<void>;
  freeSlotCourseOptions?: string[];
  freeSlotTeachers?: TeacherOption[];
  loadTeachersForSubject?: (subjectName: string) => Promise<TeacherOption[]>;
  periodsPerWeekForSubject?: (subjectName: string) => number | undefined;
  placedPeriodsForSubject?: (subjectName: string) => number;
}

function breakBandClass(slotType: PeriodSlotDefinition['slotType']) {
  if (slotType === 'LUNCH' || slotType === 'BREAK') return 'timetable-break-band timetable-break-default';
  if (slotType === 'ASSEMBLY') return 'timetable-break-band timetable-break-assembly';
  return 'timetable-break-band timetable-break-default';
}

function courseLabel(lesson: TimetableRow, courses: CourseMeta[]) {
  if (lesson.isExtraActivity) return lesson.subjectName;
  const cfg = courses.find((c) => c.subjectName === lesson.subjectName);
  return shortCourseCode(cfg?.courseCode, lesson.subjectName);
}

export function DndTimetableGrid({
  rows,
  periodSlots = [],
  courses = [],
  days = [...WEEK_DAYS].slice(0, 5),
  onMove,
  onSwap,
  viewLabel,
  readOnly = false,
  cardSecondary = 'teacher',
  className,
  term,
  academicYear,
  manualEntry = false,
  onAddCourse,
  onEditCourse,
  onDeleteLesson,
  onDuplicateLesson,
  copyLesson,
  onCopyLesson,
  onPasteCopy,
  onAddExtra,
  onRemoveExtra,
  onSaveCourseFromFreeSlot,
  freeSlotCourseOptions = [],
  freeSlotTeachers = [],
  loadTeachersForSubject,
  periodsPerWeekForSubject,
  placedPeriodsForSubject,
}: DndTimetableGridProps) {
  const suppressLessonClickRef = useRef(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOrigin, setDragOrigin] = useState<TimetableCellRef | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [moveModeId, setMoveModeId] = useState<string | null>(null);
  const [actionSheet, setActionSheet] = useState<{
    lesson: TimetableRow;
    cell: TimetableCellRef;
  } | null>(null);
  const [freeSlotModal, setFreeSlotModal] = useState<{
    day: string;
    startTime: string;
    endTime: string;
    periodLabel?: string;
  } | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!actionSheet && !freeSlotModal) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [actionSheet, freeSlotModal]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const slots = periodSlots.length
    ? periodSlots
    : rows.map((r, i) => ({
        id: `legacy-${i}`,
        name: 'Period',
        startTime: r.startTime,
        endTime: r.endTime,
        durationMinutes: 0,
        slotType: 'LESSON' as const,
        isBreak: false,
      }));

  const canEditExtras = Boolean(!readOnly && onAddExtra && className && term && academicYear);
  const canAddCourseFromFreeSlot = Boolean(
    !readOnly && onSaveCourseFromFreeSlot && className && term && academicYear,
  );
  const canAddCourseLegacyModal = Boolean(
    !readOnly && manualEntry && onAddCourse && className && !onSaveCourseFromFreeSlot,
  );
  const canFillFreeSlot = canEditExtras || canAddCourseFromFreeSlot || canAddCourseLegacyModal;

  function cellKey(day: string, timeKey: string) {
    return `${day}|${timeKey}`;
  }

  function findLesson(day: string, startTime: string, endTime: string) {
    return rows.find((r) => r.dayOfWeek === day && r.startTime === startTime && r.endTime === endTime);
  }

  async function handleDrop(day: string, startTime: string, endTime: string, periodLabel?: string) {
    if (readOnly) return;

    const cell: TimetableCellRef = { dayOfWeek: day, startTime, endTime, periodLabel };

    if (moveModeId) {
      const existing = findLesson(day, startTime, endTime);
      if (existing && existing.id !== moveModeId) {
        toast.error('Target slot is occupied');
        return;
      }
      setBusy(true);
      try {
        await onMove(moveModeId, day, startTime, endTime);
        toast.success('Lesson moved');
        setMoveModeId(null);
      } catch (e: unknown) {
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Move failed. Conflict detected.';
        toast.error(msg);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!dragId) return;
    const existing = findLesson(day, startTime, endTime);
    if (existing && existing.id !== dragId) {
      if (onSwap && dragOrigin) {
        setBusy(true);
        try {
          await onSwap(dragId, existing.id);
          toast.success('Periods swapped');
        } catch (e: unknown) {
          const msg =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Swap failed. Conflict detected.';
          toast.error(msg);
        } finally {
          setBusy(false);
          setDragId(null);
          setDragOrigin(null);
          setDropTarget(null);
        }
        return;
      }
      toast.error('Target slot is occupied');
      setDragId(null);
      setDragOrigin(null);
      setDropTarget(null);
      return;
    }

    setBusy(true);
    try {
      await onMove(dragId, day, startTime, endTime);
      toast.success('Lesson moved');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Move failed. Conflict detected.';
      toast.error(msg);
    } finally {
      setBusy(false);
      setDragId(null);
      setDragOrigin(null);
      setDropTarget(null);
    }
  }

  async function saveExtraFromModal(name: string) {
    if (!freeSlotModal || !onAddExtra || !className) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Enter an activity name');
      return;
    }
    setBusy(true);
    try {
      await onAddExtra({
        name: trimmed,
        dayOfWeek: freeSlotModal.day,
        startTime: freeSlotModal.startTime,
        endTime: freeSlotModal.endTime,
        className,
      });
      toast.success('Activity added');
      setFreeSlotModal(null);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not add activity';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function saveCourseFromModal(
    payload: {
      subjectName: string;
      teacherUserId: string;
      teacherName: string;
      room?: string;
    },
    opts: { bumpPeriods: boolean },
    slotOverride?: { dayOfWeek: string; startTime: string; endTime: string; periodLabel?: string },
  ) {
    if (!freeSlotModal || !onSaveCourseFromFreeSlot) return;
    const cell: TimetableCellRef = slotOverride
      ? {
          dayOfWeek: slotOverride.dayOfWeek,
          startTime: slotOverride.startTime,
          endTime: slotOverride.endTime,
          periodLabel: slotOverride.periodLabel,
        }
      : {
          dayOfWeek: freeSlotModal.day,
          startTime: freeSlotModal.startTime,
          endTime: freeSlotModal.endTime,
          periodLabel: freeSlotModal.periodLabel,
        };
    setBusy(true);
    try {
      await onSaveCourseFromFreeSlot(cell, payload, opts);
      toast.success(
        slotOverride ? `Course placed · ${cell.dayOfWeek} ${cell.startTime}` : 'Course added',
      );
      setFreeSlotModal(null);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not add course. The teacher may already be teaching another class at this time.';
      toast.error(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function removeExtra(extraActivityId: string) {
    if (!onRemoveExtra) return;
    setBusy(true);
    try {
      await onRemoveExtra(extraActivityId);
      toast.success('Activity removed');
    } catch {
      toast.error('Could not remove activity');
    } finally {
      setBusy(false);
    }
  }

  async function openEmptyCell(day: string, slot: PeriodSlotDefinition) {
    const cell: TimetableCellRef = {
      dayOfWeek: day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      periodLabel: slot.name,
    };
    if (copyLesson && onPasteCopy) {
      setBusy(true);
      try {
        await onPasteCopy(cell);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (canAddCourseLegacyModal) {
      onAddCourse!(cell);
      return;
    }
    if (canEditExtras || canAddCourseFromFreeSlot) {
      setFreeSlotModal({
        day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        periodLabel: slot.name,
      });
    }
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-slate-50/60 px-6 py-12 text-center text-sm text-muted">
        Configure Time Settings to define your school day periods, then generate or place lessons.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {viewLabel ? <p className="text-sm font-medium text-navy">{viewLabel}</p> : null}
      {moveModeId ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          Tap a free cell to move the lesson here.{' '}
          <button type="button" className="underline" onClick={() => setMoveModeId(null)}>
            Cancel
          </button>
        </p>
      ) : null}
      {copyLesson ? (
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900">
          Copying <strong>{copyLesson.subjectName}</strong>. Tap a free cell to paste.{' '}
          <button type="button" className="underline" onClick={() => onCopyLesson?.(null)}>
            Cancel
          </button>
        </p>
      ) : null}
      <div className="-mx-1 overflow-x-auto rounded-xl border border-border/70 bg-white shadow-sm sm:mx-0">
        <table className="min-w-[640px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-slate-50/90">
              <th className="sticky left-0 z-10 min-w-[88px] bg-slate-50/95 px-2 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted sm:min-w-[92px] sm:px-3">
                Time
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="min-w-[100px] px-1.5 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted sm:min-w-[128px] sm:px-2"
                >
                  {isMobile ? day.slice(0, 1) : day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => {
              const timeKey = timeSlotKey(slot.startTime, slot.endTime);

              if (slot.isBreak) {
                return (
                  <tr key={slot.id} className="border-b border-border/40">
                    <td className="sticky left-0 z-10 bg-white px-2 py-2 text-[10px] font-medium tabular-nums text-muted whitespace-nowrap sm:px-3">
                      {slot.startTime}-{slot.endTime}
                    </td>
                    <td colSpan={days.length} className="p-1.5">
                      <div className={breakBandClass(slot.slotType)}>
                        <ScheduleSlotTypeIcon type={slot.slotType} size={14} className="text-navy/60" />
                        <span className="font-semibold text-navy">{slot.name}</span>
                        <span className="text-[10px] font-medium text-muted">{slot.durationMinutes} min</span>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={slot.id} className="border-b border-border/40">
                  <td className="sticky left-0 z-10 bg-white px-2 py-2 text-[10px] font-semibold tabular-nums text-navy whitespace-nowrap sm:px-3">
                    <div>{slot.name}</div>
                    <div className="font-normal text-muted">
                      {slot.startTime}-{slot.endTime}
                    </div>
                  </td>
                  {days.map((day) => {
                    const lesson = findLesson(day, slot.startTime, slot.endTime);
                    const key = cellKey(day, timeKey);
                    const isDrop = dropTarget === key;
                    const bg = lesson
                      ? resolveCourseColor(lesson.subjectName, courses as Parameters<typeof resolveCourseColor>[1])
                      : undefined;
                    const label = lesson ? courseLabel(lesson, courses) : '';
                    const cellRef: TimetableCellRef = {
                      dayOfWeek: day,
                      startTime: slot.startTime,
                      endTime: slot.endTime,
                      periodLabel: slot.name,
                    };

                    return (
                      <td key={key} className="p-0.5 align-top sm:p-1">
                        <div
                          className={`slot-cell group relative ${isDrop ? 'slot-cell-drop' : ''} ${
                            moveModeId || (copyLesson && !lesson) ? 'cursor-pointer' : ''
                          } ${copyLesson && !lesson ? 'ring-1 ring-sky-200/80' : ''}`}
                          onClick={() => {
                            if (moveModeId && !lesson) {
                              void handleDrop(day, slot.startTime, slot.endTime, slot.name);
                              return;
                            }
                            if (!lesson && copyLesson && onPasteCopy) {
                              void openEmptyCell(day, slot);
                            }
                          }}
                          onDragOver={(e) => {
                            if (readOnly || isMobile) return;
                            e.preventDefault();
                            setDropTarget(key);
                          }}
                          onDragLeave={() => setDropTarget(null)}
                          onDrop={(e) => {
                            if (readOnly || isMobile) return;
                            e.preventDefault();
                            void handleDrop(day, slot.startTime, slot.endTime, slot.name);
                          }}
                        >
                          {lesson ? (
                            <div
                              draggable={!readOnly && !busy && !lesson.isExtraActivity && !isMobile}
                              onDragStart={() => {
                                suppressLessonClickRef.current = true;
                                setDragId(lesson.id);
                                setDragOrigin(cellRef);
                              }}
                              onDragEnd={() => {
                                setDragId(null);
                                setDragOrigin(null);
                                setDropTarget(null);
                                window.setTimeout(() => {
                                  suppressLessonClickRef.current = false;
                                }, 80);
                              }}
                              onClick={() => {
                                if (
                                  isMobile ||
                                  readOnly ||
                                  lesson.isExtraActivity ||
                                  !manualEntry ||
                                  !onEditCourse ||
                                  suppressLessonClickRef.current
                                ) {
                                  return;
                                }
                                onEditCourse(lesson, cellRef);
                              }}
                              className={`lesson-card relative min-h-[44px] sm:min-h-[48px] ${
                                !isMobile && manualEntry && !lesson.isExtraActivity
                                  ? 'cursor-pointer hover:ring-1 hover:ring-navy/15'
                                  : ''
                              }`}
                              style={{
                                backgroundColor: lesson.isExtraActivity ? '#E0F2FE' : bg,
                                borderLeftWidth: 3,
                                borderLeftColor: lesson.isExtraActivity ? '#0284C7' : '#00043533',
                                opacity: dragId === lesson.id ? 0.55 : 1,
                              }}
                              title={
                                lesson.isExtraActivity
                                  ? lesson.subjectName
                                  : cardSecondary === 'class'
                                    ? `${lesson.subjectName}, ${lesson.className}`
                                    : `${lesson.subjectName}, ${lesson.teacherName}`
                              }
                            >
                              <p className="truncate pr-6 text-[11px] font-bold tracking-wide text-navy sm:text-xs">
                                {label}
                              </p>
                              {!lesson.isExtraActivity ? (
                                <p className="truncate text-[9px] font-normal text-navy/65 sm:text-[10px]">
                                  {cardSecondary === 'class' ? lesson.className : lesson.teacherName}
                                </p>
                              ) : (
                                <p className="truncate text-[9px] font-medium text-sky-700 sm:text-[10px]">Activity</p>
                              )}
                              {!readOnly && !lesson.isExtraActivity && manualEntry ? (
                                <button
                                  type="button"
                                  className={`absolute right-0.5 top-0.5 rounded-md bg-white/90 p-1 text-slate-500 shadow-sm hover:text-navy ${
                                    isMobile ? 'opacity-100' : 'opacity-0 transition group-hover:opacity-100'
                                  }`}
                                  aria-label="Lesson actions"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionSheet({ lesson, cell: cellRef });
                                  }}
                                  title="More actions"
                                >
                                  <MoreHorizontal size={14} />
                                </button>
                              ) : null}
                              {lesson.isExtraActivity && lesson.extraActivityId && onRemoveExtra && !readOnly ? (
                                <button
                                  type="button"
                                  className="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-slate-400 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-red-600"
                                  title="Remove activity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void removeExtra(lesson.extraActivityId!);
                                  }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <div
                              className={`flex h-full min-h-[44px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200/90 bg-slate-50/30 px-0.5 text-center transition sm:min-h-[48px] ${
                                canFillFreeSlot
                                  ? 'group-hover:border-primary/40 group-hover:bg-primary/[0.04]'
                                  : ''
                              }`}
                            >
                              <span className="text-[9px] font-medium text-slate-400 group-hover:hidden sm:text-[10px]">
                                {copyLesson ? 'Paste' : 'Free'}
                              </span>
                              {canFillFreeSlot || (copyLesson && onPasteCopy) ? (
                                <button
                                  type="button"
                                  className={`items-center gap-0.5 rounded-md px-1.5 py-1 text-[9px] font-semibold text-navy hover:bg-white sm:gap-1 sm:px-2 sm:text-[10px] ${
                                    isMobile || copyLesson ? 'inline-flex' : 'hidden group-hover:inline-flex'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void openEmptyCell(day, slot);
                                  }}
                                >
                                  <Plus size={12} /> {copyLesson ? 'Paste' : 'Add'}
                                </button>
                              ) : (
                                <span className="hidden text-[10px] font-medium text-slate-400 group-hover:inline">
                                  Free
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {busy ? <p className="text-xs text-muted">Saving…</p> : null}

      {portalReady && actionSheet && manualEntry
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-end justify-center bg-navy/45 sm:items-center sm:p-4">
              <button
                type="button"
                className="absolute inset-0"
                aria-label="Close"
                onClick={() => setActionSheet(null)}
              />
              <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl">
            <p className="text-sm font-bold text-navy">{actionSheet.lesson.subjectName}</p>
            <p className="text-xs text-muted">
              {actionSheet.cell.dayOfWeek} · {actionSheet.cell.startTime}-{actionSheet.cell.endTime}
            </p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-navy"
                onClick={() => {
                  onEditCourse?.(actionSheet.lesson, actionSheet.cell);
                  setActionSheet(null);
                }}
              >
                <Pencil size={16} /> Edit
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-navy"
                onClick={() => {
                  setMoveModeId(actionSheet.lesson.id);
                  setActionSheet(null);
                }}
              >
                <Move size={16} /> Move
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-navy"
                onClick={() => {
                  onCopyLesson?.(actionSheet.lesson);
                  toast.info('Tap a free cell to paste the lesson');
                  setActionSheet(null);
                }}
              >
                <Copy size={16} /> Copy lesson
              </button>
              {!isMobile && onDuplicateLesson ? (
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-navy"
                  onClick={() => {
                    void (async () => {
                      setBusy(true);
                      try {
                        await onDuplicateLesson(actionSheet.lesson, actionSheet.cell);
                        toast.success('Duplicated in this slot');
                        setActionSheet(null);
                      } catch {
                        toast.error('Duplicate failed');
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                >
                  <Copy size={16} /> Duplicate here
                </button>
              ) : null}
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700"
                onClick={() => {
                  void (async () => {
                    if (!onDeleteLesson) return;
                    setBusy(true);
                    try {
                      await onDeleteLesson(actionSheet.lesson.id);
                      toast.success('Removed');
                      setActionSheet(null);
                    } catch {
                      toast.error('Could not remove');
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                <Trash2 size={16} /> Remove
              </button>
            </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold text-slate-500"
                  onClick={() => setActionSheet(null)}
                >
                  Cancel
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}

      {portalReady && freeSlotModal && className ? (
        <FreePeriodAddModal
          open
          onClose={() => setFreeSlotModal(null)}
          busy={busy}
          className={className}
          term={term ?? ''}
          academicYear={academicYear ?? ''}
          targetSlot={{
            dayOfWeek: freeSlotModal.day,
            startTime: freeSlotModal.startTime,
            endTime: freeSlotModal.endTime,
            periodLabel: freeSlotModal.periodLabel,
          }}
          slotLabel={`${freeSlotModal.periodLabel ?? 'Period'} · ${freeSlotModal.day} ${freeSlotModal.startTime}-${freeSlotModal.endTime}`}
          showCourseTab={canAddCourseFromFreeSlot}
          showExtraTab={canEditExtras}
          courseOptions={freeSlotCourseOptions}
          teachers={freeSlotTeachers}
          loadTeachersForSubject={loadTeachersForSubject}
          periodsPerWeekForSubject={periodsPerWeekForSubject}
          placedPeriodsForSubject={placedPeriodsForSubject}
          onSaveCourse={saveCourseFromModal}
          onSaveExtra={(name) => saveExtraFromModal(name)}
        />
      ) : null}
    </div>
  );
}
