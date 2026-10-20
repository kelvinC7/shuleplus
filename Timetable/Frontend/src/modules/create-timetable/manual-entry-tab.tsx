'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Save,
  Trash2,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ClassSelectPanel } from '@/components/class-select-panel';
import { AddCourseModal } from '@/components/add-course-modal';
import {
  DndTimetableGrid,
  type TimetableCellRef,
} from '@/components/dnd-timetable-grid';
import { timetableApi } from '@/services/timetable-api';
import type {
  ClassConfigListItem,
  CourseConfig,
  SchoolSchedule,
  TeacherAssignment,
  TeacherOption,
  TimetableRow,
} from '@/types';
import { resolveSchedulePeriodSlots } from '@/utils/timetable';

const NAVY = '#000435';

function apiErrorMessage(e: unknown, fallback: string): string {
  const data = (
    e as {
      response?: {
        data?: {
          message?: string;
          details?: { issues?: { path: (string | number)[]; message: string }[] };
        };
      };
    }
  )?.response?.data;
  if (data?.message === 'Validation error' && data.details?.issues?.length) {
    return data.details.issues
      .map((issue) => `${issue.path.join('.') || 'field'}: ${issue.message}`)
      .join(' · ');
  }
  return data?.message ?? fallback;
}

interface ManualEntryTabProps {
  term: string;
  academicYear: string;
  schedule: SchoolSchedule | null;
  courses: CourseConfig[];
  classRows: ClassConfigListItem[];
  timetableRows: TimetableRow[];
  assignments: TeacherAssignment[];
  conflictCount: number;
  onRefresh: (opts?: { silent?: boolean }) => Promise<void>;
  busy: boolean;
  setBusy: (v: boolean) => void;
}

export function ManualEntryTab({
  term,
  academicYear,
  schedule,
  courses,
  classRows,
  timetableRows,
  assignments,
  conflictCount,
  onRefresh,
  busy,
  setBusy,
}: ManualEntryTabProps) {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classLoading, setClassLoading] = useState(false);
  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<TimetableCellRef | null>(null);
  const [editLesson, setEditLesson] = useState<TimetableRow | null>(null);
  const [copySource, setCopySource] = useState<TimetableRow | null>(null);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [classConfirmed, setClassConfirmed] = useState(false);

  const periodSlots = useMemo(
    () => (schedule ? resolveSchedulePeriodSlots(schedule) : []),
    [schedule],
  );
  const activeDays = schedule?.activeDays?.length ? schedule.activeDays : undefined;

  const classRowsForClass = useMemo(
    () => timetableRows.filter((r) => r.className === selectedClass),
    [timetableRows, selectedClass],
  );

  const termScopeRows = useMemo(
    () => timetableRows.filter((r) => !r.isExtraActivity),
    [timetableRows],
  );

  const termScopeClassCount = useMemo(
    () => new Set(termScopeRows.map((r) => r.className)).size,
    [termScopeRows],
  );

  const lessonSlots = periodSlots.filter((s) => !s.isBreak).length;
  const placedCount = classRowsForClass.filter((r) => !r.isExtraActivity).length;
  const capacity = lessonSlots * (activeDays?.length ?? 5);
  const coveragePct = capacity > 0 ? Math.round((placedCount / capacity) * 100) : 0;

  const loadClassMeta = useCallback(
    async (className: string) => {
      setClassLoading(true);
      try {
        const [detail, teacherRes] = await Promise.all([
          timetableApi.getClassConfig(className, term, academicYear),
          timetableApi.classConfigTeachers(term, academicYear),
        ]);
        const subjects = detail.data.data.courses.map((c) => c.subjectName);
        setCourseOptions([...new Set(subjects)].sort());
        setTeachers(teacherRes.data.data);
      } catch {
        setCourseOptions([]);
        setTeachers([]);
        toast.error('Could not load class configuration');
      } finally {
        setClassLoading(false);
      }
    },
    [term, academicYear],
  );

  useEffect(() => {
    if (!selectedClass) return;
    setCopySource(null);
    setClassConfirmed(false);
    setClassPickerOpen(false);
    void loadClassMeta(selectedClass);
  }, [selectedClass, loadClassMeta]);

  useEffect(() => {
    setClassConfirmed(false);
  }, [placedCount]);

  async function refreshData() {
    await onRefresh({ silent: true });
  }

  function openAdd(cell: TimetableCellRef) {
    if (copySource) return;
    setEditLesson(null);
    setActiveCell(cell);
    setModalOpen(true);
  }

  const loadTeachersForSubject = useCallback(
    async (subjectName: string) => {
      const res = await timetableApi.classConfigTeachers(term, academicYear, subjectName);
      return res.data.data;
    },
    [term, academicYear],
  );

  async function pasteCopy(cell: TimetableCellRef) {
    if (!copySource) return;
    await handleDuplicate(copySource, cell);
    setCopySource(null);
    toast.success('Lesson pasted');
  }

  function openEdit(lesson: TimetableRow, cell: TimetableCellRef) {
    setEditLesson(lesson);
    setActiveCell(cell);
    setModalOpen(true);
  }

  async function saveCourse(payload: {
    subjectName: string;
    teacherUserId: string;
    teacherName: string;
    room?: string;
  }) {
    if (!selectedClass || !activeCell) return;
    setBusy(true);
    try {
      if (editLesson) {
        await timetableApi.updateTimetable(editLesson.id, {
          subjectName: payload.subjectName,
          teacherUserId: payload.teacherUserId,
          teacherName: payload.teacherName,
          room: payload.room ?? null,
        });
        toast.success('Course updated');
      } else {
        await timetableApi.createTimetable({
          className: selectedClass,
          subjectName: payload.subjectName,
          teacherUserId: payload.teacherUserId,
          teacherName: payload.teacherName,
          dayOfWeek: activeCell.dayOfWeek,
          startTime: activeCell.startTime,
          endTime: activeCell.endTime,
          ...(payload.room ? { room: payload.room } : {}),
          term,
          academicYear,
        });
        toast.success('Course saved');
      }
      setModalOpen(false);
      setActiveCell(null);
      setEditLesson(null);
      await refreshData();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, 'Could not save. Check conflicts or required fields.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleMove(id: string, dayOfWeek: string, startTime: string, endTime: string) {
    await timetableApi.updateTimetable(id, { dayOfWeek, startTime, endTime });
    await refreshData();
  }

  async function handleSwap(sourceId: string, targetId: string) {
    await timetableApi.swapTimetable(sourceId, targetId);
    await refreshData();
  }

  async function handleDelete(id: string) {
    await timetableApi.deleteTimetable(id);
    await refreshData();
  }

  const periodsPerWeekForSubject = useCallback(
    (subjectName: string) => {
      if (!selectedClass) return undefined;
      const fromAssignment = assignments.find(
        (a) => a.className === selectedClass && a.subjectName === subjectName,
      )?.periodsPerWeek;
      if (fromAssignment != null) return fromAssignment;
      return courses.find((c) => c.subjectName === subjectName)?.periodsPerWeek;
    },
    [assignments, selectedClass, courses],
  );

  const placedPeriodsForSubject = useCallback(
    (subjectName: string) =>
      classRowsForClass.filter((r) => r.subjectName === subjectName && !r.isExtraActivity).length,
    [classRowsForClass],
  );

  async function handleSaveCourseFromFreeSlot(
    cell: TimetableCellRef,
    payload: {
      subjectName: string;
      teacherUserId: string;
      teacherName: string;
      room?: string;
    },
    opts: { bumpPeriods: boolean },
  ) {
    if (!selectedClass) return;
    setBusy(true);
    try {
      await timetableApi.createTimetable({
        className: selectedClass,
        subjectName: payload.subjectName,
        teacherUserId: payload.teacherUserId,
        teacherName: payload.teacherName,
        dayOfWeek: cell.dayOfWeek,
        startTime: cell.startTime,
        endTime: cell.endTime,
        ...(payload.room ? { room: payload.room } : {}),
        term,
        academicYear,
      });
      if (opts.bumpPeriods) {
        const assignment = assignments.find(
          (a) => a.className === selectedClass && a.subjectName === payload.subjectName,
        );
        if (assignment) {
          await timetableApi.updateAssignment(assignment.id, {
            periodsPerWeek: assignment.periodsPerWeek + 1,
          });
        }
      }
      await refreshData();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, 'Could not add course. The teacher may clash in another class.'));
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate(lesson: TimetableRow, cell: TimetableCellRef) {
    const occupied = classRowsForClass.some(
      (r) =>
        r.dayOfWeek === cell.dayOfWeek &&
        r.startTime === cell.startTime &&
        r.endTime === cell.endTime,
    );
    if (occupied) {
      toast.error('Cell is occupied');
      return;
    }
    await timetableApi.createTimetable({
      className: lesson.className,
      subjectName: lesson.subjectName,
      teacherUserId: lesson.teacherUserId,
      teacherName: lesson.teacherName,
      dayOfWeek: cell.dayOfWeek,
      startTime: cell.startTime,
      endTime: cell.endTime,
      ...(lesson.room ? { room: lesson.room } : {}),
      term,
      academicYear,
    });
    await refreshData();
  }

  async function confirmClassTimetable() {
    if (!selectedClass) return;
    setBusy(true);
    try {
      const { data } = await timetableApi.confirmClassTimetable({
        className: selectedClass,
        term,
        academicYear,
      });
      await refreshData();
      setClassConfirmed(true);
      const count = data.data?.lessonCount ?? placedCount;
      if (conflictCount > 0) {
        toast.warning(
          `${selectedClass} published (${count} periods). ${conflictCount} conflict(s) — review Conflicts.`,
        );
      } else {
        toast.success(
          `${selectedClass} is live for teachers on TichaPortal (${count} periods · ${term} · ${academicYear})`,
        );
      }
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, 'Could not confirm timetable'));
    } finally {
      setBusy(false);
    }
  }

  async function clearClassTimetable() {
    if (!selectedClass) return;
    const ok = confirm(
      `Delete the existing timetable for ${selectedClass}?\n\nScope: ${term} · ${academicYear}\n\nThis removes placed lessons only. Class courses and time settings stay the same. You can rebuild the grid manually or use Generator.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const { data } = await timetableApi.clearTimetables({
        term,
        academicYear,
        classes: [selectedClass],
      });
      toast.success(
        `Deleted ${data.data?.deleted ?? 0} lesson(s) for ${selectedClass} (${term} · ${academicYear})`,
      );
      setCopySource(null);
      await refreshData();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, 'Could not delete timetable'));
    } finally {
      setBusy(false);
    }
  }

  async function clearTermTimetable() {
    if (termScopeRows.length === 0) return;
    const ok = confirm(
      `Delete ALL class timetables for ${term} · ${academicYear}?\n\nThis affects ${termScopeRows.length} lesson(s) across ${termScopeClassCount} class(es). Extra activities are not removed.\n\nYou cannot undo this.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const { data } = await timetableApi.clearTimetables({ term, academicYear });
      toast.success(
        `Deleted ${data.data?.deleted ?? 0} lesson(s) for ${term} · ${academicYear}. Start fresh with manual entry or Generator.`,
      );
      setCopySource(null);
      setSelectedClass(null);
      setClassPickerOpen(true);
      await refreshData();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, 'Could not delete timetables'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Select class</h3>
          <Link
            href="/timetable?tab=schedule"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-navy shadow-sm transition hover:border-amber-300 hover:bg-amber-50/40"
          >
            <Settings2 size={15} className="text-amber-600" />
            Time settings
          </Link>
        </div>
        <div className="mt-3">
          <ClassSelectPanel
            classes={classRows}
            selectedClass={selectedClass}
            onSelect={(name) => {
              setSelectedClass(name || null);
              if (name) setClassPickerOpen(false);
            }}
            onBrowseClasses={() => setClassPickerOpen(true)}
            loading={classLoading && !classRows.length}
            compact={Boolean(selectedClass) && !classPickerOpen}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Delete existing timetable
            </p>
            <p className="mt-1 text-sm font-extrabold" style={{ color: NAVY }}>
              {term} · {academicYear}
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[220px]">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={busy || !selectedClass || placedCount === 0}
              onClick={() => void clearClassTimetable()}
            >
              <Trash2 size={15} />
              Delete for selected class
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={busy || termScopeRows.length === 0}
              onClick={() => void clearTermTimetable()}
            >
              <Trash2 size={15} />
              Delete all classes (this term)
            </button>
          </div>
        </div>
      </section>

      {!selectedClass ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
          <p className="text-sm text-slate-500">Select a class to edit the grid.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Periods / week"
              value={capacity}
              icon={<Clock size={16} />}
              tone="#2563eb"
            />
            <StatCard label="Placed lessons" value={placedCount} icon={<Save size={16} />} tone="#0f766e" />
            <StatCard
              label="Conflicts"
              value={conflictCount}
              icon={<AlertTriangle size={16} />}
              tone={conflictCount ? '#dc2626' : '#059669'}
            />
            <StatCard
              label="Coverage"
              value={`${coveragePct}%`}
              icon={<CheckCircle2 size={16} />}
              tone="#0284c7"
            />
          </div>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 sm:px-0">
              <h3 className="font-bold" style={{ color: NAVY }}>
                {selectedClass}
              </h3>
              <button
                type="button"
                className="btn-secondary py-2 text-xs"
                disabled={busy}
                onClick={() => void refreshData()}
              >
                {busy ? <Loader2 className="animate-spin" size={14} /> : null} Refresh
              </button>
            </div>

            {periodSlots.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Configure time settings first.</p>
            ) : (
              <DndTimetableGrid
                rows={classRowsForClass}
                periodSlots={periodSlots}
                days={activeDays}
                courses={courses}
                className={selectedClass}
                term={term}
                academicYear={academicYear}
                manualEntry
                cardSecondary="teacher"
                onMove={handleMove}
                onSwap={handleSwap}
                onAddCourse={openAdd}
                onEditCourse={openEdit}
                onDeleteLesson={handleDelete}
                onDuplicateLesson={handleDuplicate}
                copyLesson={copySource}
                onCopyLesson={setCopySource}
                onPasteCopy={pasteCopy}
                onAddExtra={
                  selectedClass
                    ? async (input) => {
                        await timetableApi.createExtraActivity({
                          name: input.name,
                          dayOfWeek: input.dayOfWeek,
                          startTime: input.startTime,
                          endTime: input.endTime,
                          className: input.className,
                          term,
                          academicYear,
                          sync: true,
                        });
                        await refreshData();
                      }
                    : undefined
                }
                onSaveCourseFromFreeSlot={selectedClass ? handleSaveCourseFromFreeSlot : undefined}
                freeSlotCourseOptions={courseOptions}
                freeSlotTeachers={teachers}
                loadTeachersForSubject={loadTeachersForSubject}
                periodsPerWeekForSubject={periodsPerWeekForSubject}
                placedPeriodsForSubject={placedPeriodsForSubject}
              />
            )}

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                {classConfirmed ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                    <CheckCircle2 size={14} /> Timetable confirmed for this class
                  </span>
                ) : (
                  <>Confirm to publish for teachers ({term}, {academicYear}).</>
                )}
              </p>
              <button
                type="button"
                disabled={busy || placedCount === 0}
                onClick={() => void confirmClassTimetable()}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a2280 100%)` }}
              >
                {busy ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                Confirm &amp; save timetable for {selectedClass}
              </button>
            </div>
          </section>
        </>
      )}

      <AddCourseModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setActiveCell(null);
          setEditLesson(null);
        }}
        onSave={saveCourse}
        slotLabel={
          activeCell
            ? `${activeCell.periodLabel ?? 'Period'} · ${activeCell.dayOfWeek} ${activeCell.startTime}-${activeCell.endTime}`
            : ''
        }
        className={selectedClass ?? ''}
        courseOptions={courseOptions}
        teachers={teachers}
        loadTeachersForSubject={loadTeachersForSubject}
        initial={
          editLesson
            ? {
                subjectName: editLesson.subjectName,
                teacherUserId: editLesson.teacherUserId,
                teacherName: editLesson.teacherName,
                room: editLesson.room ?? undefined,
              }
            : undefined
        }
        busy={busy}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
      <div
        className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg sm:mb-3 sm:h-9 sm:w-9 sm:rounded-xl"
        style={{ backgroundColor: `${tone}14`, color: tone }}
      >
        {icon}
      </div>
      <p className="text-xl font-extrabold leading-none sm:text-[1.55rem]" style={{ color: NAVY }}>
        {value}
      </p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500 sm:text-[10px]">
        {label}
      </p>
    </div>
  );
}
